// IndexedDB Storage Layer for Personal Finance Manager
// Fully offline, persistent, and transaction-safe

const DB_NAME = 'PFM_SmartOffline_DB';
const DB_VERSION = 2;

let dbInstance = null;

export function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event.target.error);
      reject(new Error('Failed to open local database'));
    };

    request.onblocked = () => {
      console.warn('IndexedDB upgrade blocked by another tab');
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // 1. Accounts store
      if (!db.objectStoreNames.contains('accounts')) {
        const accountsStore = db.createObjectStore('accounts', { keyPath: 'id' });
        accountsStore.createIndex('name', 'name', { unique: false });
        accountsStore.createIndex('type', 'type', { unique: false });
      }

      // 2. Categories store
      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('type', 'type', { unique: false });
      }

      // 3. Transactions ledger store
      if (!db.objectStoreNames.contains('transactions')) {
        const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
        txStore.createIndex('date', 'date', { unique: false });
        txStore.createIndex('type', 'type', { unique: false });
        txStore.createIndex('accountId', 'accountId', { unique: false });
        txStore.createIndex('categoryId', 'categoryId', { unique: false });
        txStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // 4. Audit Log store
      if (!db.objectStoreNames.contains('audit_log')) {
        const auditStore = db.createObjectStore('audit_log', { keyPath: 'id' });
        auditStore.createIndex('transactionId', 'transactionId', { unique: false });
        auditStore.createIndex('timestamp', 'timestamp', { unique: false });
        auditStore.createIndex('action', 'action', { unique: false });
      }

      // 5. Security & MIS store
      if (!db.objectStoreNames.contains('security')) {
        db.createObjectStore('security', { keyPath: 'key' });
      }

      // 6. Settings store
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }

      // Phase 2 Stores:
      // 7. Budgets store (month: YYYY-MM, categoryId)
      if (!db.objectStoreNames.contains('budgets')) {
        const budgetStore = db.createObjectStore('budgets', { keyPath: 'id' });
        budgetStore.createIndex('month', 'month', { unique: false });
        budgetStore.createIndex('categoryId', 'categoryId', { unique: false });
      }

      // 8. Savings Goals store
      if (!db.objectStoreNames.contains('savings_goals')) {
        db.createObjectStore('savings_goals', { keyPath: 'id' });
      }

      // 9. Savings Contributions store
      if (!db.objectStoreNames.contains('savings_contributions')) {
        const scStore = db.createObjectStore('savings_contributions', { keyPath: 'id' });
        scStore.createIndex('goalId', 'goalId', { unique: false });
        scStore.createIndex('date', 'date', { unique: false });
      }

      // 10. Lending store (money lent to others)
      if (!db.objectStoreNames.contains('lending')) {
        const lendStore = db.createObjectStore('lending', { keyPath: 'id' });
        lendStore.createIndex('borrowerName', 'borrowerName', { unique: false });
        lendStore.createIndex('date', 'date', { unique: false });
      }

      // 11. Borrowing store (money borrowed from others)
      if (!db.objectStoreNames.contains('borrowing')) {
        const borrowStore = db.createObjectStore('borrowing', { keyPath: 'id' });
        borrowStore.createIndex('lenderName', 'lenderName', { unique: false });
        borrowStore.createIndex('date', 'date', { unique: false });
      }

      // 12. Loan Repayments store
      if (!db.objectStoreNames.contains('loan_repayments')) {
        const repStore = db.createObjectStore('loan_repayments', { keyPath: 'id' });
        repStore.createIndex('loanId', 'loanId', { unique: false });
        repStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// Generic get single record
export async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic get all records
export async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Generic put / insert / update record
export async function dbPut(storeName, record) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Generic delete record
export async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Count records
export async function dbCount(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Clear all records from an object store
export async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve(true);
    request.onerror = () => reject(request.error);
  });
}

