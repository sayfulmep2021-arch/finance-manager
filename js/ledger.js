// Core Accounting & Transaction Ledger Engine
// Enforces Integer Minor Unit (Poisha) precision, double-entry balance consistency,
// and audit logging for all approved modifications.

import { dbGet, dbGetAll, dbPut, dbDelete } from './db.js';
import { t } from './i18n.js';

// Safe conversion of decimal string / number to integer paisa
// Eliminates floating-point inaccuracies (e.g. 0.1 + 0.2 != 0.3)
export function decimalToPaisa(amountInput) {
  if (amountInput === null || amountInput === undefined) {
    throw new Error(t('invalidAmount', 'Invalid amount'));
  }

  const str = String(amountInput).trim();
  if (!str || !/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error(t('invalidAmount', 'Please enter a valid, positive amount.'));
  }

  const parts = str.split('.');
  const integerPart = parseInt(parts[0], 10);
  const decimalPart = parts[1] ? parts[1].padEnd(2, '0').slice(0, 2) : '00';
  const paisa = (integerPart * 100) + parseInt(decimalPart, 10);

  if (paisa <= 0 || isNaN(paisa)) {
    throw new Error(t('invalidAmount', 'Amount must be greater than zero.'));
  }

  return paisa;
}

// Convert integer paisa back to standard 2-decimal string
export function paisaToDecimal(paisa) {
  if (paisa === null || paisa === undefined || isNaN(paisa)) return '0.00';
  const abs = Math.abs(paisa);
  const intPart = Math.floor(abs / 100);
  const decPart = (abs % 100).toString().padStart(2, '0');
  return `${paisa < 0 ? '-' : ''}${intPart}.${decPart}`;
}

// Generate unique, collision-resistant transaction ID
export function generateTransactionId() {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `tx_${ts}_${rand}`;
}

// Record an approved transaction (Income or Expense)
export async function recordTransaction({
  type,
  amountPaisa,
  date,
  categoryId,
  accountId,
  description = '',
  notes = '',
  tags = []
}) {
  // 1. Strict validation
  if (type !== 'income' && type !== 'expense') {
    throw new Error('Invalid transaction type. Must be income or expense.');
  }

  if (!amountPaisa || typeof amountPaisa !== 'number' || amountPaisa <= 0 || !Number.isInteger(amountPaisa)) {
    throw new Error('Amount must be a positive integer in minor units (paisa).');
  }

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(t('invalidDate', 'Invalid date format. Expected YYYY-MM-DD.'));
  }

  if (!categoryId) {
    throw new Error('Category is required.');
  }

  if (!accountId) {
    throw new Error('Account is required.');
  }

  // 2. Verify account exists
  const account = await dbGet('accounts', accountId);
  if (!account) {
    throw new Error('Specified account was not found.');
  }

  const now = new Date().toISOString();
  const txId = generateTransactionId();

  const newTx = {
    id: txId,
    type,
    amountPaisa,
    date,
    categoryId,
    accountId,
    description: description.trim(),
    notes: notes.trim(),
    tags: Array.isArray(tags) ? tags : [],
    createdAt: now,
    updatedAt: now
  };

  // 3. Atomically update account balance
  const oldBalance = account.current_balance_paisa || 0;
  if (type === 'income') {
    account.current_balance_paisa = oldBalance + amountPaisa;
  } else if (type === 'expense') {
    account.current_balance_paisa = oldBalance - amountPaisa;
  }
  account.updatedAt = now;

  // Persist transaction and updated account
  await dbPut('transactions', newTx);
  await dbPut('accounts', account);

  return newTx;
}

