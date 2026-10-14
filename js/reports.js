// Financial Reporting & Data-Quality Audit Engine (Phase 3)
// Section 15 & Section 21: Full report aggregations and mathematical ledger verification

import { dbGetAll } from './db.js';
import { t, formatMoney } from './i18n.js';

// Generate structured financial report for any date range and account filter
export async function generateFinancialReport({ startDate = '', endDate = '', accountId = 'all' } = {}) {
  const allTxs = await dbGetAll('transactions');
  const allCategories = await dbGetAll('categories');
  const allAccounts = await dbGetAll('accounts');

  const catMap = {};
  allCategories.forEach(c => { catMap[c.id] = c; });

  const accMap = {};
  allAccounts.forEach(a => { accMap[a.id] = a; });

  // Filter transactions
  const filtered = allTxs.filter(tx => {
    if (accountId !== 'all' && tx.accountId !== accountId && tx.fromAccountId !== accountId && tx.toAccountId !== accountId) {
      return false;
    }
    if (startDate && tx.date < startDate) return false;
    if (endDate && tx.date > endDate) return false;
    return true;
  });

  let totalIncomePaisa = 0;
  let totalExpensePaisa = 0;
  const incomeCategorySums = {};
  const expenseCategorySums = {};

  filtered.forEach(tx => {
    if (tx.type === 'income') {
      totalIncomePaisa += tx.amountPaisa;
      incomeCategorySums[tx.categoryId] = (incomeCategorySums[tx.categoryId] || 0) + tx.amountPaisa;
    } else if (tx.type === 'expense') {
      totalExpensePaisa += tx.amountPaisa;
      expenseCategorySums[tx.categoryId] = (expenseCategorySums[tx.categoryId] || 0) + tx.amountPaisa;
    }
    // Note: transfers, lending, borrowing are isolated from general income/expense
  });

  // Prepare category breakdowns
  const incomeCategories = Object.entries(incomeCategorySums).map(([catId, amountPaisa]) => {
    const cat = catMap[catId];
    return {
      id: catId,
      name: cat ? t(cat.nameKey, cat.name || catId) : catId,
      icon: cat?.icon || '💰',
      amountPaisa,
      percentage: totalIncomePaisa > 0 ? Number(((amountPaisa / totalIncomePaisa) * 100).toFixed(1)) : 0
    };
  }).sort((a, b) => b.amountPaisa - a.amountPaisa);

  const expenseCategories = Object.entries(expenseCategorySums).map(([catId, amountPaisa]) => {
    const cat = catMap[catId];
    return {
      id: catId,
      name: cat ? t(cat.nameKey, cat.name || catId) : catId,
      icon: cat?.icon || '🛒',
      amountPaisa,
      percentage: totalExpensePaisa > 0 ? Number(((amountPaisa / totalExpensePaisa) * 100).toFixed(1)) : 0
    };
  }).sort((a, b) => b.amountPaisa - a.amountPaisa);

  return {
    totalIncomePaisa,
    totalExpensePaisa,
    netCashFlowPaisa: totalIncomePaisa - totalExpensePaisa,
    incomeCategories,
    expenseCategories,
    transactions: filtered,
    totalRecords: filtered.length,
    startDate,
    endDate
  };
}

