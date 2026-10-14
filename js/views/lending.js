// Lending Management View (Phase 2)
// Track money lent to other people, partial repayments, overdue warnings, and MIS deletion gate

import { dbGetAll, dbGet } from '../db.js';
import { 
  recordLending, 
  recordLendingRepayment, 
  deleteLendingWithMIS, 
  decimalToPaisa 
} from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney, formatDate } from '../i18n.js';

export async function renderLendingView(container) {
  const accounts = await dbGetAll('accounts');
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="lendingTitle">${t('lendingTitle')}</h1>
        <p class="view-subtitle" data-i18n="lendingSubtitle">${t('lendingSubtitle')}</p>
      </div>
      <div>
        <button id="btn-open-lending-modal" class="btn btn-primary">
          + ${t('btnAddLending')}
        </button>
      </div>
    </div>

    <!-- Outstanding Receivables KPI Card -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 20px;">
      <div class="kpi-card card-income">
        <div class="kpi-icon">🤝</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('outstandingBalance')} (মোট পাওনা)</span>
          <span class="kpi-value text-success" id="kpi-total-receivables">৳ ০.০০</span>
        </div>
      </div>
    </div>

    <!-- Lending Table Card -->
    <div class="card">
      <div class="card-body" id="lending-list-container">
        <!-- Loaded dynamically -->
      </div>
    </div>

    <!-- Add Lending Modal -->
    <div id="lending-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnAddLending">${t('btnAddLending')}</h3>
          <button type="button" class="btn-close" id="lending-modal-close">&times;</button>
        </div>
        <form id="lending-form">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-borrower" class="form-label required" data-i18n="borrowerName">${t('borrowerName')}</label>
              <input type="text" id="lend-borrower" class="form-input" placeholder="ব্যক্তির নাম" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-amount" class="form-label required" data-i18n="amountLent">${t('amountLent')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="lend-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-source-acc" class="form-label required" data-i18n="fromAccount">${t('fromAccount')}</label>
              <select id="lend-source-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-date" class="form-label required" data-i18n="dateLent">${t('dateLent')}</label>
              <input type="date" id="lend-date" class="form-input" value="${today}" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-expected-date" class="form-label" data-i18n="expectedRepaymentDate">${t('expectedRepaymentDate')}</label>
              <input type="date" id="lend-expected-date" class="form-input">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="lend-notes" class="form-label" data-i18n="notes">${t('notes')}</label>
              <textarea id="lend-notes" class="form-textarea" rows="2"></textarea>
            </div>

            <div id="lending-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="lending-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary">${t('btnAddLending')}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Receive Repayment Modal -->
    <div id="repay-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnReceiveRepayment">${t('btnReceiveRepayment')}</h3>
          <button type="button" class="btn-close" id="repay-modal-close">&times;</button>
        </div>
        <form id="repay-form">
          <input type="hidden" id="repay-lend-id">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label font-bold" id="repay-borrower-display"></label>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="repay-amount" class="form-label required" data-i18n="repaymentAmount">${t('repaymentAmount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="repay-amount" class="form-input" step="0.01" min="1" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="repay-deposit-acc" class="form-label required" data-i18n="depositAccount">${t('depositAccount')}</label>
              <select id="repay-deposit-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="repay-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="repay-date" class="form-input" value="${today}" required>
            </div>

            <div id="repay-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="repay-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-success">${t('btnReceiveRepayment')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach modal open/close listeners
  const lendModal = document.getElementById('lending-modal');
  document.getElementById('btn-open-lending-modal').onclick = () => {
    lendModal.classList.remove('hidden');
    document.getElementById('lending-form-error').classList.add('hidden');
  };
  document.getElementById('lending-modal-close').onclick = () => lendModal.classList.add('hidden');
  document.getElementById('lending-modal-cancel').onclick = () => lendModal.classList.add('hidden');

  // Submit lending form
  document.getElementById('lending-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrower = document.getElementById('lend-borrower').value;
    const amtVal = document.getElementById('lend-amount').value;
    const sourceAccId = document.getElementById('lend-source-acc').value;
    const dateVal = document.getElementById('lend-date').value;
    const expDateVal = document.getElementById('lend-expected-date').value;
    const notes = document.getElementById('lend-notes').value;
    const errEl = document.getElementById('lending-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      await recordLending({
        borrowerName: borrower,
        amountPaisa,
        sourceAccountId: sourceAccId,
        date: dateVal,
        expectedDate: expDateVal,
        notes
      });
      lendModal.classList.add('hidden');
      document.getElementById('lending-form').reset();
      await loadLendingList();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  // Repayment form handlers
  const repayModal = document.getElementById('repay-modal');
  document.getElementById('repay-modal-close').onclick = () => repayModal.classList.add('hidden');
  document.getElementById('repay-modal-cancel').onclick = () => repayModal.classList.add('hidden');

  document.getElementById('repay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lendId = document.getElementById('repay-lend-id').value;
    const amtVal = document.getElementById('repay-amount').value;
    const depositAccId = document.getElementById('repay-deposit-acc').value;
    const dateVal = document.getElementById('repay-date').value;
    const errEl = document.getElementById('repay-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      await recordLendingRepayment({
        lendingId: lendId,
        depositAccountId: depositAccId,
        amountPaisa,
        date: dateVal
      });
      repayModal.classList.add('hidden');
      document.getElementById('repay-form').reset();
      alert('ধার পরিশোধ সফলভাবে রেকর্ড করা হয়েছে!');
      await loadLendingList();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await loadLendingList();
}

