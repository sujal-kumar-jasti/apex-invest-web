/**
 * --- CURRENCY & FORMATTING UTILS ---
 * Matches com.apexinvest.app.util logic
 */

export const getConvertedValue = (
  value: number, 
  isUsd: boolean, 
  liveRate: number
): number => {
  // Logic: If USD mode is on, divide the base INR value by the live exchange rate
  return isUsd ? value / liveRate : value;
};

export const toCleanString = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  // Removes trailing zeros for quantity (e.g., 10.00 -> 10)
  return num % 1 === 0 ? num.toString() : num.toFixed(2);
};

export const formatCurrency = (value: number, isUsd: boolean): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: isUsd ? 'USD' : 'INR',
    minimumFractionDigits: 2,
  }).format(value);
};