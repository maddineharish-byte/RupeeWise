import { useMemo } from 'react';
import { useFinance } from './FinanceContext';
import {
  calculateFinancialSummary,
  calculateCategorySummaries,
  calculateFinancialHealth,
  calculateScenarioProjection,
} from '../utils/financialEngine';

export function useFinanceCalculations() {
  const { state, dispatch, resetToDemo } = useFinance();

  const summary = useMemo(() => calculateFinancialSummary(state), [state]);
  const categorySummaries = useMemo(() => calculateCategorySummaries(state), [state]);
  const healthScore = useMemo(() => calculateFinancialHealth(state), [state]);

  const activeProjection = useMemo(() => {
    if (!state.activeScenario) return null;
    return calculateScenarioProjection(state, state.activeScenario);
  }, [state]);

  return {
    state,
    dispatch,
    resetToDemo,
    summary,
    categorySummaries,
    healthScore,
    activeProjection,
  };
}
