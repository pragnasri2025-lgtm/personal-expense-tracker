import { useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { apiRequest, formatDisplayDate, formatMoney } from '../lib/api';
import type { IncomeRecord } from '../types';

interface IncomeViewProps {
  records: IncomeRecord[];
  incomeCategories: string[];
  currency: string;
  onAdd: () => void;
  onEdit: (record: IncomeRecord) => void;
  onRefresh: () => void;
}

export function IncomeView({
  records,
  incomeCategories,
  currency,
  onAdd,
  onEdit,
  onRefresh,
}: IncomeViewProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('ALL');
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const r of records) {
      set.add(r.Date.slice(0, 7));
    }
    return Array.from(set).sort().reverse();
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      if (categoryFilter !== 'ALL' && r.Category !== categoryFilter) return false;
      if (monthFilter !== 'ALL' && !r.Date.startsWith(monthFilter)) return false;
      if (q) {
        const hay = `${r.Category} ${r.Description} ${r.Date} ${r.Amount}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [records, search, categoryFilter, monthFilter]);

  const filteredTotal = useMemo(
    () => filtered.reduce((acc, r) => acc + r.Amount, 0),
    [filtered]
  );

  async function handleDelete(id: number) {
    setError('');
    try {
      await apiRequest(`/api/income/${id}`, { method: 'DELETE' });
      setDeletingId(null);
      onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete income record.');
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Strip */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#4E6B82]">
            Filtered Income Total ({filtered.length} {filtered.length === 1 ? 'record' : 'records'})
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold text-[#2D6E96] tabular-nums">
            +{formatMoney(filteredTotal, currency)}
          </p>
        </div>

        <button
          type="button"
          onClick={onAdd}
          className="h-10 px-4 rounded-lg bg-[#A6C8E2] hover:bg-[#8FB8D8] text-[#173247] text-sm font-semibold transition-colors inline-flex items-center gap-2 self-start sm:self-auto whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Income</span>
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      {/* Search & Filters + Data Table */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#ECE5D3] flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#619DC6] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by description, category, or date..."
              aria-label="Search income records"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#D8D0BC] bg-[#FAF8F2] text-sm text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by income category"
              className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247]"
            >
              <option value="ALL">All Categories</option>
              {incomeCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter by month"
              className="h-10 px-3 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247]"
            >
              <option value="ALL">All Months</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {ym}
                </option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-[#4E6B82]">
              {records.length === 0
                ? 'No income records yet. Record your first salary, scholarship, or business deposit.'
                : 'No income records match the selected filters.'}
            </p>
            {records.length === 0 && (
              <button
                type="button"
                onClick={onAdd}
                className="mt-3 h-9 px-4 rounded-lg bg-[#A6C8E2] hover:bg-[#8FB8D8] text-[#173247] text-xs font-semibold cursor-pointer"
              >
                Add First Income
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF8F2] border-b border-[#ECE5D3] text-xs font-semibold text-[#4E6B82]">
                  <th className="py-3 px-6">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2EDE0] text-sm">
                {filtered.map((rec) => (
                  <tr key={rec.Income_ID} className="hover:bg-[#FAF8F2] transition-colors">
                    <td className="py-3 px-6 font-mono text-xs text-[#4E6B82] tabular-nums whitespace-nowrap">
                      {formatDisplayDate(rec.Date)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#173247] whitespace-nowrap">
                      {rec.Category}
                    </td>
                    <td className="py-3 px-4 text-[#4E6B82] max-w-sm truncate">
                      {rec.Description || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-[#2D6E96] tabular-nums whitespace-nowrap">
                      +{formatMoney(rec.Amount, currency)}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      {deletingId === rec.Income_ID ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDelete(rec.Income_ID)}
                            className="text-xs font-semibold text-[#DC2626] hover:underline cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(null)}
                            className="text-xs text-[#4E6B82] hover:text-[#173247] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEdit(rec)}
                            aria-label={`Edit income ${rec.Description || rec.Category}`}
                            className="p-1.5 rounded-md text-[#4E6B82] hover:bg-[#A6C8E2]/35 hover:text-[#173247] cursor-pointer"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingId(rec.Income_ID)}
                            aria-label={`Delete income ${rec.Description || rec.Category}`}
                            className="p-1.5 rounded-md text-[#4E6B82] hover:bg-[#F4BAA3]/45 hover:text-[#B91C1C] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
