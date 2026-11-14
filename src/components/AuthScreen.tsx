import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, Lock, Mail, User, Wallet, ArrowRight } from 'lucide-react';
import { apiRequest, setStoredToken } from '../lib/api';
import { CURRENCY_OPTIONS, type UserProfile } from '../types';

interface AuthScreenProps {
  onAuthenticated: (user: UserProfile) => void;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      } else {
        const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ name, email, password, currency }),
        });
        setStoredToken(res.token);
        onAuthenticated(res.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDemoLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await apiRequest<{ user: UserProfile; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'demo@expenseflow.app',
          password: 'DemoUser@2026',
        }),
      });
      setStoredToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in to demo account.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F0E2] flex flex-col lg:flex-row">
      {/* Left Brand & Value Proposition Panel */}
      <div className="lg:w-[46%] bg-[#1D3E58] text-[#F4F0E2] px-8 py-12 lg:px-14 lg:py-16 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#619DC6]/25 border border-[#A6C8E2]/40 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#F4BAA3]" />
            </div>
            <span className="font-display text-lg font-semibold tracking-tight text-white">
              Personal Expense Tracker
            </span>
          </div>

          <div className="mt-12 lg:mt-16 max-w-md">
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-white [text-wrap:balance]">
              Clarity over every dollar earned, budgeted, and spent.
            </h1>
            <p className="mt-4 text-base text-[#A6C8E2] leading-relaxed">
              Record daily income and expenses, enforce category-wise monthly budgets with automatic threshold alerts, and export structured PDF or CSV financial reports.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div className="rounded-xl bg-[#274F6E] border border-[#619DC6]/35 p-4">
              <p className="text-xs font-semibold text-[#F4BAA3]">Automatic Ledger Math</p>
              <p className="mt-1 text-sm text-[#F4F0E2]/90 leading-snug">
                Instant recalculation of balance and remaining monthly budgets on every edit.
              </p>
            </div>
            <div className="rounded-xl bg-[#274F6E] border border-[#619DC6]/35 p-4">
              <p className="text-xs font-semibold text-[#A6C8E2]">Isolated User Vaults</p>
              <p className="mt-1 text-sm text-[#F4F0E2]/90 leading-snug">
                Salted scrypt password hashing and strict per-account record isolation.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/15 text-xs text-[#A6C8E2]">
          Personal Expense Tracker Management System · Relational Financial Ledger
        </div>
      </div>

      {/* Right Authentication Form Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-14">
        <div className="w-full max-w-md bg-white border border-[#E5DEC9] rounded-2xl p-8">
          <div className="flex items-center gap-1 p-1 bg-[#F4F0E2] rounded-lg mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-[#173247] shadow-xs'
                  : 'text-[#4E6B82] hover:text-[#173247]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
              }}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-[#173247] shadow-xs'
                  : 'text-[#4E6B82] hover:text-[#173247]'
              }`}
            >
              Create Account
            </button>
          </div>

          <h2 className="font-display text-2xl font-bold text-[#173247]">
            {mode === 'login' ? 'Welcome back' : 'Create your ledger'}
          </h2>
          <p className="mt-1 text-sm text-[#4E6B82]">
            {mode === 'login'
              ? 'Sign in to access your personal financial dashboard.'
              : 'Register a private account to track your income, expenses, and budgets.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-3 text-sm text-[#B91C1C]"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <div>
                <label htmlFor="auth-name" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#619DC6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#619DC6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 pl-10 pr-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#619DC6] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'register' ? 'Minimum 6 characters' : 'Enter your password'}
                  className="w-full h-11 pl-10 pr-11 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] placeholder:text-[#8BA0B2] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#619DC6] hover:text-[#173247]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label htmlFor="auth-currency" className="block text-sm font-medium text-[#1D3E58] mb-1.5">
                  Preferred Currency
                </label>
                <select
                  id="auth-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#D8D0BC] bg-white text-sm text-[#173247] focus:outline-none focus:ring-2 focus:ring-[#619DC6]/35 focus:border-[#619DC6]"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg bg-[#1D3E58] hover:bg-[#173247] disabled:opacity-60 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}</span>
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-[#ECE5D3]">
            <p className="text-xs text-[#4E6B82] mb-3">
              Want to explore pre-populated sample transactions, budgets, and reports immediately?
            </p>
            <button
              type="button"
              disabled={loading}
              onClick={handleDemoLogin}
              className="w-full h-10 rounded-lg bg-[#F4BAA3] hover:bg-[#EEAC92] text-[#173247] text-sm font-semibold transition-colors cursor-pointer"
            >
              Sign In with Demo Account (Alex Morgan)
            </button>
            <p className="mt-2.5 text-xs font-mono text-[#4E6B82] text-center">
              demo@expenseflow.app · DemoUser@2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
