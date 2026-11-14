export interface UserProfile {
  User_ID: number;
  Name: string;
  Email: string;
  Currency: string;
}

export interface IncomeRecord {
  Income_ID: number;
  User_ID: number;
  Amount: number;
  Category: string;
  Date: string;
  Description: string;
}

export interface ExpenseRecord {
  Expense_ID: number;
  User_ID: number;
  Amount: number;
  Category: string;
  Payment_Method: string;
  Date: string;
  Description: string;
}

export interface ExpenseCategoryItem {
  Category_ID: number;
  Name: string;
  Is_Default: number;
}

export interface BudgetRecord {
  Budget_ID: number;
  User_ID: number;
  Category: string;
  Month: number;
  Year: number;
  Budget_Amount: number;
  Spent: number;
  Remaining: number;
  Utilization: number;
  Status: 'nominal' | 'warning' | 'exceeded';
}

export interface MergedTransaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  paymentMethod: string;
  date: string;
  description: string;
}

export interface DashboardResponse {
  period: { month: number; year: number };
  summary: {
    totalIncome: number;
    totalExpenses: number;
    currentBalance: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    monthlyBudget: number;
    remainingBudget: number;
    hasExplicitMonthlyBudget: boolean;
  };
  categoryBreakdown: Array<{ category: string; amount: number }>;
  monthlyTrend: Array<{
    label: string;
    month: number;
    year: number;
    income: number;
    expenses: number;
  }>;
  recentTransactions: MergedTransaction[];
  budgetAlerts: Array<{
    Budget_ID: number;
    Category: string;
    Budget_Amount: number;
    Spent: number;
    Remaining: number;
    Utilization: number;
    Status: 'warning' | 'exceeded';
  }>;
}

export interface ReportResponse {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  summary: {
    totalIncome: number;
    totalExpenses: number;
    netSavings: number;
    savingsRate: number;
  };
  categoryAnalysis: Array<{
    category: string;
    amount: number;
    count: number;
    share: number;
  }>;
  trendSeries: Array<{
    label: string;
    income: number;
    expenses: number;
  }>;
  transactions: MergedTransaction[];
}

export type AppSection = 'dashboard' | 'income' | 'expenses' | 'budgets' | 'reports' | 'profile';

export const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'CAD', label: 'CAD (C$) — Canadian Dollar' },
  { code: 'AUD', label: 'AUD (A$) — Australian Dollar' },
  { code: 'JPY', label: 'JPY (¥) — Japanese Yen' },
];
