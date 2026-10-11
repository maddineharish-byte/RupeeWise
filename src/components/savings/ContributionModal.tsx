import React, { useState, useEffect, useRef } from 'react';
import { X, ArrowUpRight } from 'lucide-react';
import { SavingsGoal } from '../../types/finance';
import { formatPaise, parseRupeeInput } from '../../utils/currency';

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onContribute: (goalId: string, amountPaise: number) => void;
}

export function ContributionModal({
  isOpen,
  onClose,
  goal,
  onContribute,
}: ContributionModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState('');

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setAmountStr('');
      setError('');
      return;
    }

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !goal) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupeeInput(amountStr);

    if (paise <= 0) {
      setError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }

    onContribute(goal.id, paise);
    setAmountStr('');
    setError('');
    onClose();
  };

  const remainingPaise = Math.max(0, goal.targetPaise - goal.currentPaise);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contrib-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden focus:outline-none"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 id="contrib-modal-title" className="text-sm font-semibold text-slate-900">
              Contribute to Savings
            </h3>
            <span className="text-xs text-slate-500">{goal.title}</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div
              role="alert"
              className="p-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md"
            >
              {error}
            </div>
          )}

          <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-500">
              <span>Goal Target:</span>
              <span>{formatPaise(goal.targetPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Currently Saved:</span>
              <span>{formatPaise(goal.currentPaise)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
              <span>Remaining:</span>
              <span>{formatPaise(remainingPaise)}</span>
            </div>
          </div>

          <div>
            <label htmlFor="deposit-amount" className="block text-xs font-medium text-slate-700 mb-1">
              Deposit Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400 text-xs font-mono">₹</span>
              <input
                ref={inputRef}
                id="deposit-amount"
                type="number"
                min="1"
                step="any"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs font-mono font-bold bg-white border border-slate-200 rounded-lg text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              This deposit will be recorded as a savings transaction and deducted from your available cash.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
              <span>Confirm Deposit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
