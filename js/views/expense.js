// Expense Management View
// Complies strictly with Section 8 & Safety Rules (Explicit confirmation preview before save)

import { dbGetAll } from '../db.js';
import { recordTransaction, decimalToPaisa } from '../ledger.js';
import { t, formatMoney, formatDate } from '../i18n.js';

export async function renderExpenseView(container) {
  const accounts = await dbGetAll('accounts');
  const allCategories = await dbGetAll('categories');
  const expenseCategories = allCategories.filter(c => c.type === 'expense');

  // Default to today's date in local YYYY-MM-DD
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const defaultDate = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="expenseTitle">${t('expenseTitle')}</h1>
        <p class="view-subtitle" data-i18n="expenseSubtitle">${t('expenseSubtitle')}</p>
      </div>
    </div>

    <div class="form-card-container">
      <div class="card form-card">
        <form id="expense-form" class="transaction-form" novalidate>
          <div class="form-grid">
            <!-- Date -->
            <div class="form-group">
              <label for="expense-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="expense-date" class="form-input" value="${defaultDate}" required>
            </div>

            <!-- Amount -->
            <div class="form-group">
              <label for="expense-amount" class="form-label required" data-i18n="amount">${t('amount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="expense-amount" class="form-input" placeholder="0.00" step="0.01" min="0.01" required>
              </div>
            </div>

            <!-- Expense Category -->
            <div class="form-group">
              <label for="expense-category" class="form-label required" data-i18n="category">${t('category')}</label>
              <select id="expense-category" class="form-select" required>
                <option value="">${t('selectCategory')}</option>
                ${expenseCategories.map(c => `
                  <option value="${c.id}">${c.icon || '🛍️'} ${t(c.nameKey, c.name || c.id)}</option>
                `).join('')}
              </select>
            </div>

            <!-- Source Account -->
            <div class="form-group">
              <label for="expense-account" class="form-label required" data-i18n="account">${t('account')}</label>
              <select id="expense-account" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <!-- Description / Merchant -->
            <div class="form-group full-width">
              <label for="expense-merchant" class="form-label required" data-i18n="merchant">${t('merchant')}</label>
              <input type="text" id="expense-merchant" class="form-input" placeholder="${t('merchant')}" required>
            </div>

            <!-- Optional Tags -->
            <div class="form-group">
              <label for="expense-tags" class="form-label" data-i18n="tags">${t('tags')}</label>
              <input type="text" id="expense-tags" class="form-input" placeholder="বাজার, মাছ, মুদি">
            </div>

            <!-- Payment Method Notes -->
            <div class="form-group">
              <label for="expense-payment-method" class="form-label" data-i18n="paymentMethod">${t('paymentMethod')}</label>
              <input type="text" id="expense-payment-method" class="form-input" placeholder="ক্যাশ / কার্ড / বিকাশ">
            </div>

            <!-- Optional Notes -->
            <div class="form-group full-width">
              <label for="expense-notes" class="form-label" data-i18n="notes">${t('notes')}</label>
              <textarea id="expense-notes" class="form-textarea" rows="2" placeholder="${t('notes')}"></textarea>
            </div>
          </div>

          <div id="expense-form-error" class="alert alert-danger hidden"></div>

          <div class="form-actions">
            <button type="submit" id="btn-submit-expense" class="btn btn-danger btn-lg" data-i18n="btnAddExpense">
              - ${t('btnAddExpense')}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Explicit Confirmation Preview Modal -->
    <div id="expense-confirm-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="confirmTitle">${t('confirmTitle')}</h3>
          <button type="button" class="btn-close" id="expense-modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <p class="modal-notice" data-i18n="confirmNotice">${t('confirmNotice')}</p>
          <div class="summary-preview-list">
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmType">${t('confirmType')}</span>
              <span class="badge badge-expense" data-i18n="typeExpense">${t('typeExpense')}</span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmAmount">${t('confirmAmount')}</span>
              <span class="font-bold text-danger" id="expense-preview-amount"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmDate">${t('confirmDate')}</span>
              <span id="expense-preview-date"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmCategory">${t('confirmCategory')}</span>
              <span id="expense-preview-category"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmAccount">${t('confirmAccount')}</span>
              <span id="expense-preview-account"></span>
            </div>
            <div class="preview-row">
              <span class="preview-label" data-i18n="confirmDesc">${t('confirmDesc')}</span>
              <span id="expense-preview-desc"></span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="expense-preview-cancel" data-i18n="btnCancel">
            ${t('btnCancel')}
          </button>
          <button type="button" class="btn btn-danger" id="expense-preview-confirm" data-i18n="btnConfirmSave">
            ✔ ${t('btnConfirmSave')}
          </button>
        </div>
      </div>
    </div>
  `;

  // Attach Form Handlers
  const form = document.getElementById('expense-form');
  const errorEl = document.getElementById('expense-form-error');
  const confirmModal = document.getElementById('expense-confirm-modal');
  let pendingSubmission = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.classList.add('hidden');
    errorEl.textContent = '';

    const dateVal = document.getElementById('expense-date').value;
    const amountVal = document.getElementById('expense-amount').value;
    const categoryVal = document.getElementById('expense-category').value;
    const accountVal = document.getElementById('expense-account').value;
    const merchantVal = document.getElementById('expense-merchant').value;
    const tagsVal = document.getElementById('expense-tags').value;
    const notesVal = document.getElementById('expense-notes').value;

    try {
      if (!dateVal) throw new Error(t('invalidDate'));
      const amountPaisa = decimalToPaisa(amountVal);
      if (!categoryVal) throw new Error(t('fieldRequired') + ` (${t('category')})`);
      if (!accountVal) throw new Error(t('fieldRequired') + ` (${t('account')})`);
      if (!merchantVal.trim()) throw new Error(t('fieldRequired') + ` (${t('merchant')})`);

      const catObj = expenseCategories.find(c => c.id === categoryVal);
      const accObj = accounts.find(a => a.id === accountVal);

      const parsedTags = tagsVal.split(',').map(s => s.trim()).filter(Boolean);

      pendingSubmission = {
        type: 'expense',
        amountPaisa,
        date: dateVal,
        categoryId: categoryVal,
        accountId: accountVal,
        description: merchantVal.trim(),
        notes: notesVal.trim(),
        tags: parsedTags
      };

      // Populate preview modal
      document.getElementById('expense-preview-amount').textContent = `-${formatMoney(amountPaisa)}`;
      document.getElementById('expense-preview-date').textContent = formatDate(dateVal);
      document.getElementById('expense-preview-category').textContent = `${catObj?.icon || ''} ${t(catObj?.nameKey, catObj?.name || categoryVal)}`;
      document.getElementById('expense-preview-account').textContent = `💼 ${t(accObj?.nameKey, accObj?.name || accountVal)}`;
      document.getElementById('expense-preview-desc').textContent = merchantVal.trim();

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

  document.getElementById('expense-modal-close').onclick = closeModal;
  document.getElementById('expense-preview-cancel').onclick = closeModal;

  document.getElementById('expense-preview-confirm').onclick = async () => {
    if (!pendingSubmission) return;

    const confirmBtn = document.getElementById('expense-preview-confirm');
    confirmBtn.disabled = true;
    confirmBtn.textContent = t('saving');

    try {
      await recordTransaction(pendingSubmission);
      closeModal();
      form.reset();
      document.getElementById('expense-date').value = defaultDate;
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
