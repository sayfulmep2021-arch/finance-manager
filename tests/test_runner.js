// Automated Test Runner for Phase 1
// Verifies Accounting Math, Precision, MIS Security Gate, and Ledger Integrity

import { openDB, dbGet, dbGetAll, dbPut, dbDelete, initDefaultData } from '../js/db.js';
import { 
  decimalToPaisa, 
  paisaToDecimal, 
  recordTransaction, 
  updateTransaction, 
  deleteTransactionWithMIS,
  getDashboardMetrics,
  getTransactionAuditHistory,
  recordInternalTransfer,
  saveBudget,
  getBudgetsForMonth,
  deleteBudgetWithMIS,
  saveSavingsGoal,
  recordSavingsContribution,
  deleteSavingsGoalWithMIS,
  recordLending,
  recordLendingRepayment,
  deleteLendingWithMIS,
  recordBorrowing,
  recordBorrowingRepayment,
  deleteBorrowingWithMIS,
  createAccount,
  deleteAccountWithMIS
} from '../js/ledger.js';
import { setupMISPassword, verifyMISPassword, changeMISPassword } from '../js/security.js';
import { t, formatMoney, setLanguage, getLanguage, translations } from '../js/i18n.js';
import { generateFinancialReport, runDataQualityAudit } from '../js/reports.js';
import { renderBarChartSvg, renderDonutChartSvg } from '../js/charts.js';
import { buildCSVString, buildExcelXmlString } from '../js/exports.js';
import { 
  generateFullBackup, 
  validateBackupFile, 
  createPreRestoreEmergencyBackup, 
  restoreBackupData, 
  resetAllFinancialDataWithMIS, 
  getStorageStatistics 
} from '../js/backup.js';
import { 
  computeFinancialHealthScorecard, 
  generateFinancialInsights, 
  buildAnonymizedAIPrompt 
} from '../js/assistant.js';

const resultsContainer = document.getElementById('test-results');
const summaryContainer = document.getElementById('test-summary');

let passCount = 0;
let failCount = 0;
const failedTests = [];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

async function runTest(testName, testFn) {
  const item = document.createElement('div');
  item.className = 'test-item';
  try {
    await testFn();
    passCount++;
    item.classList.add('test-pass');
    item.innerHTML = `<span class="badge badge-income">PASS</span> <strong>${testName}</strong>`;
  } catch (err) {
    failCount++;
    failedTests.push({ name: testName, error: err.message, stack: err.stack });
    item.classList.add('test-fail');
    item.innerHTML = `<span class="badge badge-expense">FAIL</span> <strong>${testName}</strong>: <span class="error-msg">${err.message}</span>`;
    console.error(`[FAIL] ${testName}:`, err);
  }
  resultsContainer.appendChild(item);
}

