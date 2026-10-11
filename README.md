# RupeeWise — Personal Finance Engine & Decision Simulator

> **"Broke But Functional — Survive the Month"**  
> Zero-drift, integer-paise personal finance engine, commitment ring-fencer, and "What If?" predictive simulator designed to help cash-strapped students, young professionals, and gig workers survive the month without running out of money.

---

## 1. Product Overview & Target Hackathon Persona

### The "Broke But Functional" Challenge
Living paycheck-to-paycheck or on a fixed monthly allowance creates continuous financial anxiety:
- **Zero Room for Error:** An unexpected expense of ₹1,500 can trigger overdrafts, missed room rent, or days without groceries.
- **Mental Accounting Fatigue:** Trying to mentally calculate how much money is "actually free" versus what is spoken for (rent, wifi, mess bills, EMI) leads to costly errors.
- **The "False Balance" Illusion:** Banking apps display current bank balance (e.g. ₹8,500), but omit upcoming obligations due in 10 days (e.g. ₹6,000 rent), tricking users into reckless discretionary spending.

### How RupeeWise Solves This
RupeeWise replaces financial guesswork with ruthless mathematical transparency:
- **True Available-to-Spend:** Automatically ring-fences upcoming non-negotiable commitments before reporting spendable cash.
- **Safe Daily Allowance:** Calculates exactly how much discretionary cash can be spent per day over the remaining days of the cycle.
- **"What If?" Pre-Commitment Simulator:** Allows users to simulate purchases (e.g. "Can I buy a ₹12,000 smartphone on Day 12?") against their 30-day baseline runway *before* spending a single real rupee.
- **Multi-Modal Logging:** Enables natural voice transaction capture via Gemini AI with automatic slot-filling and auditory confirmation chimes.

---

## 2. Architecture & Source Code Structure

### System Architecture Diagram

```
+-----------------------------------------------------------------------------+
|                            BROWSER CLIENT (React 19 SPA)                    |
|                                                                             |
|  +--------------------+   +-----------------------+   +------------------+  |
|  | Overview Dashboard |   | Budget & Commitments  |   | What If? Sandbox |  |
|  +--------------------+   +-----------------------+   +------------------+  |
|  +--------------------+   +-----------------------+   +------------------+  |
|  | Transaction Ledger |   | Savings Goals Vault   |   | Health Scorecard |  |
|  +--------------------+   +-----------------------+   +------------------+  |
|                                                                             |
|  +-----------------------------------------------------------------------+  |
|  |                FinanceContext (Deterministic Reducer)                 |  |
|  |  * Externalized timestamps & UUIDs   * Pure state transitions         |  |
|  |  * Idempotent scenario application   * Atomic commitment linking      |  |
|  +-----------------------------------------------------------------------+  |
|                                     |                                       |
|  +----------------------------------v------------------------------------+  |
|  |                    Pure Financial Engine & Validation                 |  |
|  |  * Integer-paise calculations (zero IEEE 754 float drift)             |  |
|  |  * Daily burn rate & safe runway derivation                           |  |
|  |  * Strict schema validation (rejects NaN, negative expenses, bad dates|  |
|  +-----------------------------------------------------------------------+  |
|                                     |                                       |
|  +----------------------------------v------------------------------------+  |
|  |           LocalStorage Storage Adapter (v2 Schema Migration)          |  |
|  +-----------------------------------------------------------------------+  |
+--------------------------------------|--------------------------------------+
                                       | HTTP POST / WebSocket
                                       v
+-----------------------------------------------------------------------------+
|                     SERVER-SIDE PROXY (server.ts - Express)                 |
|                                                                             |
|  * Strict rate limiting (60 req/min per IP)                                 |
|  * Request body sanitization & 100KB payload limit                          |
|  * Model allowlist (gemini-3.5-flash, gemini-3.1-flash-lite, 3.8-live)      |
|  * Zero client-side API keys (GEMINI_API_KEY confined to backend)           |
|  * WebSocket stream connection for Gemini 3.8 Live bidirectional audio      |
+--------------------------------------|--------------------------------------+
                                       | Secure Google GenAI SDK
                                       v
+-----------------------------------------------------------------------------+
|                        GOOGLE GEMINI FOUNDATION MODELS                      |
+-----------------------------------------------------------------------------+
```

### Source Folder Guide

