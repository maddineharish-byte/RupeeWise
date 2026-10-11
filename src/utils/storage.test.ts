import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadState, saveState, resetDemoState } from './storage';
import { INITIAL_DEMO_STATE } from '../data/initialSeed';
import { AppState } from '../types/finance';

// Mock localStorage for Node test runner environment
const mockStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('RupeeWise Storage Adapter & Schema Validation', () => {
  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('localStorage', mockStorage);
    vi.stubGlobal('window', { localStorage: mockStorage });
  });

  it('falls back safely to initial demo state when storage is empty', () => {
    const loaded = loadState();
    expect(loaded.period.startingBudgetPaise).toBe(1000000);
    expect(loaded.transactions.length).toBe(INITIAL_DEMO_STATE.transactions.length);
  });

  it('recovers safely from malformed JSON without throwing', () => {
    mockStorage.setItem('rupeewise_state_v1', '{"invalid_json": true, bad syntax');
    const loaded = loadState();
    expect(loaded).toBeDefined();
    expect(loaded.period.startingBudgetPaise).toBe(1000000);
    expect(loaded.transactions.length).toBe(INITIAL_DEMO_STATE.transactions.length);
  });

  it('rejects corrupted schema versions or invalid monetary values', () => {
    const corrupted = {
      version: 999, // Unrecognized future version
      period: { startingBudgetPaise: 'not-a-number' },
      transactions: 'not-an-array',
    };
    mockStorage.setItem('rupeewise_state_v1', JSON.stringify(corrupted));
    const loaded = loadState();
    expect(loaded.period.startingBudgetPaise).toBe(1000000);
  });

  it('persists valid state and omits transient activeScenario from persistence', () => {
    const stateToSave: AppState = {
      ...INITIAL_DEMO_STATE,
      activeScenario: {
        name: 'Temporary Uncommitted Test',
        oneTimeExpensePaise: 50000,
        dailySpendDeltaPaise: 0,
        additionalIncomePaise: 0,
        recurringExpensePaise: 0,
        savingsContributionDeltaPaise: 0,
        effectiveDay: 12,
        category: 'Shopping & Personal',
      },
    };

    saveState(stateToSave);

    const reloaded = loadState();
    expect(reloaded.period.startingBudgetPaise).toBe(1000000);
    // Transient scenario must NOT be persisted
    expect(reloaded.activeScenario).toBeNull();
  });

  it('resets state cleanly to canonical baseline with resetDemoState', () => {
    mockStorage.setItem('rupeewise_state_v1', JSON.stringify({ version: 1, transactions: [] }));
    const reset = resetDemoState();
    expect(reset.transactions.length).toBe(INITIAL_DEMO_STATE.transactions.length);
    expect(mockStorage.getItem('rupeewise_state_v1')).toBeNull();
  });
});
