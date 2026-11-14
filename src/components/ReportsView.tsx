import { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { BLUE_PALETTE, ChartCanvas } from './ChartCanvas';
import { apiRequest, formatDisplayDate, formatMoney, MONTH_NAMES } from '../lib/api';
import { downloadReportCSV, downloadReportPDF } from '../lib/exportReports';
import type { ReportResponse, UserProfile } from '../types';

interface ReportsViewProps {
  user: UserProfile;
  month: number;
  year: number;
  onChangePeriod: (month: number, year: number) => void;
  refreshSignal: number;
}

export function ReportsView({
  user,
  month,
  year,
  onChangePeriod,
  refreshSignal,
}: ReportsViewProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const yearOptions = useMemo(() => {
    const cur = new Date().getFullYear();
    return [cur - 2, cur - 1, cur, cur + 1];
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    apiRequest<ReportResponse>(
      `/api/reports?period=${period}&month=${month}&year=${year}`
    )
      .then((res) => {
        if (active) setReport(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load report.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [period, month, year, refreshSignal]);

  const barChartData = useMemo(() => {
    if (!report) return { labels: [], datasets: [] };
    return {
      labels: report.trendSeries.map((t) => t.label),
      datasets: [
        {
          label: 'Income',
          data: report.trendSeries.map((t) => t.income),
          backgroundColor: '#619DC6',
          borderRadius: 4,
        },
        {
          label: 'Expenses',
          data: report.trendSeries.map((t) => t.expenses),
          backgroundColor: '#F4BAA3',
          borderRadius: 4,
        },
      ],
    };
  }, [report]);

  const pieChartData = useMemo(() => {
    if (!report || report.categoryAnalysis.length === 0) {
      return { labels: [], datasets: [] };
    }
    return {
      labels: report.categoryAnalysis.map((c) => c.category),
      datasets: [
        {
          data: report.categoryAnalysis.map((c) => c.amount),
          backgroundColor: report.categoryAnalysis.map(
            (_, idx) => BLUE_PALETTE[idx % BLUE_PALETTE.length]
          ),
          borderColor: '#FFFFFF',
          borderWidth: 2,
        },
      ],
    };
  }, [report]);

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white border border-[#E5DEC9] rounded-xl p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Segmented Report Cadence */}
          <div className="inline-flex items-center gap-1 p-1 bg-[#F4F0E2] rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors capitalize whitespace-nowrap cursor-pointer ${
                  period === p
                    ? 'bg-white text-[#173247] shadow-xs'
                    : 'text-[#4E6B82] hover:text-[#173247]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <select
            value={month}
            onChange={(e) => onChangePeriod(Number(e.target.value), year)}
            aria-label="Report reference month"
            className="h-9 px-3 rounded-lg border border-[#D8D0BC] bg-white text-xs font-medium text-[#173247]"
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
            aria-label="Report reference year"
            className="h-9 px-3 rounded-lg border border-[#D8D0BC] bg-white text-xs font-medium text-[#173247]"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {report && (
            <span className="text-xs font-mono text-[#4E6B82]">
              {report.startDate} to {report.endDate}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={!report}
            onClick={() => report && downloadReportCSV(report, user)}
            className="h-10 px-4 rounded-lg bg-[#A6C8E2] hover:bg-[#8FB8D8] disabled:opacity-50 text-[#173247] text-sm font-semibold transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
          <button
            type="button"
            disabled={!report}
            onClick={() => report && downloadReportPDF(report, user)}
            className="h-10 px-4 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-50 text-white text-sm font-medium transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
        >
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="h-96 rounded-xl bg-white border border-[#E5DEC9] animate-pulse" />
      ) : report ? (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
              <p className="text-xs font-medium text-[#4E6B82]">Period Income</p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-[#2D6E96] tabular-nums">
                +{formatMoney(report.summary.totalIncome, user.Currency)}
              </p>
            </div>
            <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
              <p className="text-xs font-medium text-[#4E6B82]">Period Expenses</p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-[#173247] tabular-nums">
                -{formatMoney(report.summary.totalExpenses, user.Currency)}
              </p>
            </div>
            <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
              <p className="text-xs font-medium text-[#4E6B82]">Net Period Savings</p>
              <p
                className={`mt-1.5 font-mono text-xl font-semibold tabular-nums ${
                  report.summary.netSavings < 0 ? 'text-[#DC2626]' : 'text-[#173247]'
                }`}
              >
                {formatMoney(report.summary.netSavings, user.Currency)}
              </p>
            </div>
            <div className="bg-white border border-[#E5DEC9] rounded-xl p-5">
              <p className="text-xs font-medium text-[#4E6B82]">Savings Rate</p>
              <p className="mt-1.5 font-mono text-xl font-semibold text-[#619DC6] tabular-nums">
                {report.summary.savingsRate}%
              </p>
            </div>
          </div>

          {/* Bar Chart + Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-[#E5DEC9] rounded-xl p-6">
              <h3 className="font-display text-base font-semibold text-[#173247]">
                {period === 'daily'
                  ? 'Daily Income vs. Expenses'
                  : period === 'weekly'
                    ? 'Weekly Spending Trends (12 Weeks)'
                    : 'Monthly Income vs. Expenses (12 Months)'}
              </h3>
              <p className="text-xs text-[#4E6B82] mt-0.5 mb-4">
                Bar chart comparison across the selected reporting window
              </p>
              <ChartCanvas
                type="bar"
                data={barChartData}
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
                    y: { beginAtZero: true, grid: { color: '#F0EBE0' }, ticks: { color: '#4E6B82' } },
                  },
                }}
              />
            </div>

            <div className="lg:col-span-5 bg-white border border-[#E5DEC9] rounded-xl p-6 flex flex-col">
              <h3 className="font-display text-base font-semibold text-[#173247]">
                Category-Wise Expense Share
              </h3>
              <p className="text-xs text-[#4E6B82] mt-0.5 mb-4">
                Pie chart distribution of expenses in this period
              </p>
              {report.categoryAnalysis.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 text-sm text-[#4E6B82]">
                  No expense transactions recorded during this period.
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-between gap-4">
                  <ChartCanvas
                    type="pie"
                    data={pieChartData}
                    heightClass="h-56"
                    options={{
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { boxWidth: 11, color: '#173247', padding: 12 },
                        },
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="bg-white border border-[#E5DEC9] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ECE5D3]">
              <h3 className="font-display text-base font-semibold text-[#173247]">
                Category-Wise Expense Breakdown
              </h3>
            </div>
            {report.categoryAnalysis.length === 0 ? (
              <div className="px-6 py-8 text-sm text-[#4E6B82] text-center">
                No expenses found in this timeframe.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAF8F2] border-b border-[#ECE5D3] text-xs font-semibold text-[#4E6B82]">
                      <th className="py-3 px-6">Category</th>
                      <th className="py-3 px-4 text-right">Transactions</th>
                      <th className="py-3 px-4 text-right">Share of Spending</th>
                      <th className="py-3 px-6 text-right">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EDE0] text-sm">
                    {report.categoryAnalysis.map((row) => (
                      <tr key={row.category} className="hover:bg-[#FAF8F2]">
                        <td className="py-3 px-6 font-medium text-[#173247]">{row.category}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#4E6B82]">
                          {row.count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-[#2D6E96]">
                          {row.share}%
                        </td>
                        <td className="py-3 px-6 text-right font-mono tabular-nums font-semibold text-[#173247]">
                          {formatMoney(row.amount, user.Currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Period Ledger Preview */}
          <div className="bg-white border border-[#E5DEC9] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#ECE5D3] flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-[#173247]">
                Included Transactions ({report.transactions.length})
              </h3>
            </div>
            {report.transactions.length === 0 ? (
              <div className="px-6 py-8 text-sm text-[#4E6B82] text-center">
                No transactions in this reporting period.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-[#FAF8F2]">
                    <tr className="border-b border-[#ECE5D3] text-xs font-semibold text-[#4E6B82]">
                      <th className="py-3 px-6">Date</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Description</th>
                      <th className="py-3 px-6 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EDE0] text-sm">
                    {report.transactions.map((tx) => (
                      <tr key={`${tx.type}-${tx.id}`} className="hover:bg-[#FAF8F2]">
                        <td className="py-2.5 px-6 font-mono text-xs tabular-nums text-[#4E6B82] whitespace-nowrap">
                          {formatDisplayDate(tx.date)}
                        </td>
                        <td className="py-2.5 px-4 text-xs font-medium text-[#1D3E58] capitalize">
                          {tx.type}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#173247] whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#4E6B82] whitespace-nowrap">
                          {tx.paymentMethod || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-[#4E6B82] max-w-xs truncate">
                          {tx.description || '—'}
                        </td>
                        <td
                          className={`py-2.5 px-6 text-right font-mono font-semibold tabular-nums whitespace-nowrap ${
                            tx.type === 'income' ? 'text-[#2D6E96]' : 'text-[#173247]'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatMoney(tx.amount, user.Currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
