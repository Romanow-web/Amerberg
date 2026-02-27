import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value);
}

export function getMonthName(dateString: string): string {
  // dateString is YYYY-MM
  const [year, month] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
}

export function parseCSV(csvText: string): any[] {
  const lines = csvText.split('\n').filter(line => line.trim() !== '');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    return obj;
  });
}
