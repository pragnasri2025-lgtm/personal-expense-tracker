import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  Target,
  BarChart3,
  UserCog,
  LogOut,
  Wallet,
  X,
} from 'lucide-react';
import type { AppSection, UserProfile } from '../types';

interface SidebarProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  user: UserProfile;
  onLogout: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'income', label: 'Income', icon: TrendingUp },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'profile', label: 'Profile Settings', icon: UserCog },
];

export function Sidebar({
  activeSection,
  onSelectSection,
  user,
  onLogout,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const navContent = (
    <div className="h-full flex flex-col bg-[#1D3E58] text-[#F4F0E2]">
      <div className="px-6 py-5 border-b border-white/12 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[#619DC6]/25 border border-[#A6C8E2]/40 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-[#F4BAA3]" />
          </div>
          <span className="font-display font-semibold text-base tracking-tight text-white truncate">
            ExpenseFlow
          </span>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-md text-[#A6C8E2] hover:bg-white/10 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelectSection(item.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#619DC6]/30 text-white'
                  : 'text-[#A6C8E2] hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#F4BAA3]' : 'text-[#A6C8E2]'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/12">
        <div className="px-2 pb-3 mb-2 border-b border-white/12">
          <p className="text-sm font-medium text-white truncate">{user.Name}</p>
          <p className="text-xs text-[#A6C8E2] truncate">
            {user.Email} · {user.Currency}
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#A6C8E2] hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 shrink-0 text-[#F4BAA3]" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 left-0 z-30">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-[#173247]/60 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-xl">{navContent}</aside>
        </div>
      )}
    </>
  );
}
