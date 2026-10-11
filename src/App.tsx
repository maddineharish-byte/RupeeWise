import React, { useState, Suspense, lazy } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AppHeader, ActiveTab } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { ConfirmModal } from './components/common/ConfirmModal';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { VoiceTransactionWidget } from './components/voice/VoiceTransactionWidget';
import { TransactionModal } from './components/transactions/TransactionModal';
import { Transaction } from './types/finance';

// Code-split secondary views to keep initial bundle size minimal and maximize Core Web Vitals
const TransactionsView = lazy(() =>
  import('./components/transactions/TransactionsView').then((m) => ({ default: m.TransactionsView }))
);
const BudgetPlannerView = lazy(() =>
  import('./components/budget/BudgetPlannerView').then((m) => ({ default: m.BudgetPlannerView }))
);
const WhatIfSimulatorView = lazy(() =>
  import('./components/simulator/WhatIfSimulatorView').then((m) => ({ default: m.WhatIfSimulatorView }))
);
const SavingsGoalsView = lazy(() =>
  import('./components/savings/SavingsGoalsView').then((m) => ({ default: m.SavingsGoalsView }))
);
const FinancialHealthView = lazy(() =>
  import('./components/health/FinancialHealthView').then((m) => ({ default: m.FinancialHealthView }))
);
const GeminiChatView = lazy(() =>
  import('./components/chat/GeminiChatView').then((m) => ({ default: m.GeminiChatView }))
);
const GeminiVoiceModal = lazy(() =>
  import('./components/voice/GeminiVoiceModal').then((m) => ({ default: m.GeminiVoiceModal }))
);

function TabLoadingSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading view content"
      className="space-y-4 animate-pulse p-2 sm:p-4"
    >
      <div className="h-8 bg-slate-200 rounded-lg w-1/3 max-w-xs" />
      <div className="h-28 bg-slate-200 rounded-xl w-full" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
        <div className="h-32 bg-slate-200 rounded-xl" />
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

function MainAppContent() {
  const { dispatch, resetToDemo } = useFinance();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isGlobalAddTxOpen, setIsGlobalAddTxOpen] = useState(false);
  const [voicePrefillDraft, setVoicePrefillDraft] = useState<Partial<Transaction> | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  const handleGlobalSaveTransaction = (tx: Transaction) => {
    dispatch({ type: 'ADD_TRANSACTION', payload: tx });
  };

  const handlePopulateFromVoice = (draft: Partial<Transaction>) => {
    setVoicePrefillDraft(draft);
    setIsGlobalAddTxOpen(true);
  };

  const handleResetDemoConfirm = () => {
    resetToDemo();
    setIsResetConfirmOpen(false);
    setActiveTab('overview');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      {/* Top Header conforming to Top Bar Contract */}
      <AppHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAddTransaction={() => setIsGlobalAddTxOpen(true)}
        onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Mobile Sidebar Drawer */}
      <AppSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenResetConfirm={() => setIsResetConfirmOpen(true)}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Suspense fallback={<TabLoadingSkeleton />}>
          {activeTab === 'overview' && (
            <OverviewDashboard
              setActiveTab={setActiveTab}
              onOpenAddTransaction={() => setIsGlobalAddTxOpen(true)}
            />
          )}
          {activeTab === 'transactions' && <TransactionsView />}
          {activeTab === 'budget' && <BudgetPlannerView />}
          {activeTab === 'simulator' && <WhatIfSimulatorView />}
          {activeTab === 'goals' && <SavingsGoalsView />}
          {activeTab === 'health' && <FinancialHealthView />}
          {activeTab === 'chat' && <GeminiChatView />}
        </Suspense>
      </main>

      {/* Subtle, Clean Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">RupeeWise</span>
            <span>·</span>
            <span>Make every rupee count</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>Integer Paise Precision</span>
            <span>·</span>
            <span>Gemini 3.8 Live & 3.5 Flash Integration</span>
            <span>·</span>
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="text-slate-600 hover:text-slate-900 hover:underline"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      </footer>

      {/* Global Add Transaction Modal */}
      <TransactionModal
        isOpen={isGlobalAddTxOpen}
        onClose={() => {
          setIsGlobalAddTxOpen(false);
          setVoicePrefillDraft(null);
        }}
        onSave={(tx) => {
          handleGlobalSaveTransaction(tx);
          setVoicePrefillDraft(null);
        }}
        initialTransaction={voicePrefillDraft}
        isVoicePrefilled={voicePrefillDraft !== null}
      />

      {/* Voice Recognition Floating Widget in Right Bottom Corner */}
      <VoiceTransactionWidget onPopulateModal={handlePopulateFromVoice} />

      {/* Gemini 3.8 Live Voice Modal (dynamically loaded on demand) */}
      {isVoiceModalOpen && (
        <Suspense fallback={null}>
          <GeminiVoiceModal
            isOpen={isVoiceModalOpen}
            onClose={() => setIsVoiceModalOpen(false)}
          />
        </Suspense>
      )}

      {/* Reset Demo Data Modal */}
      <ConfirmModal
        isOpen={isResetConfirmOpen}
        title="Reset Demo Dataset?"
        message="This will restore the canonical RupeeWise hackathon dataset: ₹10,000 starting budget, ₹3,000 posted expenses, ₹7,000 balance, ₹2,000 protected commitments, and Day 10 of 30."
        confirmLabel="Reset Demo Data"
        isDestructive={true}
        onConfirm={handleResetDemoConfirm}
        onCancel={() => setIsResetConfirmOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainAppContent />
    </FinanceProvider>
  );
}
