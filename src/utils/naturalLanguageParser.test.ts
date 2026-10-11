import { describe, it, expect } from 'vitest';
import { parseLocalIntent } from './naturalLanguageParser';

describe('Natural Language Intent Parser', () => {
  it('extracts amount, category, and description for dining expense', () => {
    const res = parseLocalIntent('Spent 450 rupees on cafeteria lunch');
    expect(res.amountRupees).toBe(450);
    expect(res.category).toBe('Food & Dining');
    expect(res.type).toBe('expense');
    expect(res.isComplete).toBe(true);
    expect(res.missingFields.length).toBe(0);
  });

  it('extracts textbook purchase with education category', () => {
    const res = parseLocalIntent('I bought textbooks for 1200 rs');
    expect(res.amountRupees).toBe(1200);
    expect(res.category).toBe('Books & Education');
    expect(res.isComplete).toBe(true);
  });

  it('detects income transaction type from keywords', () => {
    const res = parseLocalIntent('Received 5000 stipend from internship');
    expect(res.amountRupees).toBe(5000);
    expect(res.type).toBe('income');
    expect(res.isComplete).toBe(true);
  });

  it('flags missing amount when only description/category is mentioned', () => {
    const res = parseLocalIntent('I ordered food from Swiggy');
    expect(res.category).toBe('Food & Dining');
    expect(res.amountRupees).toBeNull();
    expect(res.isComplete).toBe(false);
    expect(res.missingFields).toContain('amount');
  });

  it('handles INR and rupee currency symbols', () => {
    const res1 = parseLocalIntent('₹350 for metro recharge');
    expect(res1.amountRupees).toBe(350);
    expect(res1.category).toBe('Transit & Travel');

    const res2 = parseLocalIntent('INR 800 wifi broadband bill');
    expect(res2.amountRupees).toBe(800);
    expect(res2.category).toBe('Utilities & Bills');
  });

  it('correctly maps extracted intent into application state transaction format', () => {
    const res = parseLocalIntent('Spent 600 rupees on movie tickets');
    expect(res.amountRupees).toBe(600);
    expect(res.category).toBe('Entertainment');
    expect(res.type).toBe('expense');

    // Convert to application state transaction model
    const tx = {
      id: 'voice-tx-test',
      type: res.type,
      category: res.category!,
      description: res.description!,
      amountPaise: Math.round(res.amountRupees! * 100),
      date: '2026-10-11',
      status: 'posted' as const,
      createdAt: Date.now(),
    };

    expect(tx.amountPaise).toBe(60000);
    expect(tx.category).toBe('Entertainment');
    expect(tx.type).toBe('expense');
    expect(tx.status).toBe('posted');
  });
});