async function loadLendingList() {
  const container = document.getElementById('lending-list-container');
  if (!container) return;

  const loans = await dbGetAll('lending');
  const today = new Date().toISOString().split('T')[0];

  let totalReceivables = 0;
  loans.forEach(l => { totalReceivables += (l.outstandingBalancePaisa || 0); });
  const kpiEl = document.getElementById('kpi-total-receivables');
  if (kpiEl) kpiEl.textContent = formatMoney(totalReceivables);

  if (loans.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">🤝</div>
        <h3 class="empty-title">${t('noLendingYet')}</h3>
        <p class="empty-desc">${t('lendingSubtitle')}</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('borrowerName')}</th>
            <th>${t('amountLent')}</th>
            <th>${t('amountRepaid')}</th>
            <th>${t('outstandingBalance')}</th>
            <th>${t('dateLent')}</th>
            <th>${t('expectedRepaymentDate')}</th>
            <th class="text-center">${t('colActions')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  loans.forEach(l => {
    const isOverdue = l.expectedDate && l.expectedDate < today && l.outstandingBalancePaisa > 0;
    const isPaid = l.outstandingBalancePaisa === 0;

    html += `
      <tr>
        <td class="font-bold">${l.borrowerName}</td>
        <td>${formatMoney(l.originalAmountPaisa)}</td>
        <td class="text-success">${formatMoney(l.amountRepaidPaisa || 0)}</td>
        <td class="font-bold ${isPaid ? 'text-muted' : 'text-danger'}">
          ${formatMoney(l.outstandingBalancePaisa)}
        </td>
        <td>${formatDate(l.date)}</td>
        <td>
          ${l.expectedDate ? formatDate(l.expectedDate) : '-'}
          ${isOverdue ? '<span class="badge badge-expense" style="margin-left:4px;">অতিক্রান্ত</span>' : ''}
          ${isPaid ? '<span class="badge badge-income" style="margin-left:4px;">পরিশোধিত</span>' : ''}
        </td>
        <td class="text-center action-buttons">
          ${!isPaid ? `
            <button class="btn btn-success btn-xs btn-open-repay" data-id="${l.id}" data-name="${l.borrowerName}" data-due="${l.outstandingBalancePaisa}">
              💰 ${t('btnReceiveRepayment')}
            </button>
          ` : ''}
          <button class="btn btn-danger-outline btn-xs btn-delete-lending" data-id="${l.id}">
            🗑️ ${t('btnDelete')}
          </button>
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

  // Repay modal handlers
  container.querySelectorAll('.btn-open-repay').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('repay-lend-id').value = btn.dataset.id;
      document.getElementById('repay-borrower-display').textContent = `ধার গ্রহীতা: ${btn.dataset.name} (বকেয়া: ${formatMoney(parseInt(btn.dataset.due, 10))})`;
      document.getElementById('repay-form-error').classList.add('hidden');
      document.getElementById('repay-modal').classList.remove('hidden');
    };
  });

  // Guarded delete handlers
  container.querySelectorAll('.btn-delete-lending').forEach(btn => {
    btn.onclick = async () => {
      const lendId = btn.dataset.id;
      const verified = await requestMISAuthorization('আপনি কি এই ধারের রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?');
      if (verified) {
        await deleteLendingWithMIS(lendId, true);
        await loadLendingList();
      }
    };
  });
}
