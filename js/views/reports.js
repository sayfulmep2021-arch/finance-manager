// Financial Reports, Charts & Data-Quality Audit View (Phase 3)
// Interactive Period Reports, SVG Charts, CSV/Excel Export with Preview, and Ledger Verification

import { dbGetAll } from '../db.js';
import { generateFinancialReport, runDataQualityAudit } from '../reports.js';
import { renderBarChartSvg, renderDonutChartSvg } from '../charts.js';
import { openExportPreviewModal } from '../exports.js';
import { t, formatMoney, formatDate } from '../i18n.js';
import { paisaToDecimal } from '../ledger.js';

let reportPeriod = 'this_month';
let customStart = '';
let customEnd = '';
let selectedAccount = 'all';

export async function renderReportsView(container) {
  const accounts = await dbGetAll('accounts');

  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="navReports">${t('navReports')}</h1>
        <p class="view-subtitle">আর্থিক সারাংশ, চার্ট বিশ্লেষণ, এক্সপোর্ট ও লেজার নির্ভুলতা অডিট</p>
      </div>
      <div class="header-actions">
        <button id="btn-run-audit" class="btn btn-secondary">
          🔍 ডেটা কোয়ালিটি অডিট
        </button>
        <button id="btn-export-report" class="btn btn-primary">
          📥 এক্সপোর্ট করুন (Export)
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="card toolbar-card" style="margin-bottom: 20px;">
      <div class="toolbar-grid" style="grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));">
        <div class="filter-group">
          <label for="report-period-select" class="form-label">${t('filterPeriod')}</label>
          <select id="report-period-select" class="form-select">
            <option value="today" ${reportPeriod === 'today' ? 'selected' : ''}>আজকে (Today)</option>
            <option value="this_month" ${reportPeriod === 'this_month' ? 'selected' : ''}>${t('thisMonth')}</option>
            <option value="last_month" ${reportPeriod === 'last_month' ? 'selected' : ''}>${t('lastMonth')}</option>
            <option value="this_year" ${reportPeriod === 'this_year' ? 'selected' : ''}>${t('thisYear')}</option>
            <option value="all_time" ${reportPeriod === 'all_time' ? 'selected' : ''}>${t('allTime')}</option>
            <option value="custom" ${reportPeriod === 'custom' ? 'selected' : ''}>কাস্টম তারিখ (Custom)</option>
          </select>
        </div>

        <div class="filter-group" id="custom-start-group" style="${reportPeriod === 'custom' ? '' : 'display: none;'}">
          <label for="report-start-date" class="form-label">শুরু তারিখ</label>
          <input type="date" id="report-start-date" class="form-input" value="${customStart || todayStr}">
        </div>

        <div class="filter-group" id="custom-end-group" style="${reportPeriod === 'custom' ? '' : 'display: none;'}">
          <label for="report-end-date" class="form-label">শেষ তারিখ</label>
          <input type="date" id="report-end-date" class="form-input" value="${customEnd || todayStr}">
        </div>

        <div class="filter-group">
          <label for="report-acc-select" class="form-label">${t('filterAccount')}</label>
          <select id="report-acc-select" class="form-select">
            <option value="all">${t('allAccounts')}</option>
            ${accounts.map(a => `
              <option value="${a.id}" ${selectedAccount === a.id ? 'selected' : ''}>💼 ${t(a.nameKey, a.name || a.id)}</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Report KPI Cards -->
    <div class="kpi-grid" style="margin-bottom: 24px;">
      <div class="kpi-card card-income">
        <div class="kpi-icon">📈</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('cardTotalIncome')}</span>
          <span class="kpi-value text-success" id="report-kpi-income">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-expense">
        <div class="kpi-icon">📉</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('cardTotalExpense')}</span>
          <span class="kpi-value text-danger" id="report-kpi-expense">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-flow">
        <div class="kpi-icon">🔄</div>
        <div class="kpi-content">
          <span class="kpi-label">${t('cardNetCashFlow')}</span>
          <span class="kpi-value font-bold" id="report-kpi-net">৳ ০.০০</span>
        </div>
      </div>

      <div class="kpi-card card-balance">
        <div class="kpi-icon">📑</div>
        <div class="kpi-content">
          <span class="kpi-label">মোট লেনদেন রেকর্ড</span>
          <span class="kpi-value text-primary" id="report-kpi-count">০</span>
        </div>
      </div>
    </div>

    <!-- Charts Grid (Pure SVG Offline) -->
    <div class="dashboard-grid" style="margin-bottom: 24px;">
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">📊 আয় বনাম ব্যয় অনুপাত (Income vs Expense)</h2>
        </div>
        <div class="card-body" id="report-barchart-container">
          <!-- Loaded dynamically -->
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🍩 খাতভিত্তিক ব্যয়ের বণ্টন (Expense Distribution)</h2>
        </div>
        <div class="card-body" id="report-donutchart-container">
          <!-- Loaded dynamically -->
        </div>
      </div>
    </div>

    <!-- Tabular Category Breakdowns -->
    <div class="dashboard-grid" style="margin-bottom: 24px;">
      <!-- Expense Breakdown Table -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">🛒 ব্যয়ের খাতভিত্তিক বিবরণ</h2>
        </div>
        <div class="card-body" id="report-expense-table-container">
          <!-- Loaded dynamically -->
        </div>
      </div>

      <!-- Income Breakdown Table -->
      <div class="card">
        <div class="card-header">
          <h2 class="card-title">💰 আয়ের খাতভিত্তিক বিবরণ</h2>
        </div>
        <div class="card-body" id="report-income-table-container">
          <!-- Loaded dynamically -->
        </div>
      </div>
    </div>

    <!-- Data-Quality Audit Modal / Drawer -->
    <div id="audit-modal" class="modal-overlay hidden">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">🔍 লেজার অখণ্ডতা ও ডেটা কোয়ালিটি অডিট রিপোর্ট</h3>
          <button type="button" class="btn-close" id="audit-modal-close">&times;</button>
        </div>
        <div class="modal-body" id="audit-modal-body">
          <!-- Populated dynamically -->
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="audit-modal-btn-close">${t('btnCancel')}</button>
        </div>
      </div>
    </div>
  `;

  // Attach filter event listeners
  const periodSelect = document.getElementById('report-period-select');
  periodSelect.addEventListener('change', (e) => {
    reportPeriod = e.target.value;
    const isCustom = reportPeriod === 'custom';
    document.getElementById('custom-start-group').style.display = isCustom ? '' : 'none';
    document.getElementById('custom-end-group').style.display = isCustom ? '' : 'none';
    updateReportData();
  });

  document.getElementById('report-start-date').addEventListener('change', (e) => {
    customStart = e.target.value;
    updateReportData();
  });

  document.getElementById('report-end-date').addEventListener('change', (e) => {
    customEnd = e.target.value;
    updateReportData();
  });

  document.getElementById('report-acc-select').addEventListener('change', (e) => {
    selectedAccount = e.target.value;
    updateReportData();
  });

  // Audit button click
  document.getElementById('btn-run-audit').onclick = async () => {
    await executeAndShowAuditModal();
  };

  // Export button click
  document.getElementById('btn-export-report').onclick = async () => {
    const { startDate, endDate } = getComputedDateRange();
    const report = await generateFinancialReport({
      startDate,
      endDate,
      accountId: selectedAccount
    });

    const categories = await dbGetAll('categories');
    const catMap = {};
    categories.forEach(c => { catMap[c.id] = c; });

    const accounts = await dbGetAll('accounts');
    const accMap = {};
    accounts.forEach(a => { accMap[a.id] = a; });

    const columns = [
      { label: 'তারিখ (Date)', key: 'date', accessor: (r) => formatDate(r.date) },
      { label: 'ধরন (Type)', key: 'type', accessor: (r) => r.type === 'income' ? 'আয় (Income)' : (r.type === 'expense' ? 'ব্যয় (Expense)' : r.type) },
      { label: 'খাত (Category)', key: 'categoryId', accessor: (r) => { const c = catMap[r.categoryId]; return c ? t(c.nameKey, c.name || r.categoryId) : r.categoryId || '-'; } },
      { label: 'হিসাব (Account)', key: 'accountId', accessor: (r) => { const a = accMap[r.accountId]; return a ? t(a.nameKey, a.name || r.accountId) : r.accountId || '-'; } },
      { label: 'বিবরণ (Description)', key: 'description' },
      { label: 'টাকার পরিমাণ (Amount BDT)', key: 'amountPaisa', isNumeric: true, accessor: (r) => paisaToDecimal(r.amountPaisa) }
    ];

    const rangeLabel = startDate && endDate ? `${formatDate(startDate)} থেকে ${formatDate(endDate)}` : 'সর্বমোট সময়কাল (All Time)';
    openExportPreviewModal({
      records: report.transactions,
      columns,
      title: 'আর্থিক লেনদেন এক্সপোর্ট পূর্বরূপ (Export Preview)',
      dateRange: rangeLabel
    });
  };

  // Close audit modal
  document.getElementById('audit-modal-close').onclick = () => document.getElementById('audit-modal').classList.add('hidden');
  document.getElementById('audit-modal-btn-close').onclick = () => document.getElementById('audit-modal').classList.add('hidden');

  await updateReportData();
}

function getComputedDateRange() {
  const today = new Date();
  const pad = (n) => n.toString().padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  let startDate = '';
  let endDate = '';

  if (reportPeriod === 'today') {
    startDate = toDateStr(today);
    endDate = toDateStr(today);
  } else if (reportPeriod === 'this_month') {
    startDate = toDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
    endDate = toDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  } else if (reportPeriod === 'last_month') {
    startDate = toDateStr(new Date(today.getFullYear(), today.getMonth() - 1, 1));
    endDate = toDateStr(new Date(today.getFullYear(), today.getMonth(), 0));
  } else if (reportPeriod === 'this_year') {
    startDate = `${today.getFullYear()}-01-01`;
    endDate = `${today.getFullYear()}-12-31`;
  } else if (reportPeriod === 'custom') {
    startDate = customStart;
    endDate = customEnd;
  }

  return { startDate, endDate };
}

async function updateReportData() {
  const { startDate, endDate } = getComputedDateRange();
  const report = await generateFinancialReport({
    startDate,
    endDate,
    accountId: selectedAccount
  });

  // Update KPI Cards
  document.getElementById('report-kpi-income').textContent = formatMoney(report.totalIncomePaisa);
  document.getElementById('report-kpi-expense').textContent = formatMoney(report.totalExpensePaisa);

  const netEl = document.getElementById('report-kpi-net');
  netEl.textContent = formatMoney(report.netCashFlowPaisa);
  netEl.className = 'kpi-value ' + (report.netCashFlowPaisa >= 0 ? 'text-success' : 'text-danger');

  document.getElementById('report-kpi-count').textContent = report.totalRecords;

  // Render SVG Charts
  const barContainer = document.getElementById('report-barchart-container');
  if (barContainer) {
    barContainer.innerHTML = renderBarChartSvg({
      incomePaisa: report.totalIncomePaisa,
      expensePaisa: report.totalExpensePaisa
    });
  }

  const donutContainer = document.getElementById('report-donutchart-container');
  if (donutContainer) {
    donutContainer.innerHTML = renderDonutChartSvg(report.expenseCategories, report.totalExpensePaisa);
  }

  // Render Expense Table
  const expContainer = document.getElementById('report-expense-table-container');
  if (expContainer) {
    if (report.expenseCategories.length === 0) {
      expContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">এই সময়ে কোনো খরচের তথ্য নেই।</p>`;
    } else {
      let html = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>খাত (Category)</th>
                <th class="text-right">পরিমাণ (Amount)</th>
                <th class="text-right">শতাংশ (%)</th>
              </tr>
            </thead>
            <tbody>
      `;
      report.expenseCategories.forEach(c => {
        html += `
          <tr>
            <td>${c.icon} ${c.name}</td>
            <td class="text-right font-bold text-danger">${formatMoney(c.amountPaisa)}</td>
            <td class="text-right">${c.percentage}%</td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
      expContainer.innerHTML = html;
    }
  }

  // Render Income Table
  const incContainer = document.getElementById('report-income-table-container');
  if (incContainer) {
    if (report.incomeCategories.length === 0) {
      incContainer.innerHTML = `<p class="text-muted" style="text-align: center; padding: 20px;">এই সময়ে কোনো আয়ের তথ্য নেই।</p>`;
    } else {
      let html = `
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>খাত (Category)</th>
                <th class="text-right">পরিমাণ (Amount)</th>
                <th class="text-right">শতাংশ (%)</th>
              </tr>
            </thead>
            <tbody>
      `;
      report.incomeCategories.forEach(c => {
        html += `
          <tr>
            <td>${c.icon} ${c.name}</td>
            <td class="text-right font-bold text-success">${formatMoney(c.amountPaisa)}</td>
            <td class="text-right">${c.percentage}%</td>
          </tr>
        `;
      });
      html += '</tbody></table></div>';
      incContainer.innerHTML = html;
    }
  }
}

// Data Quality Audit Execution
async function executeAndShowAuditModal() {
  const audit = await runDataQualityAudit();
  const body = document.getElementById('audit-modal-body');

  const isPerfect = audit.status === 'PERFECT';

  let html = `
    <div class="alert ${isPerfect ? 'alert-income' : 'alert-danger'}" style="margin-top: 0; margin-bottom: 20px;">
      <h3 style="margin-bottom: 4px;">${isPerfect ? '✔ লেজার অখণ্ডতা শতভাগ নির্ভুল (All Checks Passed)' : '⚠️ অসঙ্গতি পাওয়া গেছে!'}</h3>
      <p>মোট পরীক্ষিত শর্ত: <strong>${audit.totalCount}</strong> | উত্তীর্ণ: <strong>${audit.passedCount}</strong> | সময়: ${new Date(audit.timestamp).toLocaleString()}</p>
    </div>

    <div class="breakdown-list" style="gap: 12px;">
  `;

  audit.checks.forEach(c => {
    html += `
      <div class="card" style="padding: 14px; border-left: 4px solid ${c.passed ? 'var(--success)' : 'var(--danger)'};">
        <div class="flex-between" style="margin-bottom: 4px;">
          <strong style="font-size: 0.95rem;">${c.passed ? '✅' : '❌'} ${c.name}</strong>
          <span class="badge ${c.passed ? 'badge-income' : 'badge-expense'}">${c.passed ? 'উত্তীর্ণ (PASSED)' : 'ত্রুটি (FAILED)'}</span>
        </div>
        <p class="text-muted" style="font-size: 0.88rem;">${c.detail}</p>
      </div>
    `;
  });

  html += '</div>';
  body.innerHTML = html;
  document.getElementById('audit-modal').classList.remove('hidden');
}
