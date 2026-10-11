import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  PieChart,
  Sparkles,
  Target,
  Activity,
  MessageSquare,
  Mic,
  RotateCcw,
  X,
} from 'lucide-react';
import { ActiveTab } from './AppHeader';

interface AppSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenResetConfirm: () => void;
  onOpenVoiceModal: () => void;
}

export function AppSidebar({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  onOpenResetConfirm,
  onOpenVoiceModal,
}: AppSidebarProps) {
  const items: Array<{ id: ActiveTab; label: string; icon: React.ReactNode; desc: string }> = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
      desc: 'Financial position & burn rate',
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <Receipt className="w-4 h-4" />,
      desc: 'Posted & planned cashflows',
    },
    {
      id: 'budget',
      label: 'Budget Planner',
      icon: <PieChart className="w-4 h-4" />,
      desc: '30-day category allocations',
    },
    {
      id: 'simulator',
      label: 'What If? Simulator',
      icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
      desc: 'Test purchase scenarios',
    },
    {
      id: 'goals',
      label: 'Savings Goals',
      icon: <Target className="w-4 h-4" />,
      desc: 'Emergency & milestone targets',
    },
    {
      id: 'health',
      label: 'Financial Health',
      icon: <Activity className="w-4 h-4" />,
      desc: 'Score breakdown & audit',
    },
    {
      id: 'chat',
      label: 'Gemini AI Advisor',
      icon: <MessageSquare className="w-4 h-4 text-indigo-600" />,
      desc: 'Multi-turn chatbot advice',
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden bg-slate-900/50 backdrop-blur-xs flex">
      <div className="w-72 bg-white h-full flex flex-col border-r border-slate-200 shadow-xl p-4 animate-in slide-in-from-left duration-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              ₹
            </div>
            <div>
              <span className="font-bold text-slate-900 block text-sm">RupeeWise</span>
              <span className="text-[10px] text-slate-500">Student & Gen-Z Finance</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close navigation"
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Voice CTA button */}
        <div className="mt-4">
          <button
            onClick={() => {
              onClose();
              onOpenVoiceModal();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Mic className="w-4 h-4 animate-pulse" />
            <span>Launch Live Voice Mode</span>
          </button>
        </div>

        <nav className="mt-4 space-y-1 flex-1 overflow-y-auto">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white font-medium shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className={isActive ? 'text-emerald-400' : 'text-slate-500'}>
                  {item.icon}
                </div>
                <div>
                  <div className="leading-tight">{item.label}</div>
                  <div className="text-[11px] leading-tight text-slate-400 mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-100 space-y-2">
          <button
            onClick={() => {
              onClose();
              onOpenResetConfirm();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Reset Demo Baseline</span>
          </button>
          <div className="text-[10px] text-center text-slate-400 font-mono">
            Canonical Hackathon Build
          </div>
        </div>
      </div>
      <div className="flex-1" onClick={onClose} />
    </div>
  );
}
