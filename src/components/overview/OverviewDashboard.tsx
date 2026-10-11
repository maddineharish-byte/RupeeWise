import React from 'react';
import {
  Wallet,
  Sparkles,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowRight,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  Target,
  Info,
} from 'lucide-react';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';
import { MetricCard } from '../common/MetricCard';
import { SpendingBudgetChart } from './SpendingBudgetChart';
import { ActiveTab } from '../layout/AppHeader';

interface OverviewDashboardProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAddTransaction: () => void;
}

export function OverviewDashboard({
  setActiveTab,
  onOpenAddTransaction,
}: OverviewDashboardProps) {
  const { state, dispatch, summary, healthScore } = useFinanceCalculations();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Active Budget Cycle
            </span>
            <span className="text-slate-500 text-xs">·</span>
            <span className="text-xs text-slate-300 font-mono">
              Day {state.period.currentDay} of {state.period.totalDays} ({summary.daysRemaining} days left)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back, {state.userProfile.name}
          </h1>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            You have <strong className="text-emerald-400 font-mono">{formatPaise(summary.availableToSpendPaise)}</strong> available to spend safely after protecting upcoming bills.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setActiveTab('chat')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-700" />
            <span>AI Advisor</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors shadow-xs"
          >
            <span>What If?</span>
          </button>
          <button
            onClick={onOpenAddTransaction}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Log Spend</span>
          </button>
        </div>
      </div>

      {/* Mandatory Accounting Model Explainer Callout */}
      <div className="p-4 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 leading-relaxed flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold text-slate-900">Documented Accounting Model:</strong>{' '}
          Your <strong className="font-mono text-slate-900">{formatPaise(summary.currentBalancePaise)}</strong> current balance is calculated before upcoming commitments. RupeeWise ring-fences your{' '}
          <strong className="font-mono text-amber-800">{formatPaise(summary.unpaidCommitmentsPaise)}</strong> in unpaid protected bills, leaving{' '}
          <strong className="font-mono text-emerald-800">{formatPaise(summary.availableToSpendPaise)}</strong> as your true available-to-spend cash. Your remaining savings target of{' '}
          <span className="font-mono">{formatPaise(summary.remainingSavingsTargetPaise)}</span> is displayed separately and will only be deducted when contributed.
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Available to Spend"
          value={formatPaise(summary.availableToSpendPaise)}
          subtext="Safe discretionary cash after ring-fencing upcoming commitments."
          helperRule="Current balance − Unpaid bills"
          badge={{ text: 'Ready Cash', type: 'positive' }}
          highlight={true}
        />

        <MetricCard
          label="Daily Spending Allowance"
          value={`${formatPaise(summary.dailyAllowancePaise)} / day`}
          subtext={`Safe burn rate over the remaining ${summary.daysRemaining} days.`}
          helperRule="Available ÷ Days remaining"
          badge={{ text: `${summary.daysRemaining} Days Left`, type: 'neutral' }}
        />

        <MetricCard
          label="Current Balance"
          value={formatPaise(summary.currentBalancePaise)}
          subtext={`Starting budget (${formatPaise(summary.startingBudgetPaise)}) minus posted spending.`}
          helperRule="Before unpaid bills"
          badge={{ text: 'Bank Ledger', type: 'neutral' }}
        />

        <MetricCard
          label="Protected Unpaid Bills"
          value={formatPaise(summary.unpaidCommitmentsPaise)}
          subtext="Ring-fenced dues for broadband & room share."
          helperRule="Mandatory commitments"
          badge={{ text: 'Protected', type: 'warning' }}
        />
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Total Posted Spending
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {formatPaise(summary.postedExpensesPaise)}
          </div>
          <span className="text-[11px] text-slate-400">
            {Math.round((summary.postedExpensesPaise / summary.startingBudgetPaise) * 100)}% of 30d budget
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Remaining Savings Target
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-indigo-600 mt-0.5">
            {formatPaise(summary.remainingSavingsTargetPaise)}
          </div>
          <span className="text-[11px] text-slate-400">
            Target for cycle
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Current Daily Burn
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
            {formatPaise(summary.currentDailyBurnPaise)} / day
          </div>
          <span className="text-[11px] text-slate-400">
            Day 1 to 10 average
          </span>
        </div>

        <div className="p-3.5 bg-white rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
            Financial Health
          </span>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-600 mt-0.5">
            {healthScore.totalScore} / 100
          </div>
          <span className="text-[11px] text-slate-400">
            {healthScore.riskLevel} Risk
          </span>
        </div>
      </div>

      {/* Visual Chart + Key Insights (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Spending vs Budget Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Capital Allocation Breakdown</h2>
              <p className="text-xs text-slate-500">
                Comparing posted expenses, protected bills, savings target, and remaining cash.
              </p>
            </div>
            <button
              onClick={() => setActiveTab('budget')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Planner</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <SpendingBudgetChart
            startingBudgetPaise={summary.startingBudgetPaise}
            postedExpensesPaise={summary.postedExpensesPaise}
            unpaidCommitmentsPaise={summary.unpaidCommitmentsPaise}
            availableToSpendPaise={summary.availableToSpendPaise}
            remainingSavingsTargetPaise={summary.remainingSavingsTargetPaise}
          />
        </div>

        {/* Actionable Insights & Burn Projection (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Financial Forecast & Insights</h2>
            <button
              onClick={() => setActiveTab('health')}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Full Audit →
            </button>
          </div>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-950">
              <strong className="font-semibold text-emerald-900 block mb-0.5">
                Solvent at Daily Allowance Pace:
              </strong>
              Spending at or below <span className="font-mono font-bold">{formatPaise(summary.dailyAllowancePaise)}/day</span> guarantees 100% of your ₹2,000 bills are covered.
            </div>

            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-100 text-xs text-amber-950">
              <strong className="font-semibold text-amber-900 block mb-0.5">
                Burn Rate Check:
              </strong>
              Your current burn rate is <span className="font-mono font-bold">{formatPaise(summary.currentDailyBurnPaise)}/day</span>. Staying within <span className="font-mono font-bold">{formatPaise(summary.dailyAllowancePaise)}/day</span> avoids an end-of-month shortfall.
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700">
              <strong className="font-semibold text-slate-900 block mb-0.5">
                Savings Target Feasibility:
              </strong>
              To fully fund your remaining {formatPaise(summary.remainingSavingsTargetPaise)} savings goal, set aside{' '}
              <span className="font-mono font-bold text-indigo-700">{formatPaise(Math.round(summary.remainingSavingsTargetPaise / summary.daysRemaining))}/day</span>.
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setActiveTab('simulator')}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Simulate a Purchase in What If?</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Recent Transactions & Upcoming Commitments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Recent Transactions</h2>
            <button
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>View All ({state.transactions.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {state.transactions.slice(0, 4).map((tx) => (
              <div
                key={tx.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-medium text-slate-900">{tx.description}</div>
                  <div className="text-[11px] text-slate-500">
                    {tx.category} · {tx.date}
                  </div>
                </div>
                <div className="font-mono font-semibold tabular-nums text-slate-900">
                  {tx.type === 'expense' ? '-' : '+'}
                  {formatPaise(tx.amountPaise)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Commitments */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Upcoming Protected Commitments</h2>
            <button
              onClick={() => setActiveTab('budget')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              <span>Manage Bills</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {state.commitments.map((comm) => (
              <div
                key={comm.id}
                className="py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      comm.isPaid ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <div
                      className={`font-medium ${
                        comm.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'
                      }`}
                    >
                      {comm.title}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Due: {comm.dueDate} (Day {comm.dueDay})
                    </div>
                  </div>
                </div>
                <div
                  className={`font-mono font-semibold tabular-nums ${
                    comm.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'
                  }`}
                >
                  {formatPaise(comm.amountPaise)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
