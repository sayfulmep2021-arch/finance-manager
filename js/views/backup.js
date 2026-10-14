// Backup & Restore View for Personal Finance Manager
// Features: Full JSON backup generation, AES-256-GCM authenticated encryption,
// SHA-256 checksum verification, pre-restore preview, emergency pre-restore snapshot,
// browser storage health metrics, and MIS-protected data reset.

import {
  generateFullBackup,
  triggerBackupDownload,
  validateBackupFile,
  createPreRestoreEmergencyBackup,
  restoreBackupData,
  resetAllFinancialDataWithMIS,
  getStorageStatistics
} from '../backup.js';
import { requestMISAuthorization } from '../security.js';
import { t, formatDate, formatMoney } from '../i18n.js';

export async function renderBackupView(container) {
  container.innerHTML = `
    <div class="view-header">
      <div>
        <h2 class="view-title">${t('backupTitle')}</h2>
        <p class="view-subtitle">${t('backupSubtitle')}</p>
      </div>
    </div>

    <!-- Alert Container -->
    <div id="backup-global-alert" class="alert hidden" style="margin-bottom: 24px;"></div>

    <div class="dashboard-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; margin-bottom: 24px;">
      
      <!-- 1. CREATE BACKUP CARD -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">💾 ${t('createBackupTitle')}</h3>
        </div>
        <div class="card-body">
          <form id="create-backup-form">
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label required">${t('backupOptions')}</label>
              <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 6px;">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.95rem;">
                  <input type="radio" name="backupType" value="plain" checked>
                  <span>${t('backupTypePlain')}</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.95rem;">
                  <input type="radio" name="backupType" value="encrypted">
                  <span>${t('backupTypeEncrypted')}</span>
                </label>
              </div>
            </div>

            <!-- Encryption Password Field (hidden by default) -->
            <div id="backup-password-container" class="form-group hidden" style="margin-bottom: 16px;">
              <label for="backup-password-input" class="form-label required">${t('backupPassLabel')}</label>
              <input type="password" id="backup-password-input" class="form-input" placeholder="${t('backupPassPlaceholder')}" minlength="6" autocomplete="new-password">
              <small class="form-help" style="color: var(--text-light); font-size: 0.8rem; margin-top: 4px; display: block;">
                পাসওয়ার্ডটি মনে রাখুন বা লিখে রাখুন। পাসওয়ার্ড ছাড়া এনক্রিপ্টেড ব্যাকআপ রিস্টোর করা অসম্ভব।
              </small>
            </div>

            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 0.9rem;">
                <input type="checkbox" id="backup-include-audit" checked>
                <span>${t('backupAuditLogLabel')}</span>
              </label>
            </div>

            <button type="submit" id="btn-download-backup" class="btn btn-primary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>⬇️</span>
              <span>${t('btnGenerateBackup')}</span>
            </button>
          </form>
        </div>
      </div>

      <!-- 2. RESTORE FROM BACKUP CARD -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">📥 ${t('restoreTitle')}</h3>
        </div>
        <div class="card-body">
          <p class="modal-notice" style="margin-bottom: 16px;">
            ${t('restoreSubtitle')}
          </p>

          <form id="restore-inspect-form">
            <div class="form-group" style="margin-bottom: 16px;">
              <label for="restore-file-input" class="form-label required">${t('selectBackupFile')}</label>
              <input type="file" id="restore-file-input" class="form-input" accept=".json,.pfmbak" required style="padding: 8px;">
            </div>

            <div id="restore-password-container" class="form-group hidden" style="margin-bottom: 16px;">
              <label for="restore-password-input" class="form-label required">${t('decryptPassLabel')}</label>
              <input type="password" id="restore-password-input" class="form-input" placeholder="••••••••" autocomplete="current-password">
            </div>

            <button type="submit" id="btn-inspect-backup" class="btn btn-secondary" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <span>🔍</span>
              <span>${t('btnInspectBackup')}</span>
            </button>
          </form>
        </div>
      </div>

    </div>

    <!-- 3. BROWSER STORAGE HEALTH & STATISTICS CARD -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h3 class="card-title">🛡️ ${t('storageHealthTitle')}</h3>
        <span class="status-badge badge-active">100% Offline (Local IndexedDB)</span>
      </div>
      <div class="card-body">
        <p style="color: var(--text-muted); font-size: 0.92rem; line-height: 1.5; margin-bottom: 16px;">
          ${t('storageHealthDesc')}
        </p>

        <div id="storage-stats-container">
          <div class="loading-spinner">পরিসংখ্যান লোড হচ্ছে...</div>
        </div>
      </div>
    </div>

    <!-- 4. DANGER ZONE (RESET DATABASE) -->
    <div class="card" style="border-left: 4px solid var(--danger);">
      <div class="card-header">
        <h3 class="card-title" style="color: var(--danger);">⚠️ ${t('dangerZoneTitle')}</h3>
      </div>
      <div class="card-body" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: gap: 16px;">
        <div style="flex: 1; min-width: 260px; margin-right: 16px;">
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 6px;">
            ${t('dangerZoneDesc')}
          </p>
          <small style="color: var(--danger); font-weight: 600;">
            🔒 এই অপারেশন অপরিবর্তনীয় এবং MIS মডিউল পাসওয়ার্ড ছাড়া সম্পূর্ণ অসম্ভব।
          </small>
        </div>
        <div>
          <button type="button" id="btn-reset-db" class="btn btn-danger" style="white-space: nowrap;">
            🗑️ ${t('btnResetDatabase')}
          </button>
        </div>
      </div>
    </div>

    <!-- PREVIEW & RESTORE MODAL -->
    <div id="restore-preview-modal" class="modal-overlay hidden" role="dialog" aria-modal="true">
      <div class="modal-card" style="max-width: 650px;">
        <div class="modal-header">
          <h3 class="modal-title">📦 ${t('previewRestoreTitle')}</h3>
          <button type="button" class="btn-close" id="btn-close-restore-modal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="alert alert-warning" style="margin-bottom: 16px; font-size: 0.9rem; line-height: 1.5;">
            ⚠️ <strong>${t('restoreWarningNotice')}</strong>
          </div>

          <!-- Metadata Grid -->
          <div id="restore-metadata-content" style="background: var(--bg-surface); padding: 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); margin-bottom: 16px;">
            <!-- Populated dynamically -->
          </div>

          <!-- Record Counts Grid -->
          <h4 style="font-size: 0.95rem; margin-bottom: 8px;">সংরক্ষিত রেকর্ডের বিবরণ:</h4>
          <div id="restore-counts-content" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-bottom: 16px;">
            <!-- Populated dynamically -->
          </div>

          <div style="background: #eef2ff; border: 1px solid #c7d2fe; padding: 12px; border-radius: var(--radius-sm); margin-bottom: 12px; font-size: 0.85rem; color: #3730a3;">
            💡 <strong>নিরাপত্তা গ্যারান্টি:</strong> "রিস্টোর সম্পন্ন করুন" বাটনে চাপার সাথে সাথে আপনার বর্তমান ডেটার একটি জরুরি সেফটি ব্যাকআপ ফাইল ব্রাউজারে স্বয়ংক্রিয়ভাবে ডাউনলোড হয়ে যাবে।
          </div>

          <div id="restore-error-alert" class="alert alert-danger hidden"></div>
        </div>
        <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
          <button type="button" class="btn btn-secondary" id="btn-cancel-restore">${t('btnCancel')}</button>
          <div style="display: flex; gap: 8px;">
            <button type="button" class="btn btn-secondary" id="btn-manual-emergency-backup">
              ⬇️ ${t('btnEmergencyBackup')}
            </button>
            <button type="button" class="btn btn-danger" id="btn-confirm-restore">
              ✔ ${t('btnConfirmRestore')}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Global Alert Helper
  const globalAlert = container.querySelector('#backup-global-alert');
  const showAlert = (msg, type = 'income') => {
    globalAlert.className = `alert alert-${type}`;
    globalAlert.textContent = msg;
    globalAlert.classList.remove('hidden');
    globalAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    setTimeout(() => {
      globalAlert.classList.add('hidden');
    }, 6000);
  };

  // 1. Radio Toggle for Backup Password
  const radioPlain = container.querySelector('input[name="backupType"][value="plain"]');
  const radioEncrypted = container.querySelector('input[name="backupType"][value="encrypted"]');
  const passContainer = container.querySelector('#backup-password-container');
  const passInput = container.querySelector('#backup-password-input');

  const updatePassVisibility = () => {
    if (radioEncrypted.checked) {
      passContainer.classList.remove('hidden');
      passInput.required = true;
      passInput.focus();
    } else {
      passContainer.classList.add('hidden');
      passInput.required = false;
      passInput.value = '';
    }
  };
  radioPlain.addEventListener('change', updatePassVisibility);
  radioEncrypted.addEventListener('change', updatePassVisibility);

  // 2. Create Backup Form Submit
  const createForm = container.querySelector('#create-backup-form');
  const btnDownload = container.querySelector('#btn-download-backup');

  createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    btnDownload.disabled = true;
    btnDownload.innerHTML = '<span>⏳</span> <span>ব্যাকআপ ফাইল যাচাই ও তৈরি হচ্ছে...</span>';

    try {
      const isEncrypted = radioEncrypted.checked;
      const password = passInput.value.trim();
      const includeAudit = container.querySelector('#backup-include-audit').checked;

      const result = await generateFullBackup({
        encrypt: isEncrypted,
        password: password,
        includeAuditLog: includeAudit
      });

      triggerBackupDownload(result.jsonString, result.filename);
      showAlert(`✔ ${t('backupSuccessMsg')} (${result.filename})`, 'income');

      // Refresh storage metrics
      await loadStorageStatistics();
    } catch (err) {
      console.error('Backup creation error:', err);
      showAlert(`❌ ${err.message}`, 'danger');
    } finally {
      btnDownload.disabled = false;
      btnDownload.innerHTML = `<span>⬇️</span> <span>${t('btnGenerateBackup')}</span>`;
    }
  });

  // 3. Restore Inspect & Verification
  const restoreForm = container.querySelector('#restore-inspect-form');
  const fileInput = container.querySelector('#restore-file-input');
  const restorePassContainer = container.querySelector('#restore-password-container');
  const restorePassInput = container.querySelector('#restore-password-input');
  const btnInspect = container.querySelector('#btn-inspect-backup');

  // Preview Modal Elements
  const previewModal = container.querySelector('#restore-preview-modal');
  const btnCloseModal = container.querySelector('#btn-close-restore-modal');
  const btnCancelRestore = container.querySelector('#btn-cancel-restore');
  const metaContent = container.querySelector('#restore-metadata-content');
  const countsContent = container.querySelector('#restore-counts-content');
  const restoreErrorAlert = container.querySelector('#restore-error-alert');
  const btnEmergency = container.querySelector('#btn-manual-emergency-backup');
  const btnConfirmRestore = container.querySelector('#btn-confirm-restore');

  let currentPendingFileContent = null;
  let currentVerifiedTables = null;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (file && (file.name.endsWith('.pfmbak') || file.name.includes('encrypted'))) {
      restorePassContainer.classList.remove('hidden');
      restorePassInput.required = true;
    } else {
      restorePassContainer.classList.add('hidden');
      restorePassInput.required = false;
    }
  });

  restoreForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const file = fileInput.files[0];
    if (!file) return;

    btnInspect.disabled = true;
    btnInspect.innerHTML = '<span>⏳</span> <span>ফাইল পড়া ও যাচাই হচ্ছে...</span>';

    try {
      const fileText = await file.text();
      currentPendingFileContent = fileText;
      const pass = restorePassInput.value.trim();

      const validation = await validateBackupFile(fileText, pass);

      if (!validation.isValid) {
        if (validation.isEncrypted && !pass) {
          restorePassContainer.classList.remove('hidden');
          restorePassInput.required = true;
          restorePassInput.focus();
          showAlert(`🔒 ${validation.error}`, 'warning');
        } else {
          showAlert(`❌ ${validation.error}`, 'danger');
        }
        return;
      }

      // Validated successfully! Store parsed tables & open preview modal
      currentVerifiedTables = validation.tables;

      metaContent.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px; font-size: 0.88rem;">
          <div><strong>অ্যাপ্লিকেশন:</strong> ${validation.metadata.app}</div>
          <div><strong>সংস্করণ:</strong> v${validation.metadata.version} (স্কিমা v${validation.metadata.schemaVersion})</div>
          <div><strong>ব্যাকআপ তৈরির তারিখ:</strong> ${formatDate(validation.metadata.createdAt.split('T')[0])}</div>
          <div><strong>নিরাপত্তা অবস্থা:</strong> ${validation.isEncrypted ? '🔒 AES-256-GCM এনক্রিপ্টেড' : '📄 সাধারণ ভ্যালিডেটেড JSON'}</div>
        </div>
        <div style="margin-top: 8px; font-size: 0.78rem; color: var(--text-light); word-break: break-all;">
          <strong>SHA-256 Checksum:</strong> ${validation.metadata.checksum}
        </div>
      `;

      countsContent.innerHTML = Object.entries(validation.recordCounts).map(([key, count]) => `
        <div style="background: var(--bg-surface); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); text-align: center;">
          <div style="font-size: 0.76rem; color: var(--text-light); text-transform: uppercase;">${t(key, key)}</div>
          <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-primary);">${count}</div>
        </div>
      `).join('');

      restoreErrorAlert.classList.add('hidden');
      previewModal.classList.remove('hidden');
    } catch (err) {
      console.error('Inspection error:', err);
      showAlert(`❌ ${err.message}`, 'danger');
    } finally {
      btnInspect.disabled = false;
      btnInspect.innerHTML = `<span>🔍</span> <span>${t('btnInspectBackup')}</span>`;
    }
  });

  const closePreviewModal = () => {
    previewModal.classList.add('hidden');
    currentPendingFileContent = null;
    currentVerifiedTables = null;
  };
  btnCloseModal.addEventListener('click', closePreviewModal);
  btnCancelRestore.addEventListener('click', closePreviewModal);

  // Emergency safety backup manual button
  btnEmergency.addEventListener('click', async () => {
    try {
      await createPreRestoreEmergencyBackup();
      showAlert('✔ জরুরি সেফটি ব্যাকআপ ফাইল ডাউনলোড হয়েছে।', 'income');
    } catch (e) {
      showAlert(`❌ ${e.message}`, 'danger');
    }
  });

  // Confirm and Execute Restore
  btnConfirmRestore.addEventListener('click', async () => {
    if (!currentVerifiedTables) return;

    btnConfirmRestore.disabled = true;
    btnConfirmRestore.textContent = '⏳ রিস্টোর করা হচ্ছে...';

    try {
      // 1. Mandatory Rule 15: Create emergency pre-restore snapshot automatically
      try {
        await createPreRestoreEmergencyBackup();
      } catch (backupErr) {
        console.warn('Pre-restore backup warning:', backupErr);
      }

      // 2. Perform restore
      const result = await restoreBackupData(currentVerifiedTables);
      closePreviewModal();

      showAlert(`✔ ${t('restoreSuccessMsg')}`, 'income');
      restoreForm.reset();
      restorePassContainer.classList.add('hidden');

      // 3. Refresh statistics
      await loadStorageStatistics();
    } catch (restoreErr) {
      console.error('Restore execution error:', restoreErr);
      restoreErrorAlert.textContent = restoreErr.message || 'রিস্টোর করতে সমস্যা হয়েছে!';
      restoreErrorAlert.classList.remove('hidden');
    } finally {
      btnConfirmRestore.disabled = false;
      btnConfirmRestore.textContent = `✔ ${t('btnConfirmRestore')}`;
    }
  });

  // 4. Danger Zone: Reset Database (Rule 5 MIS Protected)
  const btnResetDb = container.querySelector('#btn-reset-db');
  btnResetDb.addEventListener('click', async () => {
    const isAuthorized = await requestMISAuthorization(t('dangerZoneDesc'));
    if (!isAuthorized) return;

    try {
      // Mandatory automatic emergency safety backup before wiping
      await createPreRestoreEmergencyBackup();

      await resetAllFinancialDataWithMIS(true);
      showAlert(`✔ ${t('resetSuccessMsg')}`, 'income');
      await loadStorageStatistics();
    } catch (e) {
      showAlert(`❌ ${e.message}`, 'danger');
    }
  });

  // 5. Load and Render Storage Health Statistics
  async function loadStorageStatistics() {
    const statsContainer = container.querySelector('#storage-stats-container');
    if (!statsContainer) return;

    try {
      const stats = await getStorageStatistics();
      statsContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
          <div class="summary-card" style="padding: 14px;">
            <div style="font-size: 0.8rem; color: var(--text-light);">${t('storageStatsRecords')}</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--primary);">${stats.totalRecords}</div>
          </div>
          <div class="summary-card" style="padding: 14px;">
            <div style="font-size: 0.8rem; color: var(--text-light);">${t('storageStatsEstimatedSize')}</div>
            <div style="font-size: 1.4rem; font-weight: 700; color: var(--text-primary);">${stats.estimatedSizeKb} KB</div>
          </div>
          <div class="summary-card" style="padding: 14px;">
            <div style="font-size: 0.8rem; color: var(--text-light);">স্টোরেজ টেকনোলজি</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--income);">IndexedDB (Local Engine)</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px;">
          ${Object.entries(stats.counts).map(([tbl, count]) => `
            <div style="background: var(--bg-surface); padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.8rem; color: var(--text-muted);">${t(tbl, tbl)}</span>
              <span style="font-weight: 700; font-size: 0.95rem;">${count}</span>
            </div>
          `).join('')}
        </div>
      `;
    } catch (e) {
      statsContainer.innerHTML = `<div class="alert alert-danger">পরিসংখ্যান লোড করা যায়নি: ${e.message}</div>`;
    }
  }

  // Initial load
  await loadStorageStatistics();
}
