// Deterministic Rule-Based Financial Assistant & Insights Engine
// 100% Offline, Zero-Cost, Private, Bilingual (Bengali & English)
// Strict Rule 3 Compliance: Assistant NEVER modifies, creates, or deletes financial records.

import { dbGetAll } from './db.js';
import { t, formatMoney, toBengaliNumerals, getLanguage } from './i18n.js';

// 1. Compute Financial Health Scorecard
export async function computeFinancialHealthScorecard() {
  const accounts = await dbGetAll('accounts');
  const transactions = await dbGetAll('transactions');
  const savingsGoals = await dbGetAll('savings_goals');
  const lending = await dbGetAll('lending');
  const borrowing = await dbGetAll('borrowing');

  // Total Liquid Cash & Bank Balances
  let liquidBalancePaisa = 0;
  for (const acc of accounts) {
    liquidBalancePaisa += (acc.current_balance_paisa || 0);
  }

  // Total In Savings Goals
  let totalSavingsPaisa = 0;
  for (const g of savingsGoals) {
    totalSavingsPaisa += (g.currentSavingsPaisa || 0);
  }

  // Total Outstanding Lending (Receivables)
  let outstandingLendingPaisa = 0;
  for (const l of lending) {
    outstandingLendingPaisa += (l.outstandingBalancePaisa || 0);
  }

  // Total Outstanding Borrowing (Liabilities)
  let outstandingLiabilityPaisa = 0;
  for (const b of borrowing) {
    outstandingLiabilityPaisa += (b.outstandingLiabilityPaisa || 0);
  }

  // Compute Income & Expense from transactions
  let totalIncomePaisa = 0;
  let totalExpensePaisa = 0;
  const expenseByCategory = {};
  const monthlyExpenses = {}; // YYYY-MM -> total paisa

  for (const tx of transactions) {
    if (tx.type === 'income') {
      totalIncomePaisa += tx.amountPaisa;
    } else if (tx.type === 'expense') {
      totalExpensePaisa += tx.amountPaisa;

      if (tx.categoryId) {
        expenseByCategory[tx.categoryId] = (expenseByCategory[tx.categoryId] || 0) + tx.amountPaisa;
      }

      if (tx.date) {
        const monthKey = tx.date.substring(0, 7);
        monthlyExpenses[monthKey] = (monthlyExpenses[monthKey] || 0) + tx.amountPaisa;
      }
    }
  }

  const netCashFlowPaisa = totalIncomePaisa - totalExpensePaisa;

  // 1. Savings Rate (%) = (Net Cash Flow / Total Income) * 100
  let savingsRate = 0;
  if (totalIncomePaisa > 0) {
    savingsRate = Math.max(0, Math.round((netCashFlowPaisa / totalIncomePaisa) * 100));
  }

  // 2. Average Monthly Expense (based on recorded months or total)
  const distinctMonths = Object.keys(monthlyExpenses).length || 1;
  const avgMonthlyExpensePaisa = Math.round(totalExpensePaisa / distinctMonths) || (totalExpensePaisa > 0 ? totalExpensePaisa : 1);

  // 3. Emergency Buffer in Months = Total Available Reserves / Average Monthly Expense
  const totalAvailableReserves = liquidBalancePaisa + totalSavingsPaisa;
  const emergencyBufferMonths = avgMonthlyExpensePaisa > 0
    ? (totalAvailableReserves / avgMonthlyExpensePaisa).toFixed(1)
    : '0.0';

  // 4. Debt-to-Income Ratio (%) = Total Liabilities / Total Income
  let debtToIncomeRatio = 0;
  if (totalIncomePaisa > 0) {
    debtToIncomeRatio = Math.round((outstandingLiabilityPaisa / totalIncomePaisa) * 100);
  }

  return {
    liquidBalancePaisa,
    totalSavingsPaisa,
    totalAvailableReserves,
    outstandingLendingPaisa,
    outstandingLiabilityPaisa,
    totalIncomePaisa,
    totalExpensePaisa,
    netCashFlowPaisa,
    savingsRate,
    emergencyBufferMonths: parseFloat(emergencyBufferMonths),
    avgMonthlyExpensePaisa,
    expenseByCategory,
    distinctMonths
  };
}

