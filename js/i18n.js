// Bilingual Internationalization (i18n) Engine
// Supports Bengali (Default) and English

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export const translations = {
  bn: {
    // App Branding
    appName: "পার্সোনাল ফাইন্যান্স ম্যানেজার",
    appSubtitle: "স্মার্ট অফলাইন সংস্করণ",
    offlineBadge: "১০০% অফলাইন ও নিরাপদ",
    currencySymbol: "৳",
    currencyCode: "BDT",

    // Navigation
    navDashboard: "ড্যাশবোর্ড",
    navIncome: "আয় যুক্ত করুন",
    navExpenses: "ব্যয় যুক্ত করুন",
    navTransactions: "লেনদেন খতিয়ান",
    navBudgets: "বাজেট ব্যবস্থাপনা",
    navSavings: "সঞ্চয় লক্ষ্য",
    navLending: "ধার প্রদান",
    navBorrowing: "ঋণ গ্রহণ",
    navAccounts: "হিসাব ও নগদ",
    navReports: "রিপোর্ট (আসন্ন)",
    navSecurity: "নিরাপত্তা ও MIS",
    navSettings: "সেটিংস",

    // Top Bar & Controls
    langSwitch: "English",
    misStatusActive: "MIS নিরাপত্তা: সক্রিয়",
    misStatusInactive: "MIS পাসওয়ার্ড সেট করা নেই",
    appLocked: "অ্যাপ লক করা আছে",
    btnLock: "লক করুন",
    btnInstallApp: "ইনস্টল করুন",
    appInstalledSuccess: "অ্যাপ সফলভাবে ইনস্টল হয়েছে!",

    // Mobile App UI Strings
    greetingMorning: "শুভ সকাল",
    greetingAfternoon: "শুভ অপরাহ্ন",
    greetingEvening: "শুভ সন্ধ্যা",
    greetingGeneral: "স্বাগতম",
    userGreetingName: "ব্যবহারকারী",
    walletTotalBalance: "মোট ওয়ালেট ব্যালেন্স",
    tabExpense: "ব্যয়ের তালিকা",
    tabIncome: "আয়ের তালিকা",
    accountsTitle: "আমার হিসাবসমূহ",
    spentRatio: "ব্যয়",
    savedRatio: "সঞ্চয়",
    quickActionTitle: "দ্রুত নতুন এন্ট্রি যোগ করুন",
    qaAddExpense: "নতুন ব্যয় যুক্ত করুন",
    qaAddIncome: "নতুন আয় যুক্ত করুন",
    qaTransfer: "হিসাব পরিবর্তন / ট্রান্সফার",
    bnavHome: "হোম",
    bnavTransactions: "খতিয়ান",
    bnavSavings: "সঞ্চয়",
    bnavLoans: "ঋণ ও ধার",
    bnavReports: "রিপোর্ট",

    // Dashboard Cards
    cardTotalIncome: "মোট আয়",
    cardTotalExpense: "মোট ব্যয়",
    cardNetCashFlow: "নিট ক্যাশ ফ্লো",
    cardTotalBalance: "মোট বর্তমান স্থিতি",
    thisMonth: "চলতি মাস",
    lastMonth: "গত মাস",
    thisYear: "চলতি বছর",
    allTime: "সর্বমোট সময়",
    filterPeriod: "সময়কাল নির্বাচন করুন",
    filterAccount: "হিসাব নির্বাচন করুন",
    allAccounts: "সকল হিসাব",

    // Dashboard Sections
    recentTransactions: "সাম্প্রতিক লেনদেনসমূহ",
    expenseBreakdown: "খাতভিত্তিক ব্যয়ের বিশ্লেষণ",
    viewAllTransactions: "সকল লেনদেন দেখুন",
    noTransactionsYet: "এখনো কোনো লেনদেন যুক্ত করা হয়নি।",
    noTransactionsDesc: "আপনার আয় অথবা ব্যয়ের হিসাব সংরক্ষণ শুরু করতে উপরের বোতাম ব্যবহার করুন।",
    noExpenseCategories: "নির্বাচিত সময়ে কোনো খরচের রেকর্ড পাওয়া যায়নি।",

    // Income Form
    incomeTitle: "নতুন আয় যুক্ত করুন",
    incomeSubtitle: "আপনার উপার্জিত অর্থের সঠিক হিসাব সংরক্ষণ করুন",
    date: "তারিখ",
    amount: "টাকার পরিমাণ (BDT ৳)",
    category: "আয়ের খাত",
    account: "জমা হিসাব",
    description: "উৎস বা বিবরণ",
    notes: "অতিরিক্ত নোট (ঐচ্ছিক)",
    btnAddIncome: "আয় সংরক্ষণ করুন",
    selectCategory: "-- খাত নির্বাচন করুন --",
    selectAccount: "-- হিসাব নির্বাচন করুন --",

    // Expense Form
    expenseTitle: "নতুন ব্যয় যুক্ত করুন",
    expenseSubtitle: "আপনার প্রাত্যহিক খরচ সঠিকভাবে নথিভুক্ত করুন",
    merchant: "বিবরণ বা মার্চেন্ট",
    paymentMethod: "পেমেন্ট মাধ্যম",
    tags: "ট্যাগসমূহ (কমা দিয়ে লিখুন, ঐচ্ছিক)",
    btnAddExpense: "ব্যয় সংরক্ষণ করুন",

    // Transactions Ledger
    ledgerTitle: "একীভূত লেনদেন খতিয়ান",
    ledgerSubtitle: "সকল অনুমোদিত আর্থিক লেনদেনের পূর্ণাঙ্গ বিবরণ ও অডিট হিস্টোরি",
    searchPlaceholder: "বিবরণ বা বিবরণী দিয়ে খুঁজুন...",
    filterType: "লেনদেনের ধরন",
    allTypes: "সকল ধরন",
    typeIncome: "আয়",
    typeExpense: "ব্যয়",
    sortOrder: "সাজানোর ক্রম",
    newestFirst: "নতুন আগে",
    oldestFirst: "পুরাতন আগে",
    colDate: "তারিখ",
    colType: "ধরন",
    colCategory: "খাত",
    colDescription: "বিবরণ",
    colAccount: "হিসাব",
    colAmount: "পরিমাণ",
    colActions: "পদক্ষেপ",
    btnView: "বিস্তারিত",
    btnEdit: "সম্পাদনা",
    btnDelete: "মুছুন",
    noMatchingRecords: "কোনো লেনদেন খুঁজে পাওয়া যায়নি।",

    // Review & Confirmation Modal
    confirmTitle: "তথ্য নিশ্চিতকরণ ও পূর্বরূপ",
    confirmNotice: "অনুগ্রহ করে সংরক্ষণের পূর্বে লেনদেনের তথ্য সতর্কতার সাথে যাচাই করুন:",
    confirmType: "লেনদেনের ধরন:",
    confirmAmount: "টাকার পরিমাণ:",
    confirmAccount: "হিসাব ও উদ্বৃত্ত প্রভাব:",
    confirmDate: "তারিখ:",
    confirmCategory: "খাত:",
    confirmDesc: "বিবরণ:",
    btnConfirmSave: "হ্যাঁ, নিশ্চিতভাবে সংরক্ষণ করুন",
    btnCancel: "বাতিল",

    // Edit Modal
    editTitle: "লেনদেন সম্পাদনা করুন",
    editNotice: "সতর্কতা: ঐতিহাসিক লেনদেন পরিবর্তন করার ক্ষেত্রে একটি অডিট লগ সংরক্ষিত হবে।",
    editReason: "পরিবর্তনের কারণ (বাধ্যতামূলক)",
    editReasonPlaceholder: "ভুল টাকার পরিমাণ / ভুল খাত ইত্যাদি...",
    btnSaveEdit: "সম্পাদনা নিশ্চিত করুন",

    // Transaction Details Modal
    txDetailsTitle: "লেনদেনের বিস্তারিত বিবরণ",
    txId: "লেনদেন আইডি:",
    txCreatedAt: "তৈরির সময়:",
    txUpdatedAt: "সর্বশেষ পরিবর্তন:",
    txAuditHistory: "অডিট ইতিহাস (Audit Trail)",
    noAuditHistory: "কোনো পূর্ববর্তী সংশোধন করা হয়নি। এটি মূল অনুমোদিত এন্ট্রি।",

    // MIS Security Module
    misModalTitle: "MIS মডিউল নিরাপত্তা গেট",
    misSetupTitle: "MIS মডিউল পাসওয়ার্ড সেটআপ",
    misSetupNotice: "যে কোনো আর্থিক তথ্য মোছার জন্য MIS পাসওয়ার্ড আবশ্যক। একটি নিরাপদ পাসওয়ার্ড নির্ধারণ করুন।",
    misPasswordLabel: "MIS পাসওয়ার্ড প্রদান করুন",
    misPasswordNew: "নতুন MIS পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)",
    misPasswordConfirm: "পাসওয়ার্ড নিশ্চিত করুন",
    misBtnSetup: "MIS পাসওয়ার্ড সংরক্ষণ করুন",
    misBtnVerifyDelete: "পাসওয়ার্ড যাচাই করে মুছে ফেলুন",
    misWarningDelete: "সতর্কতা: এই লেনদেনটি স্থায়ীভাবে মুছে যাবে এবং সংশ্লিষ্ট হিসাবের স্থিতি স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে। কোনো লুকানো বাইপাস নেই।",
    misErrorWrong: "ভুল MIS পাসওয়ার্ড! মুছে ফেলার অনুরোধ বাতিল করা হয়েছে।",
    misErrorMismatch: "পাসওয়ার্ড দুটি মেলেনি। আবার চেষ্টা করুন।",
    misErrorLength: "পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।",
    misConfiguredSuccess: "MIS মডিউল পাসওয়ার্ড সফলভাবে সংরক্ষিত হয়েছে!",
    misDeletionDisabledNotice: "মুছে ফেলা নিষ্ক্রিয়: কোনো MIS পাসওয়ার্ড সেট করা নেই। মুছে ফেলার পূর্বে MIS পাসওয়ার্ড সেটআপ করুন।",

    // Common Messages & Validations
    fieldRequired: "এই ঘরটি পূরণ করা আবশ্যক।",
    invalidAmount: "অনুগ্রহ করে একটি সঠিক ও ধনাত্মক টাকার পরিমাণ লিখুন (যেমন: ১০০ অথবা ২৫০.৫০)।",
    invalidDate: "সঠিক তারিখ নির্বাচন করুন।",
    saving: "সংরক্ষণ করা হচ্ছে...",
    saveSuccess: "লেনদেনটি সফলভাবে সংরক্ষিত হয়েছে!",
    editSuccess: "লেনদেনটি সফলভাবে আপডেট করা হয়েছে এবং অডিট লগ সংরক্ষিত হয়েছে।",
    deleteSuccess: "লেনদেনটি সফলভাবে মুছে ফেলা হয়েছে এবং হিসাব সমন্বয় করা হয়েছে।",
    errorOccurred: "একটি ত্রুটি ঘটেছে। বিস্তারিত দেখতে কনসোল চেক করুন।",

    // Phase 2: Budgets
    budgetTitle: "মাসিক বাজেট ব্যবস্থাপনা",
    budgetSubtitle: "ব্যয়ের খাতভিত্তিক মাসিক সীমা নির্ধারণ ও পর্যবেক্ষণ করুন",
    budgetMonth: "বাজেটের মাস",
    budgetAmount: "বাজেট বরাদ্দ (৳)",
    budgetSpent: "প্রকৃত খরচ",
    budgetRemaining: "অবশিষ্ট বাজেট",
    budgetPercentage: "ব্যবহারের হার",
    budgetNormal: "স্বাভাবিক",
    budgetWarning: "সীমার কাছাকাছি (৮০%+)",
    budgetExceeded: "বাজেট সীমা অতিক্রান্ত!",
    btnAddBudget: "নতুন বাজেট নির্ধারণ করুন",
    noBudgetsYet: "এই মাসের জন্য কোনো বাজেট নির্ধারণ করা হয়নি।",

    // Phase 2: Savings Goals
    savingsTitle: "সঞ্চয় লক্ষ্যসমূহ",
    savingsSubtitle: "ভবিষ্যতের লক্ষ্য অনুযায়ী সঞ্চয় পরিকল্পনা ও অগ্রগতি",
    goalName: "লক্ষ্যের নাম",
    targetAmount: "লক্ষ্যমাত্রা (৳)",
    targetDate: "অর্জনের লক্ষ্য তারিখ",
    startingAmount: "প্রারম্ভিক পরিমাণ",
    currentSavings: "বর্তমান সঞ্চিত",
    remainingSavings: "বাকি পরিমাণ",
    progress: "অগ্রগতি",
    btnAddGoal: "নতুন সঞ্চয় লক্ষ্য যুক্ত করুন",
    btnContribute: "অর্থ জমা করুন",
    contributeTitle: "সঞ্চয় লক্ষ্যে অর্থ জমা করুন",
    contributeNotice: "নির্বাচিত হিসাব থেকে টাকা সঞ্চয় লক্ষ্যে স্থানান্তরিত হবে। এটি দৈনন্দিন খরচযোগ্য তহবিল থেকে পৃথক থাকবে।",
    noSavingsYet: "কোনো সঞ্চয় লক্ষ্য নির্ধারিত নেই।",

    // Phase 2: Lending
    lendingTitle: "অন্যকে প্রদত্ত ধার",
    lendingSubtitle: "কাকে কত টাকা ধার দেওয়া হয়েছে এবং আদায়ের হিসাব রাখুন",
    borrowerName: "ধার গ্রহীতার নাম",
    amountLent: "প্রদত্ত ধারের পরিমাণ (৳)",
    dateLent: "ধার প্রদানের তারিখ",
    expectedRepaymentDate: "সম্ভাব্য ফেরত দেওয়ার তারিখ",
    amountRepaid: "পরিশোধিত অর্থ",
    outstandingBalance: "বকেয়া পাওনা",
    btnAddLending: "নতুন ধার রেকর্ড করুন",
    btnReceiveRepayment: "কিস্তি/পরিশোধ গ্রহণ করুন",
    repaymentTitle: "ধার পরিশোধ রেকর্ড করুন",
    repaymentAmount: "পরিশোধের পরিমাণ (৳)",
    depositAccount: "জমা নেওয়ার হিসাব",
    noLendingYet: "কাউকে কোনো ধার দেওয়ার তথ্য নেই।",

    // Phase 2: Borrowing
    borrowingTitle: "অন্যের থেকে গৃহীত ঋণ",
    borrowingSubtitle: "কার কাছ থেকে কত ঋণ নেওয়া হয়েছে এবং পরিশোধের হিসাব",
    lenderName: "ঋণদাতার নাম",
    amountBorrowed: "গৃহীত ঋণের পরিমাণ (৳)",
    dateBorrowed: "ঋণ গ্রহণের তারিখ",
    outstandingLiability: "বকেয়া দায়",
    btnAddBorrowing: "নতুন ঋণ রেকর্ড করুন",
    btnMakeRepayment: "ঋণ পরিশোধ করুন",
    payFromAccount: "যে হিসাব থেকে পরিশোধ করবেন",
    noBorrowingYet: "কারো থেকে কোনো ঋণ গ্রহণের তথ্য নেই।",

    // Phase 2: Accounts & Transfers
    accountsTitle: "হিসাব ও নগদ ব্যবস্থাপনা",
    accountsSubtitle: "আপনার ব্যাংক, নগদ ও মোবাইল ব্যাংকিং হিসাবের স্থিতি ও ফান্ড ট্রান্সফার",
    accountName: "হিসাবের নাম",
    accountType: "হিসাবের ধরন",
    openingBalance: "প্রারম্ভিক স্থিতি (৳)",
    currentBalance: "বর্তমান স্থিতি",
    btnAddAccount: "নতুন হিসাব যোগ করুন",
    transferTitle: "অভ্যন্তরীণ ফান্ড ট্রান্সফার",
    transferSubtitle: "নিজের এক হিসাব থেকে অন্য হিসাবে অর্থ স্থানান্তর করুন (এটি আয় বা ব্যয় হিসেবে গণনা হবে না)",
    fromAccount: "উৎস হিসাব (টাকা কাটা যাবে)",
    toAccount: "গন্তব্য হিসাব (টাকা জমা হবে)",
    btnTransfer: "ফান্ড ট্রান্সফার সম্পন্ন করুন",
    transferSuccess: "ফান্ড ট্রান্সফার সফলভাবে সম্পন্ন হয়েছে!",
    sameAccountError: "উৎস হিসাব এবং গন্তব্য হিসাব একই হতে পারে না।",
    insufficientBalance: "উৎস হিসাবে পর্যাপ্ত ব্যালেন্স নেই।",
    typeTransfer: "অভ্যন্তরীণ স্থানান্তর",

    // Categories
    cat_salary: "বেতন",
    cat_business: "ব্যবসা",
    cat_freelance: "ফ্রিল্যান্সিং",
    cat_investment: "বিনিয়োগ ও মুনাফা",
    cat_gift: "উপহার ও অনুদান",
    cat_other_income: "অন্যান্য আয়",

    cat_food: "খাদ্য ও খাবার",
    cat_transportation: "যাতায়াত ও পরিবহন",
    cat_shopping: "কেনাকাটা",
    cat_housing: "বাসা ভাড়া ও বাসস্থান",
    cat_utilities: "বিদ্যুৎ, গ্যাস ও পানি",
    cat_telecom: "মোবাইল ও ইন্টারনেট",
    cat_healthcare: "চিকিৎসা ও ওষুধ",
    cat_education: "শিক্ষা ও পড়াশোনা",
    cat_family: "পরিবার ও আত্মীয়",
    cat_charity: "দান ও সদকা",
    cat_entertainment: "বিনোদন ও ভ্রমণ",
    cat_other_expense: "অন্যান্য খরচ",

    // Default Accounts
    acc_cash: "নগদ টাকা (ক্যাশ ইন হ্যান্ড)",
    acc_bank: "ব্যাংক অ্যাকাউন্ট",
    acc_mfs: "মোবাইল ব্যাংকিং (বিকাশ/নগদ/রকেট)",

    // Phase 4: Backup & Restore
    navBackup: "ব্যাকআপ ও রিস্টোর",
    backupTitle: "ডেটা ব্যাকআপ ও রিস্টোর",
    backupSubtitle: "আপনার সমস্ত আর্থিক রেকর্ডের নির্ভরযোগ্য ব্যাকআপ সংরক্ষণ ও রিস্টোর করুন",
    createBackupTitle: "নতুন ব্যাকআপ তৈরি করুন",
    backupOptions: "ব্যাকআপের ধরন ও নিরাপত্তা",
    backupTypePlain: "সাধারণ JSON ব্যাকআপ (SHA-256 চেকসাম যাচাইকৃত)",
    backupTypeEncrypted: "এনক্রিপ্টেড ব্যাকআপ (AES-256-GCM পাসওয়ার্ড সুরক্ষিত)",
    backupPassLabel: "ব্যাকআপ সুরক্ষা পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)",
    backupPassPlaceholder: "শক্তিশালী পাসওয়ার্ড দিন...",
    backupAuditLogLabel: "অডিট হিস্ট্রি লগ অন্তর্ভুক্ত করুন",
    btnGenerateBackup: "ব্যাকআপ ফাইল তৈরি ও ডাউনলোড করুন",
    backupSuccessMsg: "ব্যাকআপ ফাইলটি সফলভাবে তৈরি ও ডাউনলোড হয়েছে!",
    restoreTitle: "ব্যাকআপ ফাইল থেকে রিস্টোর",
    restoreSubtitle: "পূর্বে সংরক্ষিত .json বা .pfmbak ব্যাকআপ ফাইল নির্বাচন করুন",
    selectBackupFile: "ব্যাকআপ ফাইল বেছে নিন",
    decryptPassLabel: "এনক্রিপশন পাসওয়ার্ড প্রদান করুন",
    btnInspectBackup: "ব্যাকআপ যাচাই ও প্রিভিউ দেখুন",
    previewRestoreTitle: "রিস্টোর পূর্ববর্তী যাচাই ও প্রিভিউ",
    restoreWarningNotice: "সতর্কতা: ব্যাকআপ রিস্টোর করলে বর্তমান ডেটাবেজের সমস্ত তথ্য প্রতিস্থাপিত হবে। রিস্টোরের ঠিক পূর্বে একটি জরুরি সেফটি স্ন্যাপশট স্বয়ংক্রিয়ভাবে ডাউনলোড হবে।",
    btnEmergencyBackup: "জরুরি সেফটি ব্যাকআপ ডাউনলোড করুন",
    btnConfirmRestore: "অনুমোদন দিয়ে রিস্টোর সম্পন্ন করুন",
    restoreSuccessMsg: "অভিনন্দন! আপনার ডেটাবেজ সফলভাবে রিস্টোর হয়েছে।",
    storageHealthTitle: "ব্রাউজার স্টোরেজ স্বাস্থ্য ও অফলাইন গাইড",
    storageHealthDesc: "আপনার সমস্ত তথ্য ১০০% অফলাইনে এই ডিভাইসের ব্রাউজার IndexedDB-তে সংরক্ষিত। ব্রাউজার ক্যাশ মুছে দিলে যাতে ডেটা না হারায়, তাই প্রতি সপ্তাহে বা গুরুত্বপূর্ণ লেনদেনের পর ব্যাকআপ ফাইল ডাউনলোড করে নিরাপদ স্থানে রাখুন।",
    storageStatsRecords: "মোট সংরক্ষিত রেকর্ড সংখ্যা",
    storageStatsEstimatedSize: "আনুমানিক ডেটাবেজ সাইজ",
    dangerZoneTitle: "বিপদজনক অঞ্চল (ডেটাবেজ রিসেট)",
    dangerZoneDesc: "সমস্ত লেনদেন, বাজেট, সঞ্চয় ও ঋণের তথ্য মুছে ডেটাবেজ প্রাথমিক অবস্থায় ফিরিয়ে নেওয়া হবে। এই কাজের জন্য MIS পাসওয়ার্ড যাচাই বাধ্যতামূলক।",
    btnResetDatabase: "সম্পূর্ণ ডেটাবেজ রিসেট করুন",
    resetSuccessMsg: "ডেটাবেজ সফলভাবে রিসেট করা হয়েছে।",

    // Phase 5: AI Finance Assistant & Insights
    navAssistant: "এআই ফাইন্যান্স সহকারী",
    assistantTitle: "স্মার্ট ফাইন্যান্স সহকারী ও পরামর্শ",
    assistantSubtitle: "১০০% অফলাইন রুল-বেসড আর্থিক স্বাস্থ্য বিশ্লেষণ, অ্যালার্ট ও সঞ্চয় পরামর্শ",
    scorecardTitle: "আর্থিক স্বাস্থ্য স্কোরকার্ড",
    metricSavingsRate: "সঞ্চয় হার (Savings Rate)",
    metricEmergencyBuffer: "জরুরি রিজার্ভ (Emergency Buffer)",
    metricDebtToIncome: "দায়-আয় অনুপাত (Debt-to-Income)",
    metricLiquidReserves: "মোট লিকুইড রিজার্ভ",
    insightsTitle: "স্মার্ট অ্যালার্ট ও পর্যবেক্ষণ",
    categoryAnalysisTitle: "খাতভিত্তিক ব্যয় ও সাশ্রয়ের সুযোগ",
    repaymentScheduleTitle: "আসন্ন ঋণ ও ধার আদায়ের তাগিদ",
    aiDisclaimer: "দাবিত্যাগ: এআই পরামর্শ সম্পূর্ণরূপে তথ্যগত ও গাণিতিক সহায়তার জন্য প্রণীত এবং কোনো প্রকার বাধ্যতামূলক আর্থিক সিদ্ধান্ত নয়।",
    optionalLocalAITitle: "ঐচ্ছিক লোকাল এআই প্রম্পট (Local LLM / WebLLM)",
    btnCopyAIPrompt: "প্রম্পট কপি করুন",
    promptCopied: "প্রম্পট ক্লিপবোর্ডে কপি করা হয়েছে!",
    localAIDesc: "আপনার আর্থিক ডেটা ১০০% ব্যক্তিগত ও অফলাইন রাখতে কোনো ডেটা ইন্টারনেটে পাঠানো হয় না। আপনি চাইলে নিচের বেনামী সামারি প্রম্পটটি কপি করে আপনার স্থানীয় Ollama বা ব্রাউজার WebLLM মডেলে ব্যবহার করতে পারেন।"
  },

  en: {
    // App Branding
    appName: "Personal Finance Manager",
    appSubtitle: "Smart Offline Edition",
    offlineBadge: "100% Offline & Secure",
    currencySymbol: "৳",
    currencyCode: "BDT",

    // Navigation
    navDashboard: "Dashboard",
    navIncome: "Add Income",
    navExpenses: "Add Expense",
    navTransactions: "Ledger",
    navBudgets: "Budgets",
    navSavings: "Savings Goals",
    navLending: "Lending",
    navBorrowing: "Borrowing",
    navAccounts: "Accounts & Cash",
    navReports: "Reports (Upcoming)",
    navSecurity: "Security & MIS",
    navSettings: "Settings",

    // Top Bar & Controls
    langSwitch: "বাংলা",
    misStatusActive: "MIS Security: Active",
    misStatusInactive: "MIS Password Not Set",
    appLocked: "App is Locked",
    btnLock: "Lock App",
    btnInstallApp: "Install App",
    appInstalledSuccess: "App installed successfully!",

    // Mobile App UI Strings
    greetingMorning: "Good Morning",
    greetingAfternoon: "Good Afternoon",
    greetingEvening: "Good Evening",
    greetingGeneral: "Welcome",
    userGreetingName: "User",
    walletTotalBalance: "Total Wallet Balance",
    tabExpense: "Expenses",
    tabIncome: "Income",
    accountsTitle: "My Accounts",
    spentRatio: "Spent",
    savedRatio: "Saved",
    quickActionTitle: "Quick Entry",
    qaAddExpense: "Record New Expense",
    qaAddIncome: "Record New Income",
    qaTransfer: "Account Transfer",
    bnavHome: "Home",
    bnavTransactions: "Ledger",
    bnavSavings: "Savings",
    bnavLoans: "Loans",
    bnavReports: "Reports",

    // Dashboard Cards
    cardTotalIncome: "Total Income",
    cardTotalExpense: "Total Expense",
    cardNetCashFlow: "Net Cash Flow",
    cardTotalBalance: "Total Current Balance",
    thisMonth: "This Month",
    lastMonth: "Last Month",
    thisYear: "This Year",
    allTime: "All Time",
    filterPeriod: "Select Period",
    filterAccount: "Select Account",
    allAccounts: "All Accounts",

    // Dashboard Sections
    recentTransactions: "Recent Transactions",
    expenseBreakdown: "Expense Category Breakdown",
    viewAllTransactions: "View All Transactions",
    noTransactionsYet: "No transactions recorded yet.",
    noTransactionsDesc: "Use the buttons above to record your income or expenses.",
    noExpenseCategories: "No expense records found for the selected period.",

    // Income Form
    incomeTitle: "Record New Income",
    incomeSubtitle: "Track your earnings accurately and securely",
    date: "Date",
    amount: "Amount (BDT ৳)",
    category: "Income Category",
    account: "Receiving Account",
    description: "Source or Description",
    notes: "Optional Notes",
    btnAddIncome: "Save Income",
    selectCategory: "-- Select Category --",
    selectAccount: "-- Select Account --",

    // Expense Form
    expenseTitle: "Record New Expense",
    expenseSubtitle: "Record your daily expenses with precise categorization",
    merchant: "Description or Merchant",
    paymentMethod: "Payment Method",
    tags: "Tags (comma-separated, optional)",
    btnAddExpense: "Save Expense",

    // Transactions Ledger
    ledgerTitle: "Unified Transaction Ledger",
    ledgerSubtitle: "Complete record and audit trail of all approved financial entries",
    searchPlaceholder: "Search by description or notes...",
    filterType: "Transaction Type",
    allTypes: "All Types",
    typeIncome: "Income",
    typeExpense: "Expense",
    sortOrder: "Sort Order",
    newestFirst: "Newest First",
    oldestFirst: "Oldest First",
    colDate: "Date",
    colType: "Type",
    colCategory: "Category",
    colDescription: "Description",
    colAccount: "Account",
    colAmount: "Amount",
    colActions: "Actions",
    btnView: "Details",
    btnEdit: "Edit",
    btnDelete: "Delete",
    noMatchingRecords: "No matching transactions found.",

    // Review & Confirmation Modal
    confirmTitle: "Review & Confirmation",
    confirmNotice: "Please carefully verify the transaction details before committing:",
    confirmType: "Type:",
    confirmAmount: "Amount:",
    confirmAccount: "Account & Balance Impact:",
    confirmDate: "Date:",
    confirmCategory: "Category:",
    confirmDesc: "Description:",
    btnConfirmSave: "Confirm & Commit",
    btnCancel: "Cancel",

    // Edit Modal
    editTitle: "Edit Transaction",
    editNotice: "Warning: Modifying historical records will create a permanent audit log entry.",
    editReason: "Reason for Change (Required)",
    editReasonPlaceholder: "Typo in amount / incorrect category, etc.",
    btnSaveEdit: "Confirm Edit",

    // Transaction Details Modal
    txDetailsTitle: "Transaction Details",
    txId: "Transaction ID:",
    txCreatedAt: "Created At:",
    txUpdatedAt: "Last Updated:",
    txAuditHistory: "Audit Trail",
    noAuditHistory: "No modifications recorded. This is the original approved entry.",

    // MIS Security Module
    misModalTitle: "MIS Module Security Gate",
    misSetupTitle: "Setup MIS Module Password",
    misSetupNotice: "The MIS Password is required for deleting any stored financial records. Choose a secure password.",
    misPasswordLabel: "Enter MIS Password",
    misPasswordNew: "New MIS Password (min 6 characters)",
    misPasswordConfirm: "Confirm MIS Password",
    misBtnSetup: "Save MIS Password",
    misBtnVerifyDelete: "Verify Password & Delete",
    misWarningDelete: "Warning: This transaction will be permanently deleted and the account balance will be reconciled. There is no hidden bypass.",
    misErrorWrong: "Incorrect MIS password! Deletion request rejected.",
    misErrorMismatch: "Passwords do not match. Please try again.",
    misErrorLength: "Password must be at least 6 characters.",
    misConfiguredSuccess: "MIS Module Password saved successfully!",
    misDeletionDisabledNotice: "Deletion Disabled: No MIS password has been set. Set up an MIS password to enable deletion.",

    // Common Messages & Validations
    fieldRequired: "This field is required.",
    invalidAmount: "Please enter a valid, positive amount (e.g., 100 or 250.50).",
    invalidDate: "Please select a valid date.",
    saving: "Saving...",
    saveSuccess: "Transaction saved successfully!",
    editSuccess: "Transaction updated and audit log recorded.",
    deleteSuccess: "Transaction deleted and account balance reconciled.",
    errorOccurred: "An error occurred. Check the console for details.",

    // Phase 2: Budgets
    budgetTitle: "Monthly Budget Management",
    budgetSubtitle: "Set and track category spending limits for the month",
    budgetMonth: "Budget Month",
    budgetAmount: "Budget Allocation (৳)",
    budgetSpent: "Actual Spending",
    budgetRemaining: "Remaining Budget",
    budgetPercentage: "Usage Percentage",
    budgetNormal: "Normal",
    budgetWarning: "Approaching Limit (80%+)",
    budgetExceeded: "Budget Limit Exceeded!",
    btnAddBudget: "Set New Budget",
    noBudgetsYet: "No budgets set for this month.",

    // Phase 2: Savings Goals
    savingsTitle: "Savings Goals",
    savingsSubtitle: "Plan and track progress toward your financial targets",
    goalName: "Goal Name",
    targetAmount: "Target Amount (৳)",
    targetDate: "Target Date",
    startingAmount: "Starting Amount",
    currentSavings: "Current Savings",
    remainingSavings: "Remaining to Save",
    progress: "Progress",
    btnAddGoal: "Create Savings Goal",
    btnContribute: "Add Contribution",
    contributeTitle: "Contribute to Savings Goal",
    contributeNotice: "Money will be moved from the selected account to this goal. It is kept isolated from daily spendable cash.",
    noSavingsYet: "No savings goals created yet.",

    // Phase 2: Lending
    lendingTitle: "Money Lent to Others",
    lendingSubtitle: "Track receivables, partial repayments, and overdue dates",
    borrowerName: "Borrower Name",
    amountLent: "Amount Lent (৳)",
    dateLent: "Date Lent",
    expectedRepaymentDate: "Expected Repayment Date",
    amountRepaid: "Amount Repaid",
    outstandingBalance: "Outstanding Balance",
    btnAddLending: "Record Money Lent",
    btnReceiveRepayment: "Receive Repayment",
    repaymentTitle: "Record Repayment Received",
    repaymentAmount: "Repayment Amount (৳)",
    depositAccount: "Receiving Account",
    noLendingYet: "No records of money lent to others.",

    // Phase 2: Borrowing
    borrowingTitle: "Money Borrowed from Others",
    borrowingSubtitle: "Track liabilities, lender details, and repayments made",
    lenderName: "Lender Name",
    amountBorrowed: "Amount Borrowed (৳)",
    dateBorrowed: "Date Borrowed",
    outstandingLiability: "Outstanding Liability",
    btnAddBorrowing: "Record Money Borrowed",
    btnMakeRepayment: "Make Repayment",
    payFromAccount: "Pay From Account",
    noBorrowingYet: "No records of money borrowed.",

    // Phase 2: Accounts & Transfers
    accountsTitle: "Accounts & Cash Management",
    accountsSubtitle: "Manage balances across cash, bank, and mobile financial services",
    accountName: "Account Name",
    accountType: "Account Type",
    openingBalance: "Opening Balance (৳)",
    currentBalance: "Current Balance",
    btnAddAccount: "Add New Account",
    transferTitle: "Internal Fund Transfer",
    transferSubtitle: "Transfer funds between your own accounts (does not alter income or expense totals)",
    fromAccount: "Source Account (Debited)",
    toAccount: "Destination Account (Credited)",
    btnTransfer: "Execute Transfer",
    transferSuccess: "Fund transfer completed successfully!",
    sameAccountError: "Source and destination accounts cannot be the same.",
    insufficientBalance: "Insufficient balance in source account.",
    typeTransfer: "Internal Transfer",

    // Categories
    cat_salary: "Salary",
    cat_business: "Business",
    cat_freelance: "Freelancing",
    cat_investment: "Investment & Profit",
    cat_gift: "Gift & Grants",
    cat_other_income: "Other Income",

    cat_food: "Food & Dining",
    cat_transportation: "Transportation",
    cat_shopping: "Shopping",
    cat_housing: "Rent & Housing",
    cat_utilities: "Utilities (Gas, Water, Power)",
    cat_telecom: "Mobile & Internet",
    cat_healthcare: "Healthcare & Medicine",
    cat_education: "Education",
    cat_family: "Family & Relatives",
    cat_charity: "Charity & Donations",
    cat_entertainment: "Entertainment & Leisure",
    cat_other_expense: "Other Expense",

    // Default Accounts
    acc_cash: "Cash in Hand",
    acc_bank: "Bank Account",
    acc_mfs: "Mobile Financial Service (bKash/Nagad)",

    // Phase 4: Backup & Restore
    navBackup: "Backup & Restore",
    backupTitle: "Data Backup & Restore",
    backupSubtitle: "Reliably back up, encrypt, and restore all your financial records offline",
    createBackupTitle: "Create New Backup",
    backupOptions: "Backup Type & Security",
    backupTypePlain: "Standard JSON Backup (SHA-256 Checksum Verified)",
    backupTypeEncrypted: "Encrypted Backup (AES-256-GCM Password Protected)",
    backupPassLabel: "Backup Protection Password (min 6 chars)",
    backupPassPlaceholder: "Enter strong password...",
    backupAuditLogLabel: "Include Audit History Log",
    btnGenerateBackup: "Generate & Download Backup File",
    backupSuccessMsg: "Backup file has been successfully created and downloaded!",
    restoreTitle: "Restore from Backup File",
    restoreSubtitle: "Select a previously downloaded .json or .pfmbak backup file",
    selectBackupFile: "Choose Backup File",
    decryptPassLabel: "Decryption Password",
    btnInspectBackup: "Verify & Preview Backup",
    previewRestoreTitle: "Pre-Restore Inspection & Preview",
    restoreWarningNotice: "Warning: Restoring will overwrite existing financial records with the backup data. An emergency safety backup of current data will be automatically downloaded before applying the restore.",
    btnEmergencyBackup: "Download Emergency Safety Backup",
    btnConfirmRestore: "Authorize & Complete Restore",
    restoreSuccessMsg: "Congratulations! Database has been successfully restored.",
    storageHealthTitle: "Browser Storage Health & Offline Advisory",
    storageHealthDesc: "Your financial data is stored 100% locally in your device's browser IndexedDB. To prevent data loss if browser storage is cleared, download manual backups regularly and keep them in a safe place.",
    storageStatsRecords: "Total Stored Records",
    storageStatsEstimatedSize: "Estimated Database Size",
    dangerZoneTitle: "Danger Zone (Database Reset)",
    dangerZoneDesc: "Clear all transactions, budgets, savings, and loans to clean initial state. Requires verified MIS Module Password.",
    btnResetDatabase: "Reset All Financial Data",
    resetSuccessMsg: "Database has been reset successfully.",

    // Phase 5: AI Finance Assistant & Insights
    navAssistant: "AI Finance Assistant",
    assistantTitle: "Smart Financial Assistant & Insights",
    assistantSubtitle: "100% offline rule-based financial health analysis, alerts, and savings advice",
    scorecardTitle: "Financial Health Scorecard",
    metricSavingsRate: "Savings Rate",
    metricEmergencyBuffer: "Emergency Buffer",
    metricDebtToIncome: "Debt-to-Income Ratio",
    metricLiquidReserves: "Total Liquid Reserves",
    insightsTitle: "Smart Alerts & Observations",
    categoryAnalysisTitle: "Category Spending & Optimization",
    repaymentScheduleTitle: "Upcoming Debt & Lending Reminders",
    aiDisclaimer: "Disclaimer: AI suggestions are strictly informational and non-binding advice.",
    optionalLocalAITitle: "Optional Local AI Prompt (Local LLM / WebLLM)",
    btnCopyAIPrompt: "Copy Anonymized Prompt",
    promptCopied: "Prompt copied to clipboard!",
    localAIDesc: "To keep your financial data strictly private and offline, no data is sent to external cloud servers. You can copy this anonymized summary prompt to use in your local Ollama or browser WebLLM."
  }
};

