// Dashboard View for Personal Finance Manager
// Matching Reference Mobile App Design (Light Theme, Fintech Wallet Card, Circular Progress)
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

function getUserName() {
  return localStorage.getItem('pfm_user_name') || t('userGreetingName') || 'Shaikat';
}

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  try {
    const txDate = new Date(dateStr);
    const today = new Date();
    if (txDate.toDateString() === today.toDateString()) {
      return t('today');
    }
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (txDate.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    }
    return formatDate(dateStr);
  } catch (e) {
    return formatDate(dateStr);
  }
}

function getCategoryBadgeStyle(categoryId) {
  const id = (categoryId || '').toLowerCase();
  if (id.includes('food') || id.includes('restaurant') || id.includes('tea')) {
    return { bg: '#fff7ed', border: '#ffedd5', text: '#ea580c', defaultIcon: '☕' };
  }
  if (id.includes('grocery') || id.includes('bazar') || id.includes('fish')) {
    return { bg: '#f5f3ff', border: '#ede9fe', text: '#7c3aed', defaultIcon: '🐟' };
  }
  if (id.includes('shopping') || id.includes('personal') || id.includes('health') || id.includes('cosmetics')) {
    return { bg: '#fdf2f8', border: '#fce7f3', text: '#db2777', defaultIcon: '🧴' };
  }
  if (id.includes('bills') || id.includes('utility') || id.includes('tech') || id.includes('ai') || id.includes('sub')) {
    return { bg: '#fef2f2', border: '#fee2e2', text: '#dc2626', defaultIcon: '📷' };
  }
  if (id.includes('transport') || id.includes('commute')) {
    return { bg: '#f0fdf4', border: '#dcfce7', text: '#16a34a', defaultIcon: '🚗' };
  }
  return { bg: '#eff6ff', border: '#dbeafe', text: '#0284c7', defaultIcon: '💰' };
}

