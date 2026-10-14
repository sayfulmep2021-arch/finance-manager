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

// Register Service Worker for 100% offline functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully'))
      .catch(err => console.warn('Service Worker registration skipped/failed:', err));
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

  // Update active navigation links
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === `#${currentRoute}`) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });

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

// Update MIS Status indicator badge in the top navbar
export async function updateMISBadge() {
  const badge = document.getElementById('mis-status-badge');
  if (!badge) return;

  const status = await getMISStatus();
  if (status.isConfigured) {
    badge.textContent = `🔒 ${t('misStatusActive')}`;
    badge.className = 'status-badge badge-active';
  } else {
    badge.textContent = `⚠️ ${t('misStatusInactive')}`;
    badge.className = 'status-badge badge-inactive';
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
