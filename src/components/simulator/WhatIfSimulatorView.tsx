import React, { useState } from 'react';
import {
  Sparkles,
  Smartphone,
  Plane,
  Coffee,
  HeartPulse,
  Briefcase,
  Play,
  RotateCcw,
  Check,
  X,
  History,
  Info,
} from 'lucide-react';
import { ScenarioInput } from '../../types/finance';
import { useFinanceCalculations } from '../../context/useFinanceCalculations';
import { calculateScenarioProjection } from '../../utils/financialEngine';
import { formatPaise, parseRupeeInput } from '../../utils/currency';
import { ProjectionTimelineChart } from './ProjectionTimelineChart';
import { ScenarioCompareCard } from './ScenarioCompareCard';
import { ConfirmModal } from '../common/ConfirmModal';

interface PresetItem {
  id: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  scenario: ScenarioInput;
}

export function WhatIfSimulatorView() {
  const { state, dispatch, healthScore } = useFinanceCalculations();

  // Active scenario inputs state
  const [name, setName] = useState('Buy a Smartphone');
  const [oneTimeExpenseStr, setOneTimeExpenseStr] = useState('12000');
  const [dailyDeltaStr, setDailyDeltaStr] = useState('0');
  const [incomeStr, setIncomeStr] = useState('0');
  const [recurringStr, setRecurringStr] = useState('0');
  const [savingsDeltaStr, setSavingsDeltaStr] = useState('0');
  const [effectiveDay, setEffectiveDay] = useState(12);

  // Status message / Confirmation
  const [isApplyConfirmOpen, setIsApplyConfirmOpen] = useState(false);
  const [appliedFeedback, setAppliedFeedback] = useState<string | null>(null);

  // Presets definition
  const presets: PresetItem[] = [
    {
      id: 'phone',
      title: 'Buy a Smartphone',
      desc: 'One-time ₹12,000 gadget upgrade',
      icon: <Smartphone className="w-4 h-4 text-indigo-600" />,
      scenario: {
        name: 'Buy a Smartphone',
        oneTimeExpensePaise: 1200000,
        dailySpendDeltaPaise: 0,
        additionalIncomePaise: 0,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 12,
        category: 'Shopping & Personal',
      },
    },
    {
      id: 'trip',
      title: 'Weekend Goa Trip',
      desc: 'Short vacation expense ₹4,500',
      icon: <Plane className="w-4 h-4 text-sky-600" />,
      scenario: {
        name: 'Weekend Goa Trip',
        oneTimeExpensePaise: 450000,
        dailySpendDeltaPaise: 0,
        additionalIncomePaise: 0,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 15,
        category: 'Transit & Travel',
      },
    },
    {
      id: 'dining',
      title: 'Cut Dining Out',
      desc: 'Save ₹150/day on outside snacks',
      icon: <Coffee className="w-4 h-4 text-amber-600" />,
      scenario: {
        name: 'Cut Dining Out',
        oneTimeExpensePaise: 0,
        dailySpendDeltaPaise: -15000,
        additionalIncomePaise: 0,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 10,
        category: 'Food & Dining',
      },
    },
    {
      id: 'medical',
      title: 'Unexpected Medical Bill',
      desc: 'Emergency pharmacy check ₹2,500',
      icon: <HeartPulse className="w-4 h-4 text-rose-600" />,
      scenario: {
        name: 'Unexpected Medical Bill',
        oneTimeExpensePaise: 250000,
        dailySpendDeltaPaise: 0,
        additionalIncomePaise: 0,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 11,
        category: 'Healthcare',
      },
    },
    {
      id: 'freelance',
      title: 'Freelance Gig Income',
      desc: 'Earn ₹6,000 for frontend project',
      icon: <Briefcase className="w-4 h-4 text-emerald-600" />,
      scenario: {
        name: 'Freelance Gig Income',
        oneTimeExpensePaise: 0,
        dailySpendDeltaPaise: 0,
        additionalIncomePaise: 600000,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 14,
        category: 'Other',
      },
    },
  ];

  const handleSelectPreset = (preset: PresetItem) => {
    setName(preset.scenario.name);
    setOneTimeExpenseStr((preset.scenario.oneTimeExpensePaise / 100).toString());
    setDailyDeltaStr((preset.scenario.dailySpendDeltaPaise / 100).toString());
    setIncomeStr((preset.scenario.additionalIncomePaise / 100).toString());
    setRecurringStr((preset.scenario.recurringExpensePaise / 100).toString());
    setSavingsDeltaStr((preset.scenario.savingsContributionDeltaPaise / 100).toString());
    setEffectiveDay(preset.scenario.effectiveDay);
  };

  const handleResetInputs = () => {
    setName('Buy a Smartphone');
    setOneTimeExpenseStr('12000');
    setDailyDeltaStr('0');
    setIncomeStr('0');
    setRecurringStr('0');
    setSavingsDeltaStr('0');
    setEffectiveDay(12);
    setAppliedFeedback(null);
  };

  // Build current scenario input object
  const currentScenario: ScenarioInput = {
    name: name.trim() || 'Custom What If? Scenario',
    oneTimeExpensePaise: parseRupeeInput(oneTimeExpenseStr),
    dailySpendDeltaPaise: parseRupeeInput(dailyDeltaStr, true),
    additionalIncomePaise: parseRupeeInput(incomeStr),
    recurringExpensePaise: parseRupeeInput(recurringStr),
    savingsContributionDeltaPaise: parseRupeeInput(savingsDeltaStr),
    effectiveDay: Math.max(state.period.currentDay, Math.min(state.period.totalDays, effectiveDay)),
    category: 'Shopping & Personal',
  };

  // Pure projection calculation (no baseline mutation)
  const projection = calculateScenarioProjection(state, currentScenario);

  const handleApplyConfirm = () => {
    dispatch({ type: 'APPLY_SCENARIO', payload: currentScenario });
    setIsApplyConfirmOpen(false);
    setAppliedFeedback(`Scenario "${currentScenario.name}" was committed to your live financial state.`);
  };

  const handleDiscard = () => {
    dispatch({ type: 'DISCARD_SCENARIO' });
    handleResetInputs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Sparkles className="w-4 h-4" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              What If? Simulator
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Experiment with purchases, lifestyle shifts, and emergencies before committing real money.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDiscard}
            title="Discard temporary scenario"
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleResetInputs}
            title="Reset scenario inputs to default"
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Inputs</span>
          </button>
          <button
            onClick={() => setIsApplyConfirmOpen(true)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>Apply Scenario</span>
          </button>
        </div>
      </div>

      {/* Applied Feedback Banner */}
      {appliedFeedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{appliedFeedback}</span>
          </div>
          <button
            onClick={() => setAppliedFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Presets Strip */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Quick Test Presets
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {presets.map((preset) => {
            const isSelected = name === preset.scenario.name;
            return (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 text-left rounded-xl border transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {preset.icon}
                  <span className="text-xs font-bold text-slate-900 truncate">
                    {preset.title}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-snug">{preset.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Inputs vs Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Inputs (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Scenario Parameters</h2>
            <span className="text-[11px] font-mono text-slate-400">Isolated Baseline</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Scenario Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
              placeholder="e.g. Goa Trip, New Laptop"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                One-Time Expense (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={oneTimeExpenseStr}
                  onChange={(e) => setOneTimeExpenseStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Effective Day (Day 10–30)
              </label>
              <input
                type="number"
                min={state.period.currentDay}
                max={state.period.totalDays}
                value={effectiveDay}
                onChange={(e) => setEffectiveDay(parseInt(e.target.value) || 10)}
                className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Daily Spend Delta (₹/day)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  step="any"
                  placeholder="+/- per day"
                  value={dailyDeltaStr}
                  onChange={(e) => setDailyDeltaStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">Use negative to test saving</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Additional Income (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={incomeStr}
                  onChange={(e) => setIncomeStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
              <span className="text-[10px] text-slate-400">Freelance, stipend, gift</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Recurring Commitment (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={recurringStr}
                  onChange={(e) => setRecurringStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Savings Contribution (₹)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1.5 text-slate-400 text-xs font-mono">₹</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={savingsDeltaStr}
                  onChange={(e) => setSavingsDeltaStr(e.target.value)}
                  className="w-full pl-6 pr-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Simulation does not change live records until applied.</span>
            <button
              type="button"
              onClick={() => setIsApplyConfirmOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Commit to plan →
            </button>
          </div>
        </div>

        {/* Comparison Cards & Impact (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <ScenarioCompareCard
            projection={projection}
            baselineHealthScore={healthScore.totalScore}
            baselineHealthRisk={healthScore.riskLevel}
          />

          {/* Trajectory Projection Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Projected Daily Cash Balance Trajectory
                </h3>
                <p className="text-xs text-slate-500">
                  Day 10 to Day 30 runway comparison with and without the proposed decision.
                </p>
              </div>
            </div>

            <ProjectionTimelineChart
              data={projection.dailyTrajectory}
              scenarioName={currentScenario.name}
            />
          </div>
        </div>
      </div>

      {/* Applied History */}
      {state.appliedScenarioHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Applied Scenario Log</h3>
          </div>
          <div className="space-y-2">
            {state.appliedScenarioHistory.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg text-xs"
              >
                <div>
                  <span className="font-semibold text-slate-900">{item.name}</span>
                  <span className="text-slate-500 ml-2">{item.summary}</span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  {new Date(item.appliedAt).toLocaleDateString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={isApplyConfirmOpen}
        title="Apply Scenario to Live Financial Plan?"
        message={`Are you sure you want to commit "${currentScenario.name}"? This will create real transaction entries and update your live baseline cash balance.`}
        confirmLabel="Apply & Commit Once"
        isDestructive={projection.isDeficit}
        onConfirm={handleApplyConfirm}
        onCancel={() => setIsApplyConfirmOpen(false)}
      />
    </div>
  );
}
