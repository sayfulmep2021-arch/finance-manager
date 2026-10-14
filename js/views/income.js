// Income Management View
// Complies strictly with Section 7 & Safety Rules (Explicit confirmation preview before save)

import { dbGetAll, dbGet } from '../db.js';
import { recordTransaction, decimalToPaisa } from '../ledger.js';
import { t, formatMoney, formatDate } from '../i18n.js';

export async function renderIncomeView(container) {
  const accounts = await dbGetAll('accounts');
  const allCategories = await dbGetAll('categories');
  const incomeCategories = allCategories.filter(c => c.type === 'income');

  // Default to today's date in local YYYY-MM-DD
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="incomeTitle">${t('incomeTitle')}</h1>
        <p class="view-subtitle" data-i18n="incomeSubtitle">${t('incomeSubtitle')}</p>
      </div>
    </div>

    <div class="form-card-container">
      <div class="card form-card">
        <form id="income-form" class="transaction-form" novalidate>
          <div class="form-grid">
            <!-- Date -->
            <div class="form-group">
              <label for="income-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="income-date" class="form-input" value="${defaultDate}" required>
            </div>

            <!-- Amount -->
            <div class="form-group">
              <label for="income-amount" class="form-label required" data-i18n="amount">${t('amount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="income-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>
            </div>

            <!-- Income Category -->
            <div class="form-group">
              <label for="income-category" class="form-label required" data-i18n="category">${t('category')}</label>
              <select id="income-category" class="form-select" required>
                <option value="">${t('selectCategory')}</option>
                ${incomeCategories.map(c => `
                  <option value="${c.id}">${c.icon || '💰'} ${t(c.nameKey, c.name || c.id)}</option>
                `).join('')}
              </select>
            </div>

            <!-- Receiving Account -->
            <div class="form-group">
              <label for="income-account" class="form-label required" data-i18n="account">${t('account')}</label>
              <select id="income-account" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <!-- Source / Description -->
            <div class="form-group full-width">
              <label for="income-desc" class="form-label required" data-i18n="description">${t('description')}</label>
              <input type="text" id="income-desc" class="form-input" placeholder="${t('incomeSubtitle')}" required>
            </div>

            <!-- Optional Notes -->
            <div class="form-group full-width">
              <label for="income-notes" class="form-label" data-i18n="notes">${t('notes')}</label>
              <textarea id="income-notes" class="form-textarea" rows="2" placeholder="${t('notes')}"></textarea>
            </div>
          </div>

          <div id="income-form-error" class="alert alert-danger hidden"></div>

          <div class="form-actions">
            <button type="submit" id="btn-submit-income" class="btn btn-primary btn-lg" data-i18n="btnAddIncome">
              + ${t('btnAddIncome')}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Explicit Confirmation Preview Modal -->
    <div id="income-confirm-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="confirmTitle">${t('confirmTitle')}</h3>
          <button type="button" class="btn-close" id="income-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-notice" data-i18n="confirmNotice">${t('confirmNotice')}</p>
          <div class="summary-preview-list">
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmType">${t('confirmType')}</span>
              <span class="badge badge-income" data-i18n="typeIncome">${t('typeIncome')}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmAmount">${t('confirmAmount')}</span>
              <span class="font-bold text-success" id="income-preview-amount"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmDate">${t('confirmDate')}</span>
              <span id="income-preview-date"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmCategory">${t('confirmCategory')}</span>
              <span id="income-preview-category"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmAccount">${t('confirmAccount')}</span>
              <span id="income-preview-account"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmDesc">${t('confirmDesc')}</span>
              <span id="income-preview-desc"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="income-preview-cancel" data-i18n="btnCancel">
            ${t('btnCancel')}
          </button>
          <button type="button" class="btn btn-success" id="income-preview-confirm" data-i18n="btnConfirmSave">
            ✔ ${t('btnConfirmSave')}
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Form Handlers
  const form = document.getElementById('income-form');
  const errorEl = document.getElementById('income-form-error');
  const confirmModal = document.getElementById('income-confirm-modal');
  let pendingSubmission = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const dateVal = document.getElementById('income-date').value;
    const amountVal = document.getElementById('income-amount').value;
    const categoryVal = document.getElementById('income-category').value;
    const accountVal = document.getElementById('income-account').value;
    const descVal = document.getElementById('income-desc').value;
    const notesVal = document.getElementById('income-notes').value;

    try {
      if (!dateVal) throw new Error(t('invalidDate'));
      const amountPaisa = decimalToPaisa(amountVal);
      if (!categoryVal) throw new Error(t('fieldRequired') + ` (${t('category')})`);
      if (!accountVal) throw new Error(t('fieldRequired') + ` (${t('account')})`);
      if (!descVal.trim()) throw new Error(t('fieldRequired') + ` (${t('description')})`);

      const catObj = incomeCategories.find(c => c.id === categoryVal);
      const accObj = accounts.find(a => a.id === accountVal);

      pendingSubmission = {
        type: 'income',
        amountPaisa,
        date: dateVal,
        categoryId: categoryVal,
        accountId: accountVal,
        description: descVal.trim(),
        notes: notesVal.trim()
      };

      // Populate preview modal
      document.getElementById('income-preview-amount').textContent = `+${formatMoney(amountPaisa)}`;
      document.getElementById('income-preview-date').textContent = formatDate(dateVal);
      document.getElementById('income-preview-category').textContent = `${catObj?.icon || ''} ${t(catObj?.nameKey, catObj?.name || categoryVal)}`;
      document.getElementById('income-preview-account').textContent = `💼 ${t(accObj?.nameKey, accObj?.name || accountVal)}`;
      document.getElementById('income-preview-desc').textContent = descVal.trim();

      // Show modal
      confirmModal.classList.remove('hidden');

    } catch (err) {
      errorEl.textContent = err.message || t('errorOccurred');
      errorEl.classList.remove('hidden');
    }
  });

  // Modal actions
  const closeModal = () => {
    confirmModal.classList.add('hidden');
    pendingSubmission = null;
  };

  document.getElementById('income-modal-close').onclick = closeModal;
  document.getElementById('income-preview-cancel').onclick = closeModal;

  document.getElementById('income-preview-confirm').onclick = async () => {
    if (!pendingSubmission) return;

    const confirmBtn = document.getElementById('income-preview-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = t('saving');

    try {
      await recordTransaction(pendingSubmission);
      closeModal();
      form.reset();
      document.getElementById('income-date').value = defaultDate;
      alert(t('saveSuccess'));
      // Navigate to ledger
      window.location.hash = '#transactions';
    } catch (err) {
      alert(err.message || t('errorOccurred'));
      confirmBtn.disabled = false;
      confirmBtn.textContent = t('btnConfirmSave');
    }
  };
}
