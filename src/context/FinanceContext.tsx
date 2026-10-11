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
import { INITIAL_DEMO_STATE } from '../data/initialSeed';

export type FinanceAction =
  | { type: 'ADD_TRANSACTION'; payload: Transaction }
  | { type: 'EDIT_TRANSACTION'; payload: Transaction }
  | { type: 'DELETE_TRANSACTION'; payload: { id: string } }
  | { type: 'UPDATE_CATEGORY_BUDGET'; payload: { category: ExpenseCategory; allocatedPaise: number } }
  | { type: 'UPDATE_STARTING_BUDGET'; payload: { startingBudgetPaise: number } }
  | { type: 'ADD_COMMITMENT'; payload: ProtectedCommitment }
  | { type: 'TOGGLE_COMMITMENT_PAID'; payload: { id: string } }
  | { type: 'DELETE_COMMITMENT'; payload: { id: string } }
  | { type: 'ADD_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'UPDATE_SAVINGS_GOAL'; payload: SavingsGoal }
  | { type: 'DELETE_SAVINGS_GOAL'; payload: { id: string } }
  | { type: 'CONTRIBUTE_TO_GOAL'; payload: { goalId: string; amountPaise: number } }
  | { type: 'SET_ACTIVE_SCENARIO'; payload: ScenarioInput | null }
  | { type: 'APPLY_SCENARIO'; payload: ScenarioInput }
  | { type: 'DISCARD_SCENARIO' }
  | { type: 'RESET_DEMO_DATA' };

function financeReducer(state: AppState, action: FinanceAction): AppState {
  switch (action.type) {
    case 'ADD_TRANSACTION': {
      // Prevent duplicate transaction id
      if (state.transactions.some((t) => t.id === action.payload.id)) {
        return state;
      }
      return {
        ...state,
        transactions: [action.payload, ...state.transactions],
      };
    }

    case 'EDIT_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.map((t) =>
          t.id === action.payload.id ? action.payload : t
        ),
      };
    }

    case 'DELETE_TRANSACTION': {
      return {
        ...state,
        transactions: state.transactions.filter((t) => t.id !== action.payload.id),
      };
    }

    case 'UPDATE_CATEGORY_BUDGET': {
      const exists = state.categoryBudgets.some((b) => b.category === action.payload.category);
      let updatedBudgets;
      if (exists) {
        updatedBudgets = state.categoryBudgets.map((b) =>
          b.category === action.payload.category
            ? { ...b, allocatedPaise: Math.max(0, action.payload.allocatedPaise) }
            : b
        );
      } else {
        updatedBudgets = [
          ...state.categoryBudgets,
          { category: action.payload.category, allocatedPaise: Math.max(0, action.payload.allocatedPaise) },
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
          startingBudgetPaise: Math.max(0, action.payload.startingBudgetPaise),
        },
      };
    }

    case 'ADD_COMMITMENT': {
      return {
        ...state,
        commitments: [...state.commitments, action.payload],
      };
    }

    case 'TOGGLE_COMMITMENT_PAID': {
      const comm = state.commitments.find((c) => c.id === action.payload.id);
      if (!comm) return state;

      const willBePaid = !comm.isPaid;
      // When a commitment is paid, convert it to a posted transaction if not already posted
      let updatedTransactions = [...state.transactions];
      if (willBePaid) {
        const alreadyHasTx = updatedTransactions.some(
          (t) => t.description === `[Commitment] ${comm.title}`
        );
        if (!alreadyHasTx) {
          updatedTransactions.unshift({
            id: `comm-tx-${comm.id}-${Date.now()}`,
            type: 'expense',
            category: comm.category,
            description: `[Commitment] ${comm.title}`,
            amountPaise: comm.amountPaise,
            date: new Date().toISOString().split('T')[0],
            status: 'posted',
            createdAt: Date.now(),
          });
        }
      }

      return {
        ...state,
        transactions: updatedTransactions,
        commitments: state.commitments.map((c) =>
          c.id === action.payload.id ? { ...c, isPaid: willBePaid } : c
        ),
      };
    }

    case 'DELETE_COMMITMENT': {
      return {
        ...state,
        commitments: state.commitments.filter((c) => c.id !== action.payload.id),
      };
    }

    case 'ADD_SAVINGS_GOAL': {
      return {
        ...state,
        savingsGoals: [...state.savingsGoals, action.payload],
      };
    }

    case 'UPDATE_SAVINGS_GOAL': {
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
      const { goalId, amountPaise } = action.payload;
      if (amountPaise <= 0) return state;

      const goal = state.savingsGoals.find((g) => g.id === goalId);
      if (!goal) return state;

      const updatedGoals = state.savingsGoals.map((g) =>
        g.id === goalId ? { ...g, currentPaise: g.currentPaise + amountPaise } : g
      );

      // Add corresponding transaction so cash balance correctly accounts for savings deposit
      const savingsTx: Transaction = {
        id: `goal-contrib-${Date.now()}`,
        type: 'expense',
        category: 'Savings & Investments',
        description: `Deposit to ${goal.title}`,
        amountPaise,
        date: new Date().toISOString().split('T')[0],
        status: 'posted',
        createdAt: Date.now(),
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
      const scenario = action.payload;
      const now = Date.now();
      const today = new Date().toISOString().split('T')[0];
      const newTransactions: Transaction[] = [];

      // 1. One-time expense transaction
      if (scenario.oneTimeExpensePaise > 0) {
        newTransactions.push({
          id: `applied-sc-expense-${now}`,
          type: 'expense',
          category: scenario.category || 'Shopping & Personal',
          description: `[Scenario] ${scenario.name}`,
          amountPaise: scenario.oneTimeExpensePaise,
          date: today,
          status: 'posted',
          createdAt: now,
        });
      }

      // 2. Additional income transaction
      if (scenario.additionalIncomePaise > 0) {
        newTransactions.push({
          id: `applied-sc-income-${now}`,
          type: 'income',
          category: 'Other',
          description: `[Scenario] ${scenario.name} - Income`,
          amountPaise: scenario.additionalIncomePaise,
          date: today,
          status: 'posted',
          createdAt: now + 1,
        });
      }

      // 3. Recurring commitment
      let updatedCommitments = [...state.commitments];
      if (scenario.recurringExpensePaise > 0) {
        updatedCommitments.push({
          id: `applied-comm-${now}`,
          title: `[Scenario] ${scenario.name} recurring`,
          category: scenario.category || 'Utilities & Bills',
          amountPaise: scenario.recurringExpensePaise,
          dueDate: today,
          dueDay: Math.min(28, state.period.currentDay + 5),
          isPaid: false,
          notes: 'Applied from What If? simulator',
        });
      }

      const summaryNote = `${scenario.name} committed: ${
        scenario.oneTimeExpensePaise > 0 ? `Expense ₹${Math.round(scenario.oneTimeExpensePaise / 100)}` : ''
      }${scenario.additionalIncomePaise > 0 ? ` Income +₹${Math.round(scenario.additionalIncomePaise / 100)}` : ''}`;

      return {
        ...state,
        transactions: [...newTransactions, ...state.transactions],
        commitments: updatedCommitments,
        activeScenario: null, // Clear active uncommitted scenario
        appliedScenarioHistory: [
          {
            id: `sc-hist-${now}`,
            name: scenario.name,
            appliedAt: now,
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

  return (
    <FinanceContext.Provider value={{ state, dispatch, resetToDemo }}>
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
