import { DatabaseSync } from 'node:sqlite';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Scholarship',
  'Business',
  'Part-time Income',
  'Other Income',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Shopping',
  'Education',
  'Transportation',
  'Entertainment',
  'Medical Expenses',
  'Electricity Bills',
  'Rent',
  'Other Expenses',
] as const;

export const PAYMENT_METHODS = [
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Cash',
  'Digital Wallet',
] as const;

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'expense_tracker.db');
export const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  const derived = crypto.scryptSync(password, salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS USER (
      User_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      Name TEXT NOT NULL,
      Email TEXT NOT NULL UNIQUE COLLATE NOCASE,
      Password_Hash TEXT NOT NULL,
      Currency TEXT NOT NULL DEFAULT 'USD',
      Created_At TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS INCOME (
      Income_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      User_ID INTEGER NOT NULL,
      Amount REAL NOT NULL CHECK (Amount > 0),
      Category TEXT NOT NULL,
      Date TEXT NOT NULL,
      Description TEXT NOT NULL DEFAULT '',
      Created_At TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (User_ID) REFERENCES USER(User_ID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS EXPENSE (
      Expense_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      User_ID INTEGER NOT NULL,
      Amount REAL NOT NULL CHECK (Amount > 0),
      Category TEXT NOT NULL,
      Payment_Method TEXT NOT NULL,
      Date TEXT NOT NULL,
      Description TEXT NOT NULL DEFAULT '',
      Created_At TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (User_ID) REFERENCES USER(User_ID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS BUDGET (
      Budget_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      User_ID INTEGER NOT NULL,
      Category TEXT NOT NULL,
      Month INTEGER NOT NULL CHECK (Month BETWEEN 1 AND 12),
      Year INTEGER NOT NULL CHECK (Year BETWEEN 2000 AND 2100),
      Budget_Amount REAL NOT NULL CHECK (Budget_Amount >= 0),
      Created_At TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (User_ID, Category, Month, Year),
      FOREIGN KEY (User_ID) REFERENCES USER(User_ID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS EXPENSE_CATEGORY (
      Category_ID INTEGER PRIMARY KEY AUTOINCREMENT,
      User_ID INTEGER NOT NULL,
      Name TEXT NOT NULL,
      Is_Default INTEGER NOT NULL DEFAULT 0,
      UNIQUE (User_ID, Name),
      FOREIGN KEY (User_ID) REFERENCES USER(User_ID) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_income_user_date ON INCOME(User_ID, Date);
    CREATE INDEX IF NOT EXISTS idx_expense_user_date ON EXPENSE(User_ID, Date);
    CREATE INDEX IF NOT EXISTS idx_budget_user_period ON BUDGET(User_ID, Year, Month);
  `);

  seedDemoUserIfNeeded();
}

export function seedDefaultCategoriesForUser(userId: number): void {
  const insertCat = db.prepare(
    'INSERT OR IGNORE INTO EXPENSE_CATEGORY (User_ID, Name, Is_Default) VALUES (?, ?, 1)'
  );
  for (const cat of DEFAULT_EXPENSE_CATEGORIES) {
    insertCat.run(userId, cat);
  }
}

function formatDateYMD(year: number, monthIndex0: number, day: number): string {
  const d = new Date(year, monthIndex0, day);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

function seedDemoUserIfNeeded(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM USER').get() as { count: number };
  if (existing.count > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO USER (Name, Email, Password_Hash, Currency) VALUES (?, ?, ?, ?)'
  );
  const result = insertUser.run(
    'Alex Morgan',
    'demo@expenseflow.app',
    hashPassword('DemoUser@2026'),
    'USD'
  );
  const userId = Number(result.lastInsertRowid);

  seedDefaultCategoriesForUser(userId);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0-indexed
  const curDay = Math.min(now.getDate(), 28);

  const prev1 = new Date(curYear, curMonth - 1, 1);
  const prev2 = new Date(curYear, curMonth - 2, 1);
  const prev3 = new Date(curYear, curMonth - 3, 1);

  const insertIncome = db.prepare(
    'INSERT INTO INCOME (User_ID, Amount, Category, Date, Description) VALUES (?, ?, ?, ?, ?)'
  );
  const insertExpense = db.prepare(
    'INSERT INTO EXPENSE (User_ID, Amount, Category, Payment_Method, Date, Description) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertBudget = db.prepare(
    'INSERT INTO BUDGET (User_ID, Category, Month, Year, Budget_Amount) VALUES (?, ?, ?, ?, ?)'
  );

  // Sample Income across 4 months
  const incomeSeeds: Array<[number, string, string, string]> = [
    [4200, 'Salary', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 1), 'Monthly Software Engineering Salary'],
    [450, 'Business', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 14), 'UI Audit Consulting'],
    [4200, 'Salary', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 1), 'Monthly Software Engineering Salary'],
    [600, 'Part-time Income', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 18), 'Weekend Workshop Instruction'],
    [4350, 'Salary', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 1), 'Monthly Software Engineering Salary'],
    [520, 'Business', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 16), 'Freelance Analytics Dashboard'],
    [4350, 'Salary', formatDateYMD(curYear, curMonth, 1), 'Monthly Software Engineering Salary'],
    [750, 'Scholarship', formatDateYMD(curYear, curMonth, Math.max(2, Math.min(curDay, 8))), 'Professional Continuing Education Stipend'],
    [340, 'Part-time Income', formatDateYMD(curYear, curMonth, Math.max(3, Math.min(curDay, 12))), 'Technical Mentorship Session'],
  ];

  for (const [amount, category, date, desc] of incomeSeeds) {
    insertIncome.run(userId, amount, category, date, desc);
  }

  // Sample Expenses across 4 months
  const expenseSeeds: Array<[number, string, string, string, string]> = [
    // 3 months ago
    [1250, 'Rent', 'Bank Transfer', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 2), 'Apartment Monthly Lease'],
    [410, 'Food', 'Debit Card', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 9), 'Groceries & Weekly Meal Prep'],
    [135, 'Electricity Bills', 'Bank Transfer', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 15), 'Monthly Electric Utility'],
    [160, 'Transportation', 'Credit Card', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 20), 'Metro Pass & Fuel'],
    [220, 'Shopping', 'Credit Card', formatDateYMD(prev3.getFullYear(), prev3.getMonth(), 23), 'Office Desk Lamp & Supplies'],
    // 2 months ago
    [1250, 'Rent', 'Bank Transfer', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 2), 'Apartment Monthly Lease'],
    [445, 'Food', 'Debit Card', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 11), 'Fresh Market & Dining'],
    [142, 'Electricity Bills', 'Bank Transfer', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 15), 'Monthly Electric Utility'],
    [180, 'Medical Expenses', 'Debit Card', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 19), 'Dental Checkup & Pharmacy'],
    [195, 'Entertainment', 'Credit Card', formatDateYMD(prev2.getFullYear(), prev2.getMonth(), 24), 'Concert Tickets & Streaming'],
    // 1 month ago
    [1250, 'Rent', 'Bank Transfer', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 2), 'Apartment Monthly Lease'],
    [475, 'Food', 'Debit Card', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 8), 'Groceries & Coffee'],
    [128, 'Electricity Bills', 'Bank Transfer', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 14), 'Monthly Electric Utility'],
    [240, 'Education', 'Credit Card', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 17), 'Cloud Architecture Certification Course'],
    [190, 'Transportation', 'Debit Card', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 22), 'Commuter Rail Pass'],
    [290, 'Shopping', 'Credit Card', formatDateYMD(prev1.getFullYear(), prev1.getMonth(), 25), 'Autumn Jacket & Footwear'],
    // Current month (triggers realistic budget progress + warnings)
    [1250, 'Rent', 'Bank Transfer', formatDateYMD(curYear, curMonth, 2), 'Apartment Monthly Lease'],
    [185, 'Food', 'Debit Card', formatDateYMD(curYear, curMonth, 3), 'Weekly Organic Groceries'],
    [118, 'Transportation', 'Credit Card', formatDateYMD(curYear, curMonth, 4), 'Monthly Transit Pass & Rides'],
    [142, 'Electricity Bills', 'Bank Transfer', formatDateYMD(curYear, curMonth, 5), 'Monthly Electric Utility'],
    [165, 'Shopping', 'Credit Card', formatDateYMD(curYear, curMonth, 6), 'Ergonomic Keyboard & Mouse'],
    [145, 'Food', 'Debit Card', formatDateYMD(curYear, curMonth, Math.max(6, Math.min(curDay, 8))), 'Household Pantry Restock'],
    [95, 'Entertainment', 'Digital Wallet', formatDateYMD(curYear, curMonth, Math.max(7, Math.min(curDay, 9))), 'Cinema & Museum Membership'],
    [115, 'Shopping', 'Credit Card', formatDateYMD(curYear, curMonth, Math.max(8, Math.min(curDay, 11))), 'Winter Sweater & Accessories'],
    [105, 'Food', 'Cash', formatDateYMD(curYear, curMonth, Math.max(9, Math.min(curDay, 13))), 'Farmers Market & Lunch'],
    [88, 'Medical Expenses', 'Debit Card', formatDateYMD(curYear, curMonth, Math.max(10, curDay)), 'Optometry Co-pay & Vitamins'],
  ];

  for (const [amount, category, method, date, desc] of expenseSeeds) {
    insertExpense.run(userId, amount, category, method, date, desc);
  }

  // Budgets for current month (and previous month)
  const m1 = curMonth + 1;
  const budgetSeeds: Array<[string, number, number, number]> = [
    ['Monthly Total', m1, curYear, 3200],
    ['Rent', m1, curYear, 1250],
    ['Food', m1, curYear, 500],          // 435 spent -> 87% Warning
    ['Shopping', m1, curYear, 250],      // 280 spent -> 112% Exceeded
    ['Transportation', m1, curYear, 220],
    ['Electricity Bills', m1, curYear, 180],
    ['Entertainment', m1, curYear, 150],
    ['Medical Expenses', m1, curYear, 150],
  ];

  for (const [cat, month, year, amount] of budgetSeeds) {
    insertBudget.run(userId, cat, month, year, amount);
  }
}
