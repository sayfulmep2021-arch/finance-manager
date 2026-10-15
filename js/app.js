// Main Application Coordinator & View Router
// Personal Finance Manager — Smart Offline Edition

import { initDefaultData } from './db.js';
import { getLanguage, setLanguage, t } from './i18n.js';
import { getMISStatus, setupMISPassword, openMISSetupModal } from './security.js';
import { renderDashboard } from './views/dashboard.js';
import { renderIncomeView } from './views/income.js';
import { renderExpenseView } from './views/expense.js';
import { renderTransactionsView } from './views/transactions.js';
import { renderBudgetsView } from './views/budgets.js';
import { renderSavingsView } from './views/savings.js';
import { renderLendingView } from './views/lending.js';
import { renderBorrowingView } from './views/borrowing.js';
import { renderAccountsView } from './views/accounts.js';
import { renderReportsView } from './views/reports.js';
import { renderAssistantView } from './views/assistant.js';
import { renderBackupView } from './views/backup.js';
import { renderSettingsView } from './views/settings.js';

// Register Service Worker for 100% offline functionality with auto-update
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('[SW] Registered successfully');
        // Check for updates on every load
        reg.update();
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                const banner = document.getElementById('mobile-update-banner');
                if (banner) banner.classList.remove('hidden');
              }
            });
          }
        });
      })
      .catch(err => console.warn('[SW] Registration failed:', err));
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[SW] Controller changed. Auto reloading...');
    window.location.reload();
  });
}

// PWA Installation Prompt Management
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.style.display = 'inline-flex';
  }
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.style.display = 'none';
  }
});


// Global active route tracking
let currentRoute = 'dashboard';

