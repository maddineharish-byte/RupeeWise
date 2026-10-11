# Overview of RupeeWise

**RupeeWise** is an interactive, zero-drift personal finance engine and decision simulator built for the **"Broke But Functional — Survive the Month"** challenge. Designed specifically for students, young professionals, gig workers, and budget-conscious individuals living paycheck-to-paycheck, RupeeWise eliminates financial guesswork. It translates raw income and expense numbers into actionable, daily survival guidance—ensuring users never run out of money before month-end or default on non-negotiable commitments.

---

## 1. The "Broke But Functional" Persona

### The Challenge
Living with a constrained monthly cash flow means every financial decision carries high stakes. For this persona:
- **Zero Room for Error:** A surprise expense of ₹1,500 can trigger overdrafts, missed rent payments, or days without groceries.
- **Mental Accounting Fatigue:** Trying to mentally calculate how much money is "actually free" versus what is already spoken for (bills, rent, EMI, wifi) creates continuous stress.
- **The "False Balance" Illusion:** Bank apps display current cash balance (e.g., ₹8,500), but omit upcoming bills due next week (e.g., ₹6,000 rent), tricking the user into dangerous spending.

### How RupeeWise Empowers the Persona
RupeeWise provides ruthless clarity:
- **Truth in Numbers:** Replaces misleading bank balances with **"Available to Spend Right Now"** and a dynamic **"Safe Daily Allowance"**.
- **Pre-Commitment Protection:** Walls off upcoming fixed commitments (rent, utilities, loans) before discretionary spending begins.
- **What If? Pre-Commitment Simulator:** Lets users simulate a purchase (e.g., "Can I buy a ₹1,200 jacket on day 15?") against their baseline month-end trajectory *before* spending a single real rupee.
- **Survival-First Financial Health Score:** Evaluates runway, commitment buffer, and discretionary burn rate to give unambiguous survival diagnostics.

---

## 2. Core Financial Mechanics & Paise-Based Accounting

Unlike conventional personal finance apps that rely on floating-point arithmetic (`0.1 + 0.2 = 0.30000000000000004`), RupeeWise is architected with strict **integer paise accounting** (`1 INR = 100 paise`).

### A. Zero-Drift Integer Paise Principle
- All transactions, budgets, commitments, savings targets, and simulation inputs are stored, calculated, and projected as **64-bit integer paise**.
- Formatting functions (`formatINR`, `paiseToRupees`, `rupeesToPaise`) strictly isolate presentation conversions to display boundaries, ensuring zero rounding anomalies or penny-drop inaccuracies.
- Negative balances and cash flow deficits are **never artificially clamped to zero**. RupeeWise surfaces deficits transparently so users can respond before real-world default occurs.

### B. Canonical Accounting Lifecycle
To prevent double-counting or phantom deductions, RupeeWise enforces a strict canonical lifecycle between **Protected Commitments** and **Posted Transactions**:

1. **Unpaid Commitment State:**
   - An unpaid commitment (e.g., ₹4,000 for Rent) is registered as an obligation.
   - It reduces **Available-to-Spend** funds immediately, reserving capital for when the bill is due.
   - It is *not* counted in posted expenses yet, preserving accurate historical burn tracking.

2. **Payment Execution (Linking):**
   - When marked as "Paid", RupeeWise atomically creates a linked expense transaction containing `commitmentId: id`.
   - The commitment records `paidTransactionId: tx.id`.
   - The paid commitment is no longer deducted as an upcoming obligation—it is now tracked solely via the posted expense transaction, maintaining exact $1:1$ accounting balance.

3. **Reversal & Deletion Consistency:**
   - Unmarking a paid commitment atomically reverses/removes the linked expense transaction.
   - Deleting a transaction that was linked to a commitment reverts the commitment back to its unpaid, protected state.
   - Re-triggering payment is idempotent; duplicate transactions cannot be generated.

### C. Foundational Mathematical Equations

$$\text{Current Balance} = \sum \text{Posted Income} - \sum \text{Posted Expenses}$$

$$\text{Available to Spend} = \text{Current Balance} - \sum \text{Unpaid Protected Commitments}$$

$$\text{Remaining Days} = \max\left(1, (\text{Days in Month} - \text{Current Day} + 1)\right)$$

$$\text{Safe Daily Spending Allowance} = \frac{\text{Available to Spend}}{\text{Remaining Days}}$$

$$\text{Projected Month-End Balance} = \text{Current Balance} - \sum \text{Unpaid Commitments} - (\text{Remaining Days} \times \text{Daily Run Rate}) + \text{Planned Income}$$

---

## 3. Key Feature Modules

| View / Module | Purpose & Capability |
| :--- | :--- |
| **1. Overview Dashboard** | Instant status at a glance: Real-time Available to Spend, Safe Daily Allowance, 30-day runway gauge, category spending breakdown, and quick transaction logging. |
| **2. Budget & Commitments** | Category spending caps (Food, Transit, Utilities, Entertainment, Personal) paired with a dedicated Protected Commitments vault with $1:1$ payment reconciliation. |
| **3. Transaction Ledger** | Full audit log of all financial events with category filtering, date sorting, and zero-latency deletion/editing with automated commitment link cascading. |
| **4. Voice Transaction Entry** | Natural language voice & text intent parser powered by Gemini API, translating spoken phrases (e.g., *"Spent 80 rupees on chai and samosa"*) into structured transactions. |
| **5. What If? Decision Simulator** | Side-by-side comparative sandbox allowing users to model one-time purchases, daily spend changes, extra income, or recurring fees across 30 days before committing them. |
| **6. Savings Goals Vault** | Dedicated target tracker for emergency cushions and long-term milestones with explicit transfer accounting that protects funds from discretionary spending. |
| **7. Financial Health & Score** | Algorithmic 100-point diagnostic score assessing Commitment Coverage, Discretionary Burn Discipline, Savings Buffer, and Runway Viability. |
| **8. Gemini AI Financial Advisor** | Real-time, context-aware financial advisor offering frugal optimization advice, emergency survival strategies, and budget rebalancing tactics. |

---

## 4. Architectural Integrity & Security

- **Deterministic State Engine:** All state modifications occur through pure Reducer actions with externalized timestamp and ID generation for complete determinism and reproducible replays.
- **Idempotent Scenario Operations:** Simulation scenarios use deterministic operation IDs (`opId`), guaranteeing that applying a scenario multiple times cannot create duplicate records or corrupted double-allocations.
- **Defensive Storage Adapter:** Versioned (`v2`) LocalStorage adapter with schema-level validation on load, safe fallback on malformed JSON, and quota exhaustion resilience.
- **Server-Side AI Proxy:** Gemini API keys are strictly confined to the backend server environment (`server.ts`). Client requests undergo schema validation, payload length limits, and model allowlisting.
- **Accessible (a11y) Standards:** Built according to WCAG 2.1 AA specifications with semantic landmark regions, ARIA live-regions for dynamic balance announcements, high-contrast badges, and full keyboard navigational loops (`Tab`, `Escape`, `Enter`).

---

## 5. Getting Started

### Prerequisites
- Node.js 18+
- npm or bun

### Installation & Execution
```bash
# Install dependencies
npm install

# Run unit and integration tests (20 tests verifying engine, storage, and intent parser)
npm test

# Launch development full-stack server (Port 3000)
npm run dev

# Verify production build
npm run build
```
