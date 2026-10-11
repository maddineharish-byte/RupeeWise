import { AppState, ExpenseCategory } from '../types/finance';

/**
 * RupeeWise Canonical Demonstration Dataset
 *
 * Baseline constraints:
 * - Starting budget: ₹10,000 (1,000,000 paise)
 * - Current day: Day 10 of 30
 * - Days remaining: 21 (Day 10 through Day 30 inclusive)
 * - Posted expenses: ₹3,000 (300,000 paise)
 * - Current balance: ₹7,000 (700,000 paise)
 * - Unpaid protected commitments: ₹2,000 (200,000 paise)
 * - Available-to-spend: ₹5,000 (500,000 paise) [Current balance - Unpaid commitments]
 * - Remaining savings target: ₹2,000 (200,000 paise)
 */

export const INITIAL_DEMO_STATE: AppState = {
  version: 1,
  period: {
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    totalDays: 30,
    currentDay: 10,
    startingBudgetPaise: 1000000, // ₹10,000
  },
  userProfile: {
    name: 'Harish',
    monthlyIncomePaise: 1000000, // ₹10,000
  },
  categoryBudgets: [
    { category: 'Food & Dining', allocatedPaise: 300000 }, // ₹3,000
    { category: 'Rent & Housing', allocatedPaise: 200000 }, // ₹2,000
    { category: 'Books & Education', allocatedPaise: 180000 }, // ₹1,800
    { category: 'Utilities & Bills', allocatedPaise: 140000 }, // ₹1,400
    { category: 'Transit & Travel', allocatedPaise: 100000 }, // ₹1,000
    { category: 'Entertainment', allocatedPaise: 50000 }, // ₹500
    { category: 'Shopping & Personal', allocatedPaise: 30000 }, // ₹300
  ],
  transactions: [
    {
      id: 'tx-1',
      type: 'expense',
      category: 'Food & Dining',
      description: 'Campus cafeteria meal pass',
      amountPaise: 45000, // ₹450
      date: '2026-10-02',
      status: 'posted',
      createdAt: 1727827200000,
    },
    {
      id: 'tx-2',
      type: 'expense',
      category: 'Books & Education',
      description: 'Data structures textbook & notebook kit',
      amountPaise: 120000, // ₹1,200
      date: '2026-10-04',
      status: 'posted',
      createdAt: 1728000000000,
    },
    {
      id: 'tx-3',
      type: 'expense',
      category: 'Transit & Travel',
      description: 'Metro smart card monthly top-up',
      amountPaise: 50000, // ₹500
      date: '2026-10-06',
      status: 'posted',
      createdAt: 1728172800000,
    },
    {
      id: 'tx-4',
      type: 'expense',
      category: 'Food & Dining',
      description: 'Weekend study group snacks & filter coffee',
      amountPaise: 35000, // ₹350
      date: '2026-10-08',
      status: 'posted',
      createdAt: 1728345600000,
    },
    {
      id: 'tx-5',
      type: 'expense',
      category: 'Utilities & Bills',
      description: '5G mobile data recharge',
      amountPaise: 50000, // ₹500
      date: '2026-10-09',
      status: 'posted',
      createdAt: 1728432000000,
    },
  ],
  commitments: [
    {
      id: 'comm-1',
      title: 'High-speed broadband Wi-Fi bill',
      category: 'Utilities & Bills',
      amountPaise: 80000, // ₹800
      dueDate: '2026-10-15',
      dueDay: 15,
      isPaid: false,
      notes: 'Due on Day 15. Shared flat broadband connection.',
    },
    {
      id: 'comm-2',
      title: 'PG maintenance & room share contribution',
      category: 'Rent & Housing',
      amountPaise: 120000, // ₹1,200
      dueDate: '2026-10-20',
      dueDay: 20,
      isPaid: false,
      notes: 'Due on Day 20. Non-negotiable monthly housing commitment.',
    },
  ],
  savingsGoals: [
    {
      id: 'goal-1',
      title: 'Emergency Buffer Fund',
      category: 'Safety Net',
      targetPaise: 500000, // ₹5,000 total target
      currentPaise: 300000, // ₹3,000 saved to date
      targetDate: '2026-11-30',
      createdAt: '2026-10-01',
    },
    {
      id: 'goal-2',
      title: 'Tech Fest Hackathon Trip',
      category: 'Travel & Growth',
      targetPaise: 300000, // ₹3,000
      currentPaise: 100000, // ₹1,000 saved
      targetDate: '2026-12-15',
      createdAt: '2026-10-05',
    },
  ],
  activeScenario: null,
  appliedScenarioHistory: [],
};

export const CATEGORY_LIST: ExpenseCategory[] = [
  'Food & Dining',
  'Rent & Housing',
  'Utilities & Bills',
  'Books & Education',
  'Transit & Travel',
  'Entertainment',
  'Shopping & Personal',
  'Healthcare',
  'Savings & Investments',
  'Other',
];
