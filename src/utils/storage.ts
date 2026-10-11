import { AppState } from '../types/finance';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';

const STORAGE_KEY = 'rupeewise_state_v1';

/**
 * Loads state from LocalStorage with version validation.
 * Falls back to INITIAL_DEMO_STATE safely if corrupted or missing.
 */
export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_STATE;

    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.version !== 1 ||
      !parsed.period ||
      !Array.isArray(parsed.transactions) ||
      !Array.isArray(parsed.commitments) ||
      !Array.isArray(parsed.categoryBudgets)
    ) {
      console.warn('RupeeWise: Corrupted or outdated state in LocalStorage. Restoring canonical demo baseline.');
      return INITIAL_DEMO_STATE;
    }

    return parsed as AppState;
  } catch (err) {
    console.error('RupeeWise: Error loading from LocalStorage, falling back to seed.', err);
    return INITIAL_DEMO_STATE;
  }
}

/**
 * Saves state to LocalStorage.
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('RupeeWise: Error saving to LocalStorage.', err);
  }
}

/**
 * Resets state to canonical demo dataset.
 */
export function resetDemoState(): AppState {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('RupeeWise: Error clearing LocalStorage.', err);
  }
  return INITIAL_DEMO_STATE;
}
