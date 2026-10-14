// Budgets Management View (Phase 2)
// Category monthly budgets, spending limits, warning indicators (Normal, 80% Warning, Exceeded)

import { dbGetAll } from '../db.js';
import { getBudgetsForMonth, saveBudget, deleteBudgetWithMIS, decimalToPaisa } from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney } from '../i18n.js';

let currentBudgetMonth = '';

export async function renderBudgetsView(container) {
  if (!currentBudgetMonth) {
    const today = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    currentBudgetMonth = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  }

  const allCategories = await dbGetAll('categories');
  const expenseCategories = allCategories.filter(c => c.type === 'expense');

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="budgetTitle">${t('budgetTitle')}</h1>
        <p class="view-subtitle" data-i18n="budgetSubtitle">${t('budgetSubtitle')}</p>
      </div>
      <div class="filters-bar">
        <div class="filter-group">
          <label for="budget-month-select" class="form-label">${t('budgetMonth')}</label>
          <input type="month" id="budget-month-select" class="form-input" value="${currentBudgetMonth}">
        </div>
        <button id="btn-open-budget-modal" class="btn btn-primary" style="align-self: flex-end;">
          + ${t('btnAddBudget')}
        </button>
      </div>
    </div>

    <!-- Budgets List Container -->
    <div id="budgets-list-container" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
      <!-- Dynamically loaded -->
    </div>

    <!-- Add/Edit Budget Modal -->
    <div id="budget-form-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnAddBudget">${t('btnAddBudget')}</h3>
          <button type="button" class="btn-close" id="budget-modal-close">&times;</button>
        </div>
        <form id="budget-form">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label for="budget-category" class="form-label required" data-i18n="category">${t('category')}</label>
              <select id="budget-category" class="form-select" required>
                <option value="">${t('selectCategory')}</option>
                ${expenseCategories.map(c => `
                  <option value="${c.id}">${c.icon || ''} ${t(c.nameKey, c.name || c.id)}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="budget-amount" class="form-label required" data-i18n="budgetAmount">${t('budgetAmount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="budget-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div id="budget-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="budget-modal-cancel" data-i18n="btnCancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary" data-i18n="btnAddBudget">${t('btnAddBudget')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Attach Month Selector Listener
  document.getElementById('budget-month-select').addEventListener('change', (e) => {
    currentBudgetMonth = e.target.value;
    loadBudgetsList();
  });

  // Modal open/close handlers
  const modal = document.getElementById('budget-form-modal');
  document.getElementById('btn-open-budget-modal').onclick = () => {
    modal.classList.remove('hidden');
    document.getElementById('budget-form-error').classList.add('hidden');
  };
  document.getElementById('budget-modal-close').onclick = () => modal.classList.add('hidden');
  document.getElementById('budget-modal-cancel').onclick = () => modal.classList.add('hidden');

  // Submit budget handler
  document.getElementById('budget-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const catId = document.getElementById('budget-category').value;
    const amountVal = document.getElementById('budget-amount').value;
    const errEl = document.getElementById('budget-form-error');

    try {
      const amountPaisa = decimalToPaisa(amountVal);
      await saveBudget({
        month: currentBudgetMonth,
        categoryId: catId,
        amountPaisa
      });
      modal.classList.add('hidden');
      document.getElementById('budget-form').reset();
      await loadBudgetsList();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await loadBudgetsList();
}

async function loadBudgetsList() {
  const container = document.getElementById('budgets-list-container');
  if (!container) return;

  const budgets = await getBudgetsForMonth(currentBudgetMonth);
  const categories = await dbGetAll('categories');
  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  if (budgets.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🎯</div>
        <h3 class="empty-title">${t('noBudgetsYet')}</h3>
        <p class="empty-desc">${t('budgetSubtitle')}</p>
      </div>
    `;
    return;
  }

  let html = '';
  budgets.forEach(b => {
    const cat = catMap[b.categoryId];
    const catName = cat ? t(cat.nameKey, cat.name || b.categoryId) : b.categoryId;

    let badgeClass = 'badge-income';
    let statusText = t('budgetNormal');
    let barColor = 'var(--success)';

    if (b.status === 'exceeded') {
      badgeClass = 'badge-expense';
      statusText = t('budgetExceeded');
      barColor = 'var(--danger)';
    } else if (b.status === 'warning') {
      badgeClass = 'badge-inactive';
      statusText = t('budgetWarning');
      barColor = 'var(--warning)';
    }

    const clampedPercent = Math.min(b.percentage, 100);

    html += `
      <div class="card budget-card">
        <div class="card-header flex-between">
          <div class="font-bold">${cat?.icon || '📁'} ${catName}</div>
          <span class="badge ${badgeClass}">${statusText}</span>
        </div>
        <div class="card-body">
          <div class="flex-between" style="margin-bottom: 8px;">
            <span class="text-muted">${t('budgetSpent')}: <strong>${formatMoney(b.spentPaisa)}</strong></span>
            <span class="text-muted">${t('budgetAmount')}: <strong>${formatMoney(b.amountPaisa)}</strong></span>
          </div>

          <div class="progress-bar-bg" style="height: 10px; margin-bottom: 12px;">
            <div class="progress-bar-fill" style="width: ${clampedPercent}%; background-color: ${barColor};"></div>
          </div>

          <div class="flex-between" style="font-size: 0.88rem;">
            <span>${t('budgetRemaining')}: <strong class="${b.remainingPaisa < 0 ? 'text-danger' : 'text-success'}">${formatMoney(b.remainingPaisa)}</strong></span>
            <span class="font-bold">${b.percentage}%</span>
          </div>

          <div style="margin-top: 14px; display: flex; justify-content: flex-end;">
            <button class="btn btn-danger-outline btn-xs btn-delete-budget" data-id="${b.id}">
              🗑️ ${t('btnDelete')}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Guarded Deletion Handlers
  container.querySelectorAll('.btn-delete-budget').forEach(btn => {
    btn.onclick = async () => {
      const budgetId = btn.dataset.id;
      const verified = await requestMISAuthorization('আপনি কি এই বাজেটটি মুছে ফেলতে চান?');
      if (verified) {
        await deleteBudgetWithMIS(budgetId, true);
        await loadBudgetsList();
      }
    };
  });
}
