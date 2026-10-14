// AI Finance Assistant & Insights View
// Deterministic 100% Offline Rule Engine, Bilingual, Privacy-First
// Provides Financial Health Scorecard, Smart Alerts, Category Optimization & Local LLM Prompts

import { computeFinancialHealthScorecard, generateFinancialInsights, buildAnonymizedAIPrompt } from '../assistant.js';
import { dbGetAll } from '../db.js';
import { t, formatMoney, toBengaliNumerals, getLanguage } from '../i18n.js';

export async function renderAssistantView(container) {
  const isBn = getLanguage() === 'bn';

  container.innerHTML = `
    <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px;">
      <div>
        <h2 class="view-title">🤖 ${t('assistantTitle')}</h2>
        <p class="view-subtitle">${t('assistantSubtitle')}</p>
      </div>
      <div>
        <span class="status-badge badge-active" style="padding: 6px 12px; font-size: 0.82rem;">
          ⚡ ১০০% অফলাইন ও ব্যক্তিগত (Zero-Cost)
        </span>
      </div>
    </div>

    <!-- Alert / Toast Container -->
    <div id="assistant-toast" class="alert hidden" style="margin-bottom: 20px;"></div>

    <!-- 1. FINANCIAL HEALTH SCORECARD -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">📊 ${t('scorecardTitle')}</h3>
      </div>
      <div class="card-body">
        <div id="assistant-scorecard-container">
          <div class="loading-spinner">স্কোরকার্ড প্রস্তুত হচ্ছে...</div>
        </div>
      </div>
    </div>

    <!-- 2. SMART INSIGHTS & ANOMALY ALERTS -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">💡 ${t('insightsTitle')}</h3>
      </div>
      <div class="card-body">
        <div id="assistant-insights-container" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="loading-spinner">পরামর্শ তৈরি হচ্ছে...</div>
        </div>
      </div>
    </div>

    <!-- 3. CATEGORY SPENDING & OPTIMIZATION TIPS -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">🛍️ ${t('categoryAnalysisTitle')}</h3>
      </div>
      <div class="card-body">
        <div id="assistant-categories-container">
          <div class="loading-spinner">লোড হচ্ছে...</div>
        </div>
      </div>
    </div>

    <!-- 4. OPTIONAL LOCAL LLM PROMPT (Section 16) -->
    <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--primary);">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <h3 class="card-title">🧠 ${t('optionalLocalAITitle')}</h3>
        <button type="button" id="btn-copy-prompt" class="btn btn-secondary btn-sm" style="display: flex; align-items: center; gap: 6px;">
          <span>📋</span>
          <span id="copy-btn-text">${t('btnCopyAIPrompt')}</span>
        </button>
      </div>
      <div class="card-body">
        <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 12px;">
          ${t('localAIDesc')}
        </p>

        <textarea id="ai-anonymized-prompt-box" class="form-input" rows="6" readonly style="font-family: monospace; font-size: 0.84rem; background: var(--bg-surface); resize: vertical; margin-bottom: 8px;"></textarea>
      </div>
    </div>

    <!-- DISCLAIMER NOTICE -->
    <div style="text-align: center; color: var(--text-light); font-size: 0.82rem; padding: 12px 16px; margin-bottom: 20px;">
      ℹ️ ${t('aiDisclaimer')}
    </div>
  `;

  const showToast = (msg, type = 'income') => {
    const toast = container.querySelector('#assistant-toast');
    toast.className = `alert alert-${type}`;
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
  };

  // Populate Scorecard and Insights
  try {
    const { scorecard, insights } = await generateFinancialInsights();

    // 1. Render Scorecard Cards
    const scorecardEl = container.querySelector('#assistant-scorecard-container');
    const bufferDisplay = isBn ? toBengaliNumerals(scorecard.emergencyBufferMonths) : scorecard.emergencyBufferMonths;
    const savingsRateDisplay = isBn ? toBengaliNumerals(scorecard.savingsRate) : scorecard.savingsRate;
    const debtRatio = scorecard.totalIncomePaisa > 0
      ? Math.round((scorecard.outstandingLiabilityPaisa / scorecard.totalIncomePaisa) * 100)
      : 0;
    const debtRatioDisplay = isBn ? toBengaliNumerals(debtRatio) : debtRatio;

    scorecardEl.innerHTML = `
      <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
        
        <div class="summary-card" style="padding: 16px; border-left: 4px solid var(--income);">
          <div style="font-size: 0.82rem; color: var(--text-light); font-weight: 600;">${t('metricSavingsRate')}</div>
          <div style="font-size: 1.6rem; font-weight: 700; color: var(--income); margin: 4px 0;">${savingsRateDisplay}%</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${isBn ? 'আদর্শ মান: ২০%+' : 'Benchmark: 20%+'}</div>
        </div>

        <div class="summary-card" style="padding: 16px; border-left: 4px solid ${scorecard.emergencyBufferMonths < 1 ? 'var(--danger)' : 'var(--primary)'};">
          <div style="font-size: 0.82rem; color: var(--text-light); font-weight: 600;">${t('metricEmergencyBuffer')}</div>
          <div style="font-size: 1.6rem; font-weight: 700; color: ${scorecard.emergencyBufferMonths < 1 ? 'var(--danger)' : 'var(--primary)'}; margin: 4px 0;">
            ${bufferDisplay} ${isBn ? 'মাস' : 'Months'}
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${isBn ? 'আদর্শ রিজার্ভ: ৩-৬ মাস' : 'Recommended: 3-6 Months'}</div>
        </div>

        <div class="summary-card" style="padding: 16px; border-left: 4px solid var(--primary);">
          <div style="font-size: 0.82rem; color: var(--text-light); font-weight: 600;">${t('metricLiquidReserves')}</div>
          <div style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary); margin: 4px 0;">${formatMoney(scorecard.totalAvailableReserves)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${isBn ? 'নগদ + সঞ্চয় লক্ষ্য' : 'Cash + Savings Goals'}</div>
        </div>

        <div class="summary-card" style="padding: 16px; border-left: 4px solid ${debtRatio > 35 ? 'var(--danger)' : 'var(--secondary)'};">
          <div style="font-size: 0.82rem; color: var(--text-light); font-weight: 600;">${t('metricDebtToIncome')}</div>
          <div style="font-size: 1.6rem; font-weight: 700; color: ${debtRatio > 35 ? 'var(--danger)' : 'var(--text-primary)'}; margin: 4px 0;">
            ${debtRatioDisplay}%
          </div>
          <div style="font-size: 0.78rem; color: var(--text-muted);">${isBn ? 'নিরাপদ মাত্রা: < ৩৫%' : 'Safe Threshold: < 35%'}</div>
        </div>

      </div>
    `;

    // 2. Render Insights List
    const insightsEl = container.querySelector('#assistant-insights-container');
    if (insights.length === 0) {
      insightsEl.innerHTML = `
        <div class="empty-state">
          <p>${isBn ? 'কোনো অসঙ্গতি বা জরুরি সতর্কতা পাওয়া যায়নি।' : 'No anomalies or critical alerts found.'}</p>
        </div>
      `;
    } else {
      insightsEl.innerHTML = insights.map(item => {
        let alertClass = 'alert-info';
        if (item.type === 'positive') alertClass = 'alert-income';
        if (item.type === 'warning') alertClass = 'alert-warning';
        if (item.type === 'critical') alertClass = 'alert-danger';

        return `
          <div class="alert ${alertClass}" style="display: flex; gap: 12px; align-items: flex-start; padding: 14px 16px;">
            <span style="font-size: 1.4rem; line-height: 1;">${item.icon}</span>
            <div style="flex: 1;">
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">${item.title}</h4>
              <p style="font-size: 0.88rem; line-height: 1.45; margin: 0;">${item.message}</p>
            </div>
          </div>
        `;
      }).join('');
    }

    // 3. Render Category Breakdown & Optimization Tips
    const catContainer = container.querySelector('#assistant-categories-container');
    const categories = await dbGetAll('categories');
    const catMap = {};
    for (const c of categories) catMap[c.id] = c;

    const catEntries = Object.entries(scorecard.expenseByCategory)
      .sort((a, b) => b[1] - a[1]);

    if (catEntries.length === 0) {
      catContainer.innerHTML = `
        <div class="empty-state">
          <p>${isBn ? 'কোনো ব্যয়ের রেকর্ড পাওয়া যায়নি।' : 'No expense records found to analyze.'}</p>
        </div>
      `;
    } else {
      catContainer.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${catEntries.map(([catId, amount]) => {
            const cat = catMap[catId];
            const name = cat ? t(cat.nameKey, cat.name || catId) : catId;
            const icon = cat ? cat.icon : '🏷️';
            const pct = scorecard.totalExpensePaisa > 0 ? Math.round((amount / scorecard.totalExpensePaisa) * 100) : 0;
            const pctDisplay = isBn ? toBengaliNumerals(pct) : pct;

            // Generate specific tips based on category
            let tip = '';
            if (catId === 'cat_food') {
              tip = isBn ? 'খাবারের অপচয় কমানো এবং বাইরের খাবার কমিয়ে ঘরে তৈরির মাধ্যমে ১০-১৫% সাশ্রয় সম্ভব।' : 'Meal planning and reducing dining out can trim food costs by 10-15%.';
            } else if (catId === 'cat_shopping') {
              tip = isBn ? 'অপ্রয়োজনীয় কেনাকাটার আগে ২৪ ঘণ্টার বিরতি নিয়ম (24-Hour Rule) মেনে চলুন।' : 'Apply the 24-hour waiting rule before non-essential purchases.';
            } else if (catId === 'cat_utilities' || catId === 'cat_telecom') {
              tip = isBn ? 'অব্যবহৃত সাবস্ক্রিপশন বা অতিরিক্ত ব্যান্ডউইথ প্যাকেজ চেক করে সাশ্রয়ী প্ল্যানে বদলান।' : 'Audit recurring utility and internet plans to switch to cost-effective tiers.';
            } else if (catId === 'cat_transportation') {
              tip = isBn ? 'শেয়ারিং রাইড বা গণপরিবহন ব্যবহারের মাধ্যমে জ্বালানি ও যাতায়াত ব্যয় কমানো যায়।' : 'Combine errands and consider public transit options to lower travel costs.';
            } else {
              tip = isBn ? 'এই খাতে মাসিক নির্দিষ্ট বাজেট বেঁধে খরচের গতি পর্যবেক্ষণ করুন।' : 'Establish a fixed monthly cap to track and optimize spending.';
            }

            return `
              <div style="background: var(--bg-surface); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span style="font-weight: 600; font-size: 0.95rem;">${icon} ${name}</span>
                  <div style="text-align: right;">
                    <span style="font-weight: 700; color: var(--text-primary);">${formatMoney(amount)}</span>
                    <span style="font-size: 0.8rem; color: var(--text-light); margin-left: 6px;">(${pctDisplay}%)</span>
                  </div>
                </div>
                <div style="font-size: 0.84rem; color: var(--text-muted); line-height: 1.4;">
                  💡 <strong>${isBn ? 'পরামর্শ' : 'Tip'}:</strong> ${tip}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    // 4. Populate Local LLM Anonymized Prompt
    const promptBox = container.querySelector('#ai-anonymized-prompt-box');
    const promptText = await buildAnonymizedAIPrompt();
    promptBox.value = promptText;

    // Copy Prompt Button
    const btnCopy = container.querySelector('#btn-copy-prompt');
    const copyText = container.querySelector('#copy-btn-text');
    btnCopy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(promptBox.value);
        copyText.textContent = `✔ ${t('promptCopied')}`;
        showToast(t('promptCopied'), 'income');
        setTimeout(() => {
          copyText.textContent = t('btnCopyAIPrompt');
        }, 3000);
      } catch (err) {
        promptBox.select();
        document.execCommand('copy');
        showToast(t('promptCopied'), 'income');
      }
    });

  } catch (err) {
    console.error('Assistant view error:', err);
    container.querySelector('#assistant-scorecard-container').innerHTML = `
      <div class="alert alert-danger">ত্রুটি: ${err.message}</div>
    `;
  }
}
