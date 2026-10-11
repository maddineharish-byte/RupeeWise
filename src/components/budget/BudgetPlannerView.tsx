import React, { useState } from 'react';
import {
  PieChart,
  SlidersHorizontal,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  ShieldCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';
import { EditBudgetModal } from './EditBudgetModal';
import { ConfirmModal } from '../common/ConfirmModal';
import { ProtectedCommitment, ExpenseCategory } from '../../types/finance';
import { CATEGORY_LIST } from '../../data/initialSeed';

export function BudgetPlannerView() {
  const { state, dispatch, summary, categorySummaries, toggleCommitmentPaid } = useFinanceCalculations();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deleteCommitmentId, setDeleteCommitmentId] = useState<string | null>(null);

  // New commitment input state
  const [isAddingCommitment, setIsAddingCommitment] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAmountStr, setNewAmountStr] = useState('');
  const [newCategory, setNewCategory] = useState<ExpenseCategory>('Utilities & Bills');
  const [newDueDay, setNewDueDay] = useState<number>(20);

  const handleAddCommitment = (e: React.FormEvent) => {
    e.preventDefault();
    const paise = Math.round(parseFloat(newAmountStr) * 100);
    if (!newTitle.trim() || isNaN(paise) || paise <= 0) return;

    const comm: ProtectedCommitment = {
      id: `comm-${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory,
      amountPaise: paise,
      dueDate: `2026-10-${newDueDay.toString().padStart(2, '0')}`,
      dueDay: newDueDay,
      isPaid: false,
      notes: `Due on day ${newDueDay} of current cycle`,
    };

    dispatch({ type: 'ADD_COMMITMENT', payload: comm });
    setIsAddingCommitment(false);
    setNewTitle('');
    setNewAmountStr('');
  };

  const handleTogglePaid = (id: string) => {
    toggleCommitmentPaid(id);
  };

  const handleDeleteCommitment = () => {
    if (deleteCommitmentId) {
      dispatch({ type: 'DELETE_COMMITMENT', payload: { id: deleteCommitmentId } });
      setDeleteCommitmentId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Budget Planner</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage category spending limits, track burn rate, and ring-fence protected commitments.
          </p>
        </div>
        <button
          onClick={() => setIsEditModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-400" />
          <span>Adjust Allocations</span>
        </button>
      </div>

      {/* High-level status cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total 30-Day Budget
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatPaise(summary.startingBudgetPaise)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Spent to date:{' '}
            <strong className="text-slate-800 font-mono">
              {formatPaise(summary.postedExpensesPaise)}
            </strong>{' '}
            ({Math.round((summary.postedExpensesPaise / summary.startingBudgetPaise) * 100)}%)
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Unpaid Protected Bills
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1">
            {formatPaise(summary.unpaidCommitmentsPaise)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Reserved cash to cover upcoming rent and utility dues.
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Daily Discretionary Allowance
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {formatPaise(summary.dailyAllowancePaise)} / day
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Available over the remaining <strong className="text-slate-800">{summary.daysRemaining} days</strong>.
          </p>
        </div>
      </div>

      {/* Category Breakdown & Progress */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Category Budgets vs Actual</h2>
            <p className="text-xs text-slate-500">
              Live consumption tracking with daily remaining pace limits.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categorySummaries.map((cat) => {
            const isWarning = cat.percentSpent > 80 && !cat.isOverspent;
            return (
              <div
                key={cat.category}
                className={`p-4 rounded-xl border transition-all ${
                  cat.isOverspent
                    ? 'border-rose-200 bg-rose-50/40'
                    : isWarning
                    ? 'border-amber-200 bg-amber-50/30'
                    : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-slate-900">{cat.category}</span>
                  <span
                    className={`text-xs font-mono font-medium ${
                      cat.isOverspent
                        ? 'text-rose-600'
                        : isWarning
                        ? 'text-amber-700'
                        : 'text-slate-600'
                    }`}
                  >
                    {Math.round(cat.percentSpent)}% spent
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full transition-all duration-300 ${
                      cat.isOverspent
                        ? 'bg-rose-500'
                        : isWarning
                        ? 'bg-amber-500'
                        : 'bg-emerald-600'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, cat.percentSpent))}%` }}
                  />
                </div>

                {/* Numbers row */}
                <div className="flex items-center justify-between text-xs text-slate-600 font-mono">
                  <div>
                    Spent:{' '}
                    <strong className="text-slate-900">{formatPaise(cat.spentPaise)}</strong>
                  </div>
                  <div>
                    Limit: <span>{formatPaise(cat.allocatedPaise)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                  <span>
                    Remaining:{' '}
                    <strong
                      className={`font-mono ${
                        cat.isOverspent ? 'text-rose-600 font-bold' : 'text-slate-700'
                      }`}
                    >
                      {cat.isOverspent ? '-' : ''}
                      {formatPaise(Math.abs(cat.remainingPaise))}
                    </strong>
                  </span>
                  <span>
                    Daily cap: <strong className="font-mono text-slate-700">{formatPaise(cat.dailyAllowancePaise)}/d</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protected Commitments Manager */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Protected Commitments (Bills & Dues)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              These mandatory payments are deducted from your balance to compute safe available cash.
            </p>
          </div>

          {!isAddingCommitment && (
            <button
              onClick={() => setIsAddingCommitment(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" />
              <span>Add Bill</span>
            </button>
          )}
        </div>

        {/* Inline Add Commitment Form */}
        {isAddingCommitment && (
          <form
            onSubmit={handleAddCommitment}
            className="p-4 mb-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="text-xs font-semibold text-slate-800">Add New Upcoming Bill</div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Bill description (e.g. Electricity)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="sm:col-span-2 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                required
              />
              <input
                type="number"
                placeholder="Amount (₹)"
                value={newAmountStr}
                onChange={(e) => setNewAmountStr(e.target.value)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-mono focus:outline-none"
                required
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              >
                {CATEGORY_LIST.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingCommitment(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800"
              >
                Save Commitment
              </button>
            </div>
          </form>
        )}

        {/* Commitment List */}
        <div className="divide-y divide-slate-100">
          {state.commitments.map((comm) => (
            <div
              key={comm.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-lg transition-colors"
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => handleTogglePaid(comm.id)}
                  title={comm.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
                  className={`mt-0.5 p-1 rounded-md transition-colors ${
                    comm.isPaid
                      ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                      : 'text-slate-400 hover:text-emerald-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold ${
                        comm.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {comm.title}
                    </span>
                    <span className="text-[11px] text-slate-500">{comm.category}</span>
                  </div>
                  {comm.notes && (
                    <p className="text-[11px] text-slate-500 mt-0.5">{comm.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <div className="text-right">
                  <div
                    className={`text-sm font-bold font-mono tabular-nums ${
                      comm.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'
                    }`}
                  >
                    {formatPaise(comm.amountPaise)}
                  </div>
                  <div className="text-[11px] text-slate-500">Due: {comm.dueDate}</div>
                </div>

                <button
                  onClick={() => setDeleteCommitmentId(comm.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                  title="Remove commitment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <EditBudgetModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <ConfirmModal
        isOpen={deleteCommitmentId !== null}
        title="Delete Commitment?"
        message="Are you sure you want to delete this commitment? It will no longer be ring-fenced from your available cash."
        confirmLabel="Delete Commitment"
        isDestructive={true}
        onConfirm={handleDeleteCommitment}
        onCancel={() => setDeleteCommitmentId(null)}
      />
    </div>
  );
}
