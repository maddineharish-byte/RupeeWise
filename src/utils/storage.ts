import { AppState, Transaction, ProtectedCommitment, CategoryBudget, SavingsGoal } from '../types/finance';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';
import { validateTransaction, validateCommitment, validateSavingsGoal, isValidPaise } from './validation';

const STORAGE_KEY = 'rupeewise_state_v1';

/**
 * Validates deep schema integrity and monetary bounds for an AppState object.
 */
function sanitizeLoadedState(raw: any): AppState | null {
  if (!raw || typeof raw !== 'object') return null;

  // Check version
  if (typeof raw.version !== 'number' || raw.version < 1) return null;

  // Validate BudgetPeriod
  const period = raw.period;
  if (
    !period ||
    typeof period !== 'object' ||
    typeof period.startDate !== 'string' ||
    typeof period.endDate !== 'string' ||
    typeof period.totalDays !== 'number' ||
    period.totalDays <= 0 ||
    typeof period.currentDay !== 'number' ||
    period.currentDay < 1 ||
    !isValidPaise(period.startingBudgetPaise, true, false)
  ) {
    return null;
  }

  // Validate transactions
  if (!Array.isArray(raw.transactions)) return null;
  const validTransactions: Transaction[] = [];
  for (const t of raw.transactions) {
    const val = validateTransaction(t);
    if (val.isValid) {
      validTransactions.push(t as Transaction);
    }
  }

  // Validate commitments
  if (!Array.isArray(raw.commitments)) return null;
  const validCommitments: ProtectedCommitment[] = [];
  for (const c of raw.commitments) {
    const val = validateCommitment(c);
    if (val.isValid) {
      validCommitments.push(c as ProtectedCommitment);
    }
  }

  // Validate categoryBudgets
  if (!Array.isArray(raw.categoryBudgets)) return null;
  const validBudgets: CategoryBudget[] = [];
  for (const b of raw.categoryBudgets) {
    if (b && typeof b.category === 'string' && isValidPaise(b.allocatedPaise, true, false)) {
      validBudgets.push({
        category: b.category,
        allocatedPaise: b.allocatedPaise,
        iconName: b.iconName,
      });
    }
  }

  // Validate savingsGoals
  const validGoals: SavingsGoal[] = [];
  if (Array.isArray(raw.savingsGoals)) {
    for (const g of raw.savingsGoals) {
      const val = validateSavingsGoal(g);
      if (val.isValid) {
        validGoals.push(g as SavingsGoal);
      }
    }
  }

  // User profile
  const userProfile = {
    name: typeof raw.userProfile?.name === 'string' ? raw.userProfile.name : INITIAL_DEMO_STATE.userProfile.name,
    monthlyIncomePaise: isValidPaise(raw.userProfile?.monthlyIncomePaise, true, false)
      ? raw.userProfile.monthlyIncomePaise
      : INITIAL_DEMO_STATE.userProfile.monthlyIncomePaise,
  };

  // Applied scenarios
  const appliedScenarioHistory = Array.isArray(raw.appliedScenarioHistory)
    ? raw.appliedScenarioHistory.filter((h: any) => h && typeof h.id === 'string' && typeof h.name === 'string')
    : [];

  return {
    version: 1,
    period: {
      startDate: period.startDate,
      endDate: period.endDate,
      totalDays: period.totalDays,
      currentDay: Math.min(period.totalDays, Math.max(1, period.currentDay)),
      startingBudgetPaise: period.startingBudgetPaise,
    },
    userProfile,
    categoryBudgets: validBudgets.length > 0 ? validBudgets : INITIAL_DEMO_STATE.categoryBudgets,
    transactions: validTransactions,
    commitments: validCommitments,
    savingsGoals: validGoals,
    activeScenario: null, // Temporary scenarios are uncommitted and deliberately NOT restored from storage
    appliedScenarioHistory,
  };
}

/**
 * Loads state from LocalStorage with version validation, defensive parsing,
 * and graceful fallback to canonical demo baseline.
 */
export function loadState(): AppState {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return INITIAL_DEMO_STATE;
    }

    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_STATE;

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.warn('RupeeWise: Corrupted JSON in LocalStorage. Restoring canonical demo baseline.');
      return INITIAL_DEMO_STATE;
    }

    const sanitized = sanitizeLoadedState(parsed);
    if (!sanitized) {
      console.warn('RupeeWise: Schema or validation failure in stored state. Restoring demo baseline.');
      return INITIAL_DEMO_STATE;
    }

    return sanitized;
  } catch (err) {
    console.error('RupeeWise: Storage read error, falling back to seed.', err);
    return INITIAL_DEMO_STATE;
  }
}

/**
 * Saves state to LocalStorage with quota and availability handling.
 * Uncommitted activeScenario is omitted from persistent storage.
 */
export function saveState(state: AppState): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;

    // Do not persist uncommitted temporary scenario
    const toSave: AppState = {
      ...state,
      activeScenario: null,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (err: any) {
    // QuotaExceededError handling
    if (err.name === 'QuotaExceededError' || err.code === 22) {
      console.warn('RupeeWise: LocalStorage quota exceeded. Trimming scenario history.');
      try {
        const trimmed: AppState = {
          ...state,
          activeScenario: null,
          appliedScenarioHistory: state.appliedScenarioHistory.slice(0, 5),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      } catch (innerErr) {
        console.error('RupeeWise: LocalStorage failed after trim.', innerErr);
      }
    } else {
      console.error('RupeeWise: Error saving to LocalStorage.', err);
    }
  }
}

/**
 * Resets state to canonical demo dataset.
 */
export function resetDemoState(): AppState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (err) {
    console.error('RupeeWise: Error clearing LocalStorage.', err);
  }
  return INITIAL_DEMO_STATE;
}
