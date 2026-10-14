// Borrowing Management View (Phase 2)
// Track money borrowed from others, liabilities, repayments made, and MIS deletion gate

import { dbGetAll } from '../db.js';
import { 
  recordBorrowing, 
  recordBorrowingRepayment, 
  deleteBorrowingWithMIS, 
  decimalToPaisa 
} from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney, formatDate } from '../i18n.js';

export async function renderBorrowingView(container) {
  const accounts = await dbGetAll('accounts');
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="borrowingTitle">${t('borrowingTitle')}</h1>
        <p class="view-subtitle" data-i18n="borrowingSubtitle">${t('borrowingSubtitle')}</p>
      </div>
      <div>
        <button id="btn-open-borrow-modal" class="btn btn-primary">
          + ${t('btnAddBorrowing')}
        </button>
      </div>
    </div>

    <!-- Outstanding Liability KPI Card -->
    <div class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); margin-bottom: 20px;">
      <div class="kpi-card card-expense">
        <div class="kpi-icon">💳</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('outstandingLiability')} (মোট ঋণ বা দায়)</span>
          <span class="kpi-value text-danger" id="kpi-total-liabilities">৳ ০.০০</span>
        </div>
      </div>
    </div>

    <!-- Borrowing Table Card -->
    <div class="card">
      <div class="card-body" id="borrowing-list-container">
        <!-- Loaded dynamically -->
      </div>
    </div>

    <!-- Add Borrowing Modal -->
    <div id="borrow-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnAddBorrowing">${t('btnAddBorrowing')}</h3>
          <button type="button" class="btn-close" id="borrow-modal-close">&times;</button>
        </div>
        <form id="borrow-form">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-lender" class="form-label required" data-i18n="lenderName">${t('lenderName')}</label>
              <input type="text" id="borrow-lender" class="form-input" placeholder="ঋণদাতার নাম" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-amount" class="form-label required" data-i18n="amountBorrowed">${t('amountBorrowed')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="borrow-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-deposit-acc" class="form-label required" data-i18n="depositAccount">${t('depositAccount')}</label>
              <select id="borrow-deposit-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-date" class="form-label required" data-i18n="dateBorrowed">${t('dateBorrowed')}</label>
              <input type="date" id="borrow-date" class="form-input" value="${today}" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-expected-date" class="form-label" data-i18n="expectedRepaymentDate">${t('expectedRepaymentDate')}</label>
              <input type="date" id="borrow-expected-date" class="form-input">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="borrow-notes" class="form-label" data-i18n="notes">${t('notes')}</label>
              <textarea id="borrow-notes" class="form-textarea" rows="2"></textarea>
            </div>

            <div id="borrow-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="borrow-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary">${t('btnAddBorrowing')}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Repay Debt Modal -->
    <div id="debt-repay-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnMakeRepayment">${t('btnMakeRepayment')}</h3>
          <button type="button" class="btn-close" id="debt-repay-modal-close">&times;</button>
        </div>
        <form id="debt-repay-form">
          <input type="hidden" id="debt-repay-borrow-id">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label font-bold" id="debt-repay-lender-display"></label>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="debt-repay-amount" class="form-label required" data-i18n="repaymentAmount">${t('repaymentAmount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="debt-repay-amount" class="form-input" step="0.01" min="1" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="debt-repay-source-acc" class="form-label required" data-i18n="payFromAccount">${t('payFromAccount')}</label>
              <select id="debt-repay-source-acc" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="debt-repay-date" class="form-label required" data-i18n="date">${t('date')}</label>
              <input type="date" id="debt-repay-date" class="form-input" value="${today}" required>
            </div>

            <div id="debt-repay-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="debt-repay-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-danger">${t('btnMakeRepayment')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach modal open/close listeners
  const borrowModal = document.getElementById('borrow-modal');
  document.getElementById('btn-open-borrow-modal').onclick = () => {
    borrowModal.classList.remove('hidden');
    document.getElementById('borrow-form-error').classList.add('hidden');
  };
  document.getElementById('borrow-modal-close').onclick = () => borrowModal.classList.add('hidden');
  document.getElementById('borrow-modal-cancel').onclick = () => borrowModal.classList.add('hidden');

  // Submit borrowing form
  document.getElementById('borrow-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lender = document.getElementById('borrow-lender').value;
    const amtVal = document.getElementById('borrow-amount').value;
    const depositAccId = document.getElementById('borrow-deposit-acc').value;
    const dateVal = document.getElementById('borrow-date').value;
    const expDateVal = document.getElementById('borrow-expected-date').value;
    const notes = document.getElementById('borrow-notes').value;
    const errEl = document.getElementById('borrow-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      await recordBorrowing({
        lenderName: lender,
        amountPaisa,
        depositAccountId: depositAccId,
        date: dateVal,
        expectedDate: expDateVal,
        notes
      });
      borrowModal.classList.add('hidden');
      document.getElementById('borrow-form').reset();
      await loadBorrowingList();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  // Repayment form handlers
  const repayModal = document.getElementById('debt-repay-modal');
  document.getElementById('debt-repay-modal-close').onclick = () => repayModal.classList.add('hidden');
  document.getElementById('debt-repay-modal-cancel').onclick = () => repayModal.classList.add('hidden');

  document.getElementById('debt-repay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const borrowId = document.getElementById('debt-repay-borrow-id').value;
    const amtVal = document.getElementById('debt-repay-amount').value;
    const sourceAccId = document.getElementById('debt-repay-source-acc').value;
    const dateVal = document.getElementById('debt-repay-date').value;
    const errEl = document.getElementById('debt-repay-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      await recordBorrowingRepayment({
        borrowingId: borrowId,
        sourceAccountId: sourceAccId,
        amountPaisa,
        date: dateVal
      });
      repayModal.classList.add('hidden');
      document.getElementById('debt-repay-form').reset();
      alert('ঋণ পরিশোধ সফলভাবে রেকর্ড করা হয়েছে!');
      await loadBorrowingList();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await loadBorrowingList();
}

