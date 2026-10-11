import { describe, it, expect } from 'vitest';
import {
  parseRupeeInput,
  formatPaise,
  paiseToRupees,
  rupeesToPaise,
  formatDeltaPaise,
} from './currency';
import {
  validateTransaction,
  validateCommitment,
  validateSavingsGoal,
  validateScenarioInput,
  isValidPaise,
} from './validation';
import { calculateFinancialSummary } from './financialEngine';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';
import { AppState, Transaction, ProtectedCommitment, SavingsGoal } from '../types/finance';

describe('RupeeWise Monetary Arithmetic & Boundary Precision', () => {
  it('converts between rupees and paise with exact integer precision without IEEE 754 drift', () => {
    // 0.1 + 0.2 floating problem does not happen with integer paise
    expect(rupeesToPaise(0.1) + rupeesToPaise(0.2)).toBe(30);
    expect(paiseToRupees(30)).toBe(0.3);

    expect(rupeesToPaise(12.34)).toBe(1234);
    expect(paiseToRupees(1234)).toBe(12.34);

    expect(rupeesToPaise(0)).toBe(0);
    expect(paiseToRupees(0)).toBe(0);
  });

  it('safely parses user string inputs into integer paise', () => {
    expect(parseRupeeInput('1500')).toBe(150000);
    expect(parseRupeeInput('12.50')).toBe(1250);
    expect(parseRupeeInput('₹2,500.75')).toBe(250075);
    expect(parseRupeeInput('   450   ')).toBe(45000);
    expect(parseRupeeInput('')).toBe(0);
    expect(parseRupeeInput('invalid-text')).toBe(0);
  });

  it('handles negative inputs when allowNegative is enabled', () => {
    expect(parseRupeeInput('-150', true)).toBe(-15000);
    expect(parseRupeeInput('-150', false)).toBe(0);
    expect(parseRupeeInput('+200', true)).toBe(20000);
  });

  it('formats paise into Indian Rupee locale strings', () => {
    expect(formatPaise(100000)).toBe('₹1,000');
    expect(formatPaise(50, true)).toBe('₹0.50');
    expect(formatPaise(0)).toBe('₹0');
    expect(formatPaise(-50000)).toBe('-₹500');

    expect(formatDeltaPaise(25000)).toBe('+₹250');
    expect(formatDeltaPaise(-25000)).toBe('-₹250');
    expect(formatDeltaPaise(0)).toBe('₹0');
  });

  it('enforces positive integer paise validation', () => {
    expect(isValidPaise(100)).toBe(true);
    expect(isValidPaise(0)).toBe(true);
    expect(isValidPaise(-1)).toBe(false);
    expect(isValidPaise(NaN)).toBe(false);
    expect(isValidPaise(Infinity)).toBe(false);
    expect(isValidPaise(12.5)).toBe(false); // must be integer paise
    expect(isValidPaise(10_000_000_000_000)).toBe(false); // exceeds upper limit
  });
});