// Update a transaction with explicit user confirmation and audit history
export async function updateTransaction(transactionId, updatedData, reason) {
  if (!reason || !reason.trim()) {
    throw new Error(t('editReason', 'Reason for change is mandatory for audit trail.'));
  }

  const existingTx = await dbGet('transactions', transactionId);
  if (!existingTx) {
    throw new Error('Transaction not found.');
  }

  const now = new Date().toISOString();

  // 1. Reconcile account balances:
  // First reverse the old transaction effect
  const oldAccount = await dbGet('accounts', existingTx.accountId);
  if (oldAccount) {
    if (existingTx.type === 'income') {
      oldAccount.current_balance_paisa -= existingTx.amountPaisa;
    } else if (existingTx.type === 'expense') {
      oldAccount.current_balance_paisa += existingTx.amountPaisa;
    }
  }

  // Apply new transaction effect
  const newAccountId = updatedData.accountId || existingTx.accountId;
  const targetAccount = (oldAccount && oldAccount.id === newAccountId)
    ? oldAccount
    : await dbGet('accounts', newAccountId);

  if (!targetAccount) {
    throw new Error('Target account not found.');
  }

  const newAmountPaisa = updatedData.amountPaisa !== undefined ? updatedData.amountPaisa : existingTx.amountPaisa;
  const newType = updatedData.type || existingTx.type;

  if (newType === 'income') {
    targetAccount.current_balance_paisa += newAmountPaisa;
  } else if (newType === 'expense') {
    targetAccount.current_balance_paisa -= newAmountPaisa;
  }
  targetAccount.updatedAt = now;

  // 2. Create Audit Trail Entry
  const auditEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    transactionId: existingTx.id,
    action: 'EDIT',
    previousState: JSON.parse(JSON.stringify(existingTx)),
    newState: {
      ...existingTx,
      ...updatedData,
      updatedAt: now
    },
    reason: reason.trim(),
    timestamp: now
  };

  // 3. Update transaction record
  const updatedTx = {
    ...existingTx,
    ...updatedData,
    updatedAt: now
  };

  // Save changes
  if (oldAccount && oldAccount.id !== targetAccount.id) {
    await dbPut('accounts', oldAccount);
  }
  await dbPut('accounts', targetAccount);
  await dbPut('transactions', updatedTx);
  await dbPut('audit_log', auditEntry);

  return updatedTx;
}