async function loadBorrowingList() {
  const container = document.getElementById('borrowing-list-container');
  if (!container) return;

  const borrowings = await dbGetAll('borrowing');
  const today = new Date().toISOString().split('T')[0];

  let totalLiabilities = 0;
  borrowings.forEach(b => { totalLiabilities += (b.outstandingLiabilityPaisa || 0); });
  const kpiEl = document.getElementById('kpi-total-liabilities');
  if (kpiEl) kpiEl.textContent = formatMoney(totalLiabilities);

  if (borrowings.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">💳</div>
        <h3 class="empty-title">${t('noBorrowingYet')}</h3>
        <p class="empty-desc">${t('borrowingSubtitle')}</p>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>${t('lenderName')}</th>
            <th>${t('amountBorrowed')}</th>
            <th>${t('amountRepaid')}</th>
            <th>${t('outstandingLiability')}</th>
            <th>${t('dateBorrowed')}</th>
            <th>${t('expectedRepaymentDate')}</th>
            <th class="text-center">${t('colActions')}</th>
          </tr>
        </thead>
        <tbody>
  `;

  borrowings.forEach(b => {
    const isOverdue = b.expectedDate && b.expectedDate < today && b.outstandingLiabilityPaisa > 0;
    const isPaid = b.outstandingLiabilityPaisa === 0;

    html += `
      <tr>
        <td class="font-bold">${b.lenderName}</td>
        <td>${formatMoney(b.originalAmountPaisa)}</td>
        <td class="text-success">${formatMoney(b.amountRepaidPaisa || 0)}</td>
        <td class="font-bold ${isPaid ? 'text-muted' : 'text-danger'}">
          ${formatMoney(b.outstandingLiabilityPaisa)}
        </td>
        <td>${formatDate(b.date)}</td>
        <td>
          ${b.expectedDate ? formatDate(b.expectedDate) : '-'}
          ${isOverdue ? '<span class="badge badge-expense" style="margin-left:4px;">অতিক্রান্ত</span>' : ''}
          ${isPaid ? '<span class="badge badge-income" style="margin-left:4px;">পরিশোধিত</span>' : ''}
        </td>
        <td class="text-center action-buttons">
          ${!isPaid ? `
            <button class="btn btn-danger-outline btn-xs btn-open-debt-repay" data-id="${b.id}" data-name="${b.lenderName}" data-due="${b.outstandingLiabilityPaisa}">
              💸 ${t('btnMakeRepayment')}
            </button>
          ` : ''}
          <button class="btn btn-danger-outline btn-xs btn-delete-borrowing" data-id="${b.id}">
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
  container.querySelectorAll('.btn-open-debt-repay').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('debt-repay-borrow-id').value = btn.dataset.id;
      document.getElementById('debt-repay-lender-display').textContent = `ঋণদাতা: ${btn.dataset.name} (বকেয়া দায়: ${formatMoney(parseInt(btn.dataset.due, 10))})`;
      document.getElementById('debt-repay-form-error').classList.add('hidden');
      document.getElementById('debt-repay-modal').classList.remove('hidden');
    };
  });

  // Guarded delete handlers
  container.querySelectorAll('.btn-delete-borrowing').forEach(btn => {
    btn.onclick = async () => {
      const borrowId = btn.dataset.id;
      const verified = await requestMISAuthorization('আপনি কি এই ঋণের রেকর্ডটি স্থায়ীভাবে মুছে ফেলতে চান?');
      if (verified) {
        await deleteBorrowingWithMIS(borrowId, true);
        await loadBorrowingList();
      }
    };
  });
}
