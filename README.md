# Personal Expense Tracker Management System

A full-stack personal finance web application for tracking daily income and expenses, managing monthly and category-wise budgets, performing automatic balance calculations, viewing Chart.js analytics, and exporting PDF/CSV financial reports.

## Architecture & Features

- **Authentication & Data Isolation**: User registration, secure sign-in/sign-out, salted `scrypt` password hashing, HMAC-signed HTTP-only session cookies, and strict per-user SQL filtering (`User_ID`).
- **Dashboard**: Real-time summary cards for Total Income, Total Expenses, Current Balance, Monthly Budget, and Remaining Budget, plus budget threshold warnings (`>=80%` approaching limit, `>=100%` exceeded), Chart.js trend & category charts, and recent transaction search.
- **Income Management**: Full CRUD for income records (`Salary`, `Scholarship`, `Business`, `Part-time Income`, `Other Income`) with search, category, and month filtering.
- **Expense Management**: Full CRUD for daily expenses across default categories (`Food`, `Shopping`, `Education`, `Transportation`, `Entertainment`, `Medical Expenses`, `Electricity Bills`, `Rent`, `Other Expenses`) plus user-managed custom categories and payment method tracking.
- **Budget Management**: Monthly overall caps and category-wise budgets with automatic spending progress bars, remaining budget calculations, and limit alerts.
- **Reports & Analytics**: Daily, weekly, and monthly views with Chart.js bar/pie visualizations, category-wise breakdowns, and one-click **CSV** and **PDF** report exports.
- **Relational Database**: Built with `node:sqlite` (`data/expense_tracker.db`) implementing the `USER`, `INCOME`, `EXPENSE`, `BUDGET`, and `EXPENSE_CATEGORY` tables (MySQL-compatible DDL also provided in `database/schema.sql`).

## Demo Account

- **Email**: `demo@expenseflow.app`
- **Password**: `DemoUser@2026`

## Running Locally

```bash
npm install
npm run dev
```

The application serves both the REST API and React frontend on `http://localhost:3000`.

For a production build:

```bash
npm run build
NODE_ENV=production npm start
```