// Route Handler
export async function navigateTo(route) {
  const container = document.getElementById('view-container');
  if (!container) return;

  currentRoute = route || 'dashboard';

  // Update desktop active navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === `#${currentRoute}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Update mobile active bottom navigation links
  document.querySelectorAll('.bnav-item').forEach(link => {
    if (link.getAttribute('data-bnav') === currentRoute) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

  // Close mobile sidebar if open
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }

  // Render view
  container.innerHTML = '<div class="loading-spinner">⌛ লোড হচ্ছে...</div>';

  try {
    switch (currentRoute) {
      case 'dashboard':
        await renderDashboard(container);
        break;
      case 'income':
        await renderIncomeView(container);
        break;
      case 'expenses':
        await renderExpenseView(container);
        break;
      case 'transactions':
        await renderTransactionsView(container);
        break;
      case 'budgets':
        await renderBudgetsView(container);
        break;
      case 'savings':
        await renderSavingsView(container);
        break;
      case 'lending':
        await renderLendingView(container);
        break;
      case 'borrowing':
        await renderBorrowingView(container);
        break;
      case 'accounts':
        await renderAccountsView(container);
        break;
      case 'reports':
        await renderReportsView(container);
        break;
      case 'assistant':
        await renderAssistantView(container);
        break;
      case 'backup':
        await renderBackupView(container);
        break;
      case 'settings':
      case 'security':
        await renderSettingsView(container);
        break;
      default:
        await renderDashboard(container);
        break;
    }
  } catch (error) {
    console.error('View render error:', error);
    container.innerHTML = `
      <div class="alert alert-danger" style="margin: 24px;">
        <h3>${t('errorOccurred')}</h3>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Update MIS Status indicator badge in the top navbar and mobile modal
export async function updateMISBadge() {
  const badge = document.getElementById('mis-status-badge');
  const mobMisStatus = document.getElementById('mob-notif-mis-status');
  const mobLangDisplay = document.getElementById('mob-notif-lang-display');
  const profileName = document.getElementById('profile-sheet-name');

  const status = await getMISStatus();
  if (status.isConfigured) {
    if (badge) {
      badge.textContent = `🔒 ${t('misStatusActive')}`;
      badge.className = 'status-badge badge-active';
    }
    if (mobMisStatus) {
      mobMisStatus.textContent = `🔒 ${t('misStatusActive')}`;
      mobMisStatus.style.color = '#16a34a';
    }
  } else {
    if (badge) {
      badge.textContent = `⚠️ ${t('misStatusInactive')}`;
      badge.className = 'status-badge badge-inactive';
    }
    if (mobMisStatus) {
      mobMisStatus.textContent = `⚠️ ${t('misStatusInactive')}`;
      mobMisStatus.style.color = '#eab308';
    }
  }

  if (mobLangDisplay) {
    mobLangDisplay.textContent = getLanguage() === 'bn' ? 'বাংলা (BN)' : 'English (EN)';
  }
  if (profileName) {
    profileName.textContent = localStorage.getItem('pfm_user_name') || 'Shaikat';
  }
}

// Initialize Application
async function initApp() {
  // Initialize Database & Default Schema
  await initDefaultData();

  // Set initial HTML lang
  document.documentElement.lang = getLanguage();

  // Listen for language change events
  window.addEventListener('pfm_language_changed', () => {
    updateStaticTranslations();
    updateMISBadge();
    navigateTo(currentRoute);
  });

  // Listen for MIS status changes
  window.addEventListener('pfm_mis_status_changed', () => {
    updateMISBadge();
  });

  // Language switcher button click
  const langToggleBtn = document.getElementById('btn-lang-toggle');
  if (langToggleBtn) {
    langToggleBtn.addEventListener('click', () => {
      const nextLang = getLanguage() === 'bn' ? 'en' : 'bn';
      setLanguage(nextLang);
    });
  }

  // PWA Install Button click
  const installBtn = document.getElementById('btn-pwa-install');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      try {
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult && choiceResult.outcome === 'accepted') {
          installBtn.style.display = 'none';
        }
      } catch (err) {
        console.warn('Error during install prompt:', err);
      }
      deferredInstallPrompt = null;
    });
  }

  // MIS Security badge click
  const misBadge = document.getElementById('mis-status-badge');
  if (misBadge) {
    misBadge.addEventListener('click', () => {
      openMISSetupModal();
    });
  }

  // MIS Setup Modal Submissions
  const misSetupForm = document.getElementById('mis-setup-form');
  if (misSetupForm) {
    misSetupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const p1 = document.getElementById('mis-setup-new-password').value;
      const p2 = document.getElementById('mis-setup-confirm-password').value;
      const errEl = document.getElementById('mis-setup-error');
      errEl.classList.add('hidden');

      try {
        await setupMISPassword(p1, p2);
        alert(t('misConfiguredSuccess'));
        document.getElementById('mis-setup-modal').classList.add('hidden');
        await updateMISBadge();
      } catch (err) {
        errEl.textContent = err.message || t('errorOccurred');
        errEl.classList.remove('hidden');
      }
    });

    const closeBtn = document.getElementById('mis-setup-close');
    const cancelBtn = document.getElementById('mis-setup-cancel');
    if (closeBtn) closeBtn.onclick = () => document.getElementById('mis-setup-modal').classList.add('hidden');
    if (cancelBtn) cancelBtn.onclick = () => document.getElementById('mis-setup-modal').classList.add('hidden');
  }

  // Mobile menu drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-btn');
  const sidebar = document.querySelector('.app-sidebar');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Mobile Floating Action Button (FAB) & Quick Action Modal
  const mobileFab = document.getElementById('mobile-fab');
  const quickAddModal = document.getElementById('mobile-quick-add-modal');
  const quickAddClose = document.getElementById('quick-action-close');

  if (mobileFab && quickAddModal) {
    mobileFab.addEventListener('click', () => {
      quickAddModal.classList.remove('hidden');
    });
  }

  if (quickAddClose && quickAddModal) {
    quickAddClose.addEventListener('click', () => {
      quickAddModal.classList.add('hidden');
    });
  }

  if (quickAddModal) {
    quickAddModal.addEventListener('click', (e) => {
      if (e.target === quickAddModal) {
        quickAddModal.classList.add('hidden');
      }
    });
  }

  const qaExpense = document.getElementById('qa-btn-expense');
  const qaIncome = document.getElementById('qa-btn-income');
  const qaTransfer = document.getElementById('qa-btn-transfer');

  if (qaExpense && quickAddModal) {
    qaExpense.addEventListener('click', () => {
      quickAddModal.classList.add('hidden');
      window.location.hash = '#expenses';
    });
  }
  if (qaIncome && quickAddModal) {
    qaIncome.addEventListener('click', () => {
      quickAddModal.classList.add('hidden');
      window.location.hash = '#income';
    });
  }
  if (qaTransfer && quickAddModal) {
    qaTransfer.addEventListener('click', () => {
      quickAddModal.classList.add('hidden');
      window.location.hash = '#accounts';
    });
  }

  // Mobile One-Tap Update Banner button
  const btnApplyUpdate = document.getElementById('btn-apply-update');
  if (btnApplyUpdate) {
    btnApplyUpdate.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Force Reload and Clear Cache Handler
  async function forceReloadAndClearCache() {
    if (confirm('আপনি কি অফলাইন ক্যাশ পরিষ্কার করে নতুন সংস্করণ রিলোড করতে চান?')) {
      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map(k => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (let r of regs) { await r.unregister(); }
        }
      } catch (e) {
        console.warn('Error clearing cache:', e);
      }
      window.location.href = window.location.pathname + '?forceUpdate=' + Date.now();
    }
  }

  const btnForceReload1 = document.getElementById('btn-force-reload-cache');
  const btnForceReload2 = document.getElementById('btn-sheet-force-reload');
  if (btnForceReload1) btnForceReload1.addEventListener('click', forceReloadAndClearCache);
  if (btnForceReload2) btnForceReload2.addEventListener('click', forceReloadAndClearCache);

  // Mobile Notification & Status Modal Handlers (🔔)
  const notifModal = document.getElementById('mobile-notifications-modal');
  const notifClose = document.getElementById('mobile-notif-close');
  if (notifClose && notifModal) {
    notifClose.addEventListener('click', () => notifModal.classList.add('hidden'));
    notifModal.addEventListener('click', (e) => {
      if (e.target === notifModal) notifModal.classList.add('hidden');
    });
  }

  const mobNotifBtnMis = document.getElementById('mob-notif-btn-mis');
  if (mobNotifBtnMis) {
    mobNotifBtnMis.addEventListener('click', () => {
      if (notifModal) notifModal.classList.add('hidden');
      openMISSetupModal();
    });
  }

  const mobNotifBtnLang = document.getElementById('mob-notif-btn-lang');
  if (mobNotifBtnLang) {
    mobNotifBtnLang.addEventListener('click', async () => {
      const next = getLanguage() === 'bn' ? 'en' : 'bn';
      setLanguage(next);
      updateStaticTranslations();
      await updateMISBadge();
      await navigateTo(currentRoute);
      if (notifModal) notifModal.classList.add('hidden');
    });
  }

  // Mobile Profile Sheet Handlers (👤)
  const profileModal = document.getElementById('mobile-profile-modal');
  const profileClose = document.getElementById('mobile-profile-close');
  if (profileClose && profileModal) {
    profileClose.addEventListener('click', () => profileModal.classList.add('hidden'));
    profileModal.addEventListener('click', (e) => {
      if (e.target === profileModal) profileModal.classList.add('hidden');
    });
  }

  const btnEditProfileName = document.getElementById('btn-edit-profile-name');
  if (btnEditProfileName) {
    btnEditProfileName.addEventListener('click', () => {
      const current = localStorage.getItem('pfm_user_name') || 'Shaikat';
      const next = prompt('আপনার নাম লিখুন / Enter your name:', current);
      if (next && next.trim()) {
        localStorage.setItem('pfm_user_name', next.trim());
        const sheetName = document.getElementById('profile-sheet-name');
        if (sheetName) sheetName.textContent = next.trim();
        const headerName = document.getElementById('user-display-name');
        if (headerName) headerName.textContent = next.trim();
      }
    });
  }

  document.querySelectorAll('[data-sheet-nav]').forEach(item => {
    item.addEventListener('click', () => {
      if (profileModal) profileModal.classList.add('hidden');
    });
  });

  // Hash change router listener
  window.addEventListener('hashchange', () => {
    const route = window.location.hash.replace('#', '') || 'dashboard';
    navigateTo(route);
  });

  // Initial render
  updateStaticTranslations();
  await updateMISBadge();
  const initialRoute = window.location.hash.replace('#', '') || 'dashboard';
  await navigateTo(initialRoute);
}

// Update static text elements marked with data-i18n
function updateStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key, el.textContent);
    }
  });

  const langBtn = document.getElementById('btn-lang-toggle');
  if (langBtn) {
    langBtn.textContent = t('langSwitch');
  }
}

// Start app on DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
