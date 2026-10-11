/**
 * RupeeWise Financial Engine
 * Pure, deterministic financial calculations, forecasts, health scoring, and scenario projections.
 * All core monetary math uses integer paise.
 */

import {
  AppState,
  ExpenseCategory,
  FinancialHealthScore,
  ScenarioInput,
  ScenarioProjection,
} from '../types/finance';
import { formatPaise, formatDeltaPaise } from './currency';

export interface FinancialSummary {
  startingBudgetPaise: number;
  postedExpensesPaise: number;
  postedIncomePaise: number;
  plannedExpensesPaise: number;
  currentBalancePaise: number;
  unpaidCommitmentsPaise: number;
  paidCommitmentsPaise: number;
  availableToSpendPaise: number;
  remainingSavingsTargetPaise: number;
  netDiscretionaryAfterSavingsPaise: number;
  daysRemaining: number;
  dailyAllowancePaise: number;
  currentDailyBurnPaise: number;
  projectedEndBalanceAtAllowancePaise: number;
  projectedEndBalanceAtBurnRatePaise: number;
  burnRateDeficitPaise: number;
}

export interface CategorySummary {
  category: ExpenseCategory;
  allocatedPaise: number;
  spentPaise: number;
  remainingPaise: number;
  percentSpent: number;
  isOverspent: boolean;
  dailyAllowancePaise: number;
}

/**
 * Calculates current baseline financial summary from state.
 */
export function calculateFinancialSummary(state: AppState): FinancialSummary {
  const { period, transactions, commitments, savingsGoals } = state;

  const startingBudgetPaise = period.startingBudgetPaise;

  // Separate posted vs planned transactions
  let postedExpensesPaise = 0;
  let postedIncomePaise = 0;
  let plannedExpensesPaise = 0;

  for (const tx of transactions) {
    if (tx.status === 'posted') {
      if (tx.type === 'expense') {
        postedExpensesPaise += tx.amountPaise;
      } else {
        postedIncomePaise += tx.amountPaise;
      }
    } else if (tx.status === 'planned' && tx.type === 'expense') {
      plannedExpensesPaise += tx.amountPaise;
    }
  }

  // Current balance = Starting budget + posted income - posted expenses
  const currentBalancePaise = startingBudgetPaise + postedIncomePaise - postedExpensesPaise;

  // Commitments
  let unpaidCommitmentsPaise = 0;
  let paidCommitmentsPaise = 0;
  for (const comm of commitments) {
    if (comm.isPaid) {
      paidCommitmentsPaise += comm.amountPaise;
    } else {
      unpaidCommitmentsPaise += comm.amountPaise;
    }
  }

  // Accounting Rule: Available to Spend = Current balance - unpaid protected commitments
  const availableToSpendPaise = currentBalancePaise - unpaidCommitmentsPaise;

  // Remaining savings target (total across goals: targetPaise - currentPaise)
  let remainingSavingsTargetPaise = 0;
  for (const goal of savingsGoals) {
    const diff = Math.max(0, goal.targetPaise - goal.currentPaise);
    remainingSavingsTargetPaise += diff;
  }
  // If specific period savings target applies, minimum demo baseline is ₹2,000 if goal diff exists
  if (savingsGoals.length > 0 && remainingSavingsTargetPaise > 0) {
    // Primary period target is goal-1 remaining target (₹2,000 in demo)
    const primaryGoal = savingsGoals[0];
    remainingSavingsTargetPaise = Math.max(0, primaryGoal.targetPaise - primaryGoal.currentPaise);
  }

  const netDiscretionaryAfterSavingsPaise = availableToSpendPaise - remainingSavingsTargetPaise;

  // Days remaining: Day 10 of 30 means 30 - 10 + 1 = 21 days remaining
  const daysRemaining = Math.max(1, period.totalDays - period.currentDay + 1);

  // Daily allowance = Available to spend / days remaining
  const dailyAllowancePaise = Math.max(0, Math.floor(availableToSpendPaise / daysRemaining));

  // Current daily burn rate over elapsed days
  const elapsedDays = Math.max(1, period.currentDay);
  const currentDailyBurnPaise = Math.floor(postedExpensesPaise / elapsedDays);

  // Projections
  const projectedRemainingBurn = currentDailyBurnPaise * daysRemaining;
  const projectedEndBalanceAtBurnRatePaise = availableToSpendPaise - projectedRemainingBurn;
  const burnRateDeficitPaise = projectedEndBalanceAtBurnRatePaise < 0 ? Math.abs(projectedEndBalanceAtBurnRatePaise) : 0;

  const projectedEndBalanceAtAllowancePaise = Math.max(0, availableToSpendPaise - dailyAllowancePaise * daysRemaining);

  return {
    startingBudgetPaise,
    postedExpensesPaise,
    postedIncomePaise,
    plannedExpensesPaise,
    currentBalancePaise,
    unpaidCommitmentsPaise,
    paidCommitmentsPaise,
    availableToSpendPaise,
    remainingSavingsTargetPaise,
    netDiscretionaryAfterSavingsPaise,
    daysRemaining,
    dailyAllowancePaise,
    currentDailyBurnPaise,
    projectedEndBalanceAtAllowancePaise,
    projectedEndBalanceAtBurnRatePaise,
    burnRateDeficitPaise,
  };
}

