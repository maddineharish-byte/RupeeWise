import React, { useState, useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';
import { ExpenseCategory, Transaction, TransactionStatus, TransactionType } from '../../types/finance';
import { CATEGORY_LIST } from '../../data/initialSeed';
import { parseRupeeInput } from '../../utils/currency';
import { validateTransaction } from '../../utils/validation';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tx: Transaction) => void;
  initialTransaction?: Transaction | Partial<Transaction> | null;
  isVoicePrefilled?: boolean;
}

export function TransactionModal({
  isOpen,
  onClose,
  onSave,
  initialTransaction,
  isVoicePrefilled = false,
}: TransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('Food & Dining');
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<TransactionStatus>('posted');
  const [error, setError] = useState<string>('');

  const modalRef = useRef<HTMLDivElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialTransaction) {
      setType(initialTransaction.type || 'expense');
      setAmountStr(
        initialTransaction.amountPaise
          ? (initialTransaction.amountPaise / 100).toString()
          : ''
      );
      setDescription(initialTransaction.description || '');
      setCategory(initialTransaction.category || 'Food & Dining');
      setDate(initialTransaction.date || new Date().toISOString().split('T')[0]);
      setStatus(initialTransaction.status || 'posted');
    } else {
      setType('expense');
      setAmountStr('');
      setDescription('');
      setCategory('Food & Dining');
      setDate(new Date().toISOString().split('T')[0]);
      setStatus('posted');
    }
    setError('');
  }, [initialTransaction, isOpen]);

  // Focus management, Esc key, and Tab focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      amountInputRef.current?.focus();
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = parseRupeeInput(amountStr);

    if (paise <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description for the transaction.');
      return;
    }

    if (!date) {
      setError('Please select a valid date.');
      return;
    }

    const tx: Transaction = {
      id: initialTransaction?.id || `tx-${Date.now()}`,
      type,
      category,
      description: description.trim(),
      amountPaise: paise,
      date,
      status,
      createdAt: initialTransaction?.createdAt || Date.now(),
    };

    const validation = validateTransaction(tx);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid transaction details.');
      return;
    }

    onSave(tx);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tx-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 id="tx-modal-title" className="text-base font-semibold text-slate-900">
            {initialTransaction ? 'Edit Transaction' : 'Record Transaction'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isVoicePrefilled && (
            <div
              role="status"
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center justify-between"
            >
              <span className="font-medium">
                ✨ Auto-filled by Voice Recognition: Review and save below.
              </span>
            </div>
          )}

          {error && (
            <div
              role="alert"
              className="p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg"
            >
              {error}
            </div>
          )}

          {/* Type Segmented Control */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  type === 'expense'
                    ? 'bg-white text-rose-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  type === 'income'
                    ? 'bg-white text-emerald-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Amount (in INR) */}
          <div>
            <label htmlFor="tx-amount" className="block text-xs font-medium text-slate-700 mb-1">
              Amount (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                ref={amountInputRef}
                id="tx-amount"
                type="number"
                step="any"
                min="1"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="tx-desc" className="block text-xs font-medium text-slate-700 mb-1">
              Description
            </label>
            <input
              id="tx-desc"
              type="text"
              placeholder="e.g. Cafeteria lunch, Metro recharge"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              required
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tx-category" className="block text-xs font-medium text-slate-700 mb-1">
                Category
              </label>
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all"
              >
                {CATEGORY_LIST.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="tx-date" className="block text-xs font-medium text-slate-700 mb-1">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Status (Posted vs Planned) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Posting Status
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setStatus('posted')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  status === 'posted'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Posted (Deducts Now)
              </button>
              <button
                type="button"
                onClick={() => setStatus('planned')}
                className={`py-1.5 text-xs font-medium rounded-md transition-all ${
                  status === 'planned'
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Planned (Forecast Only)
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {status === 'posted'
                ? 'Immediately impacts your actual current balance.'
                : 'Forecasted commitment; will not reduce cash balance until posted.'}
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus:ring-2 focus:ring-slate-400 focus:outline-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>{initialTransaction ? 'Save Changes' : 'Record Transaction'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