let currentLanguage = localStorage.getItem('pfm_lang') || 'bn';

export function getLanguage() {
  return currentLanguage;
}

export function setLanguage(lang) {
  if (lang === 'bn' || lang === 'en') {
    currentLanguage = lang;
    localStorage.setItem('pfm_lang', lang);
    document.documentElement.lang = lang;
    window.dispatchEvent(new CustomEvent('pfm_language_changed', { detail: { lang } }));
  }
}

export function t(key, fallback = '') {
  const dict = translations[currentLanguage] || translations.bn;
  return dict[key] !== undefined ? dict[key] : (fallback || key);
}

// Convert English numerals to Bengali digits
export function toBengaliNumerals(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[0-9]/g, (w) => BENGALI_DIGITS[parseInt(w, 10)]);
}

// Format paisa into formatted Taka string (e.g. 10050 paisa -> "৳ 100.50" or "৳ ১০০.৫০")
export function formatMoney(paisa, options = { useBengaliDigits: null }) {
  if (paisa === undefined || paisa === null || isNaN(paisa)) {
    paisa = 0;
  }
  const isNegative = paisa < 0;
  const absPaisa = Math.abs(paisa);
  const taka = Math.floor(absPaisa / 100);
  const poisha = absPaisa % 100;
  const poishaStr = poisha.toString().padStart(2, '0');

  // Format standard Bangladeshi thousands separators: 1,23,456.78
  const takaStr = taka.toLocaleString('en-IN');
  const formattedDecimal = `${takaStr}.${poishaStr}`;

  const shouldConvertBn = options.useBengaliDigits !== null 
    ? options.useBengaliDigits 
    : currentLanguage === 'bn';

  const displayNum = shouldConvertBn ? toBengaliNumerals(formattedDecimal) : formattedDecimal;
  const symbol = t('currencySymbol', '৳');

  return `${isNegative ? '-' : ''}${symbol} ${displayNum}`;
}

// Format ISO date (YYYY-MM-DD) into readable localized date
export function formatDate(isoDateStr) {
  if (!isoDateStr) return '';
  try {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      const date = new Date(year, month, day);

      if (currentLanguage === 'bn') {
        const bnMonths = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
        return `${toBengaliNumerals(parseInt(day, 10))} ${bnMonths[month]} ${toBengaliNumerals(year)}`;
      } else {
        const enMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${enMonths[month]} ${year}`;
      }
    }
    return isoDateStr;
  } catch (e) {
    return isoDateStr;
  }
}
