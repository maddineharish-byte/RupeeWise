import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { ExpenseCategory } from '../../types/finance';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise, parseRupeeInput } from '../../utils/currency';

interface EditBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EditBudgetModal({ isOpen, onClose }: EditBudgetModalProps) {
  const { state, dispatch } = useFinanceCalculations();
  const [startingBudgetStr, setStartingBudgetStr] = useState<string>(
    (state.period.startingBudgetPaise / 100).toString()
  );

  // Map category allocations in state
  const [allocations, setAllocations] = useState<{ [category: string]: string }>(() => {
    const map: { [category: string]: string } = {};
    for (const b of state.categoryBudgets) {
      map[b.category] = (b.allocatedPaise / 100).toString();
    }
    return map;
  });

  if (!isOpen) return null;

  const handleAllocationChange = (category: string, value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update overall starting budget
    const newBudgetPaise = parseRupeeInput(startingBudgetStr);
    dispatch({
      type: 'UPDATE_STARTING_BUDGET',
      payload: { startingBudgetPaise: newBudgetPaise },
    });

    // 2. Update category budgets
    for (const [cat, val] of Object.entries(allocations)) {
      const paise = parseRupeeInput(val);
      dispatch({
        type: 'UPDATE_CATEGORY_BUDGET',
        payload: {
          category: cat as ExpenseCategory,
          allocatedPaise: paise,
        },
      });
    }

    onClose();
  };

  // Calculate sum of category allocations
  const totalAllocatedPaise = Object.values(allocations).reduce(
    (acc, val) => acc + parseRupeeInput(val),
    0
  );
  const targetBudgetPaise = parseRupeeInput(startingBudgetStr);
  const allocationDelta = targetBudgetPaise - totalAllocatedPaise;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="budget-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h3 id="budget-modal-title" className="text-base font-semibold text-slate-900">
            Adjust 30-Day Budget Allocations
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Total Budget */}
          <div>
            <label htmlFor="total-budget" className="block text-xs font-semibold text-slate-700 mb-1">
              Overall 30-Day Starting Budget (₹)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400 font-mono text-sm">₹</span>
              <input
                id="total-budget"
                type="number"
                min="0"
                step="any"
                value={startingBudgetStr}
                onChange={(e) => setStartingBudgetStr(e.target.value)}
                className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none"
                required
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Baseline budget for days 1 to 30. Initial canonical baseline is ₹10,000.
            </p>
          </div>

          {/* Allocation summary banner */}
          <div
            className={`p-3 rounded-lg border text-xs flex items-center justify-between font-mono ${
              allocationDelta === 0
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : allocationDelta > 0
                ? 'bg-sky-50 text-sky-800 border-sky-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <span>Allocated: {formatPaise(totalAllocatedPaise)}</span>
            <span>
              {allocationDelta === 0
                ? '100% Balanced'
                : allocationDelta > 0
                ? `Unassigned: ${formatPaise(allocationDelta)}`
                : `Over-allocated by: ${formatPaise(Math.abs(allocationDelta))}`}
            </span>
          </div>

          {/* Category Budgets list */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Category Allowances
            </h4>
            {state.categoryBudgets.map((b) => (
              <div
                key={b.category}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100"
              >
                <label className="text-xs font-medium text-slate-800 flex-1 truncate">
                  {b.category}
                </label>
                <div className="relative w-36">
                  <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={allocations[b.category] ?? ''}
                    onChange={(e) => handleAllocationChange(b.category, e.target.value)}
                    className="w-full pl-6 pr-2 py-1 text-xs font-mono text-right bg-white border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs"
            >
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save Budget</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