export async function executeAllTests() {
  resultsContainer.innerHTML = '';
  passCount = 0;
  failCount = 0;

  console.log('--- Starting Personal Finance Manager Test Suite ---');

  // Ensure fresh test state across test runs
  const db = await openDB();
  const clearStores = ['transactions', 'budgets', 'savings_goals', 'savings_contributions', 'lending', 'borrowing', 'loan_repayments'];
  for (const s of clearStores) {
    if (db.objectStoreNames.contains(s)) {
      const tx = db.transaction(s, 'readwrite');
      tx.objectStore(s).clear();
      await new Promise(r => { tx.oncomplete = r; });
    }
  }

  // 1. Math & Minor Units Precision Tests
  await runTest('Precision: Decimal string to integer paisa conversion', () => {
    assert(decimalToPaisa('100.50') === 10050, '100.50 must convert to 10050 paisa');
    assert(decimalToPaisa('100.5') === 10050, '100.5 must convert to 10050 paisa');
    assert(decimalToPaisa('500') === 50000, '500 must convert to 50000 paisa');
    assert(decimalToPaisa('0.05') === 5, '0.05 must convert to 5 paisa');
  });

  await runTest('Precision: Integer paisa to decimal string', () => {
    assert(paisaToDecimal(10050) === '100.50', '10050 paisa must format to 100.50');
    assert(paisaToDecimal(500) === '5.00', '500 paisa must format to 5.00');
    assert(paisaToDecimal(5) === '0.05', '5 paisa must format to 0.05');
  });

  await runTest('Precision: IEEE 754 Floating-point drift immunity test', () => {
    // In standard JS: 0.1 + 0.2 === 0.30000000000000004
    // In our poisha integer engine: 10 + 20 === 30
    const p1 = decimalToPaisa('0.10');
    const p2 = decimalToPaisa('0.20');
    const sumPaisa = p1 + p2;
    assert(sumPaisa === 30, '0.10 + 0.20 must equal exactly 30 paisa');
    assert(paisaToDecimal(sumPaisa) === '0.30', 'Paisa sum must format to exactly 0.30');
  });

  await runTest('Validation: Invalid and negative amounts are strictly rejected', () => {
    let errorThrown = false;
    try {
      decimalToPaisa('-50.00');
    } catch (e) {
      errorThrown = true;
    }
    assert(errorThrown, 'Negative amount must be rejected');

    errorThrown = false;
    try {
      decimalToPaisa('abc');
    } catch (e) {
      errorThrown = true;
    }
    assert(errorThrown, 'Alphabetic input must be rejected');

    errorThrown = false;
    try {
      decimalToPaisa('10.123');
    } catch (e) {
      errorThrown = true;
    }
    assert(errorThrown, 'More than 2 decimal digits must be rejected');
  });

  // 2. Bilingual i18n & Currency Formatting Tests
  await runTest('i18n: Dictionary completeness for Bengali and English', () => {
    const bnKeys = Object.keys(translations.bn);
    const enKeys = Object.keys(translations.en);
    assert(bnKeys.length > 30, 'Bengali dictionary must contain core translation keys');
    assert(enKeys.length > 30, 'English dictionary must contain core translation keys');
    assert(translations.bn.appName.length > 0, 'App name must be translated in Bengali');
    assert(translations.en.appName.length > 0, 'App name must be translated in English');
  });

  await runTest('i18n: BDT currency formatting in English and Bengali digits', () => {
    const enMoney = formatMoney(125000, { useBengaliDigits: false });
    assert(enMoney.includes('৳') && enMoney.includes('1,250.00'), `Expected ৳ 1,250.00, got ${enMoney}`);

    const bnMoney = formatMoney(125000, { useBengaliDigits: true });
    assert(bnMoney.includes('৳') && bnMoney.includes('১,২৫০.০০'), `Expected ৳ ১,২৫০.০০, got ${bnMoney}`);
  });

  // 3. Database Initialization & Zero-Demo Policy Test
  await runTest('Database: Clean initialization with zero demo transactions', async () => {
    console.log('[DEBUG] Opening DB / initDefaultData...');
    await initDefaultData();
    console.log('[DEBUG] initDefaultData done. Calling dbGetAll...');
    const allTxs = await dbGetAll('transactions');
    console.log('[DEBUG] dbGetAll done. allTxs count:', allTxs.length);
    assert(Array.isArray(allTxs), 'Transactions must be an array');
    assert(allTxs.length === 0, 'Zero demo transactions policy: transactions table must be empty on fresh install');

    const accounts = await dbGetAll('accounts');
    console.log('[DEBUG] accounts count:', accounts.length);
    assert(accounts.length >= 3, 'Default accounts (Cash, Bank, MFS) must be initialized');
  });

  // 4. MIS Module Cryptographic Security Tests
  await runTest('Security: MIS password length validation (minimum 6 chars)', async () => {
    let errorCaught = false;
    try {
      await setupMISPassword('123', '123');
    } catch (e) {
      errorCaught = true;
    }
    assert(errorCaught, 'MIS password under 6 characters must be rejected');
  });

  await runTest('Security: MIS password mismatch validation', async () => {
    let errorCaught = false;
    try {
      await setupMISPassword('secret123', 'different456');
    } catch (e) {
      errorCaught = true;
    }
    assert(errorCaught, 'Mismatched confirmation password must be rejected');
  });

  await runTest('Security: PBKDF2-SHA256 password setup and verification', async () => {
    await setupMISPassword('Pass@9876', 'Pass@9876');
    const isCorrect = await verifyMISPassword('Pass@9876');
    const isWrong = await verifyMISPassword('WrongPassword');

    assert(isCorrect === true, 'Correct MIS password must verify successfully');
    assert(isWrong === false, 'Incorrect MIS password must fail verification');
  });

  // 5. Ledger & Accounting Integrity Tests
  let testTxId = null;
  const initialAccounts = await dbGetAll('accounts');
  const cashAccount = initialAccounts.find(a => a.id === 'acc_cash');
  const initialCashBalance = cashAccount.current_balance_paisa || 0;

  await runTest('Ledger: Adding Income increases account balance accurately', async () => {
    const tx = await recordTransaction({
      type: 'income',
      amountPaisa: 500000, // ৳ 5,000.00
      date: '2026-10-14',
      categoryId: 'cat_salary',
      accountId: 'acc_cash',
      description: 'Monthly Salary'
    });

    assert(tx && tx.id, 'Transaction must be created with ID');
    testTxId = tx.id;

    const updatedAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    assert(
      updatedAccount.current_balance_paisa === initialCashBalance + 500000,
      `Balance must be ${initialCashBalance + 500000}, got ${updatedAccount.current_balance_paisa}`
    );
  });

  await runTest('Ledger: Adding Expense decreases account balance accurately', async () => {
    const preAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    const preBalance = preAccount.current_balance_paisa;

    const tx = await recordTransaction({
      type: 'expense',
      amountPaisa: 150000, // ৳ 1,500.00
      date: '2026-10-14',
      categoryId: 'cat_food',
      accountId: 'acc_cash',
      description: 'Grocery Shopping'
    });

    assert(tx && tx.id, 'Expense transaction must be created');

    const postAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    assert(
      postAccount.current_balance_paisa === preBalance - 150000,
      `Balance must be ${preBalance - 150000}, got ${postAccount.current_balance_paisa}`
    );
  });

  await runTest('Ledger: Editing transaction preserves audit history and adjusts balance', async () => {
    const preAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    const preBalance = preAccount.current_balance_paisa;

    // Edit testTxId from ৳ 5,000.00 (500000 paisa) to ৳ 6,000.00 (600000 paisa)
    await updateTransaction(testTxId, {
      amountPaisa: 600000,
      description: 'Revised Salary with Bonus'
    }, 'Added festival bonus');

    // Account should gain +100000 paisa
    const postAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    assert(
      postAccount.current_balance_paisa === preBalance + 100000,
      `Balance after edit must be ${preBalance + 100000}, got ${postAccount.current_balance_paisa}`
    );

    // Verify Audit Log
    const audits = await getTransactionAuditHistory(testTxId);
    assert(audits.length >= 1, 'Audit log must record transaction modification');
    assert(audits[0].reason === 'Added festival bonus', 'Audit record must retain the mandatory user reason');
  });

  // 6. Strict Rule 5 Deletion Guard Tests
  await runTest('Safety Rule 5: Deletion WITHOUT verified MIS password is strictly blocked', async () => {
    let blocked = false;
    try {
      await deleteTransactionWithMIS(testTxId, false); // false = unverified!
    } catch (e) {
      blocked = true;
    }

    assert(blocked, 'Rule 5 violation: Deletion without MIS verification must throw an error');

    // Verify transaction was NOT deleted
    const txs = await dbGetAll('transactions');
    const found = txs.some(t => t.id === testTxId);
    assert(found, 'Transaction must not be deleted when MIS verification is false');
  });

  await runTest('Safety Rule 5: Deletion WITH verified MIS password deletes record and reconciles balance', async () => {
    const preAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    const preBalance = preAccount.current_balance_paisa;

    // testTxId is currently 600000 paisa income
    await deleteTransactionWithMIS(testTxId, true); // true = verified with MIS password

    // Check account balance has reversed the income (-600000)
    const postAccount = await dbGetAll('accounts').then(accs => accs.find(a => a.id === 'acc_cash'));
    assert(
      postAccount.current_balance_paisa === preBalance - 600000,
      `Balance after delete must reconcile: expected ${preBalance - 600000}, got ${postAccount.current_balance_paisa}`
    );

    // Verify transaction is deleted from transactions store
    const txs = await dbGetAll('transactions');
    const found = txs.some(t => t.id === testTxId);
    assert(!found, 'Transaction must be removed from transactions store');

    // Clean up expense transaction from test
    for (const tx of txs) {
      await deleteTransactionWithMIS(tx.id, true);
    }
  });

  // 7. Phase 2: Internal Fund Transfers Test
  await runTest('Phase 2 - Internal Fund Transfers: Reconciles balances without inflating income/expense', async () => {
    const bankAcc = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_bank'));
    const cashAcc = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    bankAcc.opening_balance_paisa = 500000;
    bankAcc.current_balance_paisa = 500000;
    cashAcc.opening_balance_paisa = 1000000;
    cashAcc.current_balance_paisa = 1000000;
    await dbPut('accounts', bankAcc);
    await dbPut('accounts', cashAcc);

    const metricsBefore = await getDashboardMetrics('all_time');

    await recordInternalTransfer({
      fromAccountId: 'acc_bank',
      toAccountId: 'acc_cash',
      amountPaisa: 100000,
      date: '2026-10-14',
      description: 'Bank to Cash Withdrawal'
    });

    const updatedBank = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_bank'));
    const updatedCash = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    assert(updatedBank.current_balance_paisa === 400000, 'Bank balance must decrease by 100000');
    assert(updatedCash.current_balance_paisa === 1100000, 'Cash balance must increase by 100000');

    // Rule 14 Verification: Income and Expense must NOT increase!
    const metricsAfter = await getDashboardMetrics('all_time');
    assert(metricsAfter.totalIncomePaisa === metricsBefore.totalIncomePaisa, 'Internal transfer must not inflate total income');
    assert(metricsAfter.totalExpensePaisa === metricsBefore.totalExpensePaisa, 'Internal transfer must not inflate total expense');
  });

  // 8. Phase 2: Budget Management & Thresholds Test
  let testBudgetId = null;
  await runTest('Phase 2 - Budgets: Creation, spending tracking, and status thresholds', async () => {
    const budget = await saveBudget({
      month: '2026-10',
      categoryId: 'cat_food',
      amountPaisa: 200000 // ৳ 2,000.00
    });
    assert(budget && budget.id, 'Budget must be saved');
    testBudgetId = budget.id;

    // Add 150000 expense (75%) -> Normal
    const tx1 = await recordTransaction({
      type: 'expense',
      amountPaisa: 150000,
      date: '2026-10-10',
      categoryId: 'cat_food',
      accountId: 'acc_cash',
      description: 'Grocery'
    });

    let budgets = await getBudgetsForMonth('2026-10');
    let foodBudget = budgets.find(b => b.categoryId === 'cat_food');
    assert(foodBudget.spentPaisa === 150000, 'Spent amount must be 150000');
    assert(foodBudget.status === 'normal', 'Status must be normal at 75%');

    // Add 70000 expense -> Total 220000 (110%) -> Exceeded
    const tx2 = await recordTransaction({
      type: 'expense',
      amountPaisa: 70000,
      date: '2026-10-12',
      categoryId: 'cat_food',
      accountId: 'acc_cash',
      description: 'Dinner'
    });

    budgets = await getBudgetsForMonth('2026-10');
    foodBudget = budgets.find(b => b.categoryId === 'cat_food');
    assert(foodBudget.status === 'exceeded', 'Status must be exceeded when > 100%');
    assert(foodBudget.remainingPaisa < 0, 'Remaining budget must be negative when exceeded');

    // Clean up test transactions
    await deleteTransactionWithMIS(tx1.id, true);
    await deleteTransactionWithMIS(tx2.id, true);
  });

  // 9. Phase 2: Savings Goals & Non-Expense Contributions Test
  let testGoalId = null;
  await runTest('Phase 2 - Savings Goals: Goal creation and isolated contribution', async () => {
    const cashAcc = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    const preCashBalance = cashAcc.current_balance_paisa;

    const goal = await saveSavingsGoal({
      name: 'Emergency Fund',
      targetAmountPaisa: 1000000, // ৳ 10,000.00
      targetDate: '2027-10-14'
    });
    assert(goal && goal.id, 'Goal must be created');
    testGoalId = goal.id;

    // Contribute 250000 paisa (৳ 2,500.00)
    await recordSavingsContribution({
      goalId: testGoalId,
      sourceAccountId: 'acc_cash',
      amountPaisa: 250000,
      date: '2026-10-14'
    });

    const updatedGoal = await dbGet('savings_goals', testGoalId);
    assert(updatedGoal.currentSavingsPaisa === 250000, 'Goal savings must update to 250000');

    const postCash = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    assert(postCash.current_balance_paisa === preCashBalance - 250000, 'Cash balance must be deducted by contribution');

    // Verify Section 11 & 21: Savings contribution must NOT be counted as general expense
    const metrics = await getDashboardMetrics('all_time');
    assert(metrics.totalExpensePaisa === 0, 'Savings contribution must not inflate general expenses');
  });

  // 10. Phase 2: Lending & Partial Repayments Test
  let testLendId = null;
  await runTest('Phase 2 - Lending: Money lent, partial repayments, and overpayment prevention', async () => {
    const cashAcc = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    const preCash = cashAcc.current_balance_paisa;

    const lend = await recordLending({
      borrowerName: 'Rahim',
      amountPaisa: 100000, // ৳ 1,000.00
      sourceAccountId: 'acc_cash',
      date: '2026-10-14'
    });
    assert(lend && lend.id, 'Lending must be recorded');
    testLendId = lend.id;

    const midCash = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_cash'));
    assert(midCash.current_balance_paisa === preCash - 100000, 'Lent cash must be deducted from account');

    // Attempt overpayment
    let overpaymentBlocked = false;
    try {
      await recordLendingRepayment({
        lendingId: testLendId,
        depositAccountId: 'acc_cash',
        amountPaisa: 150000, // Exceeds 100000
        date: '2026-10-14'
      });
    } catch (e) {
      overpaymentBlocked = true;
    }
    assert(overpaymentBlocked, 'Repayment exceeding outstanding balance must be blocked');

    // Partial repayment: 60000 paisa (৳ 600.00)
    await recordLendingRepayment({
      lendingId: testLendId,
      depositAccountId: 'acc_cash',
      amountPaisa: 60000,
      date: '2026-10-14'
    });

    const updatedLend = await dbGet('lending', testLendId);
    assert(updatedLend.outstandingBalancePaisa === 40000, 'Outstanding balance must be 40000 paisa');
    assert(updatedLend.amountRepaidPaisa === 60000, 'Repaid amount must be 60000 paisa');

    // Verify loan repayment is NOT double-counted as earned income
    const metrics = await getDashboardMetrics('all_time');
    assert(metrics.totalIncomePaisa === 0, 'Loan repayment must not inflate earned income');
  });

  // 11. Phase 2: Borrowing & Liability Repayments Test
  let testBorrowId = null;
  await runTest('Phase 2 - Borrowing: Money borrowed and repayments without earned income distortion', async () => {
    const bankAcc = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_bank'));
    const preBank = bankAcc.current_balance_paisa;

    const borrow = await recordBorrowing({
      lenderName: 'Karim',
      amountPaisa: 200000, // ৳ 2,000.00
      depositAccountId: 'acc_bank',
      date: '2026-10-14'
    });
    assert(borrow && borrow.id, 'Borrowing record created');
    testBorrowId = borrow.id;

    const midBank = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_bank'));
    assert(midBank.current_balance_paisa === preBank + 200000, 'Borrowed cash must be added to account');

    // Verify Section 13 & 21: Borrowed money must NOT be classified as earned income
    const metrics = await getDashboardMetrics('all_time');
    assert(metrics.totalIncomePaisa === 0, 'Borrowed cash must not be counted as earned income');

    // Repay 120000 paisa (৳ 1,200.00)
    await recordBorrowingRepayment({
      borrowingId: testBorrowId,
      sourceAccountId: 'acc_bank',
      amountPaisa: 120000,
      date: '2026-10-14'
    });

    const updatedBorrow = await dbGet('borrowing', testBorrowId);
    assert(updatedBorrow.outstandingLiabilityPaisa === 80000, 'Remaining liability must be 80000 paisa');

    const postBank = await dbGetAll('accounts').then(a => a.find(x => x.id === 'acc_bank'));
    assert(postBank.current_balance_paisa === midBank.current_balance_paisa - 120000, 'Repayment deducted from bank');
  });

  // 12. Phase 2: Rule 5 MIS Password Protection on Budgets, Savings, Lending, Borrowing, and Accounts
  await runTest('Phase 2 - Rule 5 MIS Gate: Deletion protection on all Phase 2 entities', async () => {
    // 1. Budget delete without MIS -> blocked
    let blocked = false;
    try { await deleteBudgetWithMIS(testBudgetId, false); } catch (e) { blocked = true; }
    assert(blocked, 'Budget deletion without MIS password must be blocked');

    // 2. Savings Goal delete without MIS -> blocked
    blocked = false;
    try { await deleteSavingsGoalWithMIS(testGoalId, false); } catch (e) { blocked = true; }
    assert(blocked, 'Savings goal deletion without MIS password must be blocked');

    // 3. Lending delete without MIS -> blocked
    blocked = false;
    try { await deleteLendingWithMIS(testLendId, false); } catch (e) { blocked = true; }
    assert(blocked, 'Lending deletion without MIS password must be blocked');

    // 4. Borrowing delete without MIS -> blocked
    blocked = false;
    try { await deleteBorrowingWithMIS(testBorrowId, false); } catch (e) { blocked = true; }
    assert(blocked, 'Borrowing deletion without MIS password must be blocked');

    // 5. User account create and delete with MIS
    const customAcc = await createAccount({ name: 'Special Fund', type: 'bank', openingBalancePaisa: 50000 });
    assert(customAcc && customAcc.id, 'Custom account must be created');

    blocked = false;
    try { await deleteAccountWithMIS(customAcc.id, false); } catch (e) { blocked = true; }
    assert(blocked, 'Account deletion without MIS password must be blocked');

    // Authorized deletion with verified MIS password
    await deleteBudgetWithMIS(testBudgetId, true);
    await deleteSavingsGoalWithMIS(testGoalId, true);
    await deleteLendingWithMIS(testLendId, true);
    await deleteBorrowingWithMIS(testBorrowId, true);
    await deleteAccountWithMIS(customAcc.id, true);

    const checkAcc = await dbGet('accounts', customAcc.id);
    assert(!checkAcc, 'Account must be deleted after verified MIS authorization');
  });

  // 13. Phase 3: Financial Reports Totals & Category Aggregations Test
  await runTest('Phase 3 - Reports: Accurately computes totals and category breakdowns', async () => {
    const txInc = await recordTransaction({
      type: 'income',
      amountPaisa: 500000,
      date: '2026-10-05',
      categoryId: 'cat_salary',
      accountId: 'acc_bank',
      description: 'Consulting Income'
    });

    const txExp = await recordTransaction({
      type: 'expense',
      amountPaisa: 120000,
      date: '2026-10-06',
      categoryId: 'cat_food',
      accountId: 'acc_bank',
      description: 'Weekly Groceries'
    });

    const report = await generateFinancialReport({ startDate: '2026-10-01', endDate: '2026-10-31' });

    assert(report.totalIncomePaisa === 500000, `Expected total income 500000, got ${report.totalIncomePaisa}`);
    assert(report.totalExpensePaisa === 120000, `Expected total expense 120000, got ${report.totalExpensePaisa}`);
    assert(report.netCashFlowPaisa === 380000, `Expected net cash flow 380000, got ${report.netCashFlowPaisa}`);
    assert(report.expenseCategories.length >= 1, 'Expense category breakdown must include cat_food');
    assert(report.expenseCategories[0].amountPaisa === 120000, 'Category amount must match');

    // Clean up
    await deleteTransactionWithMIS(txInc.id, true);
    await deleteTransactionWithMIS(txExp.id, true);
  });

  // 14. Phase 3: Data Exports — CSV with UTF-8 BOM (\uFEFF) and Bengali encoding
  await runTest('Phase 3 - Exports: Generates valid CSV with UTF-8 BOM and Bengali text', () => {
    const records = [
      { date: '2026-10-14', type: 'আয়', category: 'বেতন', description: 'অক্টোবর মাসের বেতন', amount: '5000.00' }
    ];
    const columns = [
      { label: 'তারিখ', key: 'date' },
      { label: 'ধরন', key: 'type' },
      { label: 'খাত', key: 'category' },
      { label: 'বিবরণ', key: 'description' },
      { label: 'পরিমাণ (৳)', key: 'amount' }
    ];

    const csvOutput = buildCSVString(records, columns);
    assert(csvOutput.charCodeAt(0) === 0xFEFF, 'CSV must start with UTF-8 BOM (\\uFEFF) for Excel compatibility');
    assert(csvOutput.includes('অক্টোবর মাসের বেতন'), 'Bengali text must be preserved without distortion');
    assert(csvOutput.includes('"5000.00"'), 'Numeric values must be correctly formatted');
  });

  // 15. Phase 3: Data Exports — Strict Security Check (No secrets or passwords exposed)
  await runTest('Phase 3 - Exports: Zero security secrets/passwords exposed in export output', () => {
    const records = [
      { date: '2026-10-14', description: 'Grocery', amount: '120.00', password: 'secret_leak', hash: 'sha256_leak', salt: 'salt_leak' }
    ];
    const publicColumns = [
      { label: 'Date', key: 'date' },
      { label: 'Description', key: 'description' },
      { label: 'Amount', key: 'amount' }
    ];

    const csvOutput = buildCSVString(records, publicColumns);
    const xmlOutput = buildExcelXmlString(records, publicColumns);

    assert(!csvOutput.includes('secret_leak'), 'CSV must never contain passwords');
    assert(!csvOutput.includes('sha256_leak'), 'CSV must never contain cryptographic hashes');
    assert(!xmlOutput.includes('secret_leak'), 'Excel export must never contain passwords');
    assert(!xmlOutput.includes('sha256_leak'), 'Excel export must never contain cryptographic hashes');
  });

  // 16. Phase 3: SVG Chart Generator: Produces valid SVG markup with correct dimensions
  await runTest('Phase 3 - Charts: Offline SVG bar and donut chart generation', () => {
    const barSvg = renderBarChartSvg({ incomePaisa: 500000, expensePaisa: 200000 });
    assert(typeof barSvg === 'string' && barSvg.includes('<svg') && barSvg.includes('</svg>'), 'Bar chart must return valid SVG');
    assert(barSvg.includes('<rect'), 'Bar chart must render SVG rect elements');

    const donutSvg = renderDonutChartSvg([{ name: 'খাদ্য', amountPaisa: 150000 }], 150000);
    assert(typeof donutSvg === 'string' && donutSvg.includes('<svg') && donutSvg.includes('</svg>'), 'Donut chart must return valid SVG');
    assert(donutSvg.includes('<circle'), 'Donut chart must render SVG circle elements');
  });

  // 17. Phase 3: Data-Quality & Ledger Reconciliation Auditor
  await runTest('Phase 3 - Data-Quality Audit: Double-entry mathematical reconciliation returns PERFECT', async () => {
    const audit = await runDataQualityAudit();
    assert(audit.status === 'PERFECT', `Audit status must be PERFECT, got ${audit.status}`);
    assert(audit.passedCount === audit.totalCount, `All ${audit.totalCount} audit checks must pass`);
    assert(audit.checks.length >= 5, 'Must execute at least 5 integrity checks');
  });

  // 18. Phase 4: Full JSON Backup Generation & SHA-256 Verification (Rule 9)
  let plainBackupResult = null;
  await runTest('Phase 4 - Backup: Generates valid JSON backup with SHA-256 checksum and schema v1', async () => {
    plainBackupResult = await generateFullBackup({ encrypt: false, includeAuditLog: true });
    assert(plainBackupResult && plainBackupResult.envelope, 'Backup result must include envelope');
    assert(plainBackupResult.envelope.schemaVersion === 1, 'Schema version must be 1');
    assert(plainBackupResult.envelope.isEncrypted === false, 'isEncrypted must be false');
    assert(typeof plainBackupResult.envelope.checksum === 'string' && plainBackupResult.envelope.checksum.length === 64, 'Checksum must be 64-character SHA-256 hex string');
    assert(Array.isArray(plainBackupResult.envelope.payload.accounts), 'Payload must contain accounts table');
    assert(plainBackupResult.envelope.payload.accounts.length > 0, 'Accounts table must not be empty');
    assert(plainBackupResult.filename.startsWith('PFM_Backup_'), 'Filename must follow standard pattern');
  });

  // 19. Phase 4: Authenticated AES-256-GCM Encryption & Decryption Roundtrip
  let encryptedBackupResult = null;
  await runTest('Phase 4 - Backup: Authenticated AES-256-GCM encryption and decryption roundtrip', async () => {
    encryptedBackupResult = await generateFullBackup({ encrypt: true, password: 'SecureTestPassword123' });
    assert(encryptedBackupResult.envelope.isEncrypted === true, 'isEncrypted must be true');
    assert(encryptedBackupResult.envelope.encryption.algorithm === 'AES-256-GCM', 'Encryption algorithm must be AES-256-GCM');
    assert(typeof encryptedBackupResult.envelope.payload === 'string', 'Encrypted payload must be ciphertext string');

    // Decrypt and validate with correct password
    const validation = await validateBackupFile(encryptedBackupResult.jsonString, 'SecureTestPassword123');
    assert(validation.isValid === true, `Decryption must succeed: ${validation.error}`);
    assert(validation.tables && Array.isArray(validation.tables.accounts), 'Decrypted tables must contain accounts');
    assert(validation.recordCounts.accounts === plainBackupResult.recordCounts.accounts, 'Decrypted record counts must match plain backup');
  });

  // 20. Phase 4: Decryption Rejection with Wrong Password
  await runTest('Phase 4 - Backup: Decryption fails and aborts cleanly when wrong password is supplied', async () => {
    const wrongValidation = await validateBackupFile(encryptedBackupResult.jsonString, 'IncorrectPassword999');
    assert(wrongValidation.isValid === false, 'Decryption with wrong password must return isValid=false');
    assert(wrongValidation.error.length > 0, 'Must provide informative error message');
  });

  // 21. Phase 4: Strict Structural Validation & Rejection of Malformed Files (Rule 8)
  await runTest('Phase 4 - Validation: Rejects malformed, tampered, or unsupported backup files', async () => {
    // 1. Empty string
    let res = await validateBackupFile('');
    assert(!res.isValid, 'Empty file must be rejected');

    // 2. Corrupted non-JSON string
    res = await validateBackupFile('{ corrupt json [');
    assert(!res.isValid, 'Non-JSON text must be rejected');

    // 3. Unrecognized application backup
    res = await validateBackupFile(JSON.stringify({ app: 'Foreign App', schemaVersion: 1 }));
    assert(!res.isValid, 'Foreign application backup must be rejected');

    // 4. Unsupported schema version
    res = await validateBackupFile(JSON.stringify({ 
      app: 'Personal Finance Manager — Smart Offline Edition', 
      schemaVersion: 999 
    }));
    assert(!res.isValid, 'Unsupported schema version must be rejected');

    // 5. Tampered checksum
    const tampered = JSON.parse(plainBackupResult.jsonString);
    tampered.checksum = '0000000000000000000000000000000000000000000000000000000000000000';
    res = await validateBackupFile(JSON.stringify(tampered));
    assert(!res.isValid, 'Tampered checksum must be detected and rejected');
  });

  // 22. Phase 4: Full Database Restore from Verified Backup
  await runTest('Phase 4 - Restore: Restores database tables and records restore event in audit log', async () => {
    const restoreResult = await restoreBackupData(plainBackupResult.envelope.payload);
    assert(restoreResult.success === true, 'Restore operation must succeed');
    assert(restoreResult.restoredCounts.accounts > 0, 'Restored accounts count must be > 0');

    // Verify audit log has RESTORE_DATABASE event
    const audits = await dbGetAll('audit_log');
    const restoreAudit = audits.find(a => a.action === 'RESTORE_DATABASE');
    assert(restoreAudit, 'Restore event must be logged in audit trail');
  });

  // 23. Phase 4: Strict Rule 5 Deletion Guard on Database Reset
  await runTest('Phase 4 - Safety Rule 5: Database reset WITHOUT MIS password is strictly blocked', async () => {
    let blocked = false;
    try {
      await resetAllFinancialDataWithMIS(false); // false = unverified!
    } catch (e) {
      blocked = true;
    }
    assert(blocked, 'Rule 5: Database reset without MIS verification must be rejected');
  });

  // 24. Phase 4: Authorized Database Reset with Verified MIS Password
  await runTest('Phase 4 - Safety Rule 5: Authorized database reset resets balances and logs audit entry', async () => {
    await resetAllFinancialDataWithMIS(true); // true = verified with MIS password
    const txs = await dbGetAll('transactions');
    assert(txs.length === 0, 'All transactions must be cleared after reset');

    const accounts = await dbGetAll('accounts');
    for (const acc of accounts) {
      assert(acc.current_balance_paisa === 0, `Account ${acc.id} balance must be reset to 0`);
    }

    const audits = await dbGetAll('audit_log');
    const resetAudit = audits.find(a => a.action === 'DATABASE_RESET');
    assert(resetAudit, 'Reset event must be logged in audit trail');
  });

  // 25. Phase 4: Browser Storage Health & Statistics
  await runTest('Phase 4 - Storage Health: Accurately calculates total records and estimated size', async () => {
    const stats = await getStorageStatistics();
    assert(typeof stats.totalRecords === 'number' && stats.totalRecords >= 0, 'Total records must be numeric');
    assert(typeof stats.estimatedSizeKb === 'string', 'Estimated size must be string representation');
    assert(stats.counts.accounts !== undefined, 'Storage stats must report accounts table');
    assert(stats.counts.transactions !== undefined, 'Storage stats must report transactions table');
  });

  // ==========================================
  // PHASE 5: DETERMINISTIC FINANCIAL ASSISTANT & INSIGHTS
  // ==========================================
  
  // 26. Phase 5: Setup Assistant Test Scenario
  await runTest('Phase 5 - Setup: Initializing test scenario with income, expenses, budget & loan', async () => {
    // 1. Add income ৳ 50,000.00
    await recordTransaction({
      type: 'income',
      amountPaisa: 5000000,
      date: '2026-10-01',
      categoryId: 'cat_salary',
      accountId: 'acc_cash',
      description: 'Monthly Salary'
    });

    // 2. Add expense ৳ 20,000.00 in cat_food (66% dominance)
    await recordTransaction({
      type: 'expense',
      amountPaisa: 2000000,
      date: '2026-10-03',
      categoryId: 'cat_food',
      accountId: 'acc_cash',
      description: 'Monthly Grocery'
    });

    // 3. Add expense ৳ 10,000.00 in cat_housing
    await recordTransaction({
      type: 'expense',
      amountPaisa: 1000000,
      date: '2026-10-05',
      categoryId: 'cat_housing',
      accountId: 'acc_cash',
      description: 'House Rent'
    });

    // 4. Save budget for cat_food at ৳ 15,000.00 (spent 20,000 > 15,000 -> Exceeded!)
    await saveBudget({
      month: '2026-10',
      categoryId: 'cat_food',
      amountPaisa: 1500000
    });

    // 5. Record borrowing with overdue expected date
    await recordBorrowing({
      lenderName: 'Kabir Bhai',
      amountPaisa: 500000,
      depositAccountId: 'acc_cash',
      date: '2026-09-01',
      expectedDate: '2026-10-01'
    });

    const txs = await dbGetAll('transactions');
    assert(txs.length >= 3, 'Must have at least 3 transactions recorded');
  });

  // 27. Phase 5: Financial Health Scorecard Metrics Calculation
  await runTest('Phase 5 - Scorecard: Accurately computes savings rate, emergency buffer & ratios', async () => {
    const scorecard = await computeFinancialHealthScorecard();
    assert(scorecard.totalIncomePaisa === 5000000, `Expected income 5000000, got ${scorecard.totalIncomePaisa}`);
    assert(scorecard.totalExpensePaisa === 3000000, `Expected expense 3000000, got ${scorecard.totalExpensePaisa}`);
    assert(scorecard.savingsRate === 40, `Expected savings rate 40%, got ${scorecard.savingsRate}`);
    assert(typeof scorecard.emergencyBufferMonths === 'number', 'Emergency buffer must be numeric');
    assert(scorecard.expenseByCategory['cat_food'] === 2000000, 'Food expense must match 2000000');
  });

  // 28. Phase 5: Anomaly & Insight Detection — Category Spending Dominance
  await runTest('Phase 5 - Insights: Detects category dominance when a single category exceeds 35%', async () => {
    const { insights } = await generateFinancialInsights();
    const dominanceAlert = insights.find(i => i.title.includes('cat_food') || i.title.includes('খাদ্য') || i.title.includes('Food') || i.message.includes('cat_food') || i.message.includes('খাদ্য') || i.message.includes('Food'));
    assert(dominanceAlert !== undefined, 'Must trigger category spending dominance insight for food');
    assert(dominanceAlert.type === 'warning', 'Category dominance insight should have warning type');
  });

  // 29. Phase 5: Budget Overrun Alert Detection
  await runTest('Phase 5 - Insights: Detects and alerts on exceeded monthly category budgets', async () => {
    const { insights } = await generateFinancialInsights();
    const budgetAlert = insights.find(i => i.title.includes('বাজেট অতিক্রম') || i.title.includes('Budget Exceeded'));
    assert(budgetAlert !== undefined, 'Must trigger budget exceeded alert');
    assert(budgetAlert.type === 'critical', 'Exceeded budget alert must be critical type');
  });

  // 30. Phase 5: Overdue Loan Repayment Alerts
  await runTest('Phase 5 - Insights: Triggers reminders for overdue debt repayments', async () => {
    const { insights } = await generateFinancialInsights();
    const loanAlert = insights.find(i => i.title.includes('Kabir Bhai') || i.message.includes('Kabir Bhai'));
    assert(loanAlert !== undefined, 'Must trigger overdue repayment reminder for Kabir Bhai');
  });

  // 31. Phase 5: Privacy-Safe Anonymized Local LLM Prompt Builder
  await runTest('Phase 5 - Local LLM: Builds privacy-safe prompt with zero secrets exposed', async () => {
    const prompt = await buildAnonymizedAIPrompt();
    assert(typeof prompt === 'string' && prompt.length > 50, 'Prompt must be non-empty string');
    assert(prompt.includes('Total Income'), 'Prompt must include summarized financial context');
    assert(!prompt.includes('secret') && !prompt.includes('salt') && !prompt.includes('hash'), 'Prompt must never contain security credentials');
  });

  // ==========================================
  // PHASE 6: FINAL POLISH & SETTINGS VERIFICATION
  // ==========================================
  await runTest('Phase 6 - Settings: MIS password change requires existing password verification', async () => {
    let blocked = false;
    try {
      await changeMISPassword('WrongCurrentPass123', 'NewMisPass2027', 'NewMisPass2027');
    } catch (e) {
      blocked = true;
    }
    assert(blocked, 'Changing MIS password with incorrect existing password must be rejected');

    // Change with correct current password ('Pass@9876' from Test 3)
    await changeMISPassword('Pass@9876', 'NewMisPass2027', 'NewMisPass2027');
    const isNewValid = await verifyMISPassword('NewMisPass2027');
    assert(isNewValid, 'New MIS password must be verified after change');

    // Revert back for consistency
    await changeMISPassword('NewMisPass2027', 'Pass@9876', 'Pass@9876');
  });

  await runTest('Phase 6 - Language: Language persistence and switching works cleanly across all views', () => {
    setLanguage('en');
    assert(getLanguage() === 'en', 'Language must switch to English');
    assert(t('appName') === 'Personal Finance Manager', 'Must retrieve English app name');

    setLanguage('bn');
    assert(getLanguage() === 'bn', 'Language must switch to Bengali');
    assert(t('appName').length > 0, 'Must retrieve Bengali app name');
  });

  // Render Test Summary
  const isAllPassed = failCount === 0;
  summaryContainer.className = `alert ${isAllPassed ? 'alert-income' : 'alert-danger'}`;
  summaryContainer.innerHTML = `
    <h3>${isAllPassed ? '✔ All Phase 1, 2, 3, 4, 5 & 6 Tests Passed Successfully!' : '❌ Some Tests Failed'}</h3>
    <p>Total Tests: <strong>${passCount + failCount}</strong> | Passed: <strong>${passCount}</strong> | Failed: <strong>${failCount}</strong></p>
  `;

  // Output test status in console for headless verification
  console.log(`[TEST_RESULT_TOTAL] ${passCount + failCount}`);
  console.log(`[TEST_RESULT_PASSED] ${passCount}`);
  console.log(`[TEST_RESULT_FAILED] ${failCount}`);
  if (isAllPassed) {
    document.body.setAttribute('data-test-status', 'PASSED');
  } else {
    document.body.setAttribute('data-test-status', 'FAILED');
  }

  // Report results to local test server
  try {
    await fetch('/api/test-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: isAllPassed ? 'PASSED' : 'FAILED',
        total: passCount + failCount,
        passed: passCount,
        failed: failCount,
        failedTests,
        timestamp: new Date().toISOString()
      })
    });
  } catch (e) {
    console.warn('Could not POST results to server (standalone mode):', e);
  }
}

// Auto-run if loaded in test runner HTML
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', executeAllTests);
} else {
  executeAllTests();
}
