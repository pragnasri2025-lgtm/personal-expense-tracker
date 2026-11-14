import { Router, type Response } from 'express';
import {
  db,
  DEFAULT_INCOME_CATEGORIES,
  hashPassword,
  PAYMENT_METHODS,
  seedDefaultCategoriesForUser,
  verifyPassword,
} from './db.ts';
import {
  createSessionToken,
  requireAuth,
  SESSION_COOKIE_NAME,
  type AuthedRequest,
} from './auth.ts';

export const apiRouter = Router();

function setSessionCookie(res: Response, token: string): void {
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function getMonthRange(year: number, month: number): { start: string; end: string } {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${mm}-01`,
    end: `${year}-${mm}-${String(lastDay).padStart(2, '0')}`,
  };
}

function isValidDateString(d: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
}

// ============================================================
// AUTHENTICATION ROUTES
// ============================================================

apiRouter.post('/auth/register', (req, res) => {
  const { name, email, password, currency } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';
  const cleanCurrency =
    typeof currency === 'string' && currency.trim().length >= 3
      ? currency.trim().toUpperCase().slice(0, 5)
      : 'USD';

  if (cleanName.length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters.' });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    res.status(400).json({ error: 'Please provide a valid email address.' });
    return;
  }
  if (cleanPassword.length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }

  const existing = db.prepare('SELECT User_ID FROM USER WHERE Email = ?').get(cleanEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const passwordHash = hashPassword(cleanPassword);
  const insert = db.prepare(
    'INSERT INTO USER (Name, Email, Password_Hash, Currency) VALUES (?, ?, ?, ?)'
  );
  const info = insert.run(cleanName, cleanEmail, passwordHash, cleanCurrency);
  const userId = Number(info.lastInsertRowid);

  seedDefaultCategoriesForUser(userId);

  const user = {
    User_ID: userId,
    Name: cleanName,
    Email: cleanEmail,
    Currency: cleanCurrency,
  };
  const token = createSessionToken(userId);
  setSessionCookie(res, token);

  res.status(201).json({ user, token });
});

apiRouter.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!cleanEmail || !cleanPassword) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const row = db
    .prepare('SELECT User_ID, Name, Email, Password_Hash, Currency FROM USER WHERE Email = ?')
    .get(cleanEmail) as
    | {
        User_ID: number;
        Name: string;
        Email: string;
        Password_Hash: string;
        Currency: string;
      }
    | undefined;

  if (!row || !verifyPassword(cleanPassword, row.Password_Hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const user = {
    User_ID: row.User_ID,
    Name: row.Name,
    Email: row.Email,
    Currency: row.Currency,
  };
  const token = createSessionToken(row.User_ID);
  setSessionCookie(res, token);

  res.json({ user, token });
});

apiRouter.post('/auth/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

apiRouter.get('/auth/me', requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: req.user });
});

// ============================================================
// USER PROFILE ROUTES
// ============================================================

apiRouter.put('/profile', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { name, currency } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';
  const cleanCurrency =
    typeof currency === 'string' && currency.trim().length >= 3
      ? currency.trim().toUpperCase().slice(0, 5)
      : req.user!.Currency;

  if (cleanName.length < 2) {
    res.status(400).json({ error: 'Name must be at least 2 characters.' });
    return;
  }

  db.prepare('UPDATE USER SET Name = ?, Currency = ? WHERE User_ID = ?').run(
    cleanName,
    cleanCurrency,
    userId
  );

  const updated = db
    .prepare('SELECT User_ID, Name, Email, Currency FROM USER WHERE User_ID = ?')
    .get(userId);
  res.json({ user: updated });
});

apiRouter.put('/profile/password', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { currentPassword, newPassword } = req.body ?? {};

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    res.status(400).json({ error: 'Current and new passwords are required.' });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const row = db
    .prepare('SELECT Password_Hash FROM USER WHERE User_ID = ?')
    .get(userId) as { Password_Hash: string } | undefined;

  if (!row || !verifyPassword(currentPassword, row.Password_Hash)) {
    res.status(400).json({ error: 'Current password is incorrect.' });
    return;
  }

  db.prepare('UPDATE USER SET Password_Hash = ? WHERE User_ID = ?').run(
    hashPassword(newPassword),
    userId
  );
  res.json({ ok: true });
});

// ============================================================
// EXPENSE CATEGORIES MANAGEMENT
// ============================================================

apiRouter.get('/categories', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const expenseCategories = db
    .prepare(
      'SELECT Category_ID, Name, Is_Default FROM EXPENSE_CATEGORY WHERE User_ID = ? ORDER BY Is_Default DESC, Name ASC'
    )
    .all(userId) as Array<{ Category_ID: number; Name: string; Is_Default: number }>;

  res.json({
    incomeCategories: DEFAULT_INCOME_CATEGORIES,
    expenseCategories,
    paymentMethods: PAYMENT_METHODS,
  });
});

apiRouter.post('/categories', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { name } = req.body ?? {};
  const cleanName = typeof name === 'string' ? name.trim() : '';

  if (cleanName.length < 2 || cleanName.length > 40) {
    res.status(400).json({ error: 'Category name must be between 2 and 40 characters.' });
    return;
  }
  if (cleanName.toLowerCase() === 'monthly total') {
    res.status(400).json({ error: 'Reserved category name.' });
    return;
  }

  const dup = db
    .prepare('SELECT Category_ID FROM EXPENSE_CATEGORY WHERE User_ID = ? AND lower(Name) = lower(?)')
    .get(userId, cleanName);
  if (dup) {
    res.status(409).json({ error: 'That expense category already exists.' });
    return;
  }

  const info = db
    .prepare('INSERT INTO EXPENSE_CATEGORY (User_ID, Name, Is_Default) VALUES (?, ?, 0)')
    .run(userId, cleanName);

  res.status(201).json({
    category: {
      Category_ID: Number(info.lastInsertRowid),
      Name: cleanName,
      Is_Default: 0,
    },
  });
});

apiRouter.delete('/categories/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const cat = db
    .prepare('SELECT Category_ID, Name, Is_Default FROM EXPENSE_CATEGORY WHERE Category_ID = ? AND User_ID = ?')
    .get(id, userId) as { Category_ID: number; Name: string; Is_Default: number } | undefined;

  if (!cat) {
    res.status(404).json({ error: 'Category not found.' });
    return;
  }
  if (cat.Is_Default === 1) {
    res.status(400).json({ error: 'Default categories cannot be deleted.' });
    return;
  }

  const usage = db
    .prepare('SELECT COUNT(*) as count FROM EXPENSE WHERE User_ID = ? AND Category = ?')
    .get(userId, cat.Name) as { count: number };
  if (usage.count > 0) {
    res.status(400).json({
      error: `Cannot delete "${cat.Name}" because ${usage.count} expense(s) use it.`,
    });
    return;
  }

  db.prepare('DELETE FROM EXPENSE_CATEGORY WHERE Category_ID = ? AND User_ID = ?').run(id, userId);
  res.json({ ok: true });
});

// ============================================================
// INCOME CRUD
// ============================================================

apiRouter.get('/income', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const rows = db
    .prepare(
      'SELECT Income_ID, User_ID, Amount, Category, Date, Description FROM INCOME WHERE User_ID = ? ORDER BY Date DESC, Income_ID DESC'
    )
    .all(userId);
  res.json({ income: rows });
});

apiRouter.post('/income', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { amount, category, date, description } = req.body ?? {};
  const numAmount = Number(amount);
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const cleanDate = typeof date === 'string' ? date.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0.' });
    return;
  }
  if (!cleanCategory) {
    res.status(400).json({ error: 'Category is required.' });
    return;
  }
  if (!isValidDateString(cleanDate)) {
    res.status(400).json({ error: 'Valid transaction date (YYYY-MM-DD) is required.' });
    return;
  }

  const info = db
    .prepare(
      'INSERT INTO INCOME (User_ID, Amount, Category, Date, Description) VALUES (?, ?, ?, ?, ?)'
    )
    .run(userId, numAmount, cleanCategory, cleanDate, cleanDesc);

  const created = db
    .prepare('SELECT Income_ID, User_ID, Amount, Category, Date, Description FROM INCOME WHERE Income_ID = ?')
    .get(Number(info.lastInsertRowid));
  res.status(201).json({ income: created });
});

apiRouter.put('/income/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT Income_ID FROM INCOME WHERE Income_ID = ? AND User_ID = ?')
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: 'Income record not found.' });
    return;
  }

  const { amount, category, date, description } = req.body ?? {};
  const numAmount = Number(amount);
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const cleanDate = typeof date === 'string' ? date.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0.' });
    return;
  }
  if (!cleanCategory || !isValidDateString(cleanDate)) {
    res.status(400).json({ error: 'Valid category and date are required.' });
    return;
  }

  db.prepare(
    'UPDATE INCOME SET Amount = ?, Category = ?, Date = ?, Description = ? WHERE Income_ID = ? AND User_ID = ?'
  ).run(numAmount, cleanCategory, cleanDate, cleanDesc, id, userId);

  const updated = db
    .prepare('SELECT Income_ID, User_ID, Amount, Category, Date, Description FROM INCOME WHERE Income_ID = ?')
    .get(id);
  res.json({ income: updated });
});

apiRouter.delete('/income/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const info = db
    .prepare('DELETE FROM INCOME WHERE Income_ID = ? AND User_ID = ?')
    .run(id, userId);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Income record not found.' });
    return;
  }
  res.json({ ok: true });
});

// ============================================================
// EXPENSE CRUD
// ============================================================

apiRouter.get('/expenses', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const rows = db
    .prepare(
      'SELECT Expense_ID, User_ID, Amount, Category, Payment_Method, Date, Description FROM EXPENSE WHERE User_ID = ? ORDER BY Date DESC, Expense_ID DESC'
    )
    .all(userId);
  res.json({ expenses: rows });
});

apiRouter.post('/expenses', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { amount, category, paymentMethod, date, description } = req.body ?? {};
  const numAmount = Number(amount);
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const cleanMethod = typeof paymentMethod === 'string' ? paymentMethod.trim() : '';
  const cleanDate = typeof date === 'string' ? date.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0.' });
    return;
  }
  if (!cleanCategory) {
    res.status(400).json({ error: 'Category is required.' });
    return;
  }
  if (!cleanMethod) {
    res.status(400).json({ error: 'Payment method is required.' });
    return;
  }
  if (!isValidDateString(cleanDate)) {
    res.status(400).json({ error: 'Valid transaction date (YYYY-MM-DD) is required.' });
    return;
  }

  const info = db
    .prepare(
      'INSERT INTO EXPENSE (User_ID, Amount, Category, Payment_Method, Date, Description) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(userId, numAmount, cleanCategory, cleanMethod, cleanDate, cleanDesc);

  const created = db
    .prepare(
      'SELECT Expense_ID, User_ID, Amount, Category, Payment_Method, Date, Description FROM EXPENSE WHERE Expense_ID = ?'
    )
    .get(Number(info.lastInsertRowid));
  res.status(201).json({ expense: created });
});

apiRouter.put('/expenses/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const existing = db
    .prepare('SELECT Expense_ID FROM EXPENSE WHERE Expense_ID = ? AND User_ID = ?')
    .get(id, userId);

  if (!existing) {
    res.status(404).json({ error: 'Expense record not found.' });
    return;
  }

  const { amount, category, paymentMethod, date, description } = req.body ?? {};
  const numAmount = Number(amount);
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const cleanMethod = typeof paymentMethod === 'string' ? paymentMethod.trim() : '';
  const cleanDate = typeof date === 'string' ? date.trim() : '';
  const cleanDesc = typeof description === 'string' ? description.trim() : '';

  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Amount must be greater than 0.' });
    return;
  }
  if (!cleanCategory || !cleanMethod || !isValidDateString(cleanDate)) {
    res.status(400).json({ error: 'Valid category, payment method, and date are required.' });
    return;
  }

  db.prepare(
    'UPDATE EXPENSE SET Amount = ?, Category = ?, Payment_Method = ?, Date = ?, Description = ? WHERE Expense_ID = ? AND User_ID = ?'
  ).run(numAmount, cleanCategory, cleanMethod, cleanDate, cleanDesc, id, userId);

  const updated = db
    .prepare(
      'SELECT Expense_ID, User_ID, Amount, Category, Payment_Method, Date, Description FROM EXPENSE WHERE Expense_ID = ?'
    )
    .get(id);
  res.json({ expense: updated });
});

apiRouter.delete('/expenses/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const info = db
    .prepare('DELETE FROM EXPENSE WHERE Expense_ID = ? AND User_ID = ?')
    .run(id, userId);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Expense record not found.' });
    return;
  }
  res.json({ ok: true });
});

// ============================================================
// BUDGET MANAGEMENT
// ============================================================

apiRouter.get('/budgets', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  const { start, end } = getMonthRange(year, month);

  const budgets = db
    .prepare(
      'SELECT Budget_ID, User_ID, Category, Month, Year, Budget_Amount FROM BUDGET WHERE User_ID = ? AND Month = ? AND Year = ? ORDER BY CASE WHEN Category = \'Monthly Total\' THEN 0 ELSE 1 END, Category ASC'
    )
    .all(userId, month, year) as Array<{
    Budget_ID: number;
    User_ID: number;
    Category: string;
    Month: number;
    Year: number;
    Budget_Amount: number;
  }>;

  const monthlyExpensesByCat = db
    .prepare(
      'SELECT Category, COALESCE(SUM(Amount), 0) as spent FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ? GROUP BY Category'
    )
    .all(userId, start, end) as Array<{ Category: string; spent: number }>;

  const totalSpentRow = db
    .prepare(
      'SELECT COALESCE(SUM(Amount), 0) as total FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ?'
    )
    .get(userId, start, end) as { total: number };

  const spentMap = new Map<string, number>();
  for (const row of monthlyExpensesByCat) {
    spentMap.set(row.Category, row.spent);
  }

  const enriched = budgets.map((b) => {
    const spent =
      b.Category === 'Monthly Total' ? totalSpentRow.total : spentMap.get(b.Category) ?? 0;
    const remaining = b.Budget_Amount - spent;
    const utilization = b.Budget_Amount > 0 ? (spent / b.Budget_Amount) * 100 : 0;
    const status: 'nominal' | 'warning' | 'exceeded' =
      utilization >= 100 ? 'exceeded' : utilization >= 80 ? 'warning' : 'nominal';
    return {
      ...b,
      Spent: spent,
      Remaining: remaining,
      Utilization: Math.round(utilization * 10) / 10,
      Status: status,
    };
  });

  res.json({
    month,
    year,
    totalMonthlySpent: totalSpentRow.total,
    budgets: enriched,
  });
});

apiRouter.post('/budgets', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const { category, month, year, budgetAmount } = req.body ?? {};
  const cleanCategory = typeof category === 'string' ? category.trim() : '';
  const numMonth = Number(month);
  const numYear = Number(year);
  const numAmount = Number(budgetAmount);

  if (!cleanCategory) {
    res.status(400).json({ error: 'Budget category is required.' });
    return;
  }
  if (!Number.isInteger(numMonth) || numMonth < 1 || numMonth > 12) {
    res.status(400).json({ error: 'Month must be between 1 and 12.' });
    return;
  }
  if (!Number.isInteger(numYear) || numYear < 2000 || numYear > 2100) {
    res.status(400).json({ error: 'Year must be between 2000 and 2100.' });
    return;
  }
  if (!Number.isFinite(numAmount) || numAmount <= 0) {
    res.status(400).json({ error: 'Budget amount must be greater than 0.' });
    return;
  }

  db.prepare(
    `INSERT INTO BUDGET (User_ID, Category, Month, Year, Budget_Amount)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(User_ID, Category, Month, Year)
     DO UPDATE SET Budget_Amount = excluded.Budget_Amount`
  ).run(userId, cleanCategory, numMonth, numYear, numAmount);

  const saved = db
    .prepare(
      'SELECT Budget_ID, User_ID, Category, Month, Year, Budget_Amount FROM BUDGET WHERE User_ID = ? AND Category = ? AND Month = ? AND Year = ?'
    )
    .get(userId, cleanCategory, numMonth, numYear);

  res.status(201).json({ budget: saved });
});

apiRouter.delete('/budgets/:id', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const id = Number(req.params.id);
  const info = db
    .prepare('DELETE FROM BUDGET WHERE Budget_ID = ? AND User_ID = ?')
    .run(id, userId);

  if (info.changes === 0) {
    res.status(404).json({ error: 'Budget not found.' });
    return;
  }
  res.json({ ok: true });
});

// ============================================================
// DASHBOARD AGGREGATIONS (AUTOMATIC CALCULATIONS)
// ============================================================

apiRouter.get('/dashboard', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();
  const { start, end } = getMonthRange(year, month);

  const totalIncomeRow = db
    .prepare('SELECT COALESCE(SUM(Amount), 0) as total FROM INCOME WHERE User_ID = ?')
    .get(userId) as { total: number };
  const totalExpensesRow = db
    .prepare('SELECT COALESCE(SUM(Amount), 0) as total FROM EXPENSE WHERE User_ID = ?')
    .get(userId) as { total: number };

  const monthlyIncomeRow = db
    .prepare(
      'SELECT COALESCE(SUM(Amount), 0) as total FROM INCOME WHERE User_ID = ? AND Date >= ? AND Date <= ?'
    )
    .get(userId, start, end) as { total: number };

  const monthlyExpensesRow = db
    .prepare(
      'SELECT COALESCE(SUM(Amount), 0) as total FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ?'
    )
    .get(userId, start, end) as { total: number };

  const totalIncome = totalIncomeRow.total;
  const totalExpenses = totalExpensesRow.total;
  const currentBalance = totalIncome - totalExpenses;

  // Monthly budget: prefer explicit 'Monthly Total', otherwise sum of category budgets for that month
  const overallBudgetRow = db
    .prepare(
      "SELECT Budget_Amount FROM BUDGET WHERE User_ID = ? AND Category = 'Monthly Total' AND Month = ? AND Year = ?"
    )
    .get(userId, month, year) as { Budget_Amount: number } | undefined;

  const categoryBudgetsSumRow = db
    .prepare(
      "SELECT COALESCE(SUM(Budget_Amount), 0) as total FROM BUDGET WHERE User_ID = ? AND Category != 'Monthly Total' AND Month = ? AND Year = ?"
    )
    .get(userId, month, year) as { total: number };

  const monthlyBudget = overallBudgetRow
    ? overallBudgetRow.Budget_Amount
    : categoryBudgetsSumRow.total;
  const monthlySpent = monthlyExpensesRow.total;
  const remainingBudget = monthlyBudget - monthlySpent;

  // Category breakdown for selected month
  const categoryBreakdown = db
    .prepare(
      'SELECT Category as category, COALESCE(SUM(Amount), 0) as amount FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ? GROUP BY Category ORDER BY amount DESC'
    )
    .all(userId, start, end) as Array<{ category: string; amount: number }>;

  // 6-month trend ending at selected month/year
  const monthlyTrend: Array<{
    label: string;
    month: number;
    year: number;
    income: number;
    expenses: number;
  }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - 1 - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const range = getMonthRange(y, m);
    const inc = (
      db
        .prepare(
          'SELECT COALESCE(SUM(Amount), 0) as total FROM INCOME WHERE User_ID = ? AND Date >= ? AND Date <= ?'
        )
        .get(userId, range.start, range.end) as { total: number }
    ).total;
    const exp = (
      db
        .prepare(
          'SELECT COALESCE(SUM(Amount), 0) as total FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ?'
        )
        .get(userId, range.start, range.end) as { total: number }
    ).total;

    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthlyTrend.push({ label, month: m, year: y, income: inc, expenses: exp });
  }

  // Recent transactions (income + expenses merged)
  const recentTransactions = db
    .prepare(
      `SELECT * FROM (
         SELECT Income_ID as id, 'income' as type, Amount as amount, Category as category, '' as paymentMethod, Date as date, Description as description
         FROM INCOME WHERE User_ID = ?
         UNION ALL
         SELECT Expense_ID as id, 'expense' as type, Amount as amount, Category as category, Payment_Method as paymentMethod, Date as date, Description as description
         FROM EXPENSE WHERE User_ID = ?
       )
       ORDER BY date DESC, id DESC
       LIMIT 10`
    )
    .all(userId, userId);

  // Budget alerts for selected month
  const allMonthBudgets = db
    .prepare(
      'SELECT Budget_ID, Category, Budget_Amount FROM BUDGET WHERE User_ID = ? AND Month = ? AND Year = ?'
    )
    .all(userId, month, year) as Array<{
    Budget_ID: number;
    Category: string;
    Budget_Amount: number;
  }>;

  const spentMap = new Map<string, number>();
  for (const row of categoryBreakdown) {
    spentMap.set(row.category, row.amount);
  }

  const budgetAlerts = allMonthBudgets
    .map((b) => {
      const spent =
        b.Category === 'Monthly Total' ? monthlySpent : spentMap.get(b.Category) ?? 0;
      const pct = b.Budget_Amount > 0 ? (spent / b.Budget_Amount) * 100 : 0;
      return {
        Budget_ID: b.Budget_ID,
        Category: b.Category,
        Budget_Amount: b.Budget_Amount,
        Spent: spent,
        Remaining: b.Budget_Amount - spent,
        Utilization: Math.round(pct * 10) / 10,
        Status: pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'nominal',
      };
    })
    .filter((b) => b.Status !== 'nominal')
    .sort((a, b) => b.Utilization - a.Utilization);

  res.json({
    period: { month, year },
    summary: {
      totalIncome,
      totalExpenses,
      currentBalance,
      monthlyIncome: monthlyIncomeRow.total,
      monthlyExpenses: monthlySpent,
      monthlyBudget,
      remainingBudget,
      hasExplicitMonthlyBudget: Boolean(overallBudgetRow),
    },
    categoryBreakdown,
    monthlyTrend,
    recentTransactions,
    budgetAlerts,
  });
});

// ============================================================
// REPORTS & ANALYTICS (DAILY / WEEKLY / MONTHLY)
// ============================================================

apiRouter.get('/reports', requireAuth, (req: AuthedRequest, res) => {
  const userId = req.user!.User_ID;
  const period =
    req.query.period === 'daily' || req.query.period === 'weekly' || req.query.period === 'monthly'
      ? req.query.period
      : 'monthly';

  const now = new Date();
  const month = Number(req.query.month) || now.getMonth() + 1;
  const year = Number(req.query.year) || now.getFullYear();

  let startDate = '';
  let endDate = '';

  if (period === 'daily') {
    // Full selected month day-by-day
    const range = getMonthRange(year, month);
    startDate = range.start;
    endDate = range.end;
  } else if (period === 'weekly') {
    // Last 12 weeks ending at selected month end (or today if current month)
    const refEnd =
      year === now.getFullYear() && month === now.getMonth() + 1
        ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
        : new Date(year, month, 0);
    const refStart = new Date(refEnd);
    refStart.setDate(refStart.getDate() - 83); // 12 weeks (84 days)
    startDate = refStart.toISOString().slice(0, 10);
    endDate = refEnd.toISOString().slice(0, 10);
  } else {
    // Last 12 months ending at selected month
    const startObj = new Date(year, month - 12, 1);
    const endObj = new Date(year, month, 0);
    startDate = startObj.toISOString().slice(0, 10);
    endDate = endObj.toISOString().slice(0, 10);
  }

  const incomeRows = db
    .prepare(
      'SELECT Income_ID, Amount, Category, Date, Description FROM INCOME WHERE User_ID = ? AND Date >= ? AND Date <= ? ORDER BY Date DESC'
    )
    .all(userId, startDate, endDate) as Array<{
    Income_ID: number;
    Amount: number;
    Category: string;
    Date: string;
    Description: string;
  }>;

  const expenseRows = db
    .prepare(
      'SELECT Expense_ID, Amount, Category, Payment_Method, Date, Description FROM EXPENSE WHERE User_ID = ? AND Date >= ? AND Date <= ? ORDER BY Date DESC'
    )
    .all(userId, startDate, endDate) as Array<{
    Expense_ID: number;
    Amount: number;
    Category: string;
    Payment_Method: string;
    Date: string;
    Description: string;
  }>;

  const totalIncome = incomeRows.reduce((sum, r) => sum + r.Amount, 0);
  const totalExpenses = expenseRows.reduce((sum, r) => sum + r.Amount, 0);

  // Category-wise expense analysis
  const catMap = new Map<string, { amount: number; count: number }>();
  for (const exp of expenseRows) {
    const prev = catMap.get(exp.Category) ?? { amount: 0, count: 0 };
    catMap.set(exp.Category, { amount: prev.amount + exp.Amount, count: prev.count + 1 });
  }
  const categoryAnalysis = Array.from(catMap.entries())
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      share: totalExpenses > 0 ? Math.round((data.amount / totalExpenses) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Build trend series depending on period
  const trendSeries: Array<{ label: string; income: number; expenses: number }> = [];

  if (period === 'daily') {
    const daysInMonth = new Date(year, month, 0).getDate();
    const incByDay = new Map<string, number>();
    const expByDay = new Map<string, number>();
    for (const r of incomeRows) incByDay.set(r.Date, (incByDay.get(r.Date) ?? 0) + r.Amount);
    for (const r of expenseRows) expByDay.set(r.Date, (expByDay.get(r.Date) ?? 0) + r.Amount);

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      trendSeries.push({
        label: String(d),
        income: incByDay.get(dateStr) ?? 0,
        expenses: expByDay.get(dateStr) ?? 0,
      });
    }
  } else if (period === 'weekly') {
    const startObj = new Date(startDate + 'T00:00:00');
    for (let w = 0; w < 12; w++) {
      const wStart = new Date(startObj);
      wStart.setDate(wStart.getDate() + w * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 6);
      const s = wStart.toISOString().slice(0, 10);
      const e = wEnd.toISOString().slice(0, 10);
      const inc = incomeRows
        .filter((r) => r.Date >= s && r.Date <= e)
        .reduce((acc, r) => acc + r.Amount, 0);
      const exp = expenseRows
        .filter((r) => r.Date >= s && r.Date <= e)
        .reduce((acc, r) => acc + r.Amount, 0);
      const label = wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendSeries.push({ label, income: inc, expenses: exp });
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const range = getMonthRange(y, m);
      const inc = incomeRows
        .filter((r) => r.Date >= range.start && r.Date <= range.end)
        .reduce((acc, r) => acc + r.Amount, 0);
      const exp = expenseRows
        .filter((r) => r.Date >= range.start && r.Date <= range.end)
        .reduce((acc, r) => acc + r.Amount, 0);
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      trendSeries.push({ label, income: inc, expenses: exp });
    }
  }

  const transactions = [
    ...incomeRows.map((r) => ({
      id: r.Income_ID,
      type: 'income' as const,
      amount: r.Amount,
      category: r.Category,
      paymentMethod: '—',
      date: r.Date,
      description: r.Description,
    })),
    ...expenseRows.map((r) => ({
      id: r.Expense_ID,
      type: 'expense' as const,
      amount: r.Amount,
      category: r.Category,
      paymentMethod: r.Payment_Method,
      date: r.Date,
      description: r.Description,
    })),
  ].sort((a, b) => (b.date !== a.date ? b.date.localeCompare(a.date) : b.id - a.id));

  res.json({
    period,
    startDate,
    endDate,
    summary: {
      totalIncome,
      totalExpenses,
      netSavings: totalIncome - totalExpenses,
      savingsRate:
        totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 1000) / 10 : 0,
    },
    categoryAnalysis,
    trendSeries,
    transactions,
  });
});
