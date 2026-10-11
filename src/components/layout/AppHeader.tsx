import React from 'react';
import { PlusCircle, RotateCcw, Menu, Sparkles, Mic, MessageSquare } from 'lucide-react';

export type ActiveTab = 'overview' | 'transactions' | 'budget' | 'simulator' | 'goals' | 'health' | 'chat';

interface AppHeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddTransaction: () => void;
  onOpenResetConfirm: () => void;
  onToggleMobileMenu: () => void;
  onOpenVoiceModal: () => void;
}

export function AppHeader({
  activeTab,
  setActiveTab,
  onOpenAddTransaction,
  onOpenResetConfirm,
  onToggleMobileMenu,
  onOpenVoiceModal,
}: AppHeaderProps) {
  const navItems: Array<{ id: ActiveTab; label: string; badge?: string }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'transactions', label: 'Transactions' },
    { id: 'budget', label: 'Budget' },
    { id: 'simulator', label: 'What If?', badge: 'Simulator' },
    { id: 'goals', label: 'Goals' },
    { id: 'health', label: 'Health' },
    { id: 'chat', label: 'AI Advisor', badge: 'Gemini' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Wordmark Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onToggleMobileMenu}
            aria-label="Toggle navigation drawer"
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab('overview')}
            className="flex items-center gap-2.5 text-left group transition-transform focus:outline-none"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-xs group-hover:bg-emerald-700 transition-colors">
              ₹
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap block">
                RupeeWise
              </span>
              <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap hidden sm:block">
                Make every rupee count
              </span>
            </div>
          </button>
        </div>

        {/* Zone 2: Navigation Links (Single Line, Desktop) */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-1 lg:gap-1.5 text-sm font-medium text-slate-600"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative px-2.5 py-1.5 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'text-slate-900 font-semibold bg-slate-100/90'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {item.label}
                  {item.badge && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/50">
                      {item.badge}
                    </span>
                  )}
                </span>
                {isActive && (
                  <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-emerald-600 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Voice Live & Log Transaction) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Live Voice Button */}
          <button
            onClick={onOpenVoiceModal}
            title="Real-time Voice Conversation with Gemini 3.8 Live"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors whitespace-nowrap"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span className="hidden sm:inline">Voice Mode</span>
          </button>

          <button
            onClick={onOpenResetConfirm}
            title="Reset to canonical hackathon seed dataset"
            className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo</span>
          </button>

          <button
            onClick={onOpenAddTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Log Transaction</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>
    </header>
  );
}
