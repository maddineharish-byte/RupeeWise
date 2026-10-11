import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { SavingsGoal } from '../../types/finance';
import { parseRupeeInput } from '../../utils/currency';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: SavingsGoal) => void;
  initialGoal?: SavingsGoal | null;
}

export function GoalModal({ isOpen, onClose, onSave, initialGoal }: GoalModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Safety Net');
  const [targetStr, setTargetStr] = useState('');
  const [currentStr, setCurrentStr] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialGoal) {
      setTitle(initialGoal.title);
      setCategory(initialGoal.category);
      setTargetStr((initialGoal.targetPaise / 100).toString());
      setCurrentStr((initialGoal.currentPaise / 100).toString());
      setTargetDate(initialGoal.targetDate);
    } else {
      setTitle('');
      setCategory('Safety Net');
      setTargetStr('');
      setCurrentStr('0');
      setTargetDate('2026-11-30');
    }
    setError('');
  }, [initialGoal, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPaise = parseRupeeInput(targetStr);
    const currentPaise = parseRupeeInput(currentStr);

    if (!title.trim()) {
      setError('Please provide a title for the goal.');
      return;
    }
    if (targetPaise <= 0) {
      setError('Target amount must be greater than ₹0.');
      return;
    }

    const goal: SavingsGoal = {
      id: initialGoal ? initialGoal.id : `goal-${Date.now()}`,
      title: title.trim(),
      category,
      targetPaise,
      currentPaise,
      targetDate: targetDate || '2026-12-31',
      createdAt: initialGoal ? initialGoal.createdAt : new Date().toISOString().split('T')[0],
    };

    onSave(goal);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="goal-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 id="goal-modal-title" className="text-base font-semibold text-slate-900">
            {initialGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-2.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Goal Title</label>
            <input
              type="text"
              placeholder="e.g. Laptop fund, Goa hackathon, Emergency buffer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            >
              <option value="Safety Net">Safety Net / Emergency</option>
              <option value="Travel & Growth">Travel & Experience</option>
              <option value="Gadgets & Tech">Gadgets & Hardware</option>
              <option value="Education">Education & Courses</option>
              <option value="Other">Other Milestone</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Target (₹)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Already Saved (₹)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={currentStr}
                  onChange={(e) => setCurrentStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Target Date</label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
            />
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
              <span>{initialGoal ? 'Save Changes' : 'Create Goal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
