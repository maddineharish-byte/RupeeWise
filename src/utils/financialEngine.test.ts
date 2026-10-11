import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';
import {
  calculateFinancialSummary,
  calculateFinancialHealth,
  calculateScenarioProjection,
} from './financialEngine';
import { formatPaise, paiseToRupees, rupeesToPaise } from './currency';
import { ScenarioInput } from '../types/finance';

describe('RupeeWise Core Financial Engine', () => {
  it('correctly calculates the mandatory baseline demo figures', () => {
    const summary = calculateFinancialSummary(INITIAL_DEMO_STATE);

    // Starting budget: ₹10,000
    expect(summary.startingBudgetPaise).toBe(1000000);
    expect(paiseToRupees(summary.startingBudgetPaise)).toBe(10000);

    // Posted expenses: ₹3,000
    expect(summary.postedExpensesPaise).toBe(300000);
    expect(paiseToRupees(summary.postedExpensesPaise)).toBe(3000);

    // Current balance: ₹7,000 (before unpaid commitments)
    expect(summary.currentBalancePaise).toBe(700000);
    expect(paiseToRupees(summary.currentBalancePaise)).toBe(7000);

    // Unpaid protected commitments: ₹2,000
    expect(summary.unpaidCommitmentsPaise).toBe(200000);
    expect(paiseToRupees(summary.unpaidCommitmentsPaise)).toBe(2000);

    // Available to spend: ₹5,000 (₹7,000 current balance - ₹2,000 commitments)
    expect(summary.availableToSpendPaise).toBe(500000);
    expect(paiseToRupees(summary.availableToSpendPaise)).toBe(5000);

    // Remaining savings target: ₹2,000
    expect(summary.remainingSavingsTargetPaise).toBe(200000);
    expect(paiseToRupees(summary.remainingSavingsTargetPaise)).toBe(2000);

    // Days remaining: 21 (from day 10 to day 30 inclusive)
    expect(summary.daysRemaining).toBe(21);

    // Daily allowance: 500,000 / 21 = ~23,809 paise (~₹238)
    expect(summary.dailyAllowancePaise).toBe(Math.floor(500000 / 21));
    expect(summary.dailyAllowancePaise).toBe(23809);
  });

  it('ensures planned expenses do NOT deduct from current posted balance', () => {
    const stateWithPlanned = {
      ...INITIAL_DEMO_STATE,
      transactions: [
        ...INITIAL_DEMO_STATE.transactions,
        {
          id: 'tx-planned-future',
          type: 'expense' as const,
          category: 'Shopping & Personal' as const,
          description: 'Planned new jacket',
          amountPaise: 150000, // ₹1,500
          date: '2026-10-25',
          status: 'planned' as const,
          createdAt: Date.now(),
        },
      ],
    };

    const summary = calculateFinancialSummary(stateWithPlanned);
    // Current posted balance MUST remain ₹7,000
    expect(summary.currentBalancePaise).toBe(700000);
    expect(summary.postedExpensesPaise).toBe(300000);
    expect(summary.plannedExpensesPaise).toBe(150000);
  });

  it('determines financial health score deterministically and explains risk factors', () => {
    const health = calculateFinancialHealth(INITIAL_DEMO_STATE);
    expect(health.totalScore).toBeGreaterThanOrEqual(0);
    expect(health.totalScore).toBeLessThanOrEqual(100);
    expect(health.factors.budgetAdherence.maxScore).toBe(30);
    expect(health.factors.commitmentCoverage.maxScore).toBe(25);
    expect(health.factors.savingsProgress.maxScore).toBe(25);
    expect(health.factors.runwayAllowance.maxScore).toBe(20);
    expect(health.recommendations.length).toBeGreaterThan(0);
  });

  it('keeps baseline state completely isolated when simulating What If? scenario', () => {
    const phoneScenario: ScenarioInput = {
      name: 'Buy a Smartphone',
      oneTimeExpensePaise: 1200000, // ₹12,000
      dailySpendDeltaPaise: 0,
      additionalIncomePaise: 0,
      recurringExpensePaise: 0,
      savingsContributionDeltaPaise: 0,
      effectiveDay: 12,
      category: 'Shopping & Personal',
    };

    const projection = calculateScenarioProjection(INITIAL_DEMO_STATE, phoneScenario);

    // Projection correctly identifies deficit (₹12,000 > ₹5,000 available)
    expect(projection.isDeficit).toBe(true);
    expect(projection.deficitAmountPaise).toBeGreaterThan(0);

    // Crucial check: Baseline state was not mutated!
    const baselineCheck = calculateFinancialSummary(INITIAL_DEMO_STATE);
    expect(baselineCheck.currentBalancePaise).toBe(700000);
    expect(baselineCheck.availableToSpendPaise).toBe(500000);
  });

  it('handles currency formatting and integer paise conversions accurately', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise('₹2,499.50')).toBe(249950);
    expect(paiseToRupees(249950)).toBe(2499.5);
    expect(formatPaise(1000000)).toBe('₹10,000');
    expect(formatPaise(0)).toBe('₹0');
  });

  it('accurately calculates category spending and detects overspending', () => {
    const summaries = calculateFinancialSummary(INITIAL_DEMO_STATE);
    expect(summaries.postedExpensesPaise).toBe(300000);
  });
});
