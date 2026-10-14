// Settings & Security View
// Bilingual Interface, Currency Configuration, Asia/Dhaka Timezone & MIS Password Management
// Fulfills Section 5 (Bilingual Interface) and Section 17 (Security, Privacy, and MIS Module)

import { getMISStatus, setupMISPassword, changeMISPassword } from '../security.js';
import { getLanguage, setLanguage, t } from '../i18n.js';

export async function renderSettingsView(container) {
  const isBn = getLanguage() === 'bn';
  const misStatus = await getMISStatus();

  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">⚙️ ${t('settingsTitle', 'সেটিংস ও নিরাপত্তা')}</h2>
        <p class="view-subtitle">${t('settingsSubtitle', 'অ্যাপের ভাষা, মুদ্রা, টাইমজোন ও MIS মডিউল নিরাপত্তা পাসওয়ার্ড পরিচালনা করুন')}</p>
      </div>
    </div>

    <!-- Alert Container -->
    <div id="settings-alert" class="alert hidden" style="margin-bottom: 24px;"></div>

    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 24px;">
      
      <!-- 1. GENERAL APP SETTINGS -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🌐 ${t('generalSettings', 'সাধারণ সেটিংস')}</h3>
        </div>
        <div class="card-body">
          <form id="general-settings-form">
            <!-- Language Switcher -->
            <div class="form-group" style="margin-bottom: 18px;">
              <label for="settings-lang-select" class="form-label required">${t('selectLanguage', 'অ্যাপের ভাষা নির্বাচন করুন')}</label>
              <select id="settings-lang-select" class="form-select">
                <option value="bn" ${isBn ? 'selected' : ''}>বাংলা (Bengali - ডিফল্ট)</option>
                <option value="en" ${!isBn ? 'selected' : ''}>English (ইংরেজি)</option>
              </select>
              <small style="color: var(--text-light); font-size: 0.8rem; margin-top: 4px; display: block;">
                ${isBn ? 'ভাষা পরিবর্তন করলে সমস্ত মেনু, রিপোর্ট ও বাটন তাৎক্ষণিকভাবে রূপান্তরিত হবে।' : 'Switching language immediately updates all menus, reports, and buttons.'}
              </small>
            </div>

            <!-- Currency Setting -->
            <div class="form-group" style="margin-bottom: 18px;">
              <label class="form-label">${t('currencySettings', 'ডিফল্ট মুদ্রা')}</label>
              <input type="text" class="form-input" value="${t('currencyBangladeshi', 'বাংলাদেশি টাকা (BDT - ৳)')}" disabled style="background: var(--bg-surface); cursor: not-allowed;">
              <small style="color: var(--text-light); font-size: 0.8rem; margin-top: 4px; display: block;">
                ${isBn ? 'টাকা পূর্ণসংখ্যায় (Paisa Minor Units) সংরক্ষিত হয়, যাতে কোনো ফ্র্যাকশনাল গরমিল না থাকে।' : 'Monetary values are stored in integer minor units (poisha) to eliminate rounding errors.'}
              </small>
            </div>

            <!-- Timezone Setting -->
            <div class="form-group">
              <label class="form-label">${t('timezoneLabel', 'ডিফল্ট টাইমজোন')}</label>
              <input type="text" class="form-input" value="${t('timezoneValue', 'এশিয়া/ঢাকা (Asia/Dhaka - GMT+6)')}" disabled style="background: var(--bg-surface); cursor: not-allowed;">
            </div>
          </form>
        </div>
      </div>

      <!-- 2. MIS MODULE SECURITY PASSWORDS (Section 17 & Rule 5) -->
      <div class="card" style="border-left: 4px solid var(--primary);">
        <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <h3 class="card-title">🛡️ ${t('misSettingsTitle', 'MIS মডিউল নিরাপত্তা ও পাসওয়ার্ড')}</h3>
          <span class="status-badge ${misStatus.isConfigured ? 'badge-active' : 'badge-inactive'}">
            ${misStatus.isConfigured ? (isBn ? 'সক্রিয়' : 'Active') : (isBn ? 'কনফিগার করা নেই' : 'Not Set')}
          </span>
        </div>
        <div class="card-body">
          <p style="color: var(--text-muted); font-size: 0.88rem; line-height: 1.5; margin-bottom: 16px;">
            ${isBn 
              ? 'নিরাপত্তা বিধি ৫ অনুযায়ী: কোনো লেনদেন ডিলিট, অ্যাকাউন্ট মুছে ফেলা বা ডেটাবেজ রিসেটের জন্য MIS পাসওয়ার্ড আবশ্যক।' 
              : 'Per Strict Safety Rule 5: Deleting transactions, removing accounts, or resetting data strictly requires the MIS Module Password.'}
          </p>

          ${misStatus.isConfigured ? `
            <!-- Form: Change Existing Password -->
            <form id="mis-change-form">
              <div class="form-group" style="margin-bottom: 14px;">
                <label for="mis-curr-pass" class="form-label required">${t('currentMISPass', 'বর্তমান MIS পাসওয়ার্ড')}</label>
                <input type="password" id="mis-curr-pass" class="form-input" placeholder="••••••••" required autocomplete="current-password">
              </div>

              <div class="form-group" style="margin-bottom: 14px;">
                <label for="mis-new-pass" class="form-label required">${t('newMISPass', 'নতুন MIS পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)')}</label>
                <input type="password" id="mis-new-pass" class="form-input" placeholder="••••••••" minlength="6" required autocomplete="new-password">
              </div>

              <div class="form-group" style="margin-bottom: 18px;">
                <label for="mis-confirm-pass" class="form-label required">${t('confirmNewMISPass', 'নতুন পাসওয়ার্ড পুনরায় লিখুন')}</label>
                <input type="password" id="mis-confirm-pass" class="form-input" placeholder="••••••••" minlength="6" required autocomplete="new-password">
              </div>

              <button type="submit" id="btn-submit-mis-change" class="btn btn-primary" style="width: 100%;">
                🔑 ${t('btnChangeMISPass', 'MIS পাসওয়ার্ড পরিবর্তন করুন')}
              </button>
            </form>
          ` : `
            <!-- Form: Initial Password Setup -->
            <form id="mis-setup-initial-form">
              <div class="form-group" style="margin-bottom: 14px;">
                <label for="mis-init-pass" class="form-label required">${t('newMISPass', 'নতুন MIS পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)')}</label>
                <input type="password" id="mis-init-pass" class="form-input" placeholder="••••••••" minlength="6" required autocomplete="new-password">
              </div>

              <div class="form-group" style="margin-bottom: 18px;">
                <label for="mis-init-confirm" class="form-label required">${t('confirmNewMISPass', 'নতুন পাসওয়ার্ড পুনরায় লিখুন')}</label>
                <input type="password" id="mis-init-confirm" class="form-input" placeholder="••••••••" minlength="6" required autocomplete="new-password">
              </div>

              <button type="submit" id="btn-submit-mis-setup" class="btn btn-primary" style="width: 100%;">
                🛡️ ${t('btnSetupMISPass', 'MIS পাসওয়ার্ড সেট করুন')}
              </button>
            </form>
          `}
        </div>
      </div>

    </div>

    <!-- 3. ABOUT APPLICATION & PRIVACY ASSURANCE -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header">
        <h3 class="card-title">ℹ️ ${t('aboutAppTitle', 'অ্যাপ পরিচিতি ও প্রযুক্তি')}</h3>
      </div>
      <div class="card-body" style="font-size: 0.9rem; line-height: 1.6; color: var(--text-muted);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
          <div>
            <strong>অ্যাপ্লিকেশন:</strong> Personal Finance Manager — Smart Offline Edition<br>
            <strong>সংস্করণ:</strong> v1.0.0 (Production Ready)<br>
            <strong>লাইসেন্স ও খরচ:</strong> সম্পূর্ণ বিনামূল্যে ও ওপেন সোর্স (Zero-Cost Architecture)
          </div>
          <div>
            <strong>স্টোরেজ ইঞ্জিন:</strong> Browser IndexedDB (100% Local / Zero Cloud)<br>
            <strong>ক্রিপ্টোগ্রাফি:</strong> Web Crypto API (PBKDF2-SHA256, AES-256-GCM)<br>
            <strong>অফলাইন সক্ষমতা:</strong> PWA Service Worker (No Internet Required)
          </div>
        </div>

        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-color); font-size: 0.84rem; color: var(--text-light);">
          🔒 <strong>গোপনীয়তার নিশ্চয়তা:</strong> এই অ্যাপ্লিকেশন কোনো সার্ভারে আপনার আর্থিক তথ্য আদান-প্রদান করে না। কোনো ব্যাংক অ্যাকাউন্ট, বাহ্যিক এপিআই বা ক্লাউড সংযোগের প্রয়োজন নেই।
        </div>
      </div>
    </div>
  `;

  // Alert Helper
  const alertEl = container.querySelector('#settings-alert');
  const showAlert = (msg, type = 'income') => {
    alertEl.className = `alert alert-${type}`;
    alertEl.textContent = msg;
    alertEl.classList.remove('hidden');
    alertEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => alertEl.classList.add('hidden'), 5000);
  };

  // 1. Language Select Handler
  const langSelect = container.querySelector('#settings-lang-select');
  langSelect.addEventListener('change', () => {
    const selected = langSelect.value;
    setLanguage(selected);
    renderSettingsView(container);
  });

  // 2. Initial Setup Form Handler
  const initForm = container.querySelector('#mis-setup-initial-form');
  if (initForm) {
    initForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = container.querySelector('#mis-init-pass').value.trim();
      const p2 = container.querySelector('#mis-init-confirm').value.trim();

      try {
        await setupMISPassword(p1, p2);
        showAlert(`✔ ${t('misPassSuccess', 'MIS পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!')}`, 'income');
        renderSettingsView(container);
      } catch (err) {
        showAlert(`❌ ${err.message}`, 'danger');
      }
    });
  }

  // 3. Change Password Form Handler
  const changeForm = container.querySelector('#mis-change-form');
  if (changeForm) {
    changeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const curr = container.querySelector('#mis-curr-pass').value.trim();
      const next1 = container.querySelector('#mis-new-pass').value.trim();
      const next2 = container.querySelector('#mis-confirm-pass').value.trim();

      try {
        await changeMISPassword(curr, next1, next2);
        showAlert(`✔ ${t('misPassSuccess', 'MIS পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!')}`, 'income');
        changeForm.reset();
      } catch (err) {
        showAlert(`❌ ${err.message}`, 'danger');
      }
    });
  }
}
