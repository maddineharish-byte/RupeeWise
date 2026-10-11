import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import {
  AppState,
  ExpenseCategory,
  ProtectedCommitment,
  SavingsGoal,
  ScenarioInput,
  Transaction,
} from '../types/finance';
import { loadState, saveState, resetDemoState } from '../utils/storage';
import {
  validateTransaction,
  validateCommitment,
  validateSavingsGoal,
  validateScenarioInput,
} from '../utils/validation';

export type FinanceAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'EDIT_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'UPDATE_CATEGORY_BUDGET'; payload: { category: ExpenseCategory; allocatedPaise: number } }
  | { type: 'UPDATE_STARTING_BUDGET'; payload: { startingBudgetPaise: number } }
  | { type: 'ADD_COMMITMENT'; payload: ProtectedCommitment }
  | {
      type: 'TOGGLE_COMMITMENT_PAID';
      payload: {
        id: string;
        generatedTxId?: string;
        timestamp?: number;
        dateString?: string;
      };
    }
  | { type: 'DELETE_COMMITMENT'; payload: { id: string } }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: { id: string } }
  | {
      type: 'CONTRIBUTE_TO_GOAL';
      payload: {
        goalId: string;
        amountPaise: number;
        generatedTxId?: string;
        timestamp?: number;
        dateString?: string;
      };
    }
  | { type: 'SET_ACTIVE_SCENARIO'; payload: ScenarioInput | null }
  | {
      type: 'APPLY_SCENARIO';
      payload: {
        scenario: ScenarioInput;
        operationId: string;
        timestamp: number;
        dateString: string;
      };
    }
  | { type: 'DISCARD_SCENARIO' }
  | { type: 'RESET_DEMO_DATA' };

/**
 * Pure, deterministic finance reducer.
 * All nondeterministic inputs (timestamps, random IDs) are passed via action payloads.
 */