| Directory / File | Role & Responsibility |
| :--- | :--- |
| `src/context/FinanceContext.tsx` | Deterministic application state reducer, action dispatchers, canonical commitment linking, and idempotent scenario operations. |
| `src/context/useFinanceCalculations.ts` | React custom hook providing memoized financial calculations, health metrics, and atomic action helpers to views. |
| `src/utils/financialEngine.ts` | Pure financial calculation functions: net cash balance, available-to-spend, safe daily burn, 30-day trajectory, and health score. |
| `src/utils/currency.ts` | Integer paise conversion functions (`rupeesToPaise`, `paiseToRupees`, `formatPaise`, `formatDeltaPaise`, `parseRupeeInput`). |
| `src/utils/validation.ts` | Strict entity validators verifying transactions, commitments, budgets, savings goals, and scenario inputs. |
| `src/utils/storage.ts` | Defensive LocalStorage adapter with schema version migration, error recovery, and quota resilience. |
| `src/utils/soundEffects.ts` | Web Audio API synthesized tones (success chime, question prompt tone, speech synthesis). |
| `src/utils/audioLive.ts` | PCM 16-bit audio conversion and streaming buffer player for Gemini 3.8 Live API voice sessions. |
| `src/components/layout/` | Responsive top bar (`AppHeader.tsx`) and mobile drawer (`AppSidebar.tsx`) with accessible navigation. |
| `src/components/overview/` | Dashboard cards (`OverviewDashboard.tsx`) and accessible budget allocation chart (`SpendingBudgetChart.tsx`). |
| `src/components/transactions/` | Transaction ledger (`TransactionsView.tsx`) and add/edit modal (`TransactionModal.tsx`). |
| `src/components/budget/` | Budget planner (`BudgetPlannerView.tsx`) and category allocation modal (`EditBudgetModal.tsx`). |
| `src/components/simulator/` | What If? simulator (`WhatIfSimulatorView.tsx`), comparison card (`ScenarioCompareCard.tsx`), and timeline (`ProjectionTimelineChart.tsx`). |
| `src/components/savings/` | Target vault (`SavingsGoalsView.tsx`), goal modal (`GoalModal.tsx`), and deposit modal (`ContributionModal.tsx`). |
| `src/components/health/` | 100-point diagnostic health scorecard (`FinancialHealthView.tsx`). |
| `src/components/chat/` | Multi-turn AI advisor with financial context injection (`GeminiChatView.tsx`). |
| `src/components/voice/` | Floating voice intent widget (`VoiceTransactionWidget.tsx`) and real-time live voice modal (`GeminiVoiceModal.tsx`). |
| `server.ts` | Full-stack Express server with rate-limiting, body validation, Gemini REST endpoints, and WebSocket Live server. |

---

## 3. Financial Mechanics & Paise Accounting Rules

### A. The Integer-Paise Standard
All monetary figures in RupeeWise are stored, computed, and compared as **integer paise** ($1\text{ INR} = 100\text{ paise}$).
- Eliminates standard IEEE 754 floating-point inaccuracies (such as `0.1 + 0.2 = 0.30000000000000004`).
- All display conversions occur solely at presentation boundaries via `formatPaise`.
- Cash deficits are **never artificially clamped to zero**; true negative balances are preserved and displayed clearly to give users an authentic risk signal.

### B. Canonical Accounting Lifecycle
RupeeWise enforces an exact $1:1$ lifecycle between **Protected Commitments** and **Posted Transactions**:

1. **Unpaid Commitment State:**
   - Upcoming obligations (e.g. ₹4,000 rent) reduce **Available-to-Spend** immediately.
   - They do not increment posted expenses, preserving accurate historical burn tracking.
2. **Payment Execution (Linking):**
   - When marked as "Paid", RupeeWise atomically creates a linked expense transaction with `commitmentId: id`.
   - The commitment records `paidTransactionId: tx.id`.
   - The paid commitment is no longer deducted as an upcoming obligation—it is now tracked via the posted expense transaction, maintaining exact $1:1$ balance without double-deduction.
3. **Reversal & Deletion Consistency:**
   - Unmarking a paid commitment atomically reverses and deletes the linked transaction.
   - Deleting a transaction linked to a commitment returns the commitment to its unpaid, protected status.
   - Repeating payment actions is idempotent; duplicate transactions cannot be created.

### C. Core Mathematical Equations

$$\text{Current Balance} = \sum \text{Posted Income} - \sum \text{Posted Expenses}$$

$$\text{Available to Spend} = \text{Current Balance} - \sum \text{Unpaid Protected Commitments}$$

$$\text{Remaining Days} = \max\left(1, (\text{Days in Month} - \text{Current Day} + 1)\right)$$

$$\text{Safe Daily Spending Allowance} = \max\left(0, \left\lfloor\frac{\text{Available to Spend}}{\text{Remaining Days}}\right\rfloor\right)$$

$$\text{Projected Month-End Balance} = \text{Current Balance} - \sum \text{Unpaid Commitments} - (\text{Remaining Days} \times \text{Daily Burn}) + \text{Planned Income}$$

---

## 4. Key User Workflows

1. **Morning Check-In:** View true Available to Spend and daily allowance to plan discretionary meals or travel.
2. **Logging a Transaction via Voice:**
   - Click the floating "Voice Add Spend" button or tap the microphone.
   - Speak naturally: *"Spent 120 rupees on sandwich and coffee"*.
   - Gemini extracts the slot values (`amount: 120`, `category: Food & Dining`, `description: Sandwich and coffee`, `type: expense`), plays a chime, and adds it to the ledger.
