// Dashboard View for Personal Finance Manager
// Bilingual, 100% Offline, Desktop & Mobile App Experience
import { getDashboardMetrics } from '../ledger.js';
import { dbGetAll } from '../db.js';
import { t, formatMoney, formatDate, getLanguage } from '../i18n.js';

let selectedPeriod = 'this_month';
let selectedAccount = 'all';
let activeMobileTab = 'expense'; // 'expense' or 'income'

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return t('greetingMorning');
  if (hour >= 12 && hour < 17) return t('greetingAfternoon');
  if (hour >= 17 && hour < 21) return t('greetingEvening');
  return t('greetingGeneral');
}

export async function renderDashboard(container) {
  const greeting = getGreeting();

  container.innerHTML = `
    <!-- Mobile App Header (Visible on screens <= 768px) -->
    <div class="mobile-app-header">
      <div class="mobile-greeting-block">
        <span class="mobile-greeting-sub">${greeting},</span>
        <h2 class="mobile-greeting-name" data-i18n="userGreetingName">${t('userGreetingName')} 👋</h2>
      </div>
      <div class="mobile-header-tools">
        <span id="mobile-period-pill" class="mobile-period-pill">
          ${selectedPeriod === 'this_month' ? t('thisMonth') : (selectedPeriod === 'last_month' ? t('lastMonth') : (selectedPeriod === 'this_year' ? t('thisYear') : t('allTime')))}
        </span>
      </div>
    </div>

    <!-- Desktop View Header (Visible on screens > 768px) -->
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

    <!-- MOBILE MAIN WALLET SUMMARY CARD (Fintech Design with Circular SVG Ring) -->
    <div class="mobile-wallet-card" id="mobile-wallet-card">
      <div class="wallet-header">
        <span class="wallet-sublabel" data-i18n="walletTotalBalance">${t('walletTotalBalance')}</span>
        <span class="wallet-period-badge" id="wallet-period-badge">${t('thisMonth')}</span>
      </div>
      <div class="wallet-amount-row">
        <div class="wallet-balance-val" id="mobile-wallet-balance">৳ ০.০০</div>
        <!-- Circular Progress Ring (Zero-Cost Native SVG) -->
        <div class="wallet-circular-ring" id="wallet-progress-container" title="ব্যয় বনাম আয় অনুপাত">
          <svg viewBox="0 0 60 60">
            <circle class="ring-bg" cx="30" cy="30" r="24"></circle>
            <circle class="ring-fg" id="wallet-ring-fg" cx="30" cy="30" r="24"
              stroke-dasharray="150.8" stroke-dashoffset="150.8"></circle>
          </svg>
          <span class="ring-label" id="wallet-ring-label">০%</span>
        </div>
      </div>

      <!-- Dual KPI Pills: Total Income & Total Expense -->
      <div class="wallet-kpi-pills">
        <div class="wallet-pill">
          <div class="pill-icon pill-icon-income">↑</div>
          <div>
            <span class="pill-label" data-i18n="cardTotalIncome">${t('cardTotalIncome')}</span>
            <span class="pill-value" id="mobile-wallet-income">৳ ০.০০</span>
          </div>
        </div>
        <div class="wallet-pill">
          <div class="pill-icon pill-icon-expense">↓</div>
          <div>
            <span class="pill-label" data-i18n="cardTotalExpense">${t('cardTotalExpense')}</span>
            <span class="pill-value" id="mobile-wallet-expense">৳ ০.০০</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MOBILE ACCOUNT CARDS (Horizontal Scroll Strip) -->
    <div class="mobile-accounts-section" id="mobile-accounts-section">
      <div class="section-title-row">
        <h3 class="section-title" data-i18n="accountsTitle">${t('accountsTitle')}</h3>
        <a href="#accounts" style="font-size: 0.8rem; color: var(--primary); font-weight: 600; text-decoration: none;">
          ${t('viewAllTransactions')} &rarr;
        </a>
      </div>
      <div class="mobile-accounts-strip" id="mobile-accounts-strip">
        <!-- Rendered dynamically -->
      </div>
    </div>

    <!-- DESKTOP KPI GRID (Retained 100% for screens > 768px) -->
    <div class="kpi-grid desktop-kpi-grid">
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

        <!-- Mobile Segmented Tabs for Expenses vs Income -->
        <div class="mobile-tabs-container">
          <div class="segmented-tabs">
            <button type="button" class="tab-btn ${activeMobileTab === 'expense' ? 'active' : ''}" id="tab-btn-expense" data-i18n="tabExpense">
              🛒 ${t('tabExpense')}
            </button>
            <button type="button" class="tab-btn ${activeMobileTab === 'income' ? 'active' : ''}" id="tab-btn-income" data-i18n="tabIncome">
              💰 ${t('tabIncome')}
            </button>
          </div>
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

  // Mobile Tabs Listeners
  const tabExpense = document.getElementById('tab-btn-expense');
  const tabIncome = document.getElementById('tab-btn-income');
  if (tabExpense && tabIncome) {
    tabExpense.addEventListener('click', () => {
      activeMobileTab = 'expense';
      tabExpense.classList.add('active');
      tabIncome.classList.remove('active');
      renderRecentTransactionsView();
    });

    tabIncome.addEventListener('click', () => {
      activeMobileTab = 'income';
      tabIncome.classList.add('active');
      tabExpense.classList.remove('active');
      renderRecentTransactionsView();
    });
  }

  // Load initial data
  await updateDashboardData();
}

let cachedMetrics = null;
let cachedCatMap = {};
let cachedAccMap = {};

async function updateDashboardData() {
  const metrics = await getDashboardMetrics(selectedPeriod, selectedAccount);
  const categories = await dbGetAll('categories');
  const accounts = await dbGetAll('accounts');

  cachedMetrics = metrics;

  const catMap = {};
  categories.forEach(c => { catMap[c.id] = c; });
  cachedCatMap = catMap;

  const accMap = {};
  accounts.forEach(a => { accMap[a.id] = a; });
  cachedAccMap = accMap;

  // Update Desktop KPI Cards
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

  // Update Mobile Wallet Summary Card
  const mobBalance = document.getElementById('mobile-wallet-balance');
  const mobIncome = document.getElementById('mobile-wallet-income');
  const mobExpense = document.getElementById('mobile-wallet-expense');
  const mobRingFg = document.getElementById('wallet-ring-fg');
  const mobRingLabel = document.getElementById('wallet-ring-label');
  const mobPeriodBadge = document.getElementById('wallet-period-badge');

  if (mobBalance) mobBalance.textContent = formatMoney(metrics.totalBalancePaisa);
  if (mobIncome) mobIncome.textContent = formatMoney(metrics.totalIncomePaisa);
  if (mobExpense) mobExpense.textContent = formatMoney(metrics.totalExpensePaisa);

  if (mobPeriodBadge) {
    mobPeriodBadge.textContent = selectedPeriod === 'this_month' ? t('thisMonth') : (selectedPeriod === 'last_month' ? t('lastMonth') : (selectedPeriod === 'this_year' ? t('thisYear') : t('allTime')));
  }

  // Calculate Real Financial Circular Progress Ring (Zero-Cost SVG)
  // Ratio of Expense to Income, or 100% if expenses exceed income
  if (mobRingFg && mobRingLabel) {
    const circumference = 150.8; // 2 * PI * 24
    let percentage = 0;
    if (metrics.totalIncomePaisa > 0) {
      percentage = Math.min(100, Math.round((metrics.totalExpensePaisa / metrics.totalIncomePaisa) * 100));
    } else if (metrics.totalExpensePaisa > 0) {
      percentage = 100;
    }
    const offset = circumference - (percentage / 100) * circumference;
    mobRingFg.style.strokeDashoffset = offset;
    mobRingLabel.textContent = `${percentage}%`;
  }

  // Render Mobile Account Cards Strip
  const stripContainer = document.getElementById('mobile-accounts-strip');
  if (stripContainer) {
    let accHtml = '';
    accounts.forEach(acc => {
      let icon = '💵';
      const type = (acc.type || '').toLowerCase();
      if (type.includes('bank')) icon = '🏦';
      else if (type.includes('mobile') || (acc.id || '').includes('bkash')) icon = '📱';
      else if (type.includes('credit')) icon = '💳';

      accHtml += `
        <div class="account-chip" onclick="window.location.hash='#accounts'">
          <div class="chip-top">
            <span class="chip-icon">${icon}</span>
            <span class="chip-name">${t(acc.nameKey, acc.name || acc.id)}</span>
          </div>
          <div class="chip-balance text-primary">${formatMoney(acc.balancePaisa || 0)}</div>
        </div>
      `;
    });
    stripContainer.innerHTML = accHtml;
  }

  // Render Transactions (both table for desktop & cards for mobile)
  renderRecentTransactionsView();

  // Render Category Breakdown (Desktop & Mobile)
  renderCategoryBreakdownView(metrics, catMap);
}

function renderRecentTransactionsView() {
  const txContainer = document.getElementById('recent-tx-container');
  if (!txContainer || !cachedMetrics) return;

  const allTx = cachedMetrics.recentTransactions || [];
  
  // Filter for mobile tab if active
  const filteredTx = allTx.filter(tx => {
    if (activeMobileTab === 'expense') return tx.type === 'expense';
    if (activeMobileTab === 'income') return tx.type === 'income';
    return true;
  });

  if (allTx.length === 0) {
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
    return;
  }

  let html = '';

  // 1. Mobile-friendly Card View (Optimized for small screens)
  html += '<div class="mobile-tx-list mobile-only-block">';
  if (filteredTx.length === 0) {
    html += `<p class="text-muted" style="text-align: center; padding: 16px 0; font-size: 0.85rem;">${activeMobileTab === 'expense' ? 'নির্বাচিত সময়ে কোনো ব্যয়ের রেকর্ড নেই' : 'নির্বাচিত সময়ে কোনো আয়ের রেকর্ড নেই'}</p>`;
  } else {
    filteredTx.slice(0, 8).forEach(tx => {
      const cat = cachedCatMap[tx.categoryId];
      const acc = cachedAccMap[tx.accountId];
      const catName = cat ? t(cat.nameKey, cat.name) : tx.categoryId;
      const accName = acc ? t(acc.nameKey, acc.name) : tx.accountId;
      const isIncome = tx.type === 'income';

      html += `
        <div class="mobile-tx-card" onclick="window.location.hash='#transactions'">
          <div class="mobile-tx-left">
            <div class="tx-cat-icon">${cat?.icon || (isIncome ? '💰' : '🛒')}</div>
            <div class="tx-meta">
              <span class="tx-desc">${tx.description || catName}</span>
              <span class="tx-date-acc">${formatDate(tx.date)} • ${accName}</span>
            </div>
          </div>
          <div class="tx-amount-badge ${isIncome ? 'income' : 'expense'}">
            ${isIncome ? '+' : '-'}${formatMoney(tx.amountPaisa)}
          </div>
        </div>
      `;
    });
  }
  html += '</div>';

  // 2. Desktop-friendly Data Table (Screens > 768px)
  html += `
    <div class="table-responsive desktop-only-table">
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

  allTx.forEach(tx => {
    const cat = cachedCatMap[tx.categoryId];
    const acc = cachedAccMap[tx.accountId];
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

function renderCategoryBreakdownView(metrics, catMap) {
  const catContainer = document.getElementById('category-breakdown-container');
  if (!catContainer) return;

  const entries = Object.entries(metrics.categoryExpenses);
  if (entries.length === 0) {
    catContainer.innerHTML = `
      <div class="empty-state-sm">
        <p class="text-muted">${t('noExpenseCategories')}</p>
      </div>
    `;
    return;
  }

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