export function financeReducer(state: AppState, action: FinanceAction): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      const validation = validateTransaction(action.payload);
      if (!validation.isValid) {
        console.warn('Rejected invalid transaction:', validation.error);
        return state;
      }
      // Prevent duplicate transaction ID
      if (state.transactions.some((t) => t.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    }

    case 'EDIT_TRANSACTION': {
      const validation = validateTransaction(action.payload);
      if (!validation.isValid) {
        console.warn('Rejected invalid transaction edit:', validation.error);
        return state;
      }
      // If the edited transaction pays a commitment, sync commitment amount
      let updatedCommitments = state.commitments;
      if (action.payload.commitmentId) {
        updatedCommitments = state.commitments.map((c) =>
          c.id === action.payload.commitmentId
            ? { ...c, amountPaise: action.payload.amountPaise }
            : c
        );
      }

      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
        commitments: updatedCommitments,
      };
    }

    case 'DELETE_TRANSACTION': {
      const txToDelete = state.transactions.find((t) => t.id === action.payload.id);
      if (!txToDelete) return state;

      // Consistent reversal: if deleting a transaction that paid a commitment,
      // revert the commitment to unpaid so accounting remains consistent
      let updatedCommitments = state.commitments;
      if (txToDelete.commitmentId) {
        updatedCommitments = state.commitments.map((c) =>
          c.id === txToDelete.commitmentId
            ? { ...c, isPaid: false, paidTransactionId: undefined }
            : c
        );
      } else {
        // Fallback for commitments linked by paidTransactionId
        updatedCommitments = state.commitments.map((c) =>
          c.paidTransactionId === txToDelete.id
            ? { ...c, isPaid: false, paidTransactionId: undefined }
            : c
        );
      }

      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload.id),
        commitments: updatedCommitments,
      };
    }

    case 'UPDATE_CATEGORY_BUDGET': {
      const exists = state.categoryBudgets.some((b) => b.category === action.payload.category);
      let updatedBudgets;
      if (exists) {
        updatedBudgets = state.categoryBudgets.map((b) =>
          b.category === action.payload.category
            ? { ...b, allocatedPaise: Math.max(0, Math.round(action.payload.allocatedPaise)) }
            : b
        );
      } else {
        updatedBudgets = [
          ...state.categoryBudgets,
          {
            category: action.payload.category,
            allocatedPaise: Math.max(0, Math.round(action.payload.allocatedPaise)),
          },
        ];
      }
      return {
        ...state,
        categoryBudgets: updatedBudgets,
      };
    }

    case 'UPDATE_STARTING_BUDGET': {
      return {
        ...state,
        period: {
          ...state.period,
          startingBudgetPaise: Math.max(0, Math.round(action.payload.startingBudgetPaise)),
        },
      };
    }

    case 'ADD_COMMITMENT': {
      const validation = validateCommitment(action.payload);
      if (!validation.isValid) {
        console.warn('Rejected invalid commitment:', validation.error);
        return state;
      }
      if (state.commitments.some((c) => c.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        commitments: [...state.commitments, action.payload],
      };
    }

    case 'TOGGLE_COMMITMENT_PAID': {
      const comm = state.commitments.find((c) => c.id === action.payload.id);
      if (!comm) return state;

      const willBePaid = !comm.isPaid;
      let updatedTransactions = [...state.transactions];
      let updatedPaidTxId = comm.paidTransactionId;

      if (willBePaid) {
        // If not already paid, create exactly one posted transaction with deterministic ID
        const targetTxId =
          action.payload.generatedTxId || `comm-tx-${comm.id}`;

        // Check if transaction with this ID or linking to this commitment already exists
        const existingTx = updatedTransactions.find(
          (t) => t.id === targetTxId || t.commitmentId === comm.id
        );

        if (!existingTx) {
          const txDate =
            action.payload.dateString ||
            new Date().toISOString().split('T')[0];
          const txCreatedAt = action.payload.timestamp || Date.now();

          const newPaymentTx: Transaction = {
            id: targetTxId,
            type: 'expense',
            category: comm.category,
            description: `[Bill Payment] ${comm.title}`,
            amountPaise: comm.amountPaise,
            date: txDate,
            status: 'posted',
            createdAt: txCreatedAt,
            commitmentId: comm.id,
          };
          updatedTransactions.unshift(newPaymentTx);
          updatedPaidTxId = targetTxId;
        } else {
          updatedPaidTxId = existingTx.id;
        }
      } else {
        // Reversing payment: remove linked payment transaction so cash is returned
        if (comm.paidTransactionId) {
          updatedTransactions = updatedTransactions.filter(
            (t) => t.id !== comm.paidTransactionId && t.commitmentId !== comm.id
          );
        } else {
          updatedTransactions = updatedTransactions.filter(
            (t) => t.commitmentId !== comm.id
          );
        }
        updatedPaidTxId = undefined;
      }

      return {
        ...state,
        transactions: updatedTransactions,
        commitments: state.commitments.map((c) =>
          c.id === action.payload.id
            ? { ...c, isPaid: willBePaid, paidTransactionId: updatedPaidTxId }
            : c
        ),
      };
    }

    case 'DELETE_COMMITMENT': {
      const commToDelete = state.commitments.find((c) => c.id === action.payload.id);
      if (!commToDelete) return state;

      // If commitment was paid, clean up any link on the transaction or remove orphaned link
      const updatedTransactions = state.transactions.map((t) =>
        t.commitmentId === action.payload.id ? { ...t, commitmentId: undefined } : t
      );

      return {
        ...state,
        transactions: updatedTransactions,
        commitments: state.commitments.filter((c) => c.id !== action.payload.id),
      };
    }

    case 'ADD_SAVINGS_GOAL': {
      const validation = validateSavingsGoal(action.payload);
      if (!validation.isValid) {
        console.warn('Rejected invalid savings goal:', validation.error);
        return state;
      }
      if (state.savingsGoals.some((g) => g.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        savingsGoals: [...state.savingsGoals, action.payload],
      };
    }

    case 'UPDATE_SAVINGS_GOAL': {
      const validation = validateSavingsGoal(action.payload);
      if (!validation.isValid) {
        console.warn('Rejected invalid savings goal update:', validation.error);
        return state;
      }
      return {
        ...state,
        savingsGoals: state.savingsGoals.map((g) =>
          g.id === action.payload.id ? action.payload : g
        ),
      };
    }

    case 'DELETE_SAVINGS_GOAL': {
      return {
        ...state,
        savingsGoals: state.savingsGoals.filter((g) => g.id !== action.payload.id),
      };
    }

    case 'CONTRIBUTE_TO_GOAL': {
      const { goalId, amountPaise, generatedTxId, timestamp, dateString } = action.payload;
      if (amountPaise <= 0) return state;

      const goal = state.savingsGoals.find((g) => g.id === goalId);
      if (!goal) return state;

      const updatedGoals = state.savingsGoals.map((g) =>
        g.id === goalId ? { ...g, currentPaise: g.currentPaise + amountPaise } : g
      );

      const txId = generatedTxId || `goal-contrib-${goalId}-${timestamp || Date.now()}`;
      const txDate = dateString || new Date().toISOString().split('T')[0];
      const txTime = timestamp || Date.now();

      // Deduct from cash balance via a posted transfer expense
      const savingsTx: Transaction = {
        id: txId,
        type: 'expense',
        category: 'Savings & Investments',
        description: `Deposit to ${goal.title}`,
        amountPaise,
        date: txDate,
        status: 'posted',
        createdAt: txTime,
      };

      return {
        ...state,
        transactions: [savingsTx, ...state.transactions],
        savingsGoals: updatedGoals,
      };
    }

    case 'SET_ACTIVE_SCENARIO': {
      return {
        ...state,
        activeScenario: action.payload,
      };
    }

    case 'APPLY_SCENARIO': {
      const { scenario, operationId, timestamp, dateString } = action.payload;

      // Strict Idempotency Check: if this operation ID has already been applied, return unchanged state
      const isAlreadyApplied =
        state.appliedScenarioHistory.some((h) => h.id === operationId) ||
        state.transactions.some((t) => t.scenarioOperationId === operationId);

      if (isAlreadyApplied) {
        console.warn(`Scenario operation ${operationId} already applied. Skipping duplicate.`);
        return state;
      }

      const validation = validateScenarioInput(scenario);
      if (!validation.isValid) {
        console.warn('Rejected invalid scenario application:', validation.error);
        return state;
      }

      const newTransactions: Transaction[] = [];

      // 1. One-time expense transaction (scheduled at effective day if future, or posted today)
      if (scenario.oneTimeExpensePaise > 0) {
        const isFuture = scenario.effectiveDay > state.period.currentDay;
        newTransactions.push({
          id: `applied-expense-${operationId}`,
          type: 'expense',
          category: scenario.category || 'Shopping & Personal',
          description: `[Scenario] ${scenario.name}`,
          amountPaise: scenario.oneTimeExpensePaise,
          date: dateString,
          status: isFuture ? 'planned' : 'posted',
          createdAt: timestamp,
          scenarioOperationId: operationId,
        });
      }

      // 2. Additional income transaction
      if (scenario.additionalIncomePaise > 0) {
        newTransactions.push({
          id: `applied-income-${operationId}`,
          type: 'income',
          category: 'Other',
          description: `[Scenario] ${scenario.name} - Income`,
          amountPaise: scenario.additionalIncomePaise,
          date: dateString,
          status: 'posted',
          createdAt: timestamp + 1,
          scenarioOperationId: operationId,
        });
      }

      // 3. Recurring commitment
      let updatedCommitments = [...state.commitments];
      if (scenario.recurringExpensePaise > 0) {
        updatedCommitments.push({
          id: `applied-comm-${operationId}`,
          title: `[Scenario] ${scenario.name} recurring`,
          category: scenario.category || 'Utilities & Bills',
          amountPaise: scenario.recurringExpensePaise,
          dueDate: dateString,
          dueDay: Math.min(28, state.period.currentDay + 5),
          isPaid: false,
          notes: 'Applied from What If? simulator',
        });
      }

      // 4. Savings contribution adjustment: apply to primary savings goal
      let updatedGoals = state.savingsGoals;
      if (scenario.savingsContributionDeltaPaise !== 0 && state.savingsGoals.length > 0) {
        const primaryGoal = state.savingsGoals[0];
        const newCurrent = Math.max(
          0,
          primaryGoal.currentPaise + scenario.savingsContributionDeltaPaise
        );
        updatedGoals = state.savingsGoals.map((g, idx) =>
          idx === 0 ? { ...g, currentPaise: newCurrent } : g
        );

        if (scenario.savingsContributionDeltaPaise > 0) {
          newTransactions.push({
            id: `applied-savings-${operationId}`,
            type: 'expense',
            category: 'Savings & Investments',
            description: `[Scenario] Deposit to ${primaryGoal.title}`,
            amountPaise: scenario.savingsContributionDeltaPaise,
            date: dateString,
            status: 'posted',
            createdAt: timestamp + 2,
            scenarioOperationId: operationId,
          });
        }
      }

      const summaryNote = `${scenario.name} committed: ${
        scenario.oneTimeExpensePaise > 0
          ? `Expense ₹${Math.round(scenario.oneTimeExpensePaise / 100)}`
          : ''
      }${
        scenario.additionalIncomePaise > 0
          ? ` Income +₹${Math.round(scenario.additionalIncomePaise / 100)}`
          : ''
      }${
        scenario.dailySpendDeltaPaise !== 0
          ? ` Daily shift ${scenario.dailySpendDeltaPaise > 0 ? '+' : ''}₹${Math.round(
              scenario.dailySpendDeltaPaise / 100
            )}/d`
          : ''
      }`;

      return {
        ...state,
        transactions: [...newTransactions, ...state.transactions],
        commitments: updatedCommitments,
        savingsGoals: updatedGoals,
        activeScenario: null, // Clear active uncommitted scenario
        appliedScenarioHistory: [
          {
            id: operationId,
            name: scenario.name,
            appliedAt: timestamp,
            summary: summaryNote,
          },
          ...state.appliedScenarioHistory,
        ],
      };
    }

    case 'DISCARD_SCENARIO': {
      return {
        ...state,
        activeScenario: null,
      };
    }

    case 'RESET_DEMO_DATA': {
      const resetState = resetDemoState();
      return resetState;
    }

    default:
      return state;
  }
}