// Data-Quality & Ledger Reconciliation Auditor (Rule 8 & Section 21)
// Mathematically verifies the integrity of the ledger and balances
export async function runDataQualityAudit() {
  const transactions = await dbGetAll('transactions');
  const accounts = await dbGetAll('accounts');
  const categories = await dbGetAll('categories');
  const lending = await dbGetAll('lending');
  const borrowing = await dbGetAll('borrowing');

  const catIds = new Set(categories.map(c => c.id));
  const accIds = new Set(accounts.map(a => a.id));

  const checks = [];
  let hasCriticalError = false;

  // Check 1: Account Balance Double-Entry Reconciliation
  // For each account: current_balance_paisa must equal opening_balance + sum(credits) - sum(debits)
  for (const acc of accounts) {
    let expectedBalance = acc.opening_balance_paisa || 0;

    for (const tx of transactions) {
      if (tx.type === 'income' && tx.accountId === acc.id) {
        expectedBalance += tx.amountPaisa;
      } else if (tx.type === 'expense' && tx.accountId === acc.id) {
        expectedBalance -= tx.amountPaisa;
      } else if (tx.type === 'transfer') {
        if (tx.toAccountId === acc.id) expectedBalance += tx.amountPaisa;
        if (tx.fromAccountId === acc.id) expectedBalance -= tx.amountPaisa;
      } else if (tx.type === 'savings_contribution' && tx.accountId === acc.id) {
        expectedBalance -= tx.amountPaisa;
      } else if (tx.type === 'lending' && tx.accountId === acc.id) {
        expectedBalance -= tx.amountPaisa;
      } else if (tx.type === 'lending_repayment' && tx.accountId === acc.id) {
        expectedBalance += tx.amountPaisa;
      } else if (tx.type === 'borrowing' && tx.accountId === acc.id) {
        expectedBalance += tx.amountPaisa;
      } else if (tx.type === 'borrowing_repayment' && tx.accountId === acc.id) {
        expectedBalance -= tx.amountPaisa;
      }
    }

    const diff = (acc.current_balance_paisa || 0) - expectedBalance;
    const isPassed = diff === 0;
    if (!isPassed) hasCriticalError = true;

    checks.push({
      name: `হিসাব স্থিতি যাচাই (Account Balance Reconciliation): ${t(acc.nameKey, acc.name || acc.id)}`,
      passed: isPassed,
      detail: isPassed 
        ? `বর্তমান স্থিতি ${formatMoney(acc.current_balance_paisa || 0)} লেজার এন্ট্রির সাথে ১০০% মিলেছে।`
        : `অসঙ্গতি পাওয়া গেছে! প্রত্যাশিত ${formatMoney(expectedBalance)}, কিন্তু স্টোর আছে ${formatMoney(acc.current_balance_paisa || 0)}`
    });
  }

  // Check 2: No Orphan Transactions
  let orphanCount = 0;
  for (const tx of transactions) {
    if (tx.categoryId && !catIds.has(tx.categoryId)) orphanCount++;
    if (tx.accountId && !accIds.has(tx.accountId)) orphanCount++;
  }
  checks.push({
    name: 'সম্পর্কিত ডেটা অখণ্ডতা (Foreign Key Integrity)',
    passed: orphanCount === 0,
    detail: orphanCount === 0 
      ? 'সকল লেনদেনের সংশ্লিষ্ট হিসাব ও খাত বৈধ ও বিদ্যমান।'
      : `${orphanCount}টি লেনদেনে অনুপস্থিত হিসাব বা খাতের তথ্য রয়েছে!`
  });
  if (orphanCount > 0) hasCriticalError = true;

  // Check 3: Lending Mathematical Consistency (original = outstanding + repaid)
  let lendDiscrepancies = 0;
  for (const l of lending) {
    if ((l.outstandingBalancePaisa + l.amountRepaidPaisa) !== l.originalAmountPaisa) {
      lendDiscrepancies++;
    }
  }
  checks.push({
    name: 'ধার প্রদান হিসাব অখণ্ডতা (Lending Ledger Consistency)',
    passed: lendDiscrepancies === 0,
    detail: lendDiscrepancies === 0 
      ? 'সকল প্রদত্ত ধারের বকেয়া এবং পরিশোধিত টাকার যোগফল মূল ধারের সাথে মিলেছে।'
      : `${lendDiscrepancies}টি ধারের রেকর্ডে অসঙ্গতি রয়েছে!`
  });
  if (lendDiscrepancies > 0) hasCriticalError = true;

  // Check 4: Borrowing Mathematical Consistency (original = outstanding + repaid)
  let borrowDiscrepancies = 0;
  for (const b of borrowing) {
    if ((b.outstandingLiabilityPaisa + b.amountRepaidPaisa) !== b.originalAmountPaisa) {
      borrowDiscrepancies++;
    }
  }
  checks.push({
    name: 'গৃহীত ঋণ হিসাব অখণ্ডতা (Borrowing Ledger Consistency)',
    passed: borrowDiscrepancies === 0,
    detail: borrowDiscrepancies === 0 
      ? 'সকল গৃহীত ঋণের বকেয়া দায় ও পরিশোধিত টাকার যোগফল মূল ঋণের সাথে মিলেছে।'
      : `${borrowDiscrepancies}টি ঋণের রেকর্ডে অসঙ্গতি রয়েছে!`
  });
  if (borrowDiscrepancies > 0) hasCriticalError = true;

  // Check 5: Integer Minor Unit Strictness (No floating point decimals in database)
  let invalidFloatCount = 0;
  for (const tx of transactions) {
    if (!Number.isInteger(tx.amountPaisa) || tx.amountPaisa <= 0) {
      invalidFloatCount++;
    }
  }
  checks.push({
    name: 'পয়সা ইন্টিজার নির্ভুলতা (Integer Minor Unit Precision)',
    passed: invalidFloatCount === 0,
    detail: invalidFloatCount === 0 
      ? 'সকল লেনদেনের টাকার মান নিখুঁত পূর্ণসংখ্যায় (Minor Unit Paisa) সংরক্ষিত।'
      : `${invalidFloatCount}টি লেনদেনে ফ্লোটিং পয়েন্ট বা অবৈধ টাকার মান পাওয়া গেছে!`
  });
  if (invalidFloatCount > 0) hasCriticalError = true;

  return {
    status: hasCriticalError ? 'WARNING' : 'PERFECT',
    passedCount: checks.filter(c => c.passed).length,
    totalCount: checks.length,
    checks,
    timestamp: new Date().toISOString()
  };
}