export async function renderDashboard(container) {
  const greeting = getGreeting();
  const userName = getUserName();

  container.innerHTML = `
    <!-- MOBILE APP HEADER (Matching Reference Screenshot) -->
    <div class="mobile-app-header">
      <div class="mobile-greeting-block">
        <span class="mobile-greeting-sub">${greeting}</span>
        <h2 class="mobile-greeting-name" id="user-display-name" title="নাম পরিবর্তন করতে ক্লিক করুন">
          ${userName}
        </h2>
      </div>
      <div class="mobile-header-right">
        <!-- Notification Bell Icon -->
        <button type="button" class="mobile-bell-btn" id="mobile-bell-btn" aria-label="Notifications" title="বিজ্ঞপ্তি ও নিরাপত্তা স্ট্যাটাস">
          🔔
        </button>
        <!-- User Avatar Circle -->
        <div class="mobile-avatar-circle" id="mobile-avatar-btn" title="প্রোফাইল">
          <svg viewBox="0 0 40 40" width="40" height="40" class="avatar-svg">
            <circle cx="20" cy="20" r="19" fill="#0284c7"/>
            <circle cx="20" cy="15" r="7" fill="#ffffff"/>
            <path d="M7 34 C7 25, 33 25, 33 34" fill="#ffffff"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- DESKTOP VIEW HEADER (Screens > 768px) -->
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

    <!-- MAIN WALLET SUMMARY CARD (Matching Reference Image: Light Soft Blue, Large Balance, Real Progress Ring) -->
    <div class="mobile-wallet-card" id="mobile-wallet-card">
      <div class="wallet-header">
        <span class="wallet-sublabel" data-i18n="walletTotalBalance">${t('walletTotalBalance')}</span>
      </div>
      <div class="wallet-amount-row">
        <div>
          <div class="wallet-balance-val" id="mobile-wallet-balance">৳ ০</div>
          <!-- Dual Income & Expense Pills below amount -->
          <div class="wallet-pills-row">
            <div class="wallet-badge-pill wallet-badge-income">
              <span class="badge-circle">↑</span>
              <span id="mobile-wallet-income">+৳ ০</span>
            </div>
            <div class="wallet-badge-pill wallet-badge-expense">
              <span class="badge-circle">↓</span>
              <span id="mobile-wallet-expense">-৳ ০</span>
            </div>
          </div>
        </div>

        <!-- Circular Progress Ring (Zero-Cost SVG Ring with Spent %) -->
        <div class="wallet-circular-ring" id="wallet-progress-container" title="খরচের শতকরা হার">
          <svg viewBox="0 0 80 80">
            <circle class="ring-bg" cx="40" cy="40" r="32" fill="none" stroke="#e0f2fe" stroke-width="6"></circle>
            <circle class="ring-fg" id="wallet-ring-fg" cx="40" cy="40" r="32" fill="none" stroke="#0284c7" stroke-width="6" stroke-linecap="round" stroke-dasharray="201.06" stroke-dashoffset="201.06"></circle>
          </svg>
          <div class="ring-label-wrap">
            <span class="ring-subtext" data-i18n="spentRatio">${t('spentRatio')}</span>
            <span class="ring-pct-text" id="wallet-ring-label">০%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- MOBILE ACCOUNT CARDS (2-Column Grid matching EBL & Bkash in Image) -->
    <div class="mobile-accounts-grid" id="mobile-accounts-grid">
      <!-- Populated dynamically with Bank, bKash, Cash cards -->
    </div>

    <!-- SEGMENTED TOGGLE TABS (Matching 'আয়' & 'ব্যয়' in Image) -->
    <div class="mobile-toggle-wrapper">
      <button type="button" class="toggle-tab-btn ${activeMobileTab === 'income' ? 'active tab-income' : ''}" id="tab-btn-income" data-i18n="tabIncome">
        ${t('tabIncome')}
      </button>
      <button type="button" class="toggle-tab-btn ${activeMobileTab === 'expense' ? 'active tab-expense' : ''}" id="tab-btn-expense" data-i18n="tabExpense">
        ${t('tabExpense')}
      </button>
    </div>

    <!-- RECENT TRANSACTIONS SECTION HEADER (Matching 'সাম্প্রতিক ব্যয়' and 'সব দেখুন') -->
    <div class="mobile-section-header">
      <h3 class="mobile-section-title" id="mobile-tx-section-title">
        ${activeMobileTab === 'expense' ? t('recentExpenseTitle') : t('recentIncomeTitle')}
      </h3>
      <a href="#transactions" class="mobile-view-all-link" id="mobile-view-all-link" data-i18n="viewAllShort">
        ${t('viewAllShort')}
      </a>
    </div>

    <!-- MOBILE RECENT TRANSACTIONS LIST (Individual Floating Cards) -->
    <div class="mobile-tx-list-container" id="mobile-tx-list-container">
      <!-- Populated dynamically -->
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

    <!-- DESKTOP DASHBOARD GRID (Screens > 768px) -->
    <div class="dashboard-grid desktop-only-grid">
      <!-- Recent Transactions Section -->
      <div class="card recent-tx-card">
        <div class="card-header flex-between">
          <h2 class="card-title" data-i18n="recentTransactions">${t('recentTransactions')}</h2>
          <button id="btn-view-all-tx" class="btn btn-secondary btn-sm" data-i18n="viewAllTransactions">${t('viewAllTransactions')}</button>
        </div>
        <div class="card-body" id="desktop-recent-tx-container">
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

  // Change user name on click
  const nameEl = document.getElementById('user-display-name');
  if (nameEl) {
    nameEl.addEventListener('click', () => {
      const current = getUserName();
      const next = prompt('আপনার নাম লিখুন / Enter your name:', current);
      if (next && next.trim()) {
        localStorage.setItem('pfm_user_name', next.trim());
        nameEl.textContent = next.trim();
      }
    });
  }

  // Bell icon click -> opens notification & status modal
  const bellBtn = document.getElementById('mobile-bell-btn');
  if (bellBtn) {
    bellBtn.addEventListener('click', () => {
      const modal = document.getElementById('mobile-notifications-modal');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Avatar icon click -> opens profile & module menu modal
  const avatarBtn = document.getElementById('mobile-avatar-btn');
  if (avatarBtn) {
    avatarBtn.addEventListener('click', () => {
      const modal = document.getElementById('mobile-profile-modal');
      if (modal) modal.classList.remove('hidden');
    });
  }

  // Populate Accounts Dropdown (Desktop)
  const accounts = await dbGetAll('accounts');
  const accountSelect = document.getElementById('dash-filter-account');
  if (accountSelect) {
    accounts.forEach(acc => {
      const opt = document.createElement('option');
      opt.value = acc.id;
      opt.textContent = t(acc.nameKey, acc.name || acc.id);
      if (acc.id === selectedAccount) opt.selected = true;
      accountSelect.appendChild(opt);
    });

    accountSelect.addEventListener('change', (e) => {
      selectedAccount = e.target.value;
      updateDashboardData();
    });
  }

  // Event Listeners for Filters
  const periodSelect = document.getElementById('dash-filter-period');
  if (periodSelect) {
    periodSelect.addEventListener('change', (e) => {
      selectedPeriod = e.target.value;
      updateDashboardData();
    });
  }

  const viewAllBtn = document.getElementById('btn-view-all-tx');
  if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
      window.location.hash = '#transactions';
    });
  }

  // Segmented Toggle Tabs ('আয়' / 'ব্যয়')
  const tabExpense = document.getElementById('tab-btn-expense');
  const tabIncome = document.getElementById('tab-btn-income');
  const sectionTitle = document.getElementById('mobile-tx-section-title');

  if (tabExpense && tabIncome) {
    tabExpense.addEventListener('click', () => {
      activeMobileTab = 'expense';
      tabExpense.className = 'toggle-tab-btn active tab-expense';
      tabIncome.className = 'toggle-tab-btn';
      if (sectionTitle) sectionTitle.textContent = t('recentExpenseTitle');
      renderRecentTransactionsView();
    });

    tabIncome.addEventListener('click', () => {
      activeMobileTab = 'income';
      tabIncome.className = 'toggle-tab-btn active tab-income';
      tabExpense.className = 'toggle-tab-btn';
      if (sectionTitle) sectionTitle.textContent = t('recentIncomeTitle');
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

  // 1. Update Desktop KPI Cards
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

  // 2. Update Mobile Main Wallet Summary Card
  const mobBalance = document.getElementById('mobile-wallet-balance');
  const mobIncome = document.getElementById('mobile-wallet-income');
  const mobExpense = document.getElementById('mobile-wallet-expense');
  const mobRingFg = document.getElementById('wallet-ring-fg');
  const mobRingLabel = document.getElementById('wallet-ring-label');

  if (mobBalance) mobBalance.textContent = formatMoney(metrics.totalBalancePaisa);
  if (mobIncome) mobIncome.textContent = `+${formatMoney(metrics.totalIncomePaisa)}`;
  if (mobExpense) mobExpense.textContent = `-${formatMoney(metrics.totalExpensePaisa)}`;

  // Circular Progress Ring: Calculate Real Spent %
  if (mobRingFg && mobRingLabel) {
    const circumference = 201.06; // 2 * PI * 32
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

  // 3. Render Mobile Account Cards (2-column grid matching EBL & Bkash)
  const accountsGrid = document.getElementById('mobile-accounts-grid');
  if (accountsGrid) {
    let accHtml = '';
    const displayAccounts = accounts.length > 0 ? accounts : [
      { id: 'acc_bank', name: 'EBL', type: 'bank', balancePaisa: 0 },
      { id: 'acc_mfs', name: 'Bkash', type: 'mfs', balancePaisa: 0 }
    ];

    displayAccounts.slice(0, 2).forEach(acc => {
      let icon = '🏦';
      let iconClass = 'icon-bank';
      const type = (acc.type || '').toLowerCase();
      const id = (acc.id || '').toLowerCase();
      let accName = acc.name || t(acc.nameKey, acc.id);

      if (type.includes('mobile') || id.includes('bkash') || id.includes('mfs') || id.includes('nagad')) {
        icon = '📱';
        iconClass = 'icon-bkash';
        if (!acc.name || acc.name === 'acc_mfs' || acc.name === 'বিকাশ / নগদ') {
          accName = 'Bkash';
        }
      } else if (type.includes('bank') || id.includes('bank')) {
        icon = '🏦';
        iconClass = 'icon-bank';
        if (!acc.name || acc.name === 'acc_bank' || acc.name === 'ব্যাংক অ্যাকাউন্ট') {
          accName = 'EBL';
        }
      } else if (type.includes('cash') || id.includes('cash')) {
        icon = '💵';
        iconClass = 'icon-cash';
      }

      accHtml += `
        <div class="mobile-account-card" onclick="window.location.hash='#accounts'">
          <div class="account-card-icon ${iconClass}">${icon}</div>
          <div class="account-card-info">
            <span class="account-card-name">${accName}</span>
            <span class="account-card-val">${formatMoney(acc.current_balance_paisa || acc.balancePaisa || 0)}</span>
          </div>
        </div>
      `;
    });
    accountsGrid.innerHTML = accHtml;
  }

  // 4. Render Transactions
  renderRecentTransactionsView();

  // 5. Render Desktop Category Breakdown
  renderCategoryBreakdownView(metrics, catMap);
}

function renderRecentTransactionsView() {
  const mobContainer = document.getElementById('mobile-tx-list-container');
  const deskContainer = document.getElementById('desktop-recent-tx-container');
  if (!cachedMetrics) return;

  const allTx = cachedMetrics.recentTransactions || [];

  // Filter based on active tab ('expense' or 'income')
  const filteredTx = allTx.filter(tx => {
    if (activeMobileTab === 'expense') return tx.type === 'expense';
    if (activeMobileTab === 'income') return tx.type === 'income';
    return true;
  });

  // 1. Render Mobile Card List matching the Screenshot
  if (mobContainer) {
    if (filteredTx.length === 0) {
      if (activeMobileTab === 'expense') {
        mobContainer.innerHTML = `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; margin-bottom: 8px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 0.88rem; color: #64748b; font-weight: 600;">
              এখনো কোনো ব্যয়ের রেকর্ড যুক্ত করা হয়নি
            </p>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.location.hash='#expenses'" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
              <span>➕</span> <span>নতুন ব্যয় যোগ করুন</span>
            </button>
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 600; padding: 2px 4px 6px;">
            নমুনা লেআউট প্রিভিউ (Demo Preview):
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#expenses'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #fff7ed; color: #ea580c; border: 1px solid #ffedd5;">☕</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">বন্ধুদের সাথে চা</span>
                <span class="mobile-tx-sub">আজ</span>
              </div>
            </div>
            <div class="mobile-tx-amount">৳১৬০</div>
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#expenses'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #f5f3ff; color: #7c3aed; border: 1px solid #ede9fe;">🐟</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">মাছ</span>
                <span class="mobile-tx-sub">আজ</span>
              </div>
            </div>
            <div class="mobile-tx-amount">৳১,৫০০</div>
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#expenses'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #fdf2f8; color: #db2777; border: 1px solid #fce7f3;">🧴</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">শ্যাম্পু</span>
                <span class="mobile-tx-sub">গতকাল</span>
              </div>
            </div>
            <div class="mobile-tx-amount">৳৪০</div>
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#expenses'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fee2e2;">📷</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">Google ai pro</span>
                <span class="mobile-tx-sub">গতকাল</span>
              </div>
            </div>
            <div class="mobile-tx-amount">৳২৫০</div>
          </div>
        `;
      } else {
        mobContainer.innerHTML = `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; padding: 16px; margin-bottom: 8px; text-align: center;">
            <p style="margin: 0 0 10px 0; font-size: 0.88rem; color: #64748b; font-weight: 600;">
              এখনো কোনো আয়ের রেকর্ড যুক্ত করা হয়নি
            </p>
            <button type="button" class="btn btn-primary btn-sm" onclick="window.location.hash='#income'" style="margin: 0 auto; display: inline-flex; align-items: center; gap: 6px;">
              <span>➕</span> <span>নতুন আয় যোগ করুন</span>
            </button>
          </div>
          <div style="font-size: 0.76rem; color: #94a3b8; font-weight: 600; padding: 2px 4px 6px;">
            নমুনা লেআউট প্রিভিউ (Demo Preview):
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#income'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #f0fdf4; color: #16a34a; border: 1px solid #dcfce7;">💰</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">মাসিক বেতন</span>
                <span class="mobile-tx-sub">আজ</span>
              </div>
            </div>
            <div class="mobile-tx-amount text-success">+৳৭০,০০০</div>
          </div>
          <div class="mobile-tx-item" style="opacity: 0.95;" onclick="window.location.hash='#income'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: #eff6ff; color: #0284c7; border: 1px solid #dbeafe;">💻</div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">ফ্রিল্যান্স কাজ</span>
                <span class="mobile-tx-sub">গতকাল</span>
              </div>
            </div>
            <div class="mobile-tx-amount text-success">+৳১২,৫০০</div>
          </div>
        `;
      }
    } else {
      let mobHtml = '';
      filteredTx.slice(0, 10).forEach(tx => {
        const cat = cachedCatMap[tx.categoryId];
        const style = getCategoryBadgeStyle(tx.categoryId);
        const catIcon = cat?.icon || style.defaultIcon;
        const catName = cat ? t(cat.nameKey, cat.name) : tx.categoryId;
        const isIncome = tx.type === 'income';
        const relDate = formatRelativeDate(tx.date);

        mobHtml += `
          <div class="mobile-tx-item" onclick="window.location.hash='#transactions'">
            <div class="mobile-tx-left">
              <div class="mobile-tx-icon-badge" style="background-color: ${style.bg}; color: ${style.text}; border: 1px solid ${style.border};">
                ${catIcon}
              </div>
              <div class="mobile-tx-details">
                <span class="mobile-tx-title">${tx.description || catName}</span>
                <span class="mobile-tx-sub">${relDate}</span>
              </div>
            </div>
            <div class="mobile-tx-amount">
              ${formatMoney(tx.amountPaisa)}
            </div>
          </div>
        `;
      });
      mobContainer.innerHTML = mobHtml;
    }
  }

  // 2. Render Desktop Table View (Screens > 768px)
  if (deskContainer) {
    if (allTx.length === 0) {
      deskContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📂</div>
          <h3 class="empty-title">${t('noTransactionsYet')}</h3>
          <p class="empty-desc">${t('noTransactionsDesc')}</p>
        </div>
      `;
    } else {
      let deskHtml = `
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

      allTx.forEach(tx => {
        const cat = cachedCatMap[tx.categoryId];
        const acc = cachedAccMap[tx.accountId];
        const catName = cat ? t(cat.nameKey, cat.name) : tx.categoryId;
        const accName = acc ? t(acc.nameKey, acc.name) : tx.accountId;
        const isIncome = tx.type === 'income';

        deskHtml += `
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

      deskHtml += `
            </tbody>
          </table>
        </div>
      `;
      deskContainer.innerHTML = deskHtml;
    }
  }
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
