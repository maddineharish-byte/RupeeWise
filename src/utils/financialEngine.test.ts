import { describe, it, expect } from 'vitest';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';
import {
  calculateFinancialSummary,
  calculateFinancialHealth,
  calculateScenarioProjection,
} from './financialEngine';
import { formatPaise, paiseToRupees, rupeesToPaise } from './currency';
import { ScenarioInput, AppState } from '../types/finance';
import { financeReducer } from '../context/FinanceContext';

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
    const stateWithPlanned: AppState = {
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

  it('preserves true negative deficits in projection without masking them', () => {
    const heavyExpense: ScenarioInput = {
      name: 'Luxury Purchase',
      oneTimeExpensePaise: 1500000, // ₹15,000
      dailySpendDeltaPaise: 0,
      additionalIncomePaise: 0,
      recurringExpensePaise: 0,
      savingsContributionDeltaPaise: 0,
      effectiveDay: 10,
      category: 'Shopping & Personal',
    };
    const proj = calculateScenarioProjection(INITIAL_DEMO_STATE, heavyExpense);
    expect(proj.isDeficit).toBe(true);
    expect(proj.scenarioEndBalancePaise).toBeLessThan(0);
    // Trajectory at effectiveDay must report actual negative balance
    const trajectoryDay10 = proj.dailyTrajectory.find((t) => t.day === 10);
    expect(trajectoryDay10?.scenarioPaise).toBeLessThan(0);
  });
});

describe('RupeeWise Canonical Accounting & Idempotency Rules', () => {
  it('enforces single deduction lifecycle for paying and reversing commitments', () => {
    const initialSummary = calculateFinancialSummary(INITIAL_DEMO_STATE);
    expect(initialSummary.availableToSpendPaise).toBe(500000);
    expect(initialSummary.unpaidCommitmentsPaise).toBe(200000);

    // Step 1: Pay comm-1 (₹800 = 80,000 paise)
    const paidState = financeReducer(INITIAL_DEMO_STATE, {
      type: 'TOGGLE_COMMITMENT_PAID',
      payload: {
        id: 'comm-1',
        generatedTxId: 'comm-tx-comm-1',
        timestamp: 1728518400000,
        dateString: '2026-10-10',
      },
    });

    const paidSummary = calculateFinancialSummary(paidState);
    // Current balance decreases by ₹800 (from ₹7,000 to ₹6,200)
    expect(paidSummary.currentBalancePaise).toBe(620000);
    // Unpaid commitments drops to ₹1,200
    expect(paidSummary.unpaidCommitmentsPaise).toBe(120000);
    // Available to spend remains exactly ₹5,000! (no double-counting)
    expect(paidSummary.availableToSpendPaise).toBe(500000);

    // Commitment is linked to posted transaction
    const comm1 = paidState.commitments.find((c) => c.id === 'comm-1');
    expect(comm1?.isPaid).toBe(true);
    expect(comm1?.paidTransactionId).toBe('comm-tx-comm-1');

    // Step 2: Idempotent toggle - cannot duplicate payment transactions
    const doublePayState = financeReducer(paidState, {
      type: 'TOGGLE_COMMITMENT_PAID',
      payload: {
        id: 'comm-1',
        generatedTxId: 'comm-tx-comm-1',
      },
    });
    // Comm-1 was toggled off (reversed), so payment transaction is cleanly removed
    expect(doublePayState.transactions.some((t) => t.id === 'comm-tx-comm-1')).toBe(false);
    const reversedSummary = calculateFinancialSummary(doublePayState);
    expect(reversedSummary.currentBalancePaise).toBe(700000);
    expect(reversedSummary.unpaidCommitmentsPaise).toBe(200000);
    expect(reversedSummary.availableToSpendPaise).toBe(500000);
  });

  it('reverts commitment to unpaid if payment transaction is deleted', () => {
    // Pay comm-1
    const paidState = financeReducer(INITIAL_DEMO_STATE, {
      type: 'TOGGLE_COMMITMENT_PAID',
      payload: {
        id: 'comm-1',
        generatedTxId: 'comm-tx-comm-1',
        timestamp: 1728518400000,
        dateString: '2026-10-10',
      },
    });

    // Delete the payment transaction
    const deletedState = financeReducer(paidState, {
      type: 'DELETE_TRANSACTION',
      payload: { id: 'comm-tx-comm-1' },
    });

    const comm1 = deletedState.commitments.find((c) => c.id === 'comm-1');
    // Commitment must cleanly revert to unpaid
    expect(comm1?.isPaid).toBe(false);
    expect(comm1?.paidTransactionId).toBeUndefined();

    const summary = calculateFinancialSummary(deletedState);
    expect(summary.currentBalancePaise).toBe(700000);
    expect(summary.unpaidCommitmentsPaise).toBe(200000);
  });

  it('guarantees idempotency when applying scenarios with operation ID', () => {
    const freelanceScenario: ScenarioInput = {
      name: 'Freelance Project',
      oneTimeExpensePaise: 0,
      dailySpendDeltaPaise: 0,
      additionalIncomePaise: 600000, // ₹6,000
      recurringExpensePaise: 0,
      savingsContributionDeltaPaise: 0,
      effectiveDay: 10,
      category: 'Other',
    };

    const action = {
      type: 'APPLY_SCENARIO' as const,
      payload: {
        scenario: freelanceScenario,
        operationId: 'op-freelance-test-123',
        timestamp: 1728518400000,
        dateString: '2026-10-10',
      },
    };

    // Apply once
    const state1 = financeReducer(INITIAL_DEMO_STATE, action);
    expect(state1.transactions.length).toBe(INITIAL_DEMO_STATE.transactions.length + 1);
    expect(state1.appliedScenarioHistory.length).toBe(1);

    // Apply again with identical operation ID
    const state2 = financeReducer(state1, action);
    // MUST NOT create duplicate income transaction or history item
    expect(state2.transactions.length).toBe(state1.transactions.length);
    expect(state2.appliedScenarioHistory.length).toBe(1);
    expect(state2).toEqual(state1);
  });
});
