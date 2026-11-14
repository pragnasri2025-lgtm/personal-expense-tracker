import { useEffect, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import { apiRequest, todayISO } from '../lib/api';
import type { ExpenseCategoryItem, ExpenseRecord, IncomeRecord } from '../types';

interface TransactionModalProps {
  open: boolean;
  type: 'income' | 'expense';
  onClose: () => void;
  onSaved: () => void;
  incomeCategories: string[];
  expenseCategories: ExpenseCategoryItem[];
  paymentMethods: string[];
  editingIncome?: IncomeRecord | null;
  editingExpense?: ExpenseRecord | null;
}

export function TransactionModal({
  open,
  type,
  onClose,
  onSaved,
  incomeCategories,
  expenseCategories,
  paymentMethods,
  editingIncome,
  editingExpense,
}: TransactionModalProps) {
  const isEditing = type === 'income' ? Boolean(editingIncome) : Boolean(editingExpense);

  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (type === 'income') {
      if (editingIncome) {
        setAmount(String(editingIncome.Amount));
        setCategory(editingIncome.Category);
        setDate(editingIncome.Date);
        setDescription(editingIncome.Description || '');
      } else {
        setAmount('');
        setCategory(incomeCategories[0] || 'Salary');
        setDate(todayISO());
        setDescription('');
      }
    } else {
      if (editingExpense) {
        setAmount(String(editingExpense.Amount));
        setCategory(editingExpense.Category);
        setPaymentMethod(editingExpense.Payment_Method);
        setDate(editingExpense.Date);
        setDescription(editingExpense.Description || '');
      } else {
        setAmount('');
        setCategory(expenseCategories[0]?.Name || 'Food');
        setPaymentMethod(paymentMethods[0] || 'Debit Card');
        setDate(todayISO());
        setDescription('');
      }
    }
  }, [
    open,
    type,
    editingIncome,
    editingExpense,
    incomeCategories,
    expenseCategories,
    paymentMethods,
  ]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setLoading(true);
    try {
      if (type === 'income') {
        const url = editingIncome ? `/api/income/${editingIncome.Income_ID}` : '/api/income';
        await apiRequest(url, {
          method: editingIncome ? 'PUT' : 'POST',
          body: JSON.stringify({
            amount: parsedAmount,
            category,
            date,
            description,
          }),
        });
      } else {
        const url = editingExpense
          ? `/api/expenses/${editingExpense.Expense_ID}`
          : '/api/expenses';
        await apiRequest(url, {
          method: editingExpense ? 'PUT' : 'POST',
          body: JSON.stringify({
            amount: parsedAmount,
            category,
            paymentMethod,
            date,
            description,
          }),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save transaction.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#173247]/50 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
    >
      <div className="w-full max-w-lg bg-white border border-[#E5DEC9] rounded-2xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-[#ECE5D3] bg-[#FAF8F2] flex items-center justify-between">
          <h3 id="tx-modal-title" className="font-display text-lg font-semibold text-[#173247]">
            {isEditing
              ? type === 'income'
                ? 'Edit Income Record'
                : 'Edit Expense Record'
              : type === 'income'
                ? 'Add New Income'
                : 'Record New Expense'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-[#4E6B82] hover:bg-[#F4F0E2] hover:text-[#173247]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              role="alert"
              className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 text-sm text-[#B91C1C]"
            >
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-amount" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                Amount
              </label>
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm font-mono tabular-nums text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
              />
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                Transaction Date
              </label>
              <input
                id="tx-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${type === 'expense' ? 'sm:grid-cols-2' : ''} gap-4`}>
            <div>
              <label htmlFor="tx-category" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                {type === 'income' ? 'Income Category' : 'Expense Category'}
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
              >
                {type === 'income'
                  ? incomeCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))
                  : expenseCategories.map((c) => (
                      <option key={c.Category_ID} value={c.Name}>
                        {c.Name}
                      </option>
                    ))}
              </select>
            </div>

            {type === 'expense' && (
              <div>
                <label
                  htmlFor="tx-payment"
                  className="block text-sm font-medium text-[#1D3E58] mb-1.5"
                >
                  Payment Method
                </label>
                <select
                  id="tx-payment"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="tx-desc" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
              Description
            </label>
            <input
              id="tx-desc"
              type="text"
              maxLength={200}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                type === 'income'
                  ? 'e.g., Monthly salary deposit or consulting invoice'
                  : 'e.g., Weekly groceries or transit pass'
              }
              className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="h-10 px-4 rounded-lg border border-[#D8D0BC] text-sm font-medium text-[#1D3E58] hover:bg-[#F4F0E2] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-5 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-60 text-white text-sm font-medium transition-colors cursor-pointer"
            >
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