/**
 * Calculates budget vs actual for each category
 */
export function calculateCategorySummaries(state: AppState): CategorySummary[] {
  const { categoryBudgets, transactions, period } = state;
  const daysRemaining = Math.max(1, period.totalDays - period.currentDay + 1);

  // Accumulate spent per category from posted expenses
  const spentMap = new Map<ExpenseCategory, number>();
  for (const tx of transactions) {
    if (tx.status === 'posted' && tx.type === 'expense') {
      const current = spentMap.get(tx.category) || 0;
      spentMap.set(tx.category, current + tx.amountPaise);
    }
  }

  return categoryBudgets.map((cat) => {
    const spentPaise = spentMap.get(cat.category) || 0;
    const remainingPaise = cat.allocatedPaise - spentPaise;
    const percentSpent = cat.allocatedPaise > 0 ? (spentPaise / cat.allocatedPaise) * 100 : 0;
    const isOverspent = remainingPaise < 0;
    const dailyAllowancePaise = Math.max(0, Math.floor(remainingPaise / daysRemaining));

    return {
      category: cat.category,
      allocatedPaise: cat.allocatedPaise,
      spentPaise,
      remainingPaise,
      percentSpent,
      isOverspent,
      dailyAllowancePaise,
    };
  });
}

/**
 * Calculates deterministic Financial Health Score (0-100) and risk factors
 */
export function calculateFinancialHealth(state: AppState): FinancialHealthScore {
  const summary = calculateFinancialSummary(state);
  const { period } = state;

  // 1. Budget Adherence (30 pts max)
  // Elapsed time ratio vs spent budget ratio
  const timeProgress = period.currentDay / period.totalDays; // e.g. 10/30 = 0.333
  const budgetSpentRatio = summary.startingBudgetPaise > 0
    ? summary.postedExpensesPaise / summary.startingBudgetPaise
    : 0; // e.g. 3,000 / 10,000 = 0.300

  let adherenceScore = 30;
  if (budgetSpentRatio > timeProgress + 0.2) {
    adherenceScore = 12; // Overspending significantly faster than days elapsed
  } else if (budgetSpentRatio > timeProgress + 0.05) {
    adherenceScore = 20; // Slightly faster burn
  } else if (budgetSpentRatio <= timeProgress) {
    adherenceScore = 30; // On track or spending slower than budget pace
  } else {
    adherenceScore = 25;
  }

  // 2. Commitment Coverage (25 pts max)
  // Can available cash safely absorb unpaid commitments?
  let commitmentScore = 25;
  if (summary.unpaidCommitmentsPaise === 0) {
    commitmentScore = 25;
  } else {
    const coverageRatio = summary.currentBalancePaise / summary.unpaidCommitmentsPaise;
    if (coverageRatio >= 3.0) {
      commitmentScore = 25; // 3x coverage (e.g. ₹7,000 vs ₹2,000 is 3.5x coverage!)
    } else if (coverageRatio >= 2.0) {
      commitmentScore = 22;
    } else if (coverageRatio >= 1.0) {
      commitmentScore = 16;
    } else {
      commitmentScore = 5; // Danger: Cannot cover mandatory bills
    }
  }

  // 3. Savings Progress (25 pts max)
  let savingsScore = 20;
  if (state.savingsGoals.length > 0) {
    const primaryGoal = state.savingsGoals[0];
    const progress = primaryGoal.targetPaise > 0 ? primaryGoal.currentPaise / primaryGoal.targetPaise : 0;
    savingsScore = Math.min(25, Math.round(progress * 25));
  }

  // 4. Daily Runway & Discretionary Allowance (20 pts max)
  let runwayScore = 20;
  // Daily allowance threshold in paise: ₹200/day = 20,000 paise
  if (summary.dailyAllowancePaise >= 20000) {
    runwayScore = 20;
  } else if (summary.dailyAllowancePaise >= 10000) {
    runwayScore = 14;
  } else if (summary.dailyAllowancePaise > 0) {
    runwayScore = 8;
  } else {
    runwayScore = 0; // Negative or zero allowance
  }

  const totalScore = Math.max(0, Math.min(100, adherenceScore + commitmentScore + savingsScore + runwayScore));

  let riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'High' = 'Low';
  if (totalScore >= 80) {
    riskLevel = 'Low';
  } else if (totalScore >= 65) {
    riskLevel = 'Moderate';
  } else if (totalScore >= 50) {
    riskLevel = 'Elevated';
  } else {
    riskLevel = 'High';
  }

  const recommendations: string[] = [];

  if (summary.burnRateDeficitPaise > 0) {
    recommendations.push(
      `Current burn rate (₹${Math.round(summary.currentDailyBurnPaise / 100)}/day) projects a ${formatPaise(summary.burnRateDeficitPaise)} deficit. Trim daily spending to ${formatPaise(summary.dailyAllowancePaise)}/day to stay balanced.`
    );
  } else {
    recommendations.push(
      `Healthy daily allowance of ${formatPaise(summary.dailyAllowancePaise)}/day maintains full coverage of your ${formatPaise(summary.unpaidCommitmentsPaise)} upcoming commitments.`
    );
  }

  if (summary.remainingSavingsTargetPaise > 0) {
    recommendations.push(
      `Allocate ${formatPaise(Math.round(summary.remainingSavingsTargetPaise / summary.daysRemaining))}/day over the remaining ${summary.daysRemaining} days to fully fund your savings goal without stress.`
    );
  }

  if (summary.unpaidCommitmentsPaise > 0) {
    recommendations.push(
      `Keep ${formatPaise(summary.unpaidCommitmentsPaise)} ring-fenced in your account for upcoming broadband and room rent commitments.`
    );
  }

  return {
    totalScore,
    riskLevel,
    factors: {
      budgetAdherence: {
        score: adherenceScore,
        maxScore: 30,
        description: `Spent ${Math.round(budgetSpentRatio * 100)}% of budget over ${Math.round(timeProgress * 100)}% of the cycle.`,
      },
      commitmentCoverage: {
        score: commitmentScore,
        maxScore: 25,
        description: `Current balance covers protected bills by ${(summary.currentBalancePaise / Math.max(1, summary.unpaidCommitmentsPaise)).toFixed(1)}x.`,
      },
      savingsProgress: {
        score: savingsScore,
        maxScore: 25,
        description: `Savings goal funded with ${formatPaise(summary.remainingSavingsTargetPaise)} remaining.`,
      },
      runwayAllowance: {
        score: runwayScore,
        maxScore: 20,
        description: `Safe daily discretionary allowance of ${formatPaise(summary.dailyAllowancePaise)}/day for ${summary.daysRemaining} days.`,
      },
    },
    recommendations,
  };
}

