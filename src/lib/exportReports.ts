import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ReportResponse, UserProfile } from '../types';
import { formatMoney } from './api';

function escapeCsvCell(val: string | number): string {
  const str = String(val ?? '');
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function downloadReportCSV(report: ReportResponse, user: UserProfile): void {
  const lines: string[] = [];
  lines.push(`Personal Expense Tracker Management System - ${report.period.toUpperCase()} Report`);
  lines.push(`Account Holder,${escapeCsvCell(user.Name)},Email,${escapeCsvCell(user.Email)}`);
  lines.push(`Period Range,${report.startDate} to ${report.endDate},Currency,${user.Currency}`);
  lines.push('');
  lines.push('Summary');
  lines.push(`Total Income,${report.summary.totalIncome.toFixed(2)}`);
  lines.push(`Total Expenses,${report.summary.totalExpenses.toFixed(2)}`);
  lines.push(`Net Savings,${report.summary.netSavings.toFixed(2)}`);
  lines.push(`Savings Rate,${report.summary.savingsRate}%`);
  lines.push('');
  lines.push('Category-Wise Expense Analysis');
  lines.push('Category,Transactions,Amount,Share (%)');
  for (const cat of report.categoryAnalysis) {
    lines.push(
      [
        escapeCsvCell(cat.category),
        cat.count,
        cat.amount.toFixed(2),
        `${cat.share}%`,
      ].join(',')
    );
  }
  lines.push('');
  lines.push('Transaction History');
  lines.push('Date,Type,Category,Payment Method,Description,Amount');
  for (const tx of report.transactions) {
    lines.push(
      [
        escapeCsvCell(tx.date),
        escapeCsvCell(tx.type === 'income' ? 'Income' : 'Expense'),
        escapeCsvCell(tx.category),
        escapeCsvCell(tx.paymentMethod || '—'),
        escapeCsvCell(tx.description || ''),
        tx.type === 'income' ? tx.amount.toFixed(2) : (-tx.amount).toFixed(2),
      ].join(',')
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `expense-report-${report.period}-${report.startDate}-to-${report.endDate}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadReportPDF(report: ReportResponse, user: UserProfile): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const currency = user.Currency;

  // Header Banner
  doc.setFillColor(29, 62, 88);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 86, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text('Personal Expense Tracker Management System', 40, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const periodTitle = `${report.period.charAt(0).toUpperCase() + report.period.slice(1)} Financial Report`;
  doc.text(`${periodTitle}  |  ${report.startDate} to ${report.endDate}`, 40, 56);
  doc.text(`Account: ${user.Name} (${user.Email})  |  Currency: ${currency}`, 40, 72);

  // Summary Section
  doc.setTextColor(23, 50, 71);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Financial Summary', 40, 114);

  autoTable(doc, {
    startY: 124,
    margin: { left: 40, right: 40 },
    head: [['Total Income', 'Total Expenses', 'Net Savings', 'Savings Rate']],
    body: [
      [
        formatMoney(report.summary.totalIncome, currency),
        formatMoney(report.summary.totalExpenses, currency),
        formatMoney(report.summary.netSavings, currency),
        `${report.summary.savingsRate}%`,
      ],
    ],
    headStyles: { fillColor: [29, 62, 88], textColor: 255, fontSize: 9.5 },
    bodyStyles: { fontSize: 10, fontStyle: 'bold', textColor: [23, 50, 71] },
    theme: 'grid',
  });

  const afterSummaryY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;

  // Category Analysis
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Category-Wise Expense Analysis', 40, afterSummaryY);

  autoTable(doc, {
    startY: afterSummaryY + 10,
    margin: { left: 40, right: 40 },
    head: [['Category', 'Transactions', 'Total Spent', 'Share']],
    body:
      report.categoryAnalysis.length > 0
        ? report.categoryAnalysis.map((c) => [
            c.category,
            String(c.count),
            formatMoney(c.amount, currency),
            `${c.share}%`,
          ])
        : [['No expenses recorded in this period', '0', formatMoney(0, currency), '0%']],
    headStyles: { fillColor: [97, 157, 198], textColor: 255, fontSize: 9.5 },
    bodyStyles: { fontSize: 9.5, textColor: [23, 50, 71] },
    alternateRowStyles: { fillColor: [244, 240, 226] },
    theme: 'striped',
  });

  const afterCatsY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 22;

  // Transaction Ledger
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Transaction Records', 40, afterCatsY);

  autoTable(doc, {
    startY: afterCatsY + 10,
    margin: { left: 40, right: 40 },
    head: [['Date', 'Type', 'Category', 'Method', 'Description', 'Amount']],
    body:
      report.transactions.length > 0
        ? report.transactions.map((t) => [
            t.date,
            t.type === 'income' ? 'Income' : 'Expense',
            t.category,
            t.paymentMethod || '—',
            t.description || '—',
            (t.type === 'income' ? '+' : '-') + formatMoney(t.amount, currency),
          ])
        : [['—', '—', 'No transactions in selected period', '—', '—', '—']],
    headStyles: { fillColor: [29, 62, 88], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [23, 50, 71] },
    alternateRowStyles: { fillColor: [244, 240, 226] },
    columnStyles: { 5: { halign: 'right' } },
    theme: 'striped',
  });

  doc.save(`expense-report-${report.period}-${report.startDate}-to-${report.endDate}.pdf`);
}