3. **Simulating a Decision in What If?:**
   - Select a preset (e.g. "Buy a Smartphone") or enter custom parameters.
   - Observe the live side-by-side comparison: Available Cash change, Daily Allowance drop, and month-end trajectory.
   - If acceptable, click **"Apply Scenario"** to commit the decision to the live ledger once with complete idempotency.
4. **Ring-Fencing Upcoming Bills:**
   - Add upcoming room rent or electricity bills in Budget Planner.
   - Watch the cash immediately ring-fence from Available-to-Spend.
   - When paid on due date, toggle "Mark as paid" to convert it into a linked ledger expense.
5. **Contributing to Savings Goals:**
   - Transfer money toward an Emergency Buffer or Milestone goal.
   - The deposit logs as a savings transaction and ring-fences funds from daily burn.

---

## 5. Security & Privacy Safeguards

- **No Exposed Secrets:** `GEMINI_API_KEY` is strictly confined to the backend server environment (`server.ts`). It is never bundled into client JavaScript.
- **Strict Rate Limiting:** In-memory sliding-window limiter on `/api/*` endpoints restricts requests to 60 per minute per IP.
- **Input Sanitization & Schema Validation:** Financial context objects are sanitized and bounded before being forwarded to LLM system instructions.
- **No Prompt Injection Overrides:** System instructions are hard-coded on the server; client input cannot override core security constraints.
- **WebSocket Safety:** Max frame payload capped at 1MB, with automatic teardown of microphone media streams and AudioContext instances upon session closure.

---

## 6. Accessibility (WCAG 2.1 AA)

- **Accessible Names:** Every icon-only button possesses an unambiguous `aria-label` or `title` describing its action.
- **Form Association:** Every input and select dropdown has an associated `label` with matching `id` and `htmlFor`.
- **Accessible Charts:** Recharts SVG visualizations include visually hidden (`sr-only`) data summary tables and descriptive `role="region"` aria labels.
- **Dialog Focus Traps:** Custom modals implement keyboard focus traps (`Tab` / `Shift+Tab`), `Escape` key dismissal, and `aria-modal="true"`.
- **Keyboard Navigation:** Full operational capability via keyboard without traps.

---

## 7. Prerequisites & Installation

### Prerequisites
- Node.js 18.0.0 or higher
- npm 9+ or bun 1.0+

### Setup Commands
```bash
# 1. Clone the repository
git clone https://github.com/maddineharish-byte/rupeewise.git
cd rupeewise

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY
```

### Environment Variables
| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Recommended | Google Gemini API key for AI chat, voice slot-filling, and Live audio stream. |
| `PORT` | Optional | Port for the full-stack server (default: `3000`). |
| `NODE_ENV` | Optional | `development` or `production`. |

---

## 8. Verification & Execution Commands

```bash
# Run unit and integration tests (30 passing tests)
npm test

# Run TypeScript static type check
npm run lint

# Build production client bundle with Rollup chunking
npm run build

# Start local full-stack development server
npm run dev

# Start production server
npm start
```

---

## 9. Testing Strategy & Test Coverage

The automated test suite runs via Vitest and covers:
1. **`src/utils/financialEngine.test.ts` (9 tests):**
   - Canonical demo baseline calculations.
   - Planned future transactions isolation.
   - Deterministic financial health scoring.
   - Isolated What If? projection calculations.
   - Reversal of paid commitments upon transaction deletion.
   - Idempotent scenario application preventing duplicates.
2. **`src/utils/validationAndBoundaries.test.ts` (10 tests):**
   - Exact integer-paise arithmetic without floating drift.
   - Robust rupee string parsing and negative input handling.
   - Entity validation constraints (transactions, commitments, goals, scenarios).
   - Deficit transparency (preservation of true negative balances without visual masking).
3. **`src/utils/storage.test.ts` (5 tests):**
   - Safe fallback when storage is empty.
   - Resilient recovery from malformed/corrupted JSON.
   - Rejection of invalid schema versions.
   - State persistence while isolating uncommitted transient scenarios.
4. **`src/utils/naturalLanguageParser.test.ts` (6 tests):**
   - Slot-filling for expenses, income, categories, and amounts.
   - Missing field detection and conversation turn prompting.

---

## 10. Known Limitations

- **Browser Speech Recognition Support:** Voice transcription via Web Speech API requires browser support (Chrome, Edge, Safari). In unsupported environments, the widget seamlessly displays an interactive manual text command input.
- **Microphone Permissions:** Live voice conversation requires granting browser microphone permission.
- **Client Persistence:** Data is stored in browser LocalStorage (`v2`). Clearing site data restores the canonical demo dataset. Use the "Reset Demo" button anytime to return to the baseline state.
