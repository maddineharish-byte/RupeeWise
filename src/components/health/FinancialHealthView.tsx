import React from 'react';
import {
  Activity,
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  PiggyBank,
  Zap,
} from 'lucide-react';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { formatPaise } from '../../utils/currency';

export function FinancialHealthView() {
  const { summary, healthScore, categorySummaries } = useFinanceCalculations();

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'Low':
        return { text: 'Low Risk · Healthy & Resilient', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
      case 'Moderate':
        return { text: 'Moderate Risk · Stable Baseline', bg: 'bg-sky-50 text-sky-800 border-sky-200' };
      case 'Elevated':
        return { text: 'Elevated Risk · Caution Required', bg: 'bg-amber-50 text-amber-800 border-amber-200' };
      default:
        return { text: 'High Risk · Immediate Action Needed', bg: 'bg-rose-50 text-rose-800 border-rose-200' };
    }
  };

  const riskBadge = getRiskBadge(healthScore.riskLevel);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Health</h1>
        <p className="text-xs text-slate-500 mt-1">
          Transparent, deterministic evaluation of your budget adherence, runway coverage, and savings discipline.
        </p>
      </div>

      {/* Main Scorecard */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-slate-900 text-white flex flex-col items-center justify-center shadow-sm shrink-0">
              <span className="text-3xl font-extrabold font-mono tabular-nums leading-none">
                {healthScore.totalScore}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 font-mono uppercase tracking-widest">
                / 100
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md border ${riskBadge.bg}`}>
                  {riskBadge.text}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">RupeeWise Financial Resiliency Score</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated from real state: 4 objective parameters with 100% mathematical auditability.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100 font-mono text-xs">
            <div>
              <span className="text-slate-400 block text-[10px] font-sans">Projected Balance Status</span>
              <span className={`font-bold ${summary.burnRateDeficitPaise > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                {summary.burnRateDeficitPaise > 0
                  ? `Shortfall of ${formatPaise(summary.burnRateDeficitPaise)}`
                  : `Surplus Runway Verified`}
              </span>
            </div>
            <div className="sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-slate-400 block text-[10px] font-sans">Current Daily Burn</span>
              <span className="font-bold text-slate-900">
                {formatPaise(summary.currentDailyBurnPaise)} / day
              </span>
            </div>
          </div>
        </div>

        {/* 4 Factor Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Factor 1: Budget Adherence */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-900">1. Budget Adherence</span>
              <span className="font-mono font-semibold text-slate-700">
                {healthScore.factors.budgetAdherence.score} / {healthScore.factors.budgetAdherence.maxScore} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-600"
                style={{
                  width: `${(healthScore.factors.budgetAdherence.score / healthScore.factors.budgetAdherence.maxScore) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {healthScore.factors.budgetAdherence.description}
            </p>
          </div>

          {/* Factor 2: Commitment Coverage */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-900">2. Commitment Coverage</span>
              <span className="font-mono font-semibold text-slate-700">
                {healthScore.factors.commitmentCoverage.score} / {healthScore.factors.commitmentCoverage.maxScore} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-emerald-600"
                style={{
                  width: `${(healthScore.factors.commitmentCoverage.score / healthScore.factors.commitmentCoverage.maxScore) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {healthScore.factors.commitmentCoverage.description}
            </p>
          </div>

          {/* Factor 3: Savings Progress */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-900">3. Savings Target Progress</span>
              <span className="font-mono font-semibold text-slate-700">
                {healthScore.factors.savingsProgress.score} / {healthScore.factors.savingsProgress.maxScore} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-indigo-600"
                style={{
                  width: `${(healthScore.factors.savingsProgress.score / healthScore.factors.savingsProgress.maxScore) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {healthScore.factors.savingsProgress.description}
            </p>
          </div>

          {/* Factor 4: Daily Runway Allowance */}
          <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-slate-900">4. Daily Runway Allowance</span>
              <span className="font-mono font-semibold text-slate-700">
                {healthScore.factors.runwayAllowance.score} / {healthScore.factors.runwayAllowance.maxScore} pts
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-2">
              <div
                className="h-full bg-sky-600"
                style={{
                  width: `${(healthScore.factors.runwayAllowance.score / healthScore.factors.runwayAllowance.maxScore) * 100}%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              {healthScore.factors.runwayAllowance.description}
            </p>
          </div>
        </div>
      </div>

      {/* Personalized Rule-Based Recommendations */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-amber-600" />
          <h2 className="text-base font-bold text-slate-900">Data-Driven Recommendations</h2>
        </div>

        <div className="space-y-3">
          {healthScore.recommendations.map((rec, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-800 leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{rec}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Category Risk Radar List */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Category Stress Indicators</h2>
        <div className="divide-y divide-slate-100 text-xs">
          {categorySummaries.map((cat) => {
            const isDanger = cat.isOverspent;
            const isWarning = cat.percentSpent > 75 && !cat.isOverspent;

            return (
              <div
                key={cat.category}
                className="py-3 flex items-center justify-between gap-4 font-mono"
              >
                <div className="font-sans font-medium text-slate-800">{cat.category}</div>
                <div className="flex items-center gap-4">
                  <span className="text-slate-500 hidden sm:inline">
                    {formatPaise(cat.spentPaise)} / {formatPaise(cat.allocatedPaise)}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      isDanger
                        ? 'bg-rose-50 text-rose-700'
                        : isWarning
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {isDanger ? 'Over Budget' : isWarning ? 'High Burn Rate' : 'Healthy Pace'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
