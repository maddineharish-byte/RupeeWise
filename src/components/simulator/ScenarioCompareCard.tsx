import React from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ScenarioProjection } from '../../types/finance';
import { formatPaise, formatDeltaPaise } from '../../utils/currency';

interface ScenarioCompareCardProps {
  projection: ScenarioProjection;
  baselineHealthScore: number;
  baselineHealthRisk: string;
}

export function ScenarioCompareCard({
  projection,
  baselineHealthScore,
  baselineHealthRisk,
}: ScenarioCompareCardProps) {
  const metrics = [
    {
      label: 'Available to Spend',
      baseline: formatPaise(projection.baselineAvailablePaise),
      scenario: formatPaise(projection.scenarioAvailablePaise),
      delta: formatDeltaPaise(projection.deltaAvailablePaise),
      isPositive: projection.deltaAvailablePaise >= 0,
      isZero: projection.deltaAvailablePaise === 0,
    },
    {
      label: 'Daily Discretionary Allowance',
      baseline: `${formatPaise(projection.baselineDailyAllowancePaise)} / day`,
      scenario: `${formatPaise(projection.scenarioDailyAllowancePaise)} / day`,
      delta: `${formatDeltaPaise(projection.deltaDailyAllowancePaise)}/d`,
      isPositive: projection.deltaDailyAllowancePaise >= 0,
      isZero: projection.deltaDailyAllowancePaise === 0,
    },
    {
      label: 'Projected Month-End Balance',
      baseline: formatPaise(projection.baselineEndBalancePaise),
      scenario: formatPaise(projection.scenarioEndBalancePaise),
      delta: formatDeltaPaise(projection.deltaEndBalancePaise),
      isPositive: projection.deltaEndBalancePaise >= 0,
      isZero: projection.deltaEndBalancePaise === 0,
    },
    {
      label: 'Financial Health Score',
      baseline: `${baselineHealthScore}/100 (${baselineHealthRisk})`,
      scenario: `${projection.scenarioHealthScore}/100 (${projection.scenarioRiskLevel})`,
      delta: `${projection.healthScoreDelta >= 0 ? '+' : ''}${projection.healthScoreDelta} pts`,
      isPositive: projection.healthScoreDelta >= 0,
      isZero: projection.healthScoreDelta === 0,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Impact Analysis
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-0.5">
            Baseline vs. {projection.scenarioName}
          </h3>
        </div>

        {projection.isDeficit ? (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Deficit of {formatPaise(projection.deficitAmountPaise)}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Solvent & Feasible</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.map((m, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-lg border border-slate-100 bg-slate-50/40 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-medium">{m.label}</span>
                <span
                  className={`font-mono text-xs font-semibold ${
                    m.isZero
                      ? 'text-slate-500'
                      : m.isPositive
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {m.delta}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 text-xs font-mono font-medium">
                <div className="text-slate-600">
                  <span className="text-[10px] text-slate-400 block font-sans">Baseline</span>
                  <span className="tabular-nums">{m.baseline}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-sans">Simulated</span>
                  <span
                    className={`font-bold tabular-nums ${
                      m.isZero
                        ? 'text-slate-900'
                        : m.isPositive
                        ? 'text-emerald-700'
                        : 'text-rose-700'
                    }`}
                  >
                    {m.scenario}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Insight Banner */}
        <div className="mt-4 p-4 rounded-lg bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-950 leading-relaxed">
          <strong className="font-semibold text-indigo-900 block mb-1">
            Financial Impact Insight:
          </strong>
          {projection.insightSummary}
        </div>
      </div>
    </div>
  );
}
