// Savings Goals View (Phase 2)
// Goal creation, progress tracking, user-approved contributions without double-counting

import { dbGetAll, dbGet } from '../db.js';
import { 
  saveSavingsGoal, 
  recordSavingsContribution, 
  deleteSavingsGoalWithMIS, 
  decimalToPaisa 
} from '../ledger.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatMoney, formatDate } from '../i18n.js';

export async function renderSavingsView(container) {
  const accounts = await dbGetAll('accounts');

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h1 class="view-title" data-i18n="savingsTitle">${t('savingsTitle')}</h1>
        <p class="view-subtitle" data-i18n="savingsSubtitle">${t('savingsSubtitle')}</p>
      </div>
      <div>
        <button id="btn-open-goal-modal" class="btn btn-primary">
          + ${t('btnAddGoal')}
        </button>
      </div>
    </div>

    <!-- Goals Grid -->
    <div id="savings-grid-container" class="kpi-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));">
      <!-- Dynamically loaded -->
    </div>

    <!-- Add Goal Modal -->
    <div id="goal-form-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="btnAddGoal">${t('btnAddGoal')}</h3>
          <button type="button" class="btn-close" id="goal-modal-close">&times;</button>
        </div>
        <form id="goal-form">
          <div class="modal-body">
            <div class="form-group" style="margin-bottom: 12px;">
              <label for="goal-name" class="form-label required" data-i18n="goalName">${t('goalName')}</label>
              <input type="text" id="goal-name" class="form-input" placeholder="জরুরি তহবিল / নতুন ল্যাপটপ / হজ ফান্ড" required>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="goal-target-amount" class="form-label required" data-i18n="targetAmount">${t('targetAmount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="goal-target-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="goal-target-date" class="form-label" data-i18n="targetDate">${t('targetDate')}</label>
              <input type="date" id="goal-target-date" class="form-input">
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="goal-notes" class="form-label" data-i18n="notes">${t('notes')}</label>
              <textarea id="goal-notes" class="form-textarea" rows="2"></textarea>
            </div>

            <div id="goal-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="goal-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-primary">${t('btnAddGoal')}</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Contribute to Goal Modal -->
    <div id="contribute-modal" class="modal-overlay hidden">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title" data-i18n="contributeTitle">${t('contributeTitle')}</h3>
          <button type="button" class="btn-close" id="contrib-modal-close">&times;</button>
        </div>
        <form id="contrib-form">
          <input type="hidden" id="contrib-goal-id">
          <div class="modal-body">
            <p class="modal-notice" data-i18n="contributeNotice" style="margin-bottom: 14px;">${t('contributeNotice')}</p>

            <div class="form-group" style="margin-bottom: 12px;">
              <label class="form-label font-bold" id="contrib-goal-name-display"></label>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="contrib-source-account" class="form-label required" data-i18n="fromAccount">${t('fromAccount')}</label>
              <select id="contrib-source-account" class="form-select" required>
                <option value="">${t('selectAccount')}</option>
                ${accounts.map(a => `
                  <option value="${a.id}">💼 ${t(a.nameKey, a.name || a.id)} (${formatMoney(a.current_balance_paisa || 0)})</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 12px;">
              <label for="contrib-amount" class="form-label required" data-i18n="amount">${t('amount')}</label>
              <div class="input-with-addon">
                <span class="input-addon">৳</span>
                <input type="number" id="contrib-amount" class="form-input" step="0.01" min="1" placeholder="0.00" required>
              </div>
            </div>

            <div id="contrib-form-error" class="alert alert-danger hidden"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="contrib-modal-cancel">${t('btnCancel')}</button>
            <button type="submit" class="btn btn-success" data-i18n="btnContribute">${t('btnContribute')}</button>
          </div>
        </form>
      </div>
    </div>
  `;

  // Goal modal handlers
  const goalModal = document.getElementById('goal-form-modal');
  document.getElementById('btn-open-goal-modal').onclick = () => {
    goalModal.classList.remove('hidden');
    document.getElementById('goal-form-error').classList.add('hidden');
  };
  document.getElementById('goal-modal-close').onclick = () => goalModal.classList.add('hidden');
  document.getElementById('goal-modal-cancel').onclick = () => goalModal.classList.add('hidden');

  document.getElementById('goal-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('goal-name').value;
    const targetAmt = document.getElementById('goal-target-amount').value;
    const targetDate = document.getElementById('goal-target-date').value;
    const notes = document.getElementById('goal-notes').value;
    const errEl = document.getElementById('goal-form-error');

    try {
      const targetAmountPaisa = decimalToPaisa(targetAmt);
      await saveSavingsGoal({
        name,
        targetAmountPaisa,
        targetDate,
        notes
      });
      goalModal.classList.add('hidden');
      document.getElementById('goal-form').reset();
      await loadSavingsGrid();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  // Contribution modal handlers
  const contribModal = document.getElementById('contribute-modal');
  document.getElementById('contrib-modal-close').onclick = () => contribModal.classList.add('hidden');
  document.getElementById('contrib-modal-cancel').onclick = () => contribModal.classList.add('hidden');

  document.getElementById('contrib-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const goalId = document.getElementById('contrib-goal-id').value;
    const accountId = document.getElementById('contrib-source-account').value;
    const amtVal = document.getElementById('contrib-amount').value;
    const errEl = document.getElementById('contrib-form-error');

    try {
      const amountPaisa = decimalToPaisa(amtVal);
      const today = new Date().toISOString().split('T')[0];

      await recordSavingsContribution({
        goalId,
        sourceAccountId: accountId,
        amountPaisa,
        date: today
      });

      contribModal.classList.add('hidden');
      document.getElementById('contrib-form').reset();
      alert('সঞ্চয় জমা সফলভাবে সম্পন্ন হয়েছে!');
      await loadSavingsGrid();
    } catch (err) {
      errEl.textContent = err.message || t('errorOccurred');
      errEl.classList.remove('hidden');
    }
  });

  await loadSavingsGrid();
}

async function loadSavingsGrid() {
  const container = document.getElementById('savings-grid-container');
  if (!container) return;

  const goals = await dbGetAll('savings_goals');

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon">🌱</div>
        <h3 class="empty-title">${t('noSavingsYet')}</h3>
        <p class="empty-desc">${t('savingsSubtitle')}</p>
      </div>
    `;
    return;
  }

  let html = '';
  goals.forEach(g => {
    const current = g.currentSavingsPaisa || 0;
    const target = g.targetAmountPaisa || 1;
    const remaining = Math.max(0, target - current);
    const percentage = Math.min(100, Number(((current / target) * 100).toFixed(1)));

    html += `
      <div class="card savings-card">
        <div class="card-header flex-between">
          <div class="font-bold font-lg">🌱 ${g.name}</div>
          <span class="badge ${percentage >= 100 ? 'badge-income' : 'badge-inactive'}">${percentage}%</span>
        </div>
        <div class="card-body">
          <div class="flex-between" style="margin-bottom: 8px;">
            <span class="text-muted">${t('currentSavings')}: <strong class="text-primary">${formatMoney(current)}</strong></span>
            <span class="text-muted">${t('targetAmount')}: <strong>${formatMoney(target)}</strong></span>
          </div>

          <div class="progress-bar-bg" style="height: 12px; margin-bottom: 12px;">
            <div class="progress-bar-fill" style="width: ${percentage}%; background-color: ${percentage >= 100 ? 'var(--success)' : 'var(--primary)'};"></div>
          </div>

          <div class="flex-between" style="font-size: 0.88rem; margin-bottom: 14px;">
            <span>${t('remainingSavings')}: <strong>${formatMoney(remaining)}</strong></span>
            <span>${g.targetDate ? `📅 ${formatDate(g.targetDate)}` : ''}</span>
          </div>

          <div class="flex-between">
            <button class="btn btn-success btn-sm btn-open-contrib" data-id="${g.id}" data-name="${g.name}">
              + ${t('btnContribute')}
            </button>
            <button class="btn btn-danger-outline btn-xs btn-delete-goal" data-id="${g.id}">
              🗑️ ${t('btnDelete')}
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  // Open contribute modal handlers
  container.querySelectorAll('.btn-open-contrib').forEach(btn => {
    btn.onclick = () => {
      document.getElementById('contrib-goal-id').value = btn.dataset.id;
      document.getElementById('contrib-goal-name-display').textContent = `লক্ষ্য: ${btn.dataset.name}`;
      document.getElementById('contrib-form-error').classList.add('hidden');
      document.getElementById('contribute-modal').classList.remove('hidden');
    };
  });

  // Guarded delete handlers
  container.querySelectorAll('.btn-delete-goal').forEach(btn => {
    btn.onclick = async () => {
      const goalId = btn.dataset.id;
      const verified = await requestMISAuthorization('আপনি কি এই সঞ্চয় লক্ষ্যটি মুছে ফেলতে চান?');
      if (verified) {
        await deleteSavingsGoalWithMIS(goalId, true);
        await loadSavingsGrid();
      }
    };
  });
}
