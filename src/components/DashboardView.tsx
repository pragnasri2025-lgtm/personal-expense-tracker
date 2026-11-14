import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Plus,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { BLUE_PALETTE, ChartCanvas } from './ChartCanvas';
import { formatDisplayDate, formatMoney, MONTH_NAMES } from '../lib/api';
import type { AppSection, DashboardResponse } from '../types';

interface DashboardViewProps {
  data: DashboardResponse | null;
  loading: boolean;
  currency: string;
  month: number;
  year: number;
  onChangePeriod: (month: number, year: number) => void;
  onAddIncome: () => void;
  onAddExpense: () => void;
  onNavigate: (section: AppSection) => void;
}

export function DashboardView({
  data,
  loading,
  currency,
  month,
  year,
  onChangePeriod,
  onAddIncome,
  onAddExpense,
  onNavigate,
}: DashboardViewProps) {
  const [recentQuery, setRecentQuery] = useState('');

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 2, cur - 1, cur, cur + 1];
  }, []);

  const barData = useMemo(() => {
    if (!data) return { labels: [], datasets: [] };
    return {
      labels: data.monthlyTrend.map((m) => m.label),
      datasets: [
        {
          label: 'Income',
          data: data.monthlyTrend.map((m) => m.income),
          backgroundColor: '#619DC6',
          borderRadius: 6,
          barPercentage: 0.7,
        },
        {
          label: 'Expenses',
          data: data.monthlyTrend.map((m) => m.expenses),
          backgroundColor: '#F4BAA3',
          borderRadius: 6,
          barPercentage: 0.7,
        },
      ],
    };
  }, [data]);

  const doughnutData = useMemo(() => {
    if (!data || data.categoryBreakdown.length === 0) {
      return { labels: [], datasets: [] };
    }
    return {
      labels: data.categoryBreakdown.map((c) => c.category),
      datasets: [
        {
          data: data.categoryBreakdown.map((c) => c.amount),
          backgroundColor: data.categoryBreakdown.map(
            (_, idx) => BLUE_PALETTE[idx % BLUE_PALETTE.length]
          ),
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      ],
    };
  }, [data]);

  const filteredRecent = useMemo(() => {
    if (!data) return [];
    const q = recentQuery.trim().toLowerCase();
    if (!q) return data.recentTransactions;
    return data.recentTransactions.filter(
      (tx) =>
        tx.category.toLowerCase().includes(q) ||
        tx.description.toLowerCase().includes(q) ||
        tx.paymentMethod.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q)
    );
  }, [data, recentQuery]);

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-white border border-[#E5DEC9] animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 h-80 rounded-xl bg-white border border-[#E5DEC9] animate-pulse" />
          <div className="lg:col-span-5 h-80 rounded-xl bg-white border border-[#E5DEC9] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, budgetAlerts, categoryBreakdown } = data;

  return (
    <div className="space-y-6">
      {/* Toolbar: Period Selector + Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="dash-month" className="sr-only">
            Select Month
          </label>
          <select
            id="dash-month"
            value={month}
            onChange={(e) => onChangePeriod(Number(e.target.value), year)}
            className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm font-medium text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx + 1}>
                {name}
              </option>
            ))}
          </select>

          <label htmlFor="dash-year" className="sr-only">
            Select Year
          </label>
          <select
            id="dash-year"
            value={year}
            onChange={(e) => onChangePeriod(month, Number(e.target.value))}
            className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm font-medium text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onAddIncome}
            className="h-10 px-4 rounded-lg bg-[#A6C8E2] hover:bg-[#8FB8D8] text-[#173247] text-sm font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Income</span>
          </button>
          <button
            type="button"
            onClick={onAddExpense}
            className="h-10 px-4 rounded-lg bg-[#F4BAA3] hover:bg-[#EEAC92] text-[#173247] text-sm font-semibold transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* 5 Automatic Calculation Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4E6B82]">Total Income</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#173247] tabular-nums truncate">
            {formatMoney(summary.totalIncome, currency)}
          </p>
          <p className="mt-1.5 text-xs text-[#2D6E96] font-medium tabular-nums">
            {MONTH_NAMES[month - 1]}: +{formatMoney(summary.monthlyIncome, currency)}
          </p>
        </div>

        <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4E6B82]">Total Expenses</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#173247] tabular-nums truncate">
            {formatMoney(summary.totalExpenses, currency)}
          </p>
          <p className="mt-1.5 text-xs text-[#B35B3A] font-medium tabular-nums">
            {MONTH_NAMES[month - 1]}: -{formatMoney(summary.monthlyExpenses, currency)}
          </p>
        </div>

        <div className="bg-[#1D3E58] border border-[#1D3E58] rounded-xl p-5 text-white">
          <p className="text-xs font-medium text-[#A6C8E2]">Current Balance</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-white tabular-nums truncate">
            {formatMoney(summary.currentBalance, currency)}
          </p>
          <p className="mt-1.5 text-xs text-[#F4BAA3]">
            Income minus total expenses
          </p>
        </div>

        <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4E6B82]">Monthly Budget</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-[#173247] tabular-nums truncate">
            {formatMoney(summary.monthlyBudget, currency)}
          </p>
          <p className="mt-1.5 text-xs text-[#2D6E96] font-medium">
            {summary.monthlyBudget > 0
              ? `${MONTH_NAMES[month - 1]} ${year} target`
              : 'No monthly budget set'}
          </p>
        </div>

        <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
          <p className="text-xs font-medium text-[#4E6B82]">Remaining Budget</p>
          <p
            className={`mt-2 font-mono text-2xl font-semibold tabular-nums truncate ${
              summary.monthlyBudget > 0 && summary.remainingBudget < 0
                ? 'text-[#DC2626]'
                : 'text-[#173247]'
            }`}
          >
            {formatMoney(summary.remainingBudget, currency)}
          </p>
          <p className="mt-1.5 text-xs text-[#4E6B82]">
            {summary.monthlyBudget > 0
              ? summary.remainingBudget < 0
                ? 'Over monthly budget limit'
                : `${Math.max(0, Math.round((summary.remainingBudget / summary.monthlyBudget) * 100))}% available`
              : 'Set a budget to track'}
          </p>
        </div>
      </div>

      {/* Budget Limit Warnings (Approaching >=80% or Exceeded >=100%) */}
      {budgetAlerts.length > 0 && (
        <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Budget Threshold Alerts · {MONTH_NAMES[month - 1]} {year}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('budgets')}
              className="text-xs font-semibold text-[#2D6E96] hover:text-[#173247] inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage Budgets</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-[#EFE9D8]">
            {budgetAlerts.map((alert) => {
              const isExceeded = alert.Status === 'exceeded';
              return (
                <div
                  key={alert.Budget_ID}
                  className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div className="flex items-center gap-2.5">
                    {isExceeded ? (
                      <ShieldAlert className="w-4 h-4 text-[#DC2626] shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-[#C26D27] shrink-0" />
                    )}
                    <span className="text-sm font-medium text-[#173247]">{alert.Category}</span>
                    <span className="text-xs text-[#619DC6]">·</span>
                    <span
                      className={`text-xs font-semibold ${
                        isExceeded ? 'text-[#DC2626]' : 'text-[#B45309]'
                      }`}
                    >
                      {isExceeded ? 'Limit Exceeded' : 'Approaching Limit'} ({alert.Utilization}%)
                    </span>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-[#4E6B82]">
                    Spent {formatMoney(alert.Spent, currency)} of{' '}
                    {formatMoney(alert.Budget_Amount, currency)}
                    {' · '}
                    <span className={alert.Remaining < 0 ? 'text-[#DC2626] font-semibold' : ''}>
                      {alert.Remaining < 0
                        ? `Over by ${formatMoney(Math.abs(alert.Remaining), currency)}`
                        : `${formatMoney(alert.Remaining, currency)} left`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts Grid: 6-Month Cash Flow Bar + Category Expense Analysis Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-[#E5DEC9] rounded-xl p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-base font-semibold text-[#173247]">
                Income vs. Expenses Trend
              </h2>
              <p className="text-xs text-[#4E6B82] mt-0.5">
                Rolling 6-month comparison ending {MONTH_NAMES[month - 1]} {year}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs font-semibold text-[#2D6E96] hover:text-[#173247] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <span>Full Reports</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ChartCanvas
            type="bar"
            data={barData}
            heightClass="h-72"
            options={{
              plugins: {
                legend: {
                  position: 'top',
                  align: 'end',
                  labels: { boxWidth: 12, usePointStyle: true, color: '#173247' },
                },
              },
              scales: {
                x: { grid: { display: false }, ticks: { color: '#4E6B82' } },
                y: {
                  beginAtZero: true,
                  grid: { color: '#F0EBE0' },
                  ticks: { color: '#4E6B82' },
                },
              },
            }}
          />
        </div>

        <div className="lg:col-span-5 bg-white border border-[#E5DEC9] rounded-xl p-6 flex flex-col">
          <div className="mb-4">
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Expense Analysis by Category
            </h2>
            <p className="text-xs text-[#4E6B82] mt-0.5">
              {MONTH_NAMES[month - 1]} {year} spending distribution
            </p>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-[#4E6B82]">
                No expenses recorded for {MONTH_NAMES[month - 1]} {year}.
              </p>
              <button
                type="button"
                onClick={onAddExpense}
                className="mt-3 h-9 px-4 rounded-lg bg-[#F4BAA3] hover:bg-[#EEAC92] text-[#173247] text-xs font-semibold cursor-pointer"
              >
                Log First Expense
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-4">
              <ChartCanvas
                type="doughnut"
                data={doughnutData}
                heightClass="h-52"
                options={{
                  cutout: '64%',
                  plugins: {
                    legend: { display: false },
                  },
                }}
              />
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {categoryBreakdown.map((item, idx) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-xs py-1 border-b border-[#F2EDE0] last:border-b-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{
                          backgroundColor: BLUE_PALETTE[idx % BLUE_PALETTE.length],
                        }}
                      />
                      <span className="text-[#1D3E58] truncate">{item.category}</span>
                    </div>
                    <span className="font-mono tabular-nums font-medium text-[#173247] shrink-0">
                      {formatMoney(item.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#ECE5D3] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Recent Transactions
            </h2>
            <p className="text-xs text-[#4E6B82] mt-0.5">
              Latest income and expense entries across your ledger
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#619DC6] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={recentQuery}
                onChange={(e) => setRecentQuery(e.target.value)}
                placeholder="Search recent..."
                aria-label="Search recent transactions"
                className="h-9 pl-9 pr-3 rounded-lg border border-[#D8D0BC] bg-[#FAF8F2] text-xs text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('expenses')}
              className="text-xs font-semibold text-[#2D6E96] hover:text-[#173247] whitespace-nowrap cursor-pointer"
            >
              View All
            </button>
          </div>
        </div>

        {filteredRecent.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#4E6B82]">
            {recentQuery
              ? 'No recent transactions match your search.'
              : 'No transactions yet. Add your first income or expense to begin.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F2] border-b border-[#ECE5D3] text-xs font-semibold text-[#4E6B82]">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EDE0] text-sm">
                {filteredRecent.map((tx) => {
                  const isIncome = tx.type === 'income';
                  return (
                    <tr key={`${tx.type}-${tx.id}`} className="hover:bg-[#FAF8F2] transition-colors">
                      <td className="py-3 px-6 text-[#4E6B82] whitespace-nowrap font-mono text-xs tabular-nums">
                        {formatDisplayDate(tx.date)}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium ${
                            isIncome ? 'text-[#2D6E96]' : 'text-[#B35B3A]'
                          }`}
                        >
                          {isIncome ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-[#619DC6]" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-[#E08E6D]" />
                          )}
                          <span>{isIncome ? 'Income' : 'Expense'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-[#173247] whitespace-nowrap">
                        {tx.category}
                      </td>
                      <td className="py-3 px-4 text-[#4E6B82] whitespace-nowrap text-xs">
                        {tx.paymentMethod || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#4E6B82] max-w-xs truncate">
                        {tx.description || '—'}
                      </td>
                      <td
                        className={`py-3 px-6 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-[#2D6E96]' : 'text-[#173247]'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatMoney(tx.amount, currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