// 2. Generate Rule-Based Deterministic Insights
export async function generateFinancialInsights() {
  const scorecard = await computeFinancialHealthScorecard();
  const budgets = await dbGetAll('budgets');
  const transactions = await dbGetAll('transactions');
  const lending = await dbGetAll('lending');
  const borrowing = await dbGetAll('borrowing');
  const categories = await dbGetAll('categories');

  const catMap = {};
  for (const c of categories) {
    catMap[c.id] = c;
  }

  const isBn = getLanguage() === 'bn';
  const insights = [];

  // ==========================================
  // INSIGHT 1: EMERGENCY BUFFER EVALUATION
  // ==========================================
  const buffer = scorecard.emergencyBufferMonths;
  if (scorecard.totalExpensePaisa === 0 && scorecard.totalIncomePaisa === 0) {
    insights.push({
      type: 'info',
      icon: '💡',
      title: isBn ? 'নতুন যাত্রা শুরু করুন' : 'Begin Your Financial Journey',
      message: isBn
        ? 'আপনার ড্যাশবোর্ডে এখনও কোনো আয় বা ব্যয় নেই। আপনার দৈনিক লেনদেন এন্ট্রি করা শুরু করুন যাতে আমরা আপনার আর্থিক স্বাস্থ্য বিশ্লেষণ করতে পারি।'
        : 'No income or expenses recorded yet. Start tracking your daily transactions to receive automated financial health analysis.'
    });
  } else if (buffer < 1.0) {
    insights.push({
      type: 'critical',
      icon: '⚠️',
      title: isBn ? 'জরুরি রিজার্ভ ঝুঁকিপূর্ণ (< ১ মাস)' : 'Emergency Reserve Vulnerable (< 1 Month)',
      message: isBn
        ? `আপনার বর্তমান সঞ্চিত তহবিল (${formatMoney(scorecard.totalAvailableReserves)}) গড়ে ১ মাসের খরচের চেয়ে কম (${buffer} মাস)। অনাকাঙ্ক্ষিত বিপদ এড়াতে প্রতি মাসে আয়ের অন্তত ১০-২০% সঞ্চয় লক্ষ্যে জমা রাখার চেষ্টা করুন।`
        : `Your liquid reserves (${formatMoney(scorecard.totalAvailableReserves)}) cover less than 1 month of average expenses (${buffer} months). Aim to save 10-20% of your income into an emergency fund.`
    });
  } else if (buffer >= 1.0 && buffer < 3.0) {
    insights.push({
      type: 'warning',
      icon: '🌱',
      title: isBn ? 'জরুরি তহবিল গঠন প্রক্রিয়ায় রয়েছে (১-৩ মাস)' : 'Emergency Fund In Progress (1-3 Months)',
      message: isBn
        ? `আপনার বর্তমান রিজার্ভ প্রায় ${isBn ? toBengaliNumerals(buffer) : buffer} মাসের খরচের সমান। আর্থিক নিরাপত্তার জন্য এটিকে অন্তত ৩ থেকে ৬ মাসের খরচের সমান পরিমাণে উন্নীত করার লক্ষ্য নিন।`
        : `Your emergency buffer covers approximately ${buffer} months of expenses. Target increasing this to 3 to 6 months for solid financial security.`
    });
  } else {
    insights.push({
      type: 'positive',
      icon: '🛡️',
      title: isBn ? 'চমৎকার জরুরি তহবিল সুরক্ষা (৩+ মাস)' : 'Robust Emergency Cushion (3+ Months)',
      message: isBn
        ? `অভিনন্দন! আপনার প্রায় ${isBn ? toBengaliNumerals(buffer) : buffer} মাসের প্রয়োজনীয় খরচের রিজার্ভ রয়েছে (${formatMoney(scorecard.totalAvailableReserves)})। এটি আপনাকে যে কোনো আকস্মিক আর্থিক ঝুঁকি থেকে রক্ষা করবে।`
        : `Congratulations! Your reserves (${formatMoney(scorecard.totalAvailableReserves)}) cover ${buffer} months of living expenses, providing strong financial resilience.`
    });
  }

  // ==========================================
  // INSIGHT 2: SAVINGS RATE ANALYSIS
  // ==========================================
  if (scorecard.totalIncomePaisa > 0) {
    const rate = scorecard.savingsRate;
    const rateDisplay = isBn ? toBengaliNumerals(rate) : rate;
    if (rate >= 20) {
      insights.push({
        type: 'positive',
        icon: '🎯',
        title: isBn ? `উচ্চ সঞ্চয় হার (${rateDisplay}%)` : `Healthy Savings Rate (${rate}%)`,
        message: isBn
          ? `আপনার সঞ্চয়ের হার ${rateDisplay}%, যা আদর্শ আর্থিক মানের (২০%+) চেয়ে ভালো। এই ধারাবাহিকতা আপনার দীর্ঘমেয়াদী আর্থিক লক্ষ্য অর্জনে সহায়ক হবে।`
          : `Your savings rate is ${rate}%, surpassing the standard 20% benchmark. Maintaining this rate supports long-term wealth accumulation.`
      });
    } else if (rate > 0 && rate < 20) {
      insights.push({
        type: 'info',
        icon: '📈',
        title: isBn ? `সঞ্চয় হার বাড়ানোর সুযোগ (${rateDisplay}%)` : `Room to Improve Savings Rate (${rate}%)`,
        message: isBn
          ? `আপনার সঞ্চয়ের হার ${rateDisplay}%। অপ্রয়োজনীয় ছোটখাটো খরচ হ্রাস করে সঞ্চয় ২০%-এ নিয়ে যাওয়ার চেষ্টা করতে পারেন।`
          : `Your savings rate is currently ${rate}%. Trimming discretionary expenses could help raise it toward the 20% target.`
      });
    } else if (scorecard.netCashFlowPaisa < 0) {
      insights.push({
        type: 'critical',
        icon: '🚨',
        title: isBn ? 'আয়ের চেয়ে ব্যয় বেশি (নেতিবাচক ক্যাশ ফ্লো)' : 'Negative Cash Flow (Expenses Exceed Income)',
        message: isBn
          ? `আপনার মোট ব্যয় আয়ের চেয়ে ${formatMoney(Math.abs(scorecard.netCashFlowPaisa))} বেশি। ঋণ বা জমানো টাকার ক্ষয়রোধ করতে অবিলম্বে খরচের খাতগুলো পুনর্বিবেচনা করুন।`
          : `Your expenses exceed total income by ${formatMoney(Math.abs(scorecard.netCashFlowPaisa))}. Review top expense categories immediately to prevent reserve depletion.`
      });
    }
  }

  // ==========================================
  // INSIGHT 3: CATEGORY SPENDING DOMINANCE
  // ==========================================
  if (scorecard.totalExpensePaisa > 0) {
    const catEntries = Object.entries(scorecard.expenseByCategory)
      .sort((a, b) => b[1] - a[1]);

    if (catEntries.length > 0) {
      const [topCatId, topAmount] = catEntries[0];
      const topCat = catMap[topCatId];
      const topCatName = topCat ? t(topCat.nameKey, topCat.name || topCatId) : topCatId;
      const topPct = Math.round((topAmount / scorecard.totalExpensePaisa) * 100);

      if (topPct >= 35) {
        insights.push({
          type: 'warning',
          icon: '📊',
          title: isBn ? `প্রধান খরচের খাত: ${topCatName} (${isBn ? toBengaliNumerals(topPct) : topPct}%)` : `Top Spending Category: ${topCatName} (${topPct}%)`,
          message: isBn
            ? `আপনার মোট ব্যয়ের ${isBn ? toBengaliNumerals(topPct) : topPct}% খরচ হচ্ছে "${topCatName}" খাতে (${formatMoney(topAmount)})। এই খাতে মাসিক বাজেট নির্ধারণ করে খরচ নিয়ন্ত্রণ করা যেতে পারে।`
            : `"${topCatName}" accounts for ${topPct}% of your total expenses (${formatMoney(topAmount)}). Establishing a monthly category budget can help optimize this outflow.`
        });
      }
    }
  }

  // ==========================================
  // INSIGHT 4: BUDGET EXCEEDED ALERTS
  // ==========================================
  const currentMonthStr = new Date().toISOString().substring(0, 7);
  const currentMonthBudgets = budgets.filter(b => b.month === currentMonthStr);

  for (const b of currentMonthBudgets) {
    const cat = catMap[b.categoryId];
    const catName = cat ? t(cat.nameKey, cat.name || b.categoryId) : b.categoryId;

    // Calculate spent for this month in this category
    let spentPaisa = 0;
    for (const tx of transactions) {
      if (tx.type === 'expense' && tx.categoryId === b.categoryId && tx.date && tx.date.startsWith(currentMonthStr)) {
        spentPaisa += tx.amountPaisa;
      }
    }

    if (spentPaisa > b.amountPaisa) {
      const overPaisa = spentPaisa - b.amountPaisa;
      insights.push({
        type: 'critical',
        icon: '⚠️',
        title: isBn ? `বাজেট অতিক্রম: ${catName}` : `Budget Exceeded: ${catName}`,
        message: isBn
          ? `চলতি মাসে "${catName}" খাতে বাজেট ছিল ${formatMoney(b.amountPaisa)}, কিন্তু খরচ হয়েছে ${formatMoney(spentPaisa)} (অতিরিক্ত ${formatMoney(overPaisa)})।`
          : `Expenses for "${catName}" have reached ${formatMoney(spentPaisa)}, exceeding the monthly budget of ${formatMoney(b.amountPaisa)} by ${formatMoney(overPaisa)}.`
      });
    } else if (spentPaisa >= b.amountPaisa * 0.8) {
      insights.push({
        type: 'warning',
        icon: '🔔',
        title: isBn ? `বাজেট সীমার কাছাকাছি: ${catName}` : `Approaching Budget Limit: ${catName}`,
        message: isBn
          ? `চলতি মাসে "${catName}" খাতে বাজেটের ৮০% এর বেশি খরচ হয়ে গেছে (${formatMoney(spentPaisa)} / ${formatMoney(b.amountPaisa)})। বাকি দিনগুলোতে সতর্ক থাকুন।`
          : `You have utilized over 80% of your budget for "${catName}" (${formatMoney(spentPaisa)} of ${formatMoney(b.amountPaisa)}).`
      });
    }
  }

  // ==========================================
  // INSIGHT 5: LOAN & LENDING REPAYMENT REMINDERS
  // ==========================================
  const todayStr = new Date().toISOString().substring(0, 10);

  // 1. Overdue Borrowing (Money I owe)
  for (const borrow of borrowing) {
    const dueDate = borrow.expectedDate || borrow.expectedRepaymentDate;
    if (borrow.outstandingLiabilityPaisa > 0 && dueDate) {
      if (dueDate <= todayStr) {
        insights.push({
          type: 'critical',
          icon: '💳',
          title: isBn ? `বকেয়া ঋণ পরিশোধের তাগিদ: ${borrow.lenderName}` : `Overdue Debt Repayment: ${borrow.lenderName}`,
          message: isBn
            ? `${borrow.lenderName}-এর নিকট আপনার বকেয়া দায় ${formatMoney(borrow.outstandingLiabilityPaisa)}। পরিশোধের নির্ধারিত তারিখ (${dueDate}) উত্তীর্ণ হয়েছে।`
            : `You have an overdue debt of ${formatMoney(borrow.outstandingLiabilityPaisa)} to ${borrow.lenderName}. Expected date: ${dueDate}.`
        });
      }
    }
  }

  // 2. Overdue Lending (Money owed to me)
  for (const lend of lending) {
    const dueDate = lend.expectedDate || lend.expectedRepaymentDate;
    if (lend.outstandingBalancePaisa > 0 && dueDate) {
      if (dueDate <= todayStr) {
        insights.push({
          type: 'info',
          icon: '🤝',
          title: isBn ? `প্রদত্ত ধার আদায়ের তাগিদ: ${lend.borrowerName}` : `Receivable Follow-Up: ${lend.borrowerName}`,
          message: isBn
            ? `${lend.borrowerName}-এর নিকট আপনার বকেয়া পাওনা ${formatMoney(lend.outstandingBalancePaisa)}। ফেরত দেওয়ার তারিখ (${dueDate}) পার হয়েছে। অনুগ্রহ করে যোগাযোগ করুন।`
            : `${lend.borrowerName} has an overdue repayment of ${formatMoney(lend.outstandingBalancePaisa)} to you. Expected date was ${dueDate}.`
        });
      }
    }
  }

  return {
    scorecard,
    insights,
    generatedAt: new Date().toISOString()
  };
}