// Initialize default categories and starting accounts if first run
// NOTE: STRICT SAFETY RULE 3 & SECTION 6 COMPLIANCE:
// Zero demo transactions are created. Only structure and user-defined accounts.
export async function initDefaultData() {
  const catCount = await dbCount('categories');
  if (catCount === 0) {
    const defaultCategories = [
      // Income
      { id: 'cat_salary', nameKey: 'cat_salary', type: 'income', icon: '💰', isCustom: false },
      { id: 'cat_business', nameKey: 'cat_business', type: 'income', icon: '🏢', isCustom: false },
      { id: 'cat_freelance', nameKey: 'cat_freelance', type: 'income', icon: '💻', isCustom: false },
      { id: 'cat_investment', nameKey: 'cat_investment', type: 'income', icon: '📈', isCustom: false },
      { id: 'cat_gift', nameKey: 'cat_gift', type: 'income', icon: '🎁', isCustom: false },
      { id: 'cat_other_income', nameKey: 'cat_other_income', type: 'income', icon: '➕', isCustom: false },

      // Expenses
      { id: 'cat_food', nameKey: 'cat_food', type: 'expense', icon: '🍲', isCustom: false },
      { id: 'cat_transportation', nameKey: 'cat_transportation', type: 'expense', icon: '🚌', isCustom: false },
      { id: 'cat_shopping', nameKey: 'cat_shopping', type: 'expense', icon: '🛍️', isCustom: false },
      { id: 'cat_housing', nameKey: 'cat_housing', type: 'expense', icon: '🏠', isCustom: false },
      { id: 'cat_utilities', nameKey: 'cat_utilities', type: 'expense', icon: '⚡', isCustom: false },
      { id: 'cat_telecom', nameKey: 'cat_telecom', type: 'expense', icon: '📱', isCustom: false },
      { id: 'cat_healthcare', nameKey: 'cat_healthcare', type: 'expense', icon: '💊', isCustom: false },
      { id: 'cat_education', nameKey: 'cat_education', type: 'expense', icon: '📚', isCustom: false },
      { id: 'cat_family', nameKey: 'cat_family', type: 'expense', icon: '👨‍👩‍👧', isCustom: false },
      { id: 'cat_charity', nameKey: 'cat_charity', type: 'expense', icon: '🤲', isCustom: false },
      { id: 'cat_entertainment', nameKey: 'cat_entertainment', type: 'expense', icon: '🎬', isCustom: false },
      { id: 'cat_other_expense', nameKey: 'cat_other_expense', type: 'expense', icon: '🧾', isCustom: false }
    ];

    for (const cat of defaultCategories) {
      await dbPut('categories', cat);
    }
  }

  const accCount = await dbCount('accounts');
  if (accCount === 0) {
    const defaultAccounts = [
      {
        id: 'acc_cash',
        nameKey: 'acc_cash',
        type: 'cash',
        opening_balance_paisa: 0,
        current_balance_paisa: 0,
        currency: 'BDT',
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_bank',
        nameKey: 'acc_bank',
        type: 'bank',
        opening_balance_paisa: 0,
        current_balance_paisa: 0,
        currency: 'BDT',
        createdAt: new Date().toISOString()
      },
      {
        id: 'acc_mfs',
        nameKey: 'acc_mfs',
        type: 'mfs',
        opening_balance_paisa: 0,
        current_balance_paisa: 0,
        currency: 'BDT',
        createdAt: new Date().toISOString()
      }
    ];

    for (const acc of defaultAccounts) {
      await dbPut('accounts', acc);
    }
  }

  // Request persistent storage if supported (with safety timeout so headless tests or file protocol never hang)
  if (window.location && window.location.protocol !== 'file:' && navigator.storage && navigator.storage.persist) {
    try {
      await Promise.race([
        navigator.storage.persist(),
        new Promise(r => setTimeout(r, 500))
      ]);
    } catch (e) {
      // Ignore if not supported
    }
  }
}
