import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { apiRequest, formatMoney, MONTH_NAMES } from '../lib/api';
import type { BudgetRecord, ExpenseCategoryItem } from '../types';

interface BudgetsViewProps {
  budgets: BudgetRecord[];
  totalMonthlySpent: number;
  expenseCategories: ExpenseCategoryItem[];
  currency: string;
  month: number;
  year: number;
  onChangePeriod: (month: number, year: number) => void;
  onRefresh: () => void;
}

export function BudgetsView({
  budgets,
  totalMonthlySpent,
  expenseCategories,
  currency,
  month,
  year,
  onChangePeriod,
  onRefresh,
}: BudgetsViewProps) {
  const [category, setCategory] = useState('Monthly Total');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 2, cur - 1, cur, cur + 1];
  }, []);

  const overallBudget = budgets.find((b) => b.Category === 'Monthly Total');
  const categoryBudgets = budgets.filter((b) => b.Category !== 'Monthly Total');

  async function handleSaveBudget(e: FormEvent) {
    e.preventDefault();
    setError('');
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setError('Please enter a positive budget amount.');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/api/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category,
          month,
          year,
          budgetAmount: num,
        }),
      });
      setAmount('');
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    setError('');
    try {
      await apiRequest(`/api/budgets/${id}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete budget.');
    }
  }

  function renderStatusLabel(b: BudgetRecord) {
    if (b.Status === 'exceeded') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#DC2626]">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>Exceeded ({b.Utilization}%)</span>
        </span>
      );
    }
    if (b.Status === 'warning') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B45309]">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>Approaching Limit ({b.Utilization}%)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6E96]">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        <span>On Track ({b.Utilization}%)</span>
      </span>
    );
  }

  function renderProgressBar(b: BudgetRecord) {
    const widthPct = Math.min(100, Math.max(0, b.Utilization));
    const barColor =
      b.Status === 'exceeded'
        ? 'bg-[#DC2626]'
        : b.Status === 'warning'
          ? 'bg-[#E2987A]'
          : 'bg-[#619DC6]';

    return (
      <div className="w-full h-2.5 rounded-full bg-[#F4F0E2] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColor}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector & Set Budget Form */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-semibold text-[#173247]">
              Set Monthly or Category Budget
            </h2>
            <p className="text-xs text-[#4E6B82] mt-0.5">
              Select a target period and assign spending limits. Updates existing limit if already defined.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <select
              value={month}
              onChange={(e) => onChangePeriod(Number(e.target.value), year)}
              aria-label="Budget Month"
              className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm font-medium text-[#173247]"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => onChangePeriod(month, Number(e.target.value))}
              aria-label="Budget Year"
              className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm font-medium text-[#173247]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-sm text-[#B91C1C]"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSaveBudget} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5">
            <label htmlFor="budget-category" className="block text-xs font-medium text-[#1D3E58] mb-1">
              Budget Scope / Category
            </label>
            <select
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247]"
            >
              <option value="Monthly Total">Monthly Total (Overall Cap)</option>
              {expenseCategories.map((c) => (
                <option key={c.Category_ID} value={c.Name}>
                  {c.Name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label htmlFor="budget-amount" className="block text-xs font-medium text-[#1D3E58] mb-1">
              Budget Amount ({currency})
            </label>
            <input
              id="budget-amount"
              type="number"
              step="0.01"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g., 500.00"
              className="w-full h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm font-mono tabular-nums text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
            />
          </div>

          <div className="sm:col-span-3 flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full h-10 px-4 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-60 text-white text-sm font-medium transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Budget'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Overall Monthly Cap Card */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-display text-base font-semibold text-[#173247]">
              Overall Monthly Budget · {MONTH_NAMES[month - 1]} {year}
            </h3>
            <p className="text-xs text-[#4E6B82] mt-0.5">
              Total expenses counted across all categories:{' '}
              <span className="font-mono tabular-nums font-medium text-[#173247]">
                {formatMoney(totalMonthlySpent, currency)}
              </span>
            </p>
          </div>
          {overallBudget && (
            <div className="flex items-center gap-4">
              {renderStatusLabel(overallBudget)}
              <button
                type="button"
                onClick={() => handleDelete(overallBudget.Budget_ID)}
                aria-label="Delete overall monthly budget"
                className="p-1.5 rounded-md text-[#4E6B82] hover:bg-[#F4BAA3]/45 hover:text-[#B91C1C] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {overallBudget ? (
          <div className="mt-4 space-y-2.5">
            {renderProgressBar(overallBudget)}
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-mono tabular-nums">
              <span className="text-[#4E6B82]">
                Cap: <strong className="text-[#173247]">{formatMoney(overallBudget.Budget_Amount, currency)}</strong>
              </span>
              <span className="text-[#4E6B82]">
                Spent: <strong className="text-[#173247]">{formatMoney(overallBudget.Spent, currency)}</strong>
              </span>
              <span
                className={
                  overallBudget.Remaining < 0
                    ? 'text-[#DC2626] font-semibold'
                    : 'text-[#2D6E96] font-semibold'
                }
              >
                {overallBudget.Remaining < 0
                  ? `Exceeded by ${formatMoney(Math.abs(overallBudget.Remaining), currency)}`
                  : `Remaining: ${formatMoney(overallBudget.Remaining, currency)}`}
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 py-4 border-t border-[#F2EDE0] text-sm text-[#4E6B82]">
            No overall monthly cap is set for {MONTH_NAMES[month - 1]} {year}. Use the form above with &ldquo;Monthly Total&rdquo; to set one.
          </div>
        )}
      </div>

      {/* Category-Wise Budgets */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#ECE5D3]">
          <h3 className="font-display text-base font-semibold text-[#173247]">
            Category-Wise Budgets
          </h3>
          <p className="text-xs text-[#4E6B82] mt-0.5">
            Automatic spending comparison against each category limit for {MONTH_NAMES[month - 1]} {year}
          </p>
        </div>

        {categoryBudgets.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[#4E6B82]">
            No category-wise budgets defined for {MONTH_NAMES[month - 1]} {year}.
          </div>
        ) : (
          <div className="divide-y divide-[#F2EDE0]">
            {categoryBudgets.map((b) => (
              <div key={b.Budget_ID} className="p-6 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-display font-semibold text-sm text-[#173247]">
                      {b.Category}
                    </span>
                    <span className="text-xs text-[#619DC6]">·</span>
                    {renderStatusLabel(b)}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs font-mono tabular-nums text-[#4E6B82]">
                      {formatMoney(b.Spent, currency)} / {formatMoney(b.Budget_Amount, currency)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(b.Budget_ID)}
                      aria-label={`Delete budget for ${b.Category}`}
                      className="p-1.5 rounded-md text-[#4E6B82] hover:bg-[#F4BAA3]/45 hover:text-[#B91C1C] cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {renderProgressBar(b)}

                <div className="flex items-center justify-between text-xs text-[#4E6B82]">
                  <span>
                    {b.Status === 'exceeded'
                      ? 'Warning: Spending has exceeded this category budget limit.'
                      : b.Status === 'warning'
                        ? 'Caution: Over 80% of this category budget has been used.'
                        : 'Spending is within healthy budget limits.'}
                  </span>
                  <span
                    className={`font-mono tabular-nums font-semibold ${
                      b.Remaining < 0 ? 'text-[#DC2626]' : 'text-[#173247]'
                    }`}
                  >
                    {b.Remaining < 0
                      ? `-${formatMoney(Math.abs(b.Remaining), currency)} over`
                      : `${formatMoney(b.Remaining, currency)} remaining`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
