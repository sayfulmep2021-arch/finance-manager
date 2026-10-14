// Unified Transaction Ledger View
// Filtering, searching, sorting, transaction details, edit with audit trail,
// and MIS Password Guarded Deletion (Strict Rule 5 & Section 17)

import { dbGetAll, dbGet } from '../db.js';
import { 
  updateTransaction, 
  deleteTransactionWithMIS, 
  getTransactionAuditHistory, 
  decimalToPaisa,
  paisaToDecimal 
} from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney, formatDate } from '../i18n.js';

let filterType = 'all';
let filterCategory = 'all';
let filterAccount = 'all';
let searchQuery = '';
let sortOrder = 'newest';

export async function renderTransactionsView(container) {
  const accounts = await dbGetAll('accounts');
  const categories = await dbGetAll('categories');

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="ledgerTitle">${t('ledgerTitle')}</h1>
        <p class="view-subtitle" data-i18n="ledgerSubtitle">${t('ledgerSubtitle')}</p>
      </div>
      <div class="header-actions">
        <button class="btn btn-success" onclick="window.location.hash='#income'">+ ${t('navIncome')}</button>
        <button class="btn btn-danger" onclick="window.location.hash='#expenses'">+ ${t('navExpenses')}</button>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div class="card toolbar-card">
      <div class="toolbar-grid">
        <!-- Search input -->
        <div class="search-box">
          <input type="text" id="tx-search-input" class="form-input" placeholder="${t('searchPlaceholder')}" value="${searchQuery}">
        </div>

        <!-- Filter Type -->
        <div class="toolbar-select">
          <select id="tx-filter-type" class="form-select">
            <option value="all" ${filterType === 'all' ? 'selected' : ''}>${t('allTypes')}</option>
            <option value="income" ${filterType === 'income' ? 'selected' : ''}>${t('typeIncome')}</option>
            <option value="expense" ${filterType === 'expense' ? 'selected' : ''}>${t('typeExpense')}</option>
          </select>
        </div>

        <!-- Filter Category -->
        <div class="toolbar-select">
          <select id="tx-filter-cat" class="form-select">
            <option value="all">${t('selectCategory')}</option>
            ${categories.map(c => `
              <option value="${c.id}" ${filterCategory === c.id ? 'selected' : ''}>${c.icon || ''} ${t(c.nameKey, c.name || c.id)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Filter Account -->
        <div class="toolbar-select">
          <select id="tx-filter-acc" class="form-select">
            <option value="all">${t('allAccounts')}</option>
            ${accounts.map(a => `
              <option value="${a.id}" ${filterAccount === a.id ? 'selected' : ''}>💼 ${t(a.nameKey, a.name || a.id)}</option>
            `).join('')}
          </select>
        </div>

        <!-- Sort Order -->
        <div class="toolbar-select">
          <select id="tx-sort-order" class="form-select">
            <option value="newest" ${sortOrder === 'newest' ? 'selected' : ''}>${t('newestFirst')}</option>
            <option value="oldest" ${sortOrder === 'oldest' ? 'selected' : ''}>${t('oldestFirst')}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Ledger Table Container -->
    <div class="card ledger-card">
      <div id="ledger-table-container">
        <!-- Dynamically rendered -->
      </div>
    </div>

    <!-- Transaction Detail & Audit Trail Modal -->
    <div id="tx-detail-modal" class="modal-overlay hidden">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="txDetailsTitle">${t('txDetailsTitle')}</h3>
          <button type="button" class="btn-close" id="detail-modal-close">&times;</button>
        </div>
        <div class="modal-body" id="detail-modal-body">
          <!-- Populated on click -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="detail-modal-btn-close">${t('btnCancel')}</button>
        </div>
      </div>
    </div>

    <!-- Edit Transaction Modal -->
    <div id="tx-edit-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="editTitle">${t('editTitle')}</h3>
          <button type="button" class="btn-close" id="edit-modal-close">&times;</button>
        </div>
        <form id="tx-edit-form">
          <div class="modal-body">
            <p class="modal-notice text-danger font-bold" data-i18n="editNotice">${t('editNotice')}</p>
            
            <input type="hidden" id="edit-tx-id">
            
            <div class="form-group">
              <label for="edit-tx-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="edit-tx-date" class="form-input" required>
            </div>

            <div class="form-group">
              <label for="edit-tx-amount" class="form-label required" data-i18n="amount">${t('amount')}</label>
              <input type="number" id="edit-tx-amount" class="form-input" step="0.01" min="0.01" required>
            </div>

            <div class="form-group">
              <label for="edit-tx-desc" class="form-label required" data-i18n="description">${t('description')}</label>
              <input type="text" id="edit-tx-desc" class="form-input" required>
            </div>

            <div class="form-group">
              <label for="edit-tx-reason" class="form-label required text-danger" data-i18n="editReason">${t('editReason')}</label>
              <input type="text" id="edit-tx-reason" class="form-input" placeholder="${t('editReasonPlaceholder')}" required>
            </div>

            <div id="edit-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="edit-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary" id="edit-modal-save">${t('btnSaveEdit')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Filter event listeners
  document.getElementById('tx-search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    refreshLedgerTable();
  });

  document.getElementById('tx-filter-type').addEventListener('change', (e) => {
    filterType = e.target.value;
    refreshLedgerTable();
  });

  document.getElementById('tx-filter-cat').addEventListener('change', (e) => {
    filterCategory = e.target.value;
    refreshLedgerTable();
  });

  document.getElementById('tx-filter-acc').addEventListener('change', (e) => {
    filterAccount = e.target.value;
    refreshLedgerTable();
  });

  document.getElementById('tx-sort-order').addEventListener('change', (e) => {
    sortOrder = e.target.value;
    refreshLedgerTable();
  });

  // Modal close handlers
  document.getElementById('detail-modal-close').onclick = () => {
    document.getElementById('tx-detail-modal').classList.add('hidden');
  };
  document.getElementById('detail-modal-btn-close').onclick = () => {
    document.getElementById('tx-detail-modal').classList.add('hidden');
  };
  document.getElementById('edit-modal-close').onclick = () => {
    document.getElementById('tx-edit-modal').classList.add('hidden');
  };
  document.getElementById('edit-modal-cancel').onclick = () => {
    document.getElementById('tx-edit-modal').classList.add('hidden');
  };

  // Edit form submit handler
  document.getElementById('tx-edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('edit-form-error');
    errEl.classList.add('hidden');

    const txId = document.getElementById('edit-tx-id').value;
    const dateVal = document.getElementById('edit-tx-date').value;
    const amountVal = document.getElementById('edit-tx-amount').value;
    const descVal = document.getElementById('edit-tx-desc').value;
    const reasonVal = document.getElementById('edit-tx-reason').value;

    try {
      const amountPaisa = decimalToPaisa(amountVal);
      if (!reasonVal.trim()) throw new Error(t('editReason'));

      await updateTransaction(txId, {
        date: dateVal,
        amountPaisa,
        description: descVal.trim()
      }, reasonVal.trim());

      document.getElementById('tx-edit-modal').classList.add('hidden');
      alert(t('editSuccess'));
      await refreshLedgerTable();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await refreshLedgerTable();
}

async function refreshLedgerTable() {
  const container = document.getElementById('ledger-table-container');
  if (!container) return;

  const allTxs = await dbGetAll('transactions');
  const categories = await dbGetAll('categories');
  const accounts = await dbGetAll('accounts');

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  // Apply filters
  let filtered = allTxs.filter(tx => {
    if (filterType !== 'all' && tx.type !== filterType) return false;
    if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false;
    if (filterAccount !== 'all' && tx.accountId !== filterAccount) return false;
    if (searchQuery) {
      const desc = (tx.description || '').toLowerCase();
      const notes = (tx.notes || '').toLowerCase();
      if (!desc.includes(searchQuery) && !notes.includes(searchQuery)) {
        return false;
      }
    }
    return true;
  });

  // Apply sorting
  filtered.sort((a, b) => {
    if (sortOrder === 'newest') {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    } else {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    }
  });

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <h3 class="empty-title">${t('noMatchingRecords')}</h3>
        <p class="empty-desc">${t('noTransactionsDesc')}</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('colDate')}</th>
            <th>${t('colType')}</th>
            <th>${t('colCategory')}</th>
            <th>${t('colDescription')}</th>
            <th>${t('colAccount')}</th>
            <th class="text-right">${t('colAmount')}</th>
            <th class="text-center">${t('colActions')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  filtered.forEach(tx => {
    const cat = catMap[tx.categoryId];
    const acc = accMap[tx.accountId];
    const isIncome = tx.type === 'income';
    const catName = cat ? t(cat.nameKey, cat.name || tx.categoryId) : tx.categoryId;
    const accName = acc ? t(acc.nameKey, acc.name || tx.accountId) : tx.accountId;

    html += `
      <tr data-id="${tx.id}">
        <td>${formatDate(tx.date)}</td>
        <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? t('typeIncome') : t('typeExpense')}</span></td>
        <td>${cat?.icon || ''} ${catName}</td>
        <td class="cell-desc">${tx.description || '-'}</td>
        <td>💼 ${accName}</td>
        <td class="text-right font-bold ${isIncome ? 'text-success' : 'text-danger'}">
          ${isIncome ? '+' : '-'}${formatMoney(tx.amountPaisa)}
        </td>
        <td class="text-center action-buttons">
          <button class="btn btn-outline btn-xs btn-view-tx" data-id="${tx.id}" title="${t('btnView')}">👁️ ${t('btnView')}</button>
          <button class="btn btn-secondary btn-xs btn-edit-tx" data-id="${tx.id}" title="${t('btnEdit')}">✏️ ${t('btnEdit')}</button>
          <button class="btn btn-danger-outline btn-xs btn-delete-tx" data-id="${tx.id}" title="${t('btnDelete')}">🗑️ ${t('btnDelete')}</button>
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </div>
  `;

  container.innerHTML = html;

  // Attach row action listeners
  container.querySelectorAll('.btn-view-tx').forEach(btn => {
    btn.onclick = () => showTransactionDetails(btn.dataset.id);
  });

  container.querySelectorAll('.btn-edit-tx').forEach(btn => {
    btn.onclick = () => openEditModal(btn.dataset.id);
  });

  container.querySelectorAll('.btn-delete-tx').forEach(btn => {
    btn.onclick = () => handleDeleteTransaction(btn.dataset.id);
  });
}

// Show transaction details & audit trail
async function showTransactionDetails(txId) {
  const tx = await dbGet('transactions', txId);
  if (!tx) return;

  const categories = await dbGetAll('categories');
  const accounts = await dbGetAll('accounts');
  const audits = await getTransactionAuditHistory(txId);

  const cat = categories.find(c => c.id === tx.categoryId);
  const acc = accounts.find(a => a.id === tx.accountId);

  const bodyEl = document.getElementById('detail-modal-body');
  const isIncome = tx.type === 'income';

  let auditHtml = '';
  if (audits.length === 0) {
    auditHtml = `<p class="text-muted">${t('noAuditHistory')}</p>`;
  } else {
    auditHtml = `
      <div class="audit-trail-timeline">
        ${audits.map(a => `
          <div class="audit-item">
            <div class="audit-time">${new Date(a.timestamp).toLocaleString()}</div>
            <div class="audit-action font-bold">${a.action}: ${a.reason || ''}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  bodyEl.innerHTML = `
    <div class="summary-preview-list">
      <div class="preview-row">
        <span class="preview-label">${t('txId')}</span>
        <code class="code-badge">${tx.id}</code>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmType')}</span>
        <span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? t('typeIncome') : t('typeExpense')}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmAmount')}</span>
        <span class="font-bold ${isIncome ? 'text-success' : 'text-danger'}">${formatMoney(tx.amountPaisa)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmDate')}</span>
        <span>${formatDate(tx.date)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmCategory')}</span>
        <span>${cat?.icon || ''} ${t(cat?.nameKey, cat?.name || tx.categoryId)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmAccount')}</span>
        <span>💼 ${t(acc?.nameKey, acc?.name || tx.accountId)}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('confirmDesc')}</span>
        <span>${tx.description || '-'}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('notes')}</span>
        <span>${tx.notes || '-'}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('txCreatedAt')}</span>
        <span class="text-muted">${new Date(tx.createdAt).toLocaleString()}</span>
      </div>
      <div class="preview-row">
        <span class="preview-label">${t('txUpdatedAt')}</span>
        <span class="text-muted">${new Date(tx.updatedAt).toLocaleString()}</span>
      </div>
    </div>

    <div class="audit-section-container">
      <h4 class="font-bold" style="margin-bottom: 8px;">${t('txAuditHistory')}</h4>
      ${auditHtml}
    </div>
  `;

  document.getElementById('tx-detail-modal').classList.remove('hidden');
}

// Open Edit modal
async function openEditModal(txId) {
  const tx = await dbGet('transactions', txId);
  if (!tx) return;

  document.getElementById('edit-tx-id').value = tx.id;
  document.getElementById('edit-tx-date').value = tx.date;
  document.getElementById('edit-tx-amount').value = paisaToDecimal(tx.amountPaisa);
  document.getElementById('edit-tx-desc').value = tx.description;
  document.getElementById('edit-tx-reason').value = '';
  document.getElementById('edit-form-error').classList.add('hidden');

  document.getElementById('tx-edit-modal').classList.remove('hidden');
}

// Handle Delete with Mandatory MIS Module Password Verification
async function handleDeleteTransaction(txId) {
  const tx = await dbGet('transactions', txId);
  if (!tx) return;

  const desc = `${formatDate(tx.date)} - ${tx.description} (${formatMoney(tx.amountPaisa)})`;

  // STRICT RULE 5: Request MIS Module authorization
  const isAuthorized = await requestMISAuthorization(
    `${t('misWarningDelete')}\n\n[ ${desc} ]`
  );

  if (isAuthorized) {
    try {
      await deleteTransactionWithMIS(txId, true);
      alert(t('deleteSuccess'));
      await refreshLedgerTable();
    } catch (err) {
      alert(err.message || t('errorOccurred'));
    }
  }
}
