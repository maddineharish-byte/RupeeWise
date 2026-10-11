/**
 * RupeeWise Natural Language Intent Parser
 * Extracts amount, category, and description from user speech or text.
 * Combines fast client-side regex/heuristic extraction with server-side Gemini intelligence.
 */

import { ExpenseCategory, TransactionType } from '../types/finance';

export interface ParsedTransactionIntent {
  isComplete: boolean;
  type: TransactionType;
  amountRupees: number | null;
  category: ExpenseCategory | null;
  description: string | null;
  missingFields: Array<'amount' | 'category' | 'description'>;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  'Food & Dining': [
    'lunch', 'dinner', 'breakfast', 'chai', 'tea', 'coffee', 'snack', 'snacks',
    'samosa', 'food', 'restaurant', 'cafe', 'swiggy', 'zomato', 'biryani',
    'pizza', 'burger', 'groceries', 'mess', 'canteen', 'cafeteria', 'meal',
    'dosa', 'idli', 'maggi', 'subway', 'starbucks', 'dominos', 'eat', 'ate'
  ],
  'Books & Education': [
    'book', 'books', 'textbook', 'textbooks', 'notebook', 'notebooks', 'pen', 'stationery',
    'stationary', 'tuition', 'course', 'courses', 'exam', 'fee', 'fees', 'class',
    'classes', 'udemy', 'coursera', 'notes', 'xerox', 'printout', 'college'
  ],
  'Transit & Travel': [
    'metro', 'bus', 'uber', 'ola', 'auto', 'cab', 'petrol', 'diesel', 'fuel',
    'train', 'flight', 'travel', 'rapido', 'fare', 'toll', 'bus ticket', 'train ticket',
    'goa', 'trip'
  ],
  'Utilities & Bills': [
    'recharge', 'wifi', 'wi-fi', 'broadband', 'electricity', 'mobile', 'bill',
    'bills', 'water', 'gas', 'jio', 'airtel', 'vi', 'cylinder', 'internet'
  ],
  'Rent & Housing': [
    'rent', 'pg', 'hostel', 'room', 'maintenance', 'flat', 'landlord', 'deposit'
  ],
  'Entertainment': [
    'movie', 'movies', 'cinema', 'netflix', 'spotify', 'prime', 'game', 'games',
    'party', 'concert', 'ott', 'hotstar', 'youtube', 'club', 'movie ticket', 'movie tickets'
  ],
  'Healthcare': [
    'medicine', 'medicines', 'doctor', 'hospital', 'clinic', 'pharmacy',
    'test', 'medical', 'tablets', 'dentist', 'health', 'fever', 'cold'
  ],
  'Shopping & Personal': [
    'clothes', 'shirt', 'pants', 'tshirt', 'shoes', 'jacket', 'amazon',
    'flipkart', 'myntra', 'shopping', 'haircut', 'salon', 'makeup', 'skin',
    'perfume', 'jeans', 'watch'
  ],
  'Savings & Investments': [
    'savings', 'sip', 'invest', 'investment', 'stocks', 'mutual fund',
    'deposit', 'gold', 'emergency fund', 'fd', 'rd'
  ],
  'Other': ['other', 'misc', 'miscellaneous', 'general']
};

/**
 * Client-side heuristic parser for instant speech intent extraction.
 */
export function parseLocalIntent(rawInput: string): ParsedTransactionIntent {
  const input = rawInput.toLowerCase().trim();

  // 1. Detect Transaction Type (expense vs income)
  const isIncome = /\b(received|earned|got|salary|stipend|freelance|cashback|income|credited|gift)\b/i.test(input);
  const type: TransactionType = isIncome ? 'income' : 'expense';

  // 2. Extract Amount
  // Matches: "450 rupees", "rs 450", "₹450", "inr 450", "450 bucks", or standalone numbers
  let amountRupees: number | null = null;
  const rupeePattern = /(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)/i;
  const afterRupeePattern = /([\d,]+(?:\.\d+)?)\s*(?:rupees?|rs\.?|inr|bucks)/i;
  const standaloneNumberPattern = /\b([\d,]+(?:\.\d+)?)\b/;

  let match = input.match(rupeePattern) || input.match(afterRupeePattern);
  if (match && match[1]) {
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(parsed) && parsed > 0) {
      amountRupees = parsed;
    }
  } else {
    // Look for digits
    const digits = input.match(standaloneNumberPattern);
    if (digits && digits[1]) {
      const parsed = parseFloat(digits[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        amountRupees = parsed;
      }
    }
  }

  // 3. Extract Category
  let category: ExpenseCategory | null = null;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i');
      if (regex.test(input)) {
        category = cat as ExpenseCategory;
        break;
      }
    }
    if (category) break;
  }

  // 4. Extract Description
  let description: string | null = null;
  // Remove numbers, rupees, currency words, filler phrases
  let cleaned = input
    .replace(/(?:₹|rs\.?|inr)\s*[\d,]+(?:\.\d+)?/gi, '')
    .replace(/[\d,]+(?:\.\d+)?\s*(?:rupees?|rs\.?|inr|bucks)/gi, '')
    .replace(/\b(add|record|log|an|a|expense|income|for|on|at|of|i|spent|paid|bought|purchased|please)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length > 2) {
    // Capitalize first letter
    description = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  } else if (category) {
    description = category;
  }

  const missingFields: Array<'amount' | 'category' | 'description'> = [];
  if (!amountRupees) missingFields.push('amount');
  if (!category) missingFields.push('category');
  if (!description) missingFields.push('description');

  const isComplete = Boolean(amountRupees && (category || description));

  return {
    isComplete,
    type,
    amountRupees,
    category: category || (isComplete ? 'Other' : null),
    description: description || (category ? String(category) : null),
    missingFields,
    confidence: isComplete ? 0.9 : 0.4,
  };
}

/**
 * Hybrid Parser:
 * Tries fast client-side extraction first.
 * If server is available, enriches with Gemini 3.5 Flash for nuanced understanding.
 */
export async function parseNaturalLanguageTransaction(
  transcript: string,
  history: Array<{ role: string; text: string }> = []
): Promise<{
  isComplete: boolean;
  type: TransactionType;
  amountRupees: number | null;
  category: ExpenseCategory | null;
  description: string | null;
  missingFields: string[];
  spokenReply: string;
}> {
  // Fast client heuristics
  const local = parseLocalIntent(transcript);

  try {
    const res = await fetch('/api/voice-transaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, history }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        isComplete: Boolean(data.isComplete),
        type: data.type === 'income' ? 'income' : 'expense',
        amountRupees: typeof data.amountRupees === 'number' ? data.amountRupees : local.amountRupees,
        category: (data.category as ExpenseCategory) || local.category || 'Other',
        description: data.description || local.description || 'Voice Transaction',
        missingFields: data.missingFields || [],
        spokenReply: data.spokenReply || '',
      };
    }
  } catch (err) {
    console.warn('Server parser fallback to client heuristics:', err);
  }

  // Fallback to local heuristic
  return {
    isComplete: local.isComplete,
    type: local.type,
    amountRupees: local.amountRupees,
    category: local.category || 'Other',
    description: local.description || 'Voice Transaction',
    missingFields: local.missingFields,
    spokenReply: local.isComplete
      ? `Extracted ${local.type} of ₹${local.amountRupees} for ${local.description}!`
      : 'Could you tell me the missing amount or description?',
  };
}
