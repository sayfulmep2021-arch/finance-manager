// Accounts and Cash Management View (Phase 2)
// User-defined accounts, balances, and internal fund transfers (Strict Rule 14: no income/expense inflation)

import { dbGetAll, dbGet } from '../db.js';
import { 
  createAccount, 
  deleteAccountWithMIS, 
  recordInternalTransfer, 
  decimalToPaisa 
} from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney } from '../i18n.js';

export async function renderAccountsView(container) {
  const accounts = await dbGetAll('accounts');
  const today = new Date().toISOString().split('T')[0];

  let totalBalance = 0;
  accounts.forEach(a => { totalBalance += (a.current_balance_paisa || 0); });

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="accountsTitle">${t('accountsTitle')}</h1>
        <p class="view-subtitle" data-i18n="accountsSubtitle">${t('accountsSubtitle')}</p>
      </div>
      <div class="header-actions">
        <button id="btn-open-transfer-modal" class="btn btn-secondary">
          🔄 ${t('transferTitle')}
        </button>
        <button id="btn-open-acc-modal" class="btn btn-primary">
          + ${t('btnAddAccount')}
        </button>
      </div>
    </div>

    <!-- Total Aggregate Balance KPI -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 20px;">
      <div class="kpi-card card-balance">
        <div class="kpi-icon">🏦</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('cardTotalBalance')}</span>
          <span class="kpi-value text-primary">${formatMoney(totalBalance)}</span>
        </div>
      </div>
    </div>

    <!-- Accounts Cards Grid -->
    <div id="accounts-grid-container" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));">
      <!-- Loaded dynamically -->
    </div>

    <!-- Add Account Modal -->
    <div id="account-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnAddAccount">${t('btnAddAccount')}</h3>
          <button type="button" class="btn-close" id="acc-modal-close">&times;</button>
        </div>
        <form id="account-form">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label for="acc-name" class="form-label required" data-i18n="accountName">${t('accountName')}</label>
              <input type="text" id="acc-name" class="form-input" placeholder="যেমন: ডাচ-বাংলা ব্যাংক / ব্র্যাক ব্যাংক" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="acc-type" class="form-label required" data-i18n="accountType">${t('accountType')}</label>
              <select id="acc-type" class="form-select" required>
                <option value="bank">🏦 ${t('acc_bank')}</option>
                <option value="cash">💵 ${t('acc_cash')}</option>
                <option value="mfs">📱 ${t('acc_mfs')}</option>
                <option value="savings">🌱 ${t('navSavings')}</option>
                <option value="other">💼 Other</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="acc-opening-bal" class="form-label required" data-i18n="openingBalance">${t('openingBalance')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="acc-opening-bal" class="form-input" step="0.01" min="0" placeholder="0.00" value="0.00" required>
              </div>
            </div>

            <div id="account-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="acc-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary">${t('btnAddAccount')}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Internal Transfer Modal -->
    <div id="transfer-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">🔄 <span data-i18n="transferTitle">${t('transferTitle')}</span></h3>
          <button type="button" class="btn-close" id="transfer-modal-close">&times;</button>
        </div>
        <form id="transfer-form">
          <div class="modal-body">
            <p class="modal-notice" data-i18n="transferSubtitle" style="margin-bottom: 14px;">${t('transferSubtitle')}</p>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="transfer-from-acc" class="form-label required" data-i18n="fromAccount">${t('fromAccount')}</label>
              <select id="transfer-from-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="transfer-to-acc" class="form-label required" data-i18n="toAccount">${t('toAccount')}</label>
              <select id="transfer-to-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="transfer-amount" class="form-label required" data-i18n="amount">${t('amount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="transfer-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="transfer-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="transfer-date" class="form-input" value="${today}" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="transfer-desc" class="form-label" data-i18n="description">${t('description')}</label>
              <input type="text" id="transfer-desc" class="form-input" placeholder="ব্যাংক থেকে নগদ উত্তোলন ইত্যাদি">
            </div>

            <div id="transfer-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="transfer-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary" data-i18n="btnTransfer">${t('btnTransfer')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach modal open/close handlers
  const accModal = document.getElementById('account-modal');
  document.getElementById('btn-open-acc-modal').onclick = () => {
    accModal.classList.remove('hidden');
    document.getElementById('account-form-error').classList.add('hidden');
  };
  document.getElementById('acc-modal-close').onclick = () => accModal.classList.add('hidden');
  document.getElementById('acc-modal-cancel').onclick = () => accModal.classList.add('hidden');

  const transModal = document.getElementById('transfer-modal');
  document.getElementById('btn-open-transfer-modal').onclick = () => {
    transModal.classList.remove('hidden');
    document.getElementById('transfer-form-error').classList.add('hidden');
  };
  document.getElementById('transfer-modal-close').onclick = () => transModal.classList.add('hidden');
  document.getElementById('transfer-modal-cancel').onclick = () => transModal.classList.add('hidden');

  // Submit Account Form
  document.getElementById('account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('acc-name').value;
    const type = document.getElementById('acc-type').value;
    const openingVal = document.getElementById('acc-opening-bal').value;
    const errEl = document.getElementById('account-form-error');

    try {
      const openingPaisa = openingVal ? decimalToPaisa(openingVal) : 0;
      await createAccount({
        name,
        type,
        openingBalancePaisa: openingPaisa
      });
      accModal.classList.add('hidden');
      document.getElementById('account-form').reset();
      await renderAccountsView(container);
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  // Submit Transfer Form
  document.getElementById('transfer-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fromId = document.getElementById('transfer-from-acc').value;
    const toId = document.getElementById('transfer-to-acc').value;
    const amtVal = document.getElementById('transfer-amount').value;
    const dateVal = document.getElementById('transfer-date').value;
    const desc = document.getElementById('transfer-desc').value;
    const errEl = document.getElementById('transfer-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      await recordInternalTransfer({
        fromAccountId: fromId,
        toAccountId: toId,
        amountPaisa,
        date: dateVal,
        description: desc
      });
      transModal.classList.add('hidden');
      document.getElementById('transfer-form').reset();
      alert(t('transferSuccess'));
      await renderAccountsView(container);
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await loadAccountsGrid();
}

async function loadAccountsGrid() {
  const container = document.getElementById('accounts-grid-container');
  if (!container) return;

  const accounts = await dbGetAll('accounts');

  let html = '';
  accounts.forEach(a => {
    const isDefault = ['acc_cash', 'acc_bank', 'acc_mfs'].includes(a.id);
    const balance = a.current_balance_paisa || 0;

    let icon = '🏦';
    if (a.type === 'cash') icon = '💵';
    else if (a.type === 'mfs') icon = '📱';
    else if (a.type === 'savings') icon = '🌱';

    html += `
      <div class="card account-card">
        <div class="card-header flex-between">
          <div class="font-bold font-lg">${icon} ${t(a.nameKey, a.name || a.id)}</div>
          <span class="badge badge-inactive">${a.type.toUpperCase()}</span>
        </div>
        <div class="card-body">
          <div class="flex-between" style="margin-bottom: 8px;">
            <span class="text-muted">${t('currentBalance')}:</span>
            <span class="font-bold font-lg ${balance >= 0 ? 'text-primary' : 'text-danger'}">
              ${formatMoney(balance)}
            </span>
          </div>

          <div class="flex-between text-muted" style="font-size: 0.85rem; margin-bottom: 12px;">
            <span>${t('openingBalance')}:</span>
            <span>${formatMoney(a.opening_balance_paisa || 0)}</span>
          </div>

          ${!isDefault ? `
            <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
              <button class="btn btn-danger-outline btn-xs btn-delete-acc" data-id="${a.id}">
                🗑️ ${t('btnDelete')}
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Guarded delete handlers
  container.querySelectorAll('.btn-delete-acc').forEach(btn => {
    btn.onclick = async () => {
      const accId = btn.dataset.id;
      const verified = await requestMISAuthorization('আপনি কি এই হিসাবটি স্থায়ীভাবে মুছে ফেলতে চান?');
      if (verified) {
        await deleteAccountWithMIS(accId, true);
        const parent = document.getElementById('view-container');
        if (parent) renderAccountsView(parent);
      }
    };
  });
}
