import React, { useState } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { AppHeader, ActiveTab } from './components/layout/AppHeader';
import { AppSidebar } from './components/layout/AppSidebar';
import { ConfirmModal } from './components/common/ConfirmModal';
import { OverviewDashboard } from './components/overview/OverviewDashboard';
import { TransactionsView } from './components/transactions/TransactionsView';
import { BudgetPlannerView } from './components/budget/BudgetPlannerView';
import { WhatIfSimulatorView } from './components/simulator/WhatIfSimulatorView';
import { SavingsGoalsView } from './components/savings/SavingsGoalsView';
import { FinancialHealthView } from './components/health/FinancialHealthView';
import { GeminiChatView } from './components/chat/GeminiChatView';
import { GeminiVoiceModal } from './components/voice/GeminiVoiceModal';
import { VoiceTransactionWidget } from './components/voice/VoiceTransactionWidget';
import { TransactionModal } from './components/transactions/TransactionModal';
import { Transaction } from './types/finance';

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

      {/* Gemini 3.8 Live Voice Modal */}
      <GeminiVoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />

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
