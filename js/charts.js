// Pure SVG Offline Charting Engine (Zero-Cost, Zero-Dependency, 100% Offline)
// Supports Income vs Expense Bar Charts and Category Expense Donut Charts

import { formatMoney } from './i18n.js';

const PALETTE = [
  '#0284c7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
  '#ec4899', '#06b6d4', '#84cc16', '#6366f1', '#d97706'
];

// 1. Income vs Expense Comparison Bar Chart (SVG)
export function renderBarChartSvg({ incomePaisa, expensePaisa, title = '' }) {
  const width = 420;
  const height = 220;
  const padding = { top: 30, right: 30, bottom: 40, left: 60 };

  const maxVal = Math.max(incomePaisa, expensePaisa, 1);
  const chartHeight = height - padding.top - padding.bottom;
  const chartWidth = width - padding.left - padding.right;

  const incomeHeight = (incomePaisa / maxVal) * chartHeight;
  const expenseHeight = (expensePaisa / maxVal) * chartHeight;

  const barWidth = 70;
  const gap = 60;
  const startX = padding.left + (chartWidth - (barWidth * 2 + gap)) / 2;

  const incomeX = startX;
  const expenseX = startX + barWidth + gap;

  const incomeY = padding.top + (chartHeight - incomeHeight);
  const expenseY = padding.top + (chartHeight - expenseHeight);

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" style="width: 100%; height: auto; font-family: inherit;">
      <!-- Background grid lines -->
      <line x1="${padding.left}" y1="${padding.top}" x2="${width - padding.right}" y2="${padding.top}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      <line x1="${padding.left}" y1="${padding.top + chartHeight / 2}" x2="${width - padding.right}" y2="${padding.top + chartHeight / 2}" stroke="#e2e8f0" stroke-dasharray="3,3" />
      <line x1="${padding.left}" y1="${padding.top + chartHeight}" x2="${width - padding.right}" y2="${padding.top + chartHeight}" stroke="#cbd5e1" stroke-width="1.5" />

      <!-- Income Bar -->
      <rect x="${incomeX}" y="${incomeY}" width="${barWidth}" height="${incomeHeight}" rx="6" fill="#16a34a">
        <title>Income: ${formatMoney(incomePaisa)}</title>
      </rect>
      <!-- Income Value Label -->
      <text x="${incomeX + barWidth / 2}" y="${incomeY - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="#15803d">
        ${formatMoney(incomePaisa)}
      </text>
      <!-- Income Category Label -->
      <text x="${incomeX + barWidth / 2}" y="${height - 15}" text-anchor="middle" font-size="13" font-weight="600" fill="#334155">
        আয় (Income)
      </text>

      <!-- Expense Bar -->
      <rect x="${expenseX}" y="${expenseY}" width="${barWidth}" height="${expenseHeight}" rx="6" fill="#dc2626">
        <title>Expense: ${formatMoney(expensePaisa)}</title>
      </rect>
      <!-- Expense Value Label -->
      <text x="${expenseX + barWidth / 2}" y="${expenseY - 8}" text-anchor="middle" font-size="12" font-weight="600" fill="#b91c1c">
        ${formatMoney(expensePaisa)}
      </text>
      <!-- Expense Category Label -->
      <text x="${expenseX + barWidth / 2}" y="${height - 15}" text-anchor="middle" font-size="13" font-weight="600" fill="#334155">
        ব্যয় (Expense)
      </text>
    </svg>
  `;
}

// 2. Category Distribution Donut Chart (SVG)
export function renderDonutChartSvg(categoryData = [], totalPaisa = 0) {
  if (!categoryData || categoryData.length === 0 || totalPaisa <= 0) {
    return `
      <div class="empty-state-sm">
        <p class="text-muted">কোনো চার্ট ডেটা নেই (No chart data available)</p>
      </div>
    `;
  }

  const size = 260;
  const center = size / 2;
  const radius = 90;
  const strokeWidth = 36;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const slices = categoryData.map((item, idx) => {
    const fraction = item.amountPaisa / totalPaisa;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += fraction * circumference;
    const color = PALETTE[idx % PALETTE.length];

    return `
      <circle 
        cx="${center}" 
        cy="${center}" 
        r="${radius}" 
        fill="transparent" 
        stroke="${color}" 
        stroke-width="${strokeWidth}" 
        stroke-dasharray="${strokeDasharray}" 
        stroke-dashoffset="${strokeDashoffset}"
        transform="rotate(-90 ${center} ${center})"
      >
        <title>${item.name}: ${formatMoney(item.amountPaisa)} (${(fraction * 100).toFixed(1)}%)</title>
      </circle>
    `;
  }).join('');

  const legend = `
    <div class="chart-legend" style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
      ${categoryData.map((item, idx) => {
        const color = PALETTE[idx % PALETTE.length];
        const pct = ((item.amountPaisa / totalPaisa) * 100).toFixed(1);
        return `
          <div style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem;">
            <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${color};"></span>
            <span>${item.name} <strong>(${pct}%)</strong></span>
          </div>
        `;
      }).join('')}
    </div>
  `;

  return `
    <div style="display: flex; flex-direction: column; align-items: center;">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size}" class="donut-svg">
        <circle cx="${center}" cy="${center}" r="${radius}" fill="transparent" stroke="#f1f5f9" stroke-width="${strokeWidth}" />
        ${slices}
        <text x="${center}" y="${center - 6}" text-anchor="middle" font-size="12" fill="#64748b" font-weight="500">মোট খরচ</text>
        <text x="${center}" y="${center + 16}" text-anchor="middle" font-size="14" font-weight="700" fill="#0f172a">${formatMoney(totalPaisa)}</text>
      </svg>
      ${legend}
    </div>
  `;
}