// 3. Optional Local LLM Anonymized Financial Prompt Builder (Section 16)
// Compiles aggregate figures into a natural language prompt for optional external/local LLM
export async function buildAnonymizedAIPrompt() {
  const scorecard = await computeFinancialHealthScorecard();
  const isBn = getLanguage() === 'bn';

  return `
[SYSTEM: You are a professional, privacy-conscious personal finance advisor.]
[CONTEXT: User Financial Health Overview - BDT (৳)]
- Total Income: ${formatMoney(scorecard.totalIncomePaisa, { useBengaliDigits: false })}
- Total Expenses: ${formatMoney(scorecard.totalExpensePaisa, { useBengaliDigits: false })}
- Net Cash Flow: ${formatMoney(scorecard.netCashFlowPaisa, { useBengaliDigits: false })}
- Total Liquid Balance: ${formatMoney(scorecard.liquidBalancePaisa, { useBengaliDigits: false })}
- Total Savings Goals: ${formatMoney(scorecard.totalSavingsPaisa, { useBengaliDigits: false })}
- Emergency Buffer: ${scorecard.emergencyBufferMonths} months of living expenses
- Savings Rate: ${scorecard.savingsRate}%
- Outstanding Liabilities: ${formatMoney(scorecard.outstandingLiabilityPaisa, { useBengaliDigits: false })}
- Outstanding Receivables: ${formatMoney(scorecard.outstandingLendingPaisa, { useBengaliDigits: false })}

[INSTRUCTION]
Provide 3 concise, practical, and non-binding personal financial improvement recommendations ${isBn ? 'in Bengali (বাংলা)' : 'in English'}. Focus on emergency fund building, category spending reduction, and debt minimization.
`.trim();
}