interface FinanceContextType {
  state: AppState;
  dispatch: React.Dispatch<FinanceAction>;
  resetToDemo: () => void;
  applyScenarioWithIdempotency: (scenario: ScenarioInput) => string;
  toggleCommitmentPaid: (commitmentId: string) => void;
  contributeToGoal: (goalId: string, amountPaise: number) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(financeReducer, undefined, loadState);

  // Sync to LocalStorage on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const resetToDemo = () => {
    dispatch({ type: 'RESET_DEMO_DATA' });
  };

  /**
   * Helper that generates stable operation ID outside the reducer
   */
  const applyScenarioWithIdempotency = (scenario: ScenarioInput): string => {
    const timestamp = Date.now();
    const opId = `op-${scenario.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}`;
    const today = new Date().toISOString().split('T')[0];

    dispatch({
      type: 'APPLY_SCENARIO',
      payload: {
        scenario,
        operationId: opId,
        timestamp,
        dateString: today,
      },
    });
    return opId;
  };

  /**
   * Deterministic commitment toggle helper
   */
  const toggleCommitmentPaid = (commitmentId: string) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    dispatch({
      type: 'TOGGLE_COMMITMENT_PAID',
      payload: {
        id: commitmentId,
        generatedTxId: `comm-tx-${commitmentId}`,
        timestamp: now,
        dateString: today,
      },
    });
  };

  /**
   * Deterministic goal deposit helper
   */
  const contributeToGoal = (goalId: string, amountPaise: number) => {
    const now = Date.now();
    const today = new Date().toISOString().split('T')[0];
    dispatch({
      type: 'CONTRIBUTE_TO_GOAL',
      payload: {
        goalId,
        amountPaise,
        generatedTxId: `goal-contrib-${goalId}-${now}`,
        timestamp: now,
        dateString: today,
      },
    });
  };

  return (
    <FinanceContext.Provider
      value={{
        state,
        dispatch,
        resetToDemo,
        applyScenarioWithIdempotency,
        toggleCommitmentPaid,
        contributeToGoal,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
}