describe('Input Validation Constraints', () => {
  it('validates transaction entities and rejects malformed values', () => {
    const validTx: Transaction = {
      id: 'tx-test-1',
      type: 'expense',
      category: 'Food & Dining',
      description: 'Chai and Samosa',
      amountPaise: 5000,
      date: '2026-10-11',
      status: 'posted',
      createdAt: Date.now(),
    };
    expect(validateTransaction(validTx).isValid).toBe(true);

    // Empty description
    expect(validateTransaction({ ...validTx, description: '' }).isValid).toBe(false);

    // Negative or zero amount
    expect(validateTransaction({ ...validTx, amountPaise: 0 }).isValid).toBe(false);
    expect(validateTransaction({ ...validTx, amountPaise: -500 }).isValid).toBe(false);

    // Invalid date
    expect(validateTransaction({ ...validTx, date: 'not-a-date' }).isValid).toBe(false);

    // Invalid category
    expect(validateTransaction({ ...validTx, category: 'InvalidCategory' as any }).isValid).toBe(false);
  });

  it('validates commitments and rejects invalid due days or empty titles', () => {
    const validComm: ProtectedCommitment = {
      id: 'comm-test-1',
      title: 'Electricity Bill',
      category: 'Utilities & Bills',
      amountPaise: 120000,
      dueDate: '2026-10-25',
      dueDay: 25,
      isPaid: false,
    };
    expect(validateCommitment(validComm).isValid).toBe(true);

    // Empty title
    expect(validateCommitment({ ...validComm, title: '   ' }).isValid).toBe(false);

    // Due day out of bounds
    expect(validateCommitment({ ...validComm, dueDay: 0 }).isValid).toBe(false);
    expect(validateCommitment({ ...validComm, dueDay: 32 }).isValid).toBe(false);
  });

  it('validates savings goals', () => {
    const validGoal: SavingsGoal = {
      id: 'goal-test-1',
      title: 'Emergency Reserve',
      category: 'Safety Net',
      targetPaise: 1000000,
      currentPaise: 250000,
      targetDate: '2026-12-31',
      createdAt: '2026-10-01',
    };
    expect(validateSavingsGoal(validGoal).isValid).toBe(true);

    // Target must be > 0
    expect(validateSavingsGoal({ ...validGoal, targetPaise: 0 }).isValid).toBe(false);

    // Current cannot exceed 10x target or be negative
    expect(validateSavingsGoal({ ...validGoal, currentPaise: -100 }).isValid).toBe(false);
  });

  it('validates scenario inputs across all scenario types', () => {
    const validScenario = {
      name: 'Weekend Trip',
      oneTimeExpensePaise: 250000,
      dailySpendDeltaPaise: -5000,
      additionalIncomePaise: 0,
      recurringExpensePaise: 0,
      savingsContributionDeltaPaise: 0,
      effectiveDay: 15,
    };
    expect(validateScenarioInput(validScenario).isValid).toBe(true);

    // Day out of range
    expect(validateScenarioInput({ ...validScenario, effectiveDay: 0 }).isValid).toBe(false);
    expect(validateScenarioInput({ ...validScenario, effectiveDay: 32 }).isValid).toBe(false);

    // Empty name
    expect(validateScenarioInput({ ...validScenario, name: ' ' }).isValid).toBe(false);
  });
});

describe('Deficit Transparency & Non-Clamping Integrity', () => {
  it('preserves true negative balance and displays deficit without masking or clamping', () => {
    // Construct an overspent state where expenses exceed starting budget
    const overspentState: AppState = {
      ...INITIAL_DEMO_STATE,
      transactions: [
        {
          id: 'tx-massive-expense',
          type: 'expense',
          category: 'Shopping & Personal',
          description: 'Emergency repair',
          amountPaise: 1500000, // ₹15,000 on a ₹10,000 budget
          date: '2026-10-10',
          status: 'posted',
          createdAt: Date.now(),
        },
      ],
      commitments: [
        {
          id: 'comm-rent',
          title: 'Hostel Rent',
          category: 'Rent & Housing',
          amountPaise: 400000, // ₹4,000
          dueDate: '2026-10-15',
          dueDay: 15,
          isPaid: false,
        },
      ],
    };

    const summary = calculateFinancialSummary(overspentState);

    // Current balance = ₹10,000 - ₹15,000 = -₹5,000 (-500,000 paise)
    expect(summary.currentBalancePaise).toBe(-500000);

    // Available to spend = -₹5,000 - ₹4,000 unpaid commitments = -₹9,000 (-900,000 paise)
    expect(summary.availableToSpendPaise).toBe(-900000);

    // Daily allowance is clamped to 0 because money is depleted, but deficit is explicitly reported
    expect(summary.dailyAllowancePaise).toBe(0);
    expect(summary.burnRateDeficitPaise).toBeGreaterThan(0);
  });
});