// Delete a transaction (MANDATORY MIS PASSWORD GATE ENFORCED)
export async function deleteTransactionWithMIS(transactionId, misVerified = false) {
  // STRICT RULE 5 ENFORCEMENT
  if (!misVerified) {
    throw new Error('MIS Module Password verification failed. Deletion blocked.');
  }

  const existingTx = await dbGet('transactions', transactionId);
  if (!existingTx) {
    throw new Error('Transaction not found.');
  }

  const now = new Date().toISOString();

  // 1. Reconcile account balance: reverse the deleted transaction
  const account = await dbGet('accounts', existingTx.accountId);
  if (account) {
    if (existingTx.type === 'income') {
      account.current_balance_paisa -= existingTx.amountPaisa;
    } else if (existingTx.type === 'expense') {
      account.current_balance_paisa += existingTx.amountPaisa;
    }
    account.updatedAt = now;
    await dbPut('accounts', account);
  }

  // 2. Create Audit Trail Entry for deletion
  const auditEntry = {
    id: `audit_del_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    transactionId: existingTx.id,
    action: 'DELETE',
    deletedRecord: JSON.parse(JSON.stringify(existingTx)),
    timestamp: now,
    verifiedBy: 'MIS_MODULE'
  };

  await dbPut('audit_log', auditEntry);
  await dbDelete('transactions', transactionId);

  return true;
}

// Fetch audit history for a specific transaction
export async function getTransactionAuditHistory(transactionId) {
  const allAudits = await dbGetAll('audit_log');
  return allAudits
    .filter(a => a.transactionId === transactionId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

// Compute dashboard metrics
export async function getDashboardMetrics(period = 'this_month', accountFilter = 'all') {
  const allTxs = await dbGetAll('transactions');
  const allAccounts = await dbGetAll('accounts');

  // Determine date bounds
  const today = new Date();
  let startDate = '';
  let endDate = '';

  const pad = (n) => n.toString().padStart(2, '0');
  const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  if (period === 'this_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    startDate = toDateStr(firstDay);
    endDate = toDateStr(lastDay);
  } else if (period === 'last_month') {
    const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
    startDate = toDateStr(firstDay);
    endDate = toDateStr(lastDay);
  } else if (period === 'this_year') {
    startDate = `${today.getFullYear()}-01-01`;
    endDate = `${today.getFullYear()}-12-31`;
  } // 'all_time' leaves startDate & endDate empty

  // Filter transactions
  const filteredTxs = allTxs.filter(tx => {
    if (accountFilter !== 'all' && tx.accountId !== accountFilter) {
      return false;
    }
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  // Calculate totals
  let totalIncomePaisa = 0;
  let totalExpensePaisa = 0;
  const categoryExpenses = {};

  for (const tx of filteredTxs) {
    if (tx.type === 'income') {
      totalIncomePaisa += tx.amountPaisa;
    } else if (tx.type === 'expense') {
      totalExpensePaisa += tx.amountPaisa;
      categoryExpenses[tx.categoryId] = (categoryExpenses[tx.categoryId] || 0) + tx.amountPaisa;
    }
  }

  // Calculate total balance from actual accounts
  let totalBalancePaisa = 0;
  for (const acc of allAccounts) {
    if (accountFilter === 'all' || acc.id === accountFilter) {
      totalBalancePaisa += (acc.current_balance_paisa || 0);
    }
  }

  // Sort recent transactions by date descending, then createdAt descending
  const recentTransactions = [...allTxs]
    .sort((a, b) => {
      if (b.date !== a.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    })
    .slice(0, 10);

  return {
    totalIncomePaisa,
    totalExpensePaisa,
    netCashFlowPaisa: totalIncomePaisa - totalExpensePaisa,
    totalBalancePaisa,
    categoryExpenses,
    recentTransactions,
    accounts: allAccounts,
    totalCount: allTxs.length
  };
}

// ==========================================
// PHASE 2: INTERNAL FUND TRANSFERS
// ==========================================
// Strict Rule 14 & Section 21 Item 1: Internal transfers NEVER inflate income or expense.
export async function recordInternalTransfer({ fromAccountId, toAccountId, amountPaisa, date, description = '' }) {
  if (fromAccountId === toAccountId) {
    throw new Error(t('sameAccountError', 'Source and destination accounts cannot be the same.'));
  }
  if (!amountPaisa || amountPaisa <= 0 || !Number.isInteger(amountPaisa)) {
    throw new Error(t('invalidAmount', 'Invalid transfer amount.'));
  }

  const fromAcc = await dbGet('accounts', fromAccountId);
  const toAcc = await dbGet('accounts', toAccountId);

  if (!fromAcc || !toAcc) {
    throw new Error('Source or destination account not found.');
  }

  if ((fromAcc.current_balance_paisa || 0) < amountPaisa) {
    throw new Error(t('insufficientBalance', 'Insufficient balance in source account.'));
  }

  const now = new Date().toISOString();
  fromAcc.current_balance_paisa = (fromAcc.current_balance_paisa || 0) - amountPaisa;
  toAcc.current_balance_paisa = (toAcc.current_balance_paisa || 0) + amountPaisa;
  fromAcc.updatedAt = now;
  toAcc.updatedAt = now;

  const txId = generateTransactionId();
  const transferTx = {
    id: txId,
    type: 'transfer',
    fromAccountId,
    toAccountId,
    accountId: fromAccountId, // Primary linked account
    amountPaisa,
    date,
    description: description.trim() || `${fromAcc.name || fromAcc.id} -> ${toAcc.name || toAcc.id}`,
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', fromAcc);
  await dbPut('accounts', toAcc);
  await dbPut('transactions', transferTx);

  return transferTx;
}

// ==========================================
// PHASE 2: BUDGET MANAGEMENT
// ==========================================
export async function getBudgetsForMonth(monthStr) {
  const allBudgets = await dbGetAll('budgets');
  const monthBudgets = allBudgets.filter(b => b.month === monthStr);
  const allTxs = await dbGetAll('transactions');

  // Compute actual spending for this month per category
  const actualSpending = {};
  for (const tx of allTxs) {
    if (tx.type === 'expense' && tx.date && tx.date.startsWith(monthStr)) {
      actualSpending[tx.categoryId] = (actualSpending[tx.categoryId] || 0) + tx.amountPaisa;
    }
  }

  return monthBudgets.map(b => {
    const spent = actualSpending[b.categoryId] || 0;
    const remaining = b.amountPaisa - spent;
    const percentage = b.amountPaisa > 0 ? (spent / b.amountPaisa) * 100 : 0;
    
    let status = 'normal';
    if (percentage > 100) {
      status = 'exceeded';
    } else if (percentage >= 80) {
      status = 'warning';
    }

    return {
      ...b,
      spentPaisa: spent,
      remainingPaisa: remaining,
      percentage: Number(percentage.toFixed(1)),
      status
    };
  });
}

export async function saveBudget({ id, month, categoryId, amountPaisa }) {
  if (!month || !categoryId || !amountPaisa || amountPaisa <= 0) {
    throw new Error('Month, category, and a positive amount are required.');
  }

  const budgetId = id || `bg_${month}_${categoryId}`;
  const now = new Date().toISOString();
  const budget = {
    id: budgetId,
    month,
    categoryId,
    amountPaisa,
    updatedAt: now
  };

  await dbPut('budgets', budget);
  return budget;
}

export async function deleteBudgetWithMIS(budgetId, misVerified = false) {
  if (!misVerified) throw new Error('MIS Password Verification Required');
  await dbDelete('budgets', budgetId);
  return true;
}

// ==========================================
// PHASE 2: SAVINGS GOALS
// ==========================================
export async function saveSavingsGoal({ id, name, targetAmountPaisa, targetDate, startingAmountPaisa = 0, notes = '' }) {
  if (!name || !targetAmountPaisa || targetAmountPaisa <= 0) {
    throw new Error('Goal name and positive target amount are required.');
  }

  const goalId = id || `goal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const existing = id ? await dbGet('savings_goals', id) : null;
  const now = new Date().toISOString();

  const goal = {
    id: goalId,
    name: name.trim(),
    targetAmountPaisa,
    targetDate: targetDate || '',
    startingAmountPaisa,
    currentSavingsPaisa: existing ? existing.currentSavingsPaisa : startingAmountPaisa,
    notes: notes.trim(),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  await dbPut('savings_goals', goal);
  return goal;
}

export async function recordSavingsContribution({ goalId, sourceAccountId, amountPaisa, date, notes = '' }) {
  if (!amountPaisa || amountPaisa <= 0) throw new Error(t('invalidAmount'));

  const goal = await dbGet('savings_goals', goalId);
  if (!goal) throw new Error('Savings goal not found.');

  const sourceAcc = await dbGet('accounts', sourceAccountId);
  if (!sourceAcc) throw new Error('Source account not found.');

  if ((sourceAcc.current_balance_paisa || 0) < amountPaisa) {
    throw new Error(t('insufficientBalance'));
  }

  const now = new Date().toISOString();
  sourceAcc.current_balance_paisa = (sourceAcc.current_balance_paisa || 0) - amountPaisa;
  goal.currentSavingsPaisa = (goal.currentSavingsPaisa || 0) + amountPaisa;
  sourceAcc.updatedAt = now;
  goal.updatedAt = now;

  const contribId = `sc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const contrib = {
    id: contribId,
    goalId,
    sourceAccountId,
    amountPaisa,
    date,
    notes: notes.trim(),
    createdAt: now
  };

  // Record an internal transfer ledger entry so double entry checks pass
  const txId = generateTransactionId();
  const tx = {
    id: txId,
    type: 'savings_contribution',
    accountId: sourceAccountId,
    amountPaisa,
    date,
    description: `${t('savingsTitle')}: ${goal.name}`,
    notes: notes.trim(),
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', sourceAcc);
  await dbPut('savings_goals', goal);
  await dbPut('savings_contributions', contrib);
  await dbPut('transactions', tx);

  return contrib;
}

export async function deleteSavingsGoalWithMIS(goalId, misVerified = false) {
  if (!misVerified) throw new Error('MIS Password Verification Required');
  await dbDelete('savings_goals', goalId);
  return true;
}

// ==========================================
// PHASE 2: LENDING MANAGEMENT
// ==========================================
export async function recordLending({ borrowerName, amountPaisa, sourceAccountId, date, expectedDate = '', notes = '' }) {
  if (!borrowerName || !amountPaisa || amountPaisa <= 0) {
    throw new Error('Borrower name and positive amount are required.');
  }

  const sourceAcc = await dbGet('accounts', sourceAccountId);
  if (!sourceAcc) throw new Error('Source account not found.');

  if ((sourceAcc.current_balance_paisa || 0) < amountPaisa) {
    throw new Error(t('insufficientBalance'));
  }

  const now = new Date().toISOString();
  sourceAcc.current_balance_paisa = (sourceAcc.current_balance_paisa || 0) - amountPaisa;
  sourceAcc.updatedAt = now;

  const lendId = `lend_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const lendRecord = {
    id: lendId,
    borrowerName: borrowerName.trim(),
    originalAmountPaisa: amountPaisa,
    amountRepaidPaisa: 0,
    outstandingBalancePaisa: amountPaisa,
    sourceAccountId,
    date,
    expectedDate,
    notes: notes.trim(),
    createdAt: now,
    updatedAt: now
  };

  const txId = generateTransactionId();
  const tx = {
    id: txId,
    type: 'lending',
    accountId: sourceAccountId,
    amountPaisa,
    date,
    description: `${t('lendingTitle')}: ${borrowerName}`,
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', sourceAcc);
  await dbPut('lending', lendRecord);
  await dbPut('transactions', tx);

  return lendRecord;
}

export async function recordLendingRepayment({ lendingId, depositAccountId, amountPaisa, date, notes = '' }) {
  if (!amountPaisa || amountPaisa <= 0) throw new Error(t('invalidAmount'));

  const lend = await dbGet('lending', lendingId);
  if (!lend) throw new Error('Lending record not found.');

  if (amountPaisa > lend.outstandingBalancePaisa) {
    throw new Error('Repayment amount cannot exceed outstanding balance.');
  }

  const depositAcc = await dbGet('accounts', depositAccountId);
  if (!depositAcc) throw new Error('Deposit account not found.');

  const now = new Date().toISOString();
  depositAcc.current_balance_paisa = (depositAcc.current_balance_paisa || 0) + amountPaisa;
  lend.amountRepaidPaisa = (lend.amountRepaidPaisa || 0) + amountPaisa;
  lend.outstandingBalancePaisa = lend.outstandingBalancePaisa - amountPaisa;
  depositAcc.updatedAt = now;
  lend.updatedAt = now;

  const repId = `rep_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const repRecord = {
    id: repId,
    loanId: lendingId,
    type: 'lending_repayment',
    depositAccountId,
    amountPaisa,
    date,
    notes: notes.trim(),
    createdAt: now
  };

  const txId = generateTransactionId();
  const tx = {
    id: txId,
    type: 'lending_repayment',
    accountId: depositAccountId,
    amountPaisa,
    date,
    description: `${t('repaymentTitle')}: ${lend.borrowerName}`,
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', depositAcc);
  await dbPut('lending', lend);
  await dbPut('loan_repayments', repRecord);
  await dbPut('transactions', tx);

  return repRecord;
}

export async function deleteLendingWithMIS(lendingId, misVerified = false) {
  if (!misVerified) throw new Error('MIS Password Verification Required');
  await dbDelete('lending', lendingId);
  return true;
}

// ==========================================
// PHASE 2: BORROWING MANAGEMENT
// ==========================================
export async function recordBorrowing({ lenderName, amountPaisa, depositAccountId, date, expectedDate = '', notes = '' }) {
  if (!lenderName || !amountPaisa || amountPaisa <= 0) {
    throw new Error('Lender name and positive amount are required.');
  }

  const depositAcc = await dbGet('accounts', depositAccountId);
  if (!depositAcc) throw new Error('Deposit account not found.');

  const now = new Date().toISOString();
  depositAcc.current_balance_paisa = (depositAcc.current_balance_paisa || 0) + amountPaisa;
  depositAcc.updatedAt = now;

  const borrowId = `borrow_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const borrowRecord = {
    id: borrowId,
    lenderName: lenderName.trim(),
    originalAmountPaisa: amountPaisa,
    amountRepaidPaisa: 0,
    outstandingLiabilityPaisa: amountPaisa,
    depositAccountId,
    date,
    expectedDate,
    notes: notes.trim(),
    createdAt: now,
    updatedAt: now
  };

  const txId = generateTransactionId();
  const tx = {
    id: txId,
    type: 'borrowing',
    accountId: depositAccountId,
    amountPaisa,
    date,
    description: `${t('borrowingTitle')}: ${lenderName}`,
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', depositAcc);
  await dbPut('borrowing', borrowRecord);
  await dbPut('transactions', tx);

  return borrowRecord;
}

export async function recordBorrowingRepayment({ borrowingId, sourceAccountId, amountPaisa, date, notes = '' }) {
  if (!amountPaisa || amountPaisa <= 0) throw new Error(t('invalidAmount'));

  const borrow = await dbGet('borrowing', borrowingId);
  if (!borrow) throw new Error('Borrowing record not found.');

  if (amountPaisa > borrow.outstandingLiabilityPaisa) {
    throw new Error('Repayment amount cannot exceed outstanding liability.');
  }

  const sourceAcc = await dbGet('accounts', sourceAccountId);
  if (!sourceAcc) throw new Error('Source account not found.');

  if ((sourceAcc.current_balance_paisa || 0) < amountPaisa) {
    throw new Error(t('insufficientBalance'));
  }

  const now = new Date().toISOString();
  sourceAcc.current_balance_paisa = (sourceAcc.current_balance_paisa || 0) - amountPaisa;
  borrow.amountRepaidPaisa = (borrow.amountRepaidPaisa || 0) + amountPaisa;
  borrow.outstandingLiabilityPaisa = borrow.outstandingLiabilityPaisa - amountPaisa;
  sourceAcc.updatedAt = now;
  borrow.updatedAt = now;

  const repId = `rep_b_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const repRecord = {
    id: repId,
    loanId: borrowingId,
    type: 'borrowing_repayment',
    sourceAccountId,
    amountPaisa,
    date,
    notes: notes.trim(),
    createdAt: now
  };

  const txId = generateTransactionId();
  const tx = {
    id: txId,
    type: 'borrowing_repayment',
    accountId: sourceAccountId,
    amountPaisa,
    date,
    description: `${t('borrowingTitle')} (${t('btnMakeRepayment')}): ${borrow.lenderName}`,
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', sourceAcc);
  await dbPut('borrowing', borrow);
  await dbPut('loan_repayments', repRecord);
  await dbPut('transactions', tx);

  return repRecord;
}

export async function deleteBorrowingWithMIS(borrowingId, misVerified = false) {
  if (!misVerified) throw new Error('MIS Password Verification Required');
  await dbDelete('borrowing', borrowingId);
  return true;
}

// ==========================================
// PHASE 2: USER-DEFINED ACCOUNTS
// ==========================================
export async function createAccount({ name, type = 'bank', openingBalancePaisa = 0 }) {
  if (!name || !name.trim()) throw new Error('Account name is required.');
  const now = new Date().toISOString();
  const accId = `acc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

  const account = {
    id: accId,
    name: name.trim(),
    type,
    opening_balance_paisa: openingBalancePaisa,
    current_balance_paisa: openingBalancePaisa,
    currency: 'BDT',
    createdAt: now,
    updatedAt: now
  };

  await dbPut('accounts', account);
  return account;
}

export async function deleteAccountWithMIS(accountId, misVerified = false) {
  if (!misVerified) throw new Error('MIS Password Verification Required');
  await dbDelete('accounts', accountId);
  return true;
}

