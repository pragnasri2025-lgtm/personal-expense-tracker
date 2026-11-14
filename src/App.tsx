import { useCallback, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen';
import { BudgetsView } from './components/BudgetsView';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { IncomeView } from './components/IncomeView';
import { ProfileView } from './components/ProfileView';
import { ReportsView } from './components/ReportsView';
import { Sidebar } from './components/Sidebar';
import { TransactionModal } from './components/TransactionModal';
import { apiRequest, setStoredToken } from './lib/api';
import type {
  AppSection,
  BudgetRecord,
  DashboardResponse,
  ExpenseCategoryItem,
  ExpenseRecord,
  IncomeRecord,
  UserProfile,
} from './types';

const SECTION_TITLES: Record<AppSection, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Financial Overview',
    subtitle: 'Automatic balance, budget utilization, and spending analytics',
  },
  income: {
    title: 'Income Management',
    subtitle: 'Record, edit, and filter salary, business, scholarship, and other earnings',
  },
  expenses: {
    title: 'Expense Management',
    subtitle: 'Track daily spending by category and payment method',
  },
  budgets: {
    title: 'Budget Management',
    subtitle: 'Configure monthly caps and category limits with threshold alerts',
  },
  reports: {
    title: 'Reports & Analytics',
    subtitle: 'Daily, weekly, and monthly trends with PDF and CSV export',
  },
  profile: {
    title: 'Profile Settings',
    subtitle: 'Manage personal details, display currency, and account security',
  },
};

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [activeSection, setActiveSection] = useState<AppSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState(now.getMonth() + 1);
  const [periodYear, setPeriodYear] = useState(now.getFullYear());

  const [incomeCategories, setIncomeCategories] = useState<string[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategoryItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [budgets, setBudgets] = useState<BudgetRecord[]>([]);
  const [totalMonthlySpent, setTotalMonthlySpent] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [modalState, setModalState] = useState<{
    open: boolean;
    type: 'income' | 'expense';
    editingIncome?: IncomeRecord | null;
    editingExpense?: ExpenseRecord | null;
  }>({
    open: false,
    type: 'expense',
    editingIncome: null,
    editingExpense: null,
  });

  useEffect(() => {
    apiRequest<{ user: UserProfile }>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecking(false));
  }, []);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiRequest<{
        incomeCategories: string[];
        expenseCategories: ExpenseCategoryItem[];
        paymentMethods: string[];
      }>('/api/categories');
      setIncomeCategories(res.incomeCategories);
      setExpenseCategories(res.expenseCategories);
      setPaymentMethods(res.paymentMethods);
    } catch {
      // Handled by auth/session layer
    }
  }, [user]);

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    setDashboardLoading(true);
    try {
      const [dashRes, incRes, expRes, budRes] = await Promise.all([
        apiRequest<DashboardResponse>(
          `/api/dashboard?month=${periodMonth}&year=${periodYear}`
        ),
        apiRequest<{ income: IncomeRecord[] }>('/api/income'),
        apiRequest<{ expenses: ExpenseRecord[] }>('/api/expenses'),
        apiRequest<{ totalMonthlySpent: number; budgets: BudgetRecord[] }>(
          `/api/budgets?month=${periodMonth}&year=${periodYear}`
        ),
      ]);
      setDashboard(dashRes);
      setIncomeRecords(incRes.income);
      setExpenseRecords(expRes.expenses);
      setBudgets(budRes.budgets);
      setTotalMonthlySpent(budRes.totalMonthlySpent);
      setRefreshSignal((s) => s + 1);
    } finally {
      setDashboardLoading(false);
    }
  }, [user, periodMonth, periodYear]);

  useEffect(() => {
    if (user) {
      fetchCategories();
      fetchAllData();
    }
  }, [user, fetchCategories, fetchAllData]);

  async function handleLogout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout network errors
    }
    setStoredToken(null);
    setUser(null);
    setDashboard(null);
    setIncomeRecords([]);
    setExpenseRecords([]);
    setBudgets([]);
    setActiveSection('dashboard');
  }

  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#F4F0E2] flex items-center justify-center">
        <div className="text-sm font-medium text-[#4E6B82]">Loading financial workspace...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(loggedInUser) => {
          setUser(loggedInUser);
          setActiveSection('dashboard');
        }}
      />
    );
  }

  const headerInfo = SECTION_TITLES[activeSection];

  return (
    <div className="min-h-screen bg-[#F4F0E2] text-[#173247] flex">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        user={user}
        onLogout={handleLogout}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Workspace Header */}
        <header className="sticky top-0 z-20 bg-[#FAF8F2]/95 backdrop-blur-xs border-b border-[#E5DEC9] px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="lg:hidden p-2 rounded-lg border border-[#D8D0BC] text-[#173247] hover:bg-[#F4F0E2]"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg sm:text-xl font-bold text-[#173247] truncate">
                {headerInfo.title}
              </h1>
              <p className="text-xs text-[#4E6B82] truncate hidden sm:block">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <p className="text-xs font-medium text-[#173247]">{user.Name}</p>
            <p className="text-xs text-[#4E6B82] font-mono">{user.Currency}</p>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-8 max-w-[1360px] w-full mx-auto">
          {activeSection === 'dashboard' && (
            <DashboardView
              data={dashboard}
              loading={dashboardLoading}
              currency={user.Currency}
              month={periodMonth}
              year={periodYear}
              onChangePeriod={(m, y) => {
                setPeriodMonth(m);
                setPeriodYear(y);
              }}
              onAddIncome={() =>
                setModalState({ open: true, type: 'income', editingIncome: null })
              }
              onAddExpense={() =>
                setModalState({ open: true, type: 'expense', editingExpense: null })
              }
              onNavigate={setActiveSection}
            />
          )}

          {activeSection === 'income' && (
            <IncomeView
              records={incomeRecords}
              incomeCategories={incomeCategories}
              currency={user.Currency}
              onAdd={() =>
                setModalState({ open: true, type: 'income', editingIncome: null })
              }
              onEdit={(record) =>
                setModalState({ open: true, type: 'income', editingIncome: record })
              }
              onRefresh={fetchAllData}
            />
          )}

          {activeSection === 'expenses' && (
            <ExpensesView
              records={expenseRecords}
              expenseCategories={expenseCategories}
              paymentMethods={paymentMethods}
              currency={user.Currency}
              onAdd={() =>
                setModalState({ open: true, type: 'expense', editingExpense: null })
              }
              onEdit={(record) =>
                setModalState({ open: true, type: 'expense', editingExpense: record })
              }
              onRefresh={fetchAllData}
              onRefreshCategories={fetchCategories}
            />
          )}

          {activeSection === 'budgets' && (
            <BudgetsView
              budgets={budgets}
              totalMonthlySpent={totalMonthlySpent}
              expenseCategories={expenseCategories}
              currency={user.Currency}
              month={periodMonth}
              year={periodYear}
              onChangePeriod={(m, y) => {
                setPeriodMonth(m);
                setPeriodYear(y);
              }}
              onRefresh={fetchAllData}
            />
          )}

          {activeSection === 'reports' && (
            <ReportsView
              user={user}
              month={periodMonth}
              year={periodYear}
              onChangePeriod={(m, y) => {
                setPeriodMonth(m);
                setPeriodYear(y);
              }}
              refreshSignal={refreshSignal}
            />
          )}

          {activeSection === 'profile' && (
            <ProfileView user={user} onUserUpdated={(updated) => setUser(updated)} />
          )}
        </main>
      </div>

      <TransactionModal
        open={modalState.open}
        type={modalState.type}
        onClose={() => setModalState((s) => ({ ...s, open: false }))}
        onSaved={fetchAllData}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
        paymentMethods={paymentMethods}
        editingIncome={modalState.editingIncome}
        editingExpense={modalState.editingExpense}
      />
    </div>
  );
}
