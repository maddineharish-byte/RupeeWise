/**
 * RupeeWise Currency Utilities
 * Formats monetary amounts in Indian Rupees (INR) using integer paise.
 */

const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrDecimalFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Converts integer paise to formatted INR string (e.g. ₹10,000)
 */
export function formatPaise(paise: number, includeDecimals = false): string {
  if (isNaN(paise) || !isFinite(paise)) return '₹0';
  const rupees = paise / 100;
  return includeDecimals ? inrDecimalFormatter.format(rupees) : inrFormatter.format(rupees);
}

/**
 * Converts integer paise to plain rupee number
 */
export function paiseToRupees(paise: number): number {
  if (isNaN(paise) || !isFinite(paise)) return 0;
  return Math.round(paise) / 100;
}

/**
 * Converts rupees input (e.g. from user input) to integer paise.
 * Prevents floating-point error by rounding to the nearest integer.
 */
export function rupeesToPaise(rupees: number | string): number {
  const num = typeof rupees === 'string' ? parseFloat(rupees.replace(/[^\d.-]/g, '')) : rupees;
  if (isNaN(num) || !isFinite(num)) return 0;
  return Math.round(num * 100);
}

/**
 * Parses user rupee input string and returns sanitized integer paise.
 * Disallows negative values unless explicitly allowed.
 */
export function parseRupeeInput(value: string, allowNegative = false): number {
  const sanitized = value.replace(/[^\d.-]/g, '');
  const parsed = parseFloat(sanitized);
  if (isNaN(parsed) || !isFinite(parsed)) return 0;
  if (!allowNegative && parsed < 0) return 0;
  return Math.round(parsed * 100);
}

/**
 * Formats signed delta in INR (e.g., "+₹500" or "-₹1,200")
 */
export function formatDeltaPaise(paise: number): string {
  if (paise === 0) return '₹0';
  const sign = paise > 0 ? '+' : '-';
  const absFormatted = formatPaise(Math.abs(paise));
  return `${sign}${absFormatted}`;
}

/**
 * Formats a ratio as percentage (e.g. 75%)
 */
export function formatPercentage(ratio: number): string {
  if (isNaN(ratio) || !isFinite(ratio)) return '0%';
  return `${Math.round(ratio * 100)}%`;
}
