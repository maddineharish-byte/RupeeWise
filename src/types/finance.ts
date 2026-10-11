/**
 * RupeeWise Financial Types
 * All monetary values are represented as integer paise (1 INR = 100 paise)
 * to avoid floating-point rounding errors.
 */

export type TransactionType = 'expense' | 'income';
export type TransactionStatus = 'posted' | 'planned';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Rent & Housing'
  | 'Utilities & Bills'
  | 'Books & Education'
  | 'Transit & Travel'
  | 'Entertainment'
  | 'Shopping & Personal'
  | 'Healthcare'
  | 'Savings & Investments'
  | 'Other';

export interface Transaction {
  id: string;
  type: TransactionType;
  category: ExpenseCategory;
  description: string;
  amountPaise: number; // Integer paise
  date: string; // ISO format YYYY-MM-DD
  status: TransactionStatus;
  createdAt: number;
  commitmentId?: string; // Canonical link to the ProtectedCommitment paid by this transaction
  scenarioOperationId?: string; // Stable idempotency key for scenario-generated transactions
}

export interface ProtectedCommitment {
  id: string;
  title: string;
  category: ExpenseCategory;
  amountPaise: number; // Integer paise
  dueDate: string; // YYYY-MM-DD
  dueDay: number; // Day of period, e.g. 15
  isPaid: boolean;
  notes?: string;
  paidTransactionId?: string; // Canonical reference to the posted transaction recording this payment
}

export interface CategoryBudget {
  category: ExpenseCategory;
  allocatedPaise: number; // Integer paise
  iconName?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  category: string;
  targetPaise: number;
  currentPaise: number;
  targetDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface BudgetPeriod {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  totalDays: number; // e.g. 30
  currentDay: number; // e.g. 10
  startingBudgetPaise: number; // e.g. 1,000,000 (₹10,000)
}

export interface FinancialHealthScore {
  totalScore: number; // 0-100
  riskLevel: 'Low' | 'Moderate' | 'Elevated' | 'High';
  factors: {
    budgetAdherence: { score: number; maxScore: number; description: string };
    commitmentCoverage: { score: number; maxScore: number; description: string };
    savingsProgress: { score: number; maxScore: number; description: string };
    runwayAllowance: { score: number; maxScore: number; description: string };
  };
  recommendations: string[];
}

export interface ScenarioInput {
  name: string;
  oneTimeExpensePaise: number;
  dailySpendDeltaPaise: number; // Can be positive or negative
  additionalIncomePaise: number;
  recurringExpensePaise: number;
  savingsContributionDeltaPaise: number;
  effectiveDay: number;
  category: ExpenseCategory;
  notes?: string;
}

export interface ScenarioProjection {
  scenarioName: string;
  baselineEndBalancePaise: number;
  scenarioEndBalancePaise: number;
  deltaEndBalancePaise: number;
  baselineDailyAllowancePaise: number;
  scenarioDailyAllowancePaise: number;
  deltaDailyAllowancePaise: number;
  baselineAvailablePaise: number;
  scenarioAvailablePaise: number;
  deltaAvailablePaise: number;
  unfundedSavingsPaise: number;
  isDeficit: boolean;
  deficitAmountPaise: number;
  healthScoreDelta: number;
  scenarioHealthScore: number;
  scenarioRiskLevel: 'Low' | 'Moderate' | 'Elevated' | 'High';
  insightSummary: string;
  dailyTrajectory: Array<{
    day: number;
    baselinePaise: number;
    scenarioPaise: number;
  }>;
}

export interface AppState {
  version: number;
  period: BudgetPeriod;
  categoryBudgets: CategoryBudget[];
  transactions: Transaction[];
  commitments: ProtectedCommitment[];
  savingsGoals: SavingsGoal[];
  activeScenario: ScenarioInput | null;
  appliedScenarioHistory: Array<{
    id: string;
    name: string;
    appliedAt: number;
    summary: string;
  }>;
  userProfile: {
    name: string;
    monthlyIncomePaise: number;
  };
}
