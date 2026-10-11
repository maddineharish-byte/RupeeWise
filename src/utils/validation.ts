/**
 * RupeeWise Financial and State Validation
 * Validates transaction, budget, commitment, scenario, and goal inputs.
 * Enforces integer paise constraints, limits, date validity, and structural integrity.
 */

import {
  Transaction,
  ProtectedCommitment,
  CategoryBudget,
  SavingsGoal,
  ScenarioInput,
  ExpenseCategory,
  TransactionType,
  TransactionStatus,
} from '../types/finance';
import { CATEGORY_LIST } from '../data/initialSeed';

// Maximum supported amount in paise: ₹10,00,00,000 (10 crore = 1,000,000,000 paise)
export const MAX_SAFE_PAISE = 1_000_000_000_00; 

export function isValidNumber(val: any): boolean {
  return typeof val === 'number' && !isNaN(val) && isFinite(val);
}

export function isValidPaise(val: any, allowZero = true, allowNegative = false): boolean {
  if (!isValidNumber(val)) return false;
  if (!Number.isInteger(val)) return false;
  if (!allowNegative && val < 0) return false;
  if (!allowZero && val === 0) return false;
  if (Math.abs(val) > MAX_SAFE_PAISE) return false;
  return true;
}

export function isValidCategory(val: any): val is ExpenseCategory {
  return typeof val === 'string' && (CATEGORY_LIST as readonly string[]).includes(val);
}

export function isValidDate(val: any): boolean {
  if (typeof val !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(val)) return false;
  const d = new Date(val);
  return !isNaN(d.getTime());
}

export function validateTransaction(tx: Partial<Transaction>): { isValid: boolean; error?: string } {
  if (!tx) return { isValid: false, error: 'Transaction object is missing.' };
  if (!tx.id || typeof tx.id !== 'string' || tx.id.trim().length === 0) {
    return { isValid: false, error: 'Transaction ID is required.' };
  }
  if (tx.type !== 'expense' && tx.type !== 'income') {
    return { isValid: false, error: 'Transaction type must be "expense" or "income".' };
  }
  if (!isValidCategory(tx.category)) {
    return { isValid: false, error: `Invalid category: "${tx.category}".` };
  }
  if (!tx.description || typeof tx.description !== 'string' || tx.description.trim().length === 0) {
    return { isValid: false, error: 'Description is required.' };
  }
  if (tx.description.length > 200) {
    return { isValid: false, error: 'Description cannot exceed 200 characters.' };
  }
  if (!isValidPaise(tx.amountPaise, false, false)) {
    return { isValid: false, error: 'Amount must be a positive integer in paise (greater than 0).' };
  }
  if (!isValidDate(tx.date)) {
    return { isValid: false, error: 'Date must be in valid YYYY-MM-DD format.' };
  }
  if (tx.status !== 'posted' && tx.status !== 'planned') {
    return { isValid: false, error: 'Status must be "posted" or "planned".' };
  }
  return { isValid: true };
}

export function validateCommitment(comm: Partial<ProtectedCommitment>): { isValid: boolean; error?: string } {
  if (!comm) return { isValid: false, error: 'Commitment object is missing.' };
  if (!comm.id || typeof comm.id !== 'string' || comm.id.trim().length === 0) {
    return { isValid: false, error: 'Commitment ID is required.' };
  }
  if (!comm.title || typeof comm.title !== 'string' || comm.title.trim().length === 0) {
    return { isValid: false, error: 'Commitment title is required.' };
  }
  if (comm.title.length > 200) {
    return { isValid: false, error: 'Commitment title cannot exceed 200 characters.' };
  }
  if (!isValidCategory(comm.category)) {
    return { isValid: false, error: `Invalid commitment category: "${comm.category}".` };
  }
  if (!isValidPaise(comm.amountPaise, false, false)) {
    return { isValid: false, error: 'Commitment amount must be a positive integer in paise.' };
  }
  if (!isValidDate(comm.dueDate)) {
    return { isValid: false, error: 'Due date must be in valid YYYY-MM-DD format.' };
  }
  if (typeof comm.dueDay !== 'number' || !isValidNumber(comm.dueDay) || comm.dueDay < 1 || comm.dueDay > 31) {
    return { isValid: false, error: 'Due day must be between 1 and 31.' };
  }
  return { isValid: true };
}

export function validateSavingsGoal(goal: Partial<SavingsGoal>): { isValid: boolean; error?: string } {
  if (!goal) return { isValid: false, error: 'Savings goal is missing.' };
  if (!goal.id || typeof goal.id !== 'string') {
    return { isValid: false, error: 'Goal ID is required.' };
  }
  if (!goal.title || typeof goal.title !== 'string' || goal.title.trim().length === 0) {
    return { isValid: false, error: 'Goal title is required.' };
  }
  if (!isValidPaise(goal.targetPaise, false, false)) {
    return { isValid: false, error: 'Target amount must be a positive integer in paise.' };
  }
  if (!isValidPaise(goal.currentPaise, true, false)) {
    return { isValid: false, error: 'Current saved amount must be a non-negative integer in paise.' };
  }
  if (!isValidDate(goal.targetDate)) {
    return { isValid: false, error: 'Target date must be valid YYYY-MM-DD.' };
  }
  return { isValid: true };
}

export function validateScenarioInput(scenario: Partial<ScenarioInput>): { isValid: boolean; error?: string } {
  if (!scenario) return { isValid: false, error: 'Scenario is missing.' };
  if (!scenario.name || typeof scenario.name !== 'string' || scenario.name.trim().length === 0) {
    return { isValid: false, error: 'Scenario name is required.' };
  }
  if (!isValidPaise(scenario.oneTimeExpensePaise, true, false)) {
    return { isValid: false, error: 'One-time expense must be non-negative integer paise.' };
  }
  if (!isValidPaise(scenario.additionalIncomePaise, true, false)) {
    return { isValid: false, error: 'Additional income must be non-negative integer paise.' };
  }
  if (!isValidPaise(scenario.recurringExpensePaise, true, false)) {
    return { isValid: false, error: 'Recurring expense must be non-negative integer paise.' };
  }
  if (!isValidPaise(scenario.dailySpendDeltaPaise, true, true)) {
    return { isValid: false, error: 'Daily spending delta must be integer paise.' };
  }
  if (!isValidPaise(scenario.savingsContributionDeltaPaise, true, true)) {
    return { isValid: false, error: 'Savings delta must be integer paise.' };
  }
  if (typeof scenario.effectiveDay !== 'number' || !isValidNumber(scenario.effectiveDay) || scenario.effectiveDay < 1 || scenario.effectiveDay > 31) {
    return { isValid: false, error: 'Effective day must be between 1 and 31.' };
  }
  return { isValid: true };
}
