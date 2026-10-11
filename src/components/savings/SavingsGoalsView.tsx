import React, { useState } from 'react';
import { Target, Plus, Edit2, Trash2, ArrowUpRight, CheckCircle, Calendar, Sparkles } from 'lucide-react';
import { SavingsGoal } from '../../types/finance';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';
import { GoalModal } from './GoalModal';
import { ContributionModal } from './ContributionModal';
import { ConfirmModal } from '../common/ConfirmModal';

export function SavingsGoalsView() {
  const { state, dispatch, summary, contributeToGoal } = useFinanceCalculations();
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [contribGoal, setContribGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<string | null>(null);

  const handleSaveGoal = (goal: SavingsGoal) => {
    if (editingGoal) {
      dispatch({ type: 'UPDATE_SAVINGS_GOAL', payload: goal });
    } else {
      dispatch({ type: 'ADD_SAVINGS_GOAL', payload: goal });
    }
  };

  const handleContribute = (goalId: string, amountPaise: number) => {
    contributeToGoal(goalId, amountPaise);
  };

  const handleDeleteGoal = () => {
    if (deleteGoalId) {
      dispatch({ type: 'DELETE_SAVINGS_GOAL', payload: { id: deleteGoalId } });
      setDeleteGoalId(null);
    }
  };

  const totalSavedPaise = state.savingsGoals.reduce((sum, g) => sum + g.currentPaise, 0);
  const totalTargetPaise = state.savingsGoals.reduce((sum, g) => sum + g.targetPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Savings Goals</h1>
          <p className="text-xs text-slate-500 mt-1">
            Build emergency buffers and fund milestone dreams with disciplined daily contributions.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setIsGoalModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>New Goal</span>
        </button>
      </div>

      {/* Aggregate Goal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Total Accumulated Savings
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 mt-1">
            {formatPaise(totalSavedPaise)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Real cash reserved in your emergency/milestone accounts.
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Current Period Target Remaining
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatPaise(summary.remainingSavingsTargetPaise)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Suggested pace: <strong className="font-mono text-slate-800">{formatPaise(Math.round(summary.remainingSavingsTargetPaise / summary.daysRemaining))}/day</strong>
          </p>
        </div>

        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Overall Target Total
          </span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatPaise(totalTargetPaise)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {totalTargetPaise > 0
              ? `${Math.round((totalSavedPaise / totalTargetPaise) * 100)}% overall progress achieved.`
              : 'Set your targets above.'}
          </p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.savingsGoals.map((goal) => {
          const progressRatio = goal.targetPaise > 0 ? goal.currentPaise / goal.targetPaise : 0;
          const progressPercent = Math.min(100, Math.round(progressRatio * 100));
          const remainingPaise = Math.max(0, goal.targetPaise - goal.currentPaise);
          const isComplete = remainingPaise === 0;

          // Feasibility check
          const dailyRequired = Math.round(remainingPaise / summary.daysRemaining);
          const isFeasible = summary.dailyAllowancePaise >= dailyRequired;

          return (
            <div
              key={goal.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 block">
                      {goal.category}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">{goal.title}</h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingGoal(goal);
                        setIsGoalModalOpen(true);
                      }}
                      aria-label={`Edit goal: ${goal.title}`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded transition-colors"
                      title="Edit goal"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteGoalId(goal.id)}
                      aria-label={`Delete goal: ${goal.title}`}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Delete goal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="text-slate-600">
                      Saved: <strong className="text-slate-900">{formatPaise(goal.currentPaise)}</strong>
                    </span>
                    <span className="text-slate-500 font-semibold">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isComplete ? 'bg-emerald-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                    <span>Target: {formatPaise(goal.targetPaise)}</span>
                    <span>Remaining: {formatPaise(remainingPaise)}</span>
                  </div>
                </div>

                {/* Feasibility & Pace stats */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Pace Required</span>
                    <span className="font-mono font-medium text-slate-700">
                      {formatPaise(dailyRequired)} / day
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px]">Projection Feasibility</span>
                    <span
                      className={`font-semibold ${
                        isComplete
                          ? 'text-emerald-600'
                          : isFeasible
                          ? 'text-emerald-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {isComplete ? 'Goal Achieved' : isFeasible ? 'On Track' : 'Tight Runway'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Target: {goal.targetDate}
                </span>

                {!isComplete && (
                  <button
                    onClick={() => setContribGoal(goal)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Contribute</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => {
          setIsGoalModalOpen(false);
          setEditingGoal(null);
        }}
        onSave={handleSaveGoal}
        initialGoal={editingGoal}
      />

      <ContributionModal
        isOpen={contribGoal !== null}
        onClose={() => setContribGoal(null)}
        goal={contribGoal}
        onContribute={handleContribute}
      />

      <ConfirmModal
        isOpen={deleteGoalId !== null}
        title="Delete Savings Goal?"
        message="Are you sure you want to delete this goal? This will remove its remaining target from your budget calculations."
        confirmLabel="Delete Goal"
        isDestructive={true}
        onConfirm={handleDeleteGoal}
        onCancel={() => setDeleteGoalId(null)}
      />
    </div>
  );
}