/**
 * Evaluates What If? scenario simulation against baseline.
 * Pure function: Does NOT mutate baseline state.
 */
export function calculateScenarioProjection(
  baselineState: AppState,
  scenario: ScenarioInput
): ScenarioProjection {
  const baselineSummary = calculateFinancialSummary(baselineState);
  const baselineHealth = calculateFinancialHealth(baselineState);
  const daysRemaining = baselineSummary.daysRemaining;

  // Scenario adjustments
  const netScenarioDeltaPaise =
    scenario.additionalIncomePaise -
    scenario.oneTimeExpensePaise -
    scenario.recurringExpensePaise -
    scenario.savingsContributionDeltaPaise -
    scenario.dailySpendDeltaPaise * daysRemaining;

  // Scenario available to spend
  const scenarioAvailablePaise = baselineSummary.availableToSpendPaise +
    scenario.additionalIncomePaise -
    scenario.oneTimeExpensePaise -
    scenario.recurringExpensePaise;

  // Scenario daily allowance
  const scenarioDailyAllowancePaise = Math.max(
    0,
    Math.floor((scenarioAvailablePaise - scenario.dailySpendDeltaPaise * daysRemaining) / daysRemaining)
  );

  // Scenario end balance
  const scenarioEndBalancePaise = baselineSummary.projectedEndBalanceAtAllowancePaise + netScenarioDeltaPaise;

  const deltaEndBalancePaise = scenarioEndBalancePaise - baselineSummary.projectedEndBalanceAtAllowancePaise;
  const deltaDailyAllowancePaise = scenarioDailyAllowancePaise - baselineSummary.dailyAllowancePaise;
  const deltaAvailablePaise = scenarioAvailablePaise - baselineSummary.availableToSpendPaise;

  // Check deficit
  const isDeficit = scenarioEndBalancePaise < 0;
  const deficitAmountPaise = isDeficit ? Math.abs(scenarioEndBalancePaise) : 0;

  // Remaining savings target impact
  const unfundedSavingsPaise = Math.max(
    0,
    baselineSummary.remainingSavingsTargetPaise - scenario.savingsContributionDeltaPaise
  );

  // Simulated health score
  let scoreDelta = 0;
  if (isDeficit) {
    scoreDelta -= 35;
  } else if (deltaEndBalancePaise < -500000) {
    scoreDelta -= 25;
  } else if (deltaEndBalancePaise < -200000) {
    scoreDelta -= 15;
  } else if (deltaEndBalancePaise > 200000) {
    scoreDelta += 15;
  }

  if (scenarioDailyAllowancePaise < 10000) {
    scoreDelta -= 15;
  }

  const scenarioHealthScore = Math.max(5, Math.min(100, baselineHealth.totalScore + scoreDelta));
  let scenarioRiskLevel: 'Low' | 'Moderate' | 'Elevated' | 'High' = 'Low';
  if (scenarioHealthScore >= 80) scenarioRiskLevel = 'Low';
  else if (scenarioHealthScore >= 65) scenarioRiskLevel = 'Moderate';
  else if (scenarioHealthScore >= 50) scenarioRiskLevel = 'Elevated';
  else scenarioRiskLevel = 'High';

  // Dynamic Trajectory Generation across the remaining period
  const dailyTrajectory: Array<{ day: number; baselinePaise: number; scenarioPaise: number }> = [];
  const startDay = baselineState.period.currentDay;
  const endDay = baselineState.period.totalDays;

  let currentBaseline = baselineSummary.currentBalancePaise;
  let currentScenario = baselineSummary.currentBalancePaise;

  for (let d = startDay; d <= endDay; d++) {
    // Baseline burns daily allowance
    if (d > startDay) {
      currentBaseline -= baselineSummary.dailyAllowancePaise;
    }

    // Scenario applies one-time events and daily adjustment
    if (d === scenario.effectiveDay) {
      currentScenario += scenario.additionalIncomePaise;
      currentScenario -= scenario.oneTimeExpensePaise;
    }
    if (d > startDay) {
      currentScenario -= (baselineSummary.dailyAllowancePaise + scenario.dailySpendDeltaPaise);
    }

    dailyTrajectory.push({
      day: d,
      baselinePaise: Math.max(0, currentBaseline),
      scenarioPaise: Math.max(-500000, currentScenario),
    });
  }

  // Generate dynamic, human-readable insight
  let insightSummary = '';
  if (scenario.oneTimeExpensePaise > 0) {
    const expenseStr = formatPaise(scenario.oneTimeExpensePaise);
    if (isDeficit) {
      insightSummary = `Simulating "${scenario.name}" (${expenseStr}) pushes your budget into an active deficit of ${formatPaise(deficitAmountPaise)}, reducing daily discretionary allowance to ${formatPaise(scenarioDailyAllowancePaise)}/day.`;
    } else {
      insightSummary = `Executing "${scenario.name}" (${expenseStr}) reduces your projected balance by ${formatPaise(Math.abs(deltaEndBalancePaise))} and adjusts daily allowance from ${formatPaise(baselineSummary.dailyAllowancePaise)} to ${formatPaise(scenarioDailyAllowancePaise)}/day.`;
    }
  } else if (scenario.dailySpendDeltaPaise < 0) {
    insightSummary = `Trimming daily spending by ${formatPaise(Math.abs(scenario.dailySpendDeltaPaise))}/day preserves ${formatPaise(Math.abs(deltaEndBalancePaise))} in surplus savings by month end!`;
  } else if (scenario.additionalIncomePaise > 0) {
    insightSummary = `Adding ${formatPaise(scenario.additionalIncomePaise)} income expands your daily discretionary allowance to ${formatPaise(scenarioDailyAllowancePaise)}/day and boosts financial health to ${scenarioHealthScore}/100.`;
  } else {
    insightSummary = `Scenario "${scenario.name}" projects an end balance delta of ${formatDeltaPaise(deltaEndBalancePaise)} and a revised daily allowance of ${formatPaise(scenarioDailyAllowancePaise)}/day.`;
  }

  return {
    scenarioName: scenario.name,
    baselineEndBalancePaise: baselineSummary.projectedEndBalanceAtAllowancePaise,
    scenarioEndBalancePaise,
    deltaEndBalancePaise,
    baselineDailyAllowancePaise: baselineSummary.dailyAllowancePaise,
    scenarioDailyAllowancePaise,
    deltaDailyAllowancePaise,
    baselineAvailablePaise: baselineSummary.availableToSpendPaise,
    scenarioAvailablePaise,
    deltaAvailablePaise,
    unfundedSavingsPaise,
    isDeficit,
    deficitAmountPaise,
    healthScoreDelta: scenarioHealthScore - baselineHealth.totalScore,
    scenarioHealthScore,
    scenarioRiskLevel,
    insightSummary,
    dailyTrajectory,
  };
}
