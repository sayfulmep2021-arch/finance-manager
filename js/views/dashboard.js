// Dashboard View for Personal Finance Manager
import { getDashboardMetrics } from '../ledger.js';
import { dbGetAll } from '../db.js';
import { t, formatMoney, formatDate, getLanguage } from '../i18n.js';

let selectedPeriod = 'this_month';
let selectedAccount = 'all';

export async function renderDashboard(container) {
  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="navDashboard">${t('navDashboard')}</h1>
        <p class="view-subtitle">${t('appSubtitle')}</p>
      </div>
      <div class="filters-bar">
        <div class="filter-group">
          <label for="dash-filter-period" data-i18n="filterPeriod">${t('filterPeriod')}</label>
          <select id="dash-filter-period" class="form-select">
            <option value="this_month" ${selectedPeriod === 'this_month' ? 'selected' : ''}>${t('thisMonth')}</option>
            <option value="last_month" ${selectedPeriod === 'last_month' ? 'selected' : ''}>${t('lastMonth')}</option>
            <option value="this_year" ${selectedPeriod === 'this_year' ? 'selected' : ''}>${t('thisYear')}</option>
            <option value="all_time" ${selectedPeriod === 'all_time' ? 'selected' : ''}>${t('allTime')}</option>
          </select>
        </div>
        <div class="filter-group">
          <label for="dash-filter-account" data-i18n="filterAccount">${t('filterAccount')}</label>
          <select id="dash-filter-account" class="form-select">
            <option value="all">${t('allAccounts')}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- KPI Summary Cards Grid -->
    <div class="kpi-grid">
      <div class="kpi-card card-income">
        <div class="kpi-icon">📈</div>
        <div class="kpi-content">
          <span class="kpi-label" data-i18n="cardTotalIncome">${t('cardTotalIncome')}</span>
          <span class="kpi-value text-success" id="kpi-income">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-expense">
        <div class="kpi-icon">📉</div>
        <div class="kpi-content">
          <span class="kpi-label" data-i18n="cardTotalExpense">${t('cardTotalExpense')}</span>
          <span class="kpi-value text-danger" id="kpi-expense">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-flow">
        <div class="kpi-icon">🔄</div>
        <div class="kpi-content">
          <span class="kpi-label" data-i18n="cardNetCashFlow">${t('cardNetCashFlow')}</span>
          <span class="kpi-value" id="kpi-net">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-balance">
        <div class="kpi-icon">💼</div>
        <div class="kpi-content">
          <span class="kpi-label" data-i18n="cardTotalBalance">${t('cardTotalBalance')}</span>
          <span class="kpi-value text-primary" id="kpi-balance">৳ ০.০০</span>
        </div>
      </div>
    </div>

    <!-- Main Dashboard Grid -->
    <div class="dashboard-grid">
      <!-- Recent Transactions Section -->
      <div class="card recent-tx-card">
        <div class="card-header flex-between">
          <h2 class="card-title" data-i18n="recentTransactions">${t('recentTransactions')}</h2>
          <button id="btn-view-all-tx" class="btn btn-secondary btn-sm" data-i18n="viewAllTransactions">${t('viewAllTransactions')}</button>
        </div>
        <div class="card-body" id="recent-tx-container">
          <!-- Populated dynamically -->
        </div>
      </div>

      <!-- Category Breakdown Section -->
      <div class="card category-breakdown-card">
        <div class="card-header">
          <h2 class="card-title" data-i18n="expenseBreakdown">${t('expenseBreakdown')}</h2>
        </div>
        <div class="card-body" id="category-breakdown-container">
          <!-- Populated dynamically -->
        </div>
      </div>
    </div>
  `;

  // Populate Accounts Dropdown
  const accounts = await dbGetAll('accounts');
  const accountSelect = document.getElementById('dash-filter-account');
  accounts.forEach(acc => {
    const opt = document.createElement('option');
    opt.value = acc.id;
    opt.textContent = t(acc.nameKey, acc.name || acc.id);
    if (acc.id === selectedAccount) opt.selected = true;
    accountSelect.appendChild(opt);
  });

  // Event Listeners for Filters
  document.getElementById('dash-filter-period').addEventListener('change', (e) => {
    selectedPeriod = e.target.value;
    updateDashboardData();
  });

  accountSelect.addEventListener('change', (e) => {
    selectedAccount = e.target.value;
    updateDashboardData();
  });

  document.getElementById('btn-view-all-tx').addEventListener('click', () => {
    window.location.hash = '#transactions';
  });

  // Load initial data
  await updateDashboardData();
}

async function updateDashboardData() {
  const metrics = await getDashboardMetrics(selectedPeriod, selectedAccount);
  const categories = await dbGetAll('categories');
  const accounts = await dbGetAll('accounts');

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });

  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });

  // Update KPI Cards
  const incomeEl = document.getElementById('kpi-income');
  const expenseEl = document.getElementById('kpi-expense');
  const netEl = document.getElementById('kpi-net');
  const balanceEl = document.getElementById('kpi-balance');

  if (incomeEl) incomeEl.textContent = formatMoney(metrics.totalIncomePaisa);
  if (expenseEl) expenseEl.textContent = formatMoney(metrics.totalExpensePaisa);
  if (netEl) {
    netEl.textContent = formatMoney(metrics.netCashFlowPaisa);
    netEl.className = 'kpi-value ' + (metrics.netCashFlowPaisa >= 0 ? 'text-success' : 'text-danger');
  }
  if (balanceEl) balanceEl.textContent = formatMoney(metrics.totalBalancePaisa);

  // Render Recent Transactions
  const txContainer = document.getElementById('recent-tx-container');
  if (txContainer) {
    if (metrics.recentTransactions.length === 0) {
      txContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3 class="empty-title">${t('noTransactionsYet')}</h3>
          <p class="empty-desc">${t('noTransactionsDesc')}</p>
          <div class="empty-actions">
            <button class="btn btn-success btn-sm" onclick="window.location.hash='#income'">+ ${t('navIncome')}</button>
            <button class="btn btn-danger btn-sm" onclick="window.location.hash='#expenses'">+ ${t('navExpenses')}</button>
          </div>
        </div>
      `;
    } else {
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
              </tr>
            </thead>
            <tbody>
      `;

      metrics.recentTransactions.forEach(tx => {
        const cat = catMap[tx.categoryId];
        const acc = accMap[tx.accountId];
        const catName = cat ? t(cat.nameKey, cat.name) : tx.categoryId;
        const accName = acc ? t(acc.nameKey, acc.name) : tx.accountId;
        const isIncome = tx.type === 'income';

        html += `
          <tr>
            <td>${formatDate(tx.date)}</td>
            <td><span class="badge ${isIncome ? 'badge-income' : 'badge-expense'}">${isIncome ? t('typeIncome') : t('typeExpense')}</span></td>
            <td>${cat?.icon || ''} ${catName}</td>
            <td class="cell-desc">${tx.description || '-'}</td>
            <td>${accName}</td>
            <td class="text-right font-bold ${isIncome ? 'text-success' : 'text-danger'}">
              ${isIncome ? '+' : '-'}${formatMoney(tx.amountPaisa)}
            </td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
      txContainer.innerHTML = html;
    }
  }

  // Render Category Breakdown
  const catContainer = document.getElementById('category-breakdown-container');
  if (catContainer) {
    const entries = Object.entries(metrics.categoryExpenses);
    if (entries.length === 0) {
      catContainer.innerHTML = `
        <div class="empty-state-sm">
          <p class="text-muted">${t('noExpenseCategories')}</p>
        </div>
      `;
    } else {
      // Sort highest expense first
      entries.sort((a, b) => b[1] - a[1]);
      const totalExp = metrics.totalExpensePaisa;

      let html = '<div class="breakdown-list">';
      entries.forEach(([catId, amountPaisa]) => {
        const cat = catMap[catId];
        const catName = cat ? t(cat.nameKey, cat.name) : catId;
        const percentage = totalExp > 0 ? ((amountPaisa / totalExp) * 100).toFixed(1) : 0;

        html += `
          <div class="breakdown-item">
            <div class="breakdown-header flex-between">
              <span class="breakdown-name">${cat?.icon || '📁'} ${catName}</span>
              <span class="breakdown-amounts font-bold">
                ${formatMoney(amountPaisa)} <span class="text-muted">(${percentage}%)</span>
              </span>
            </div>
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
          </div>
        `;
      });
      html += '</div>';
      catContainer.innerHTML = html;
    }
  }
}
