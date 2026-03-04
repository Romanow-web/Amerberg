import React from 'react';
import { MetricType } from '../types';
import { FileCheck, Truck } from 'lucide-react';

interface MetricSelectorProps {
  value: MetricType;
  onChange: (value: MetricType) => void;
  className?: string;
}

export function MetricSelector({ value, onChange, className = '' }: MetricSelectorProps) {
  return (
    <div className={`flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <button
        onClick={() => onChange('signed_contracts')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2 ${
          value === 'signed_contracts' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <FileCheck size={14} />
        <span className="hidden sm:inline">Signed Contracts</span>
        <span className="sm:hidden">Contracts</span>
      </button>
      <button
        onClick={() => onChange('cars_shipped')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider flex items-center gap-2 ${
          value === 'cars_shipped' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <Truck size={14} />
        <span className="hidden sm:inline">Cars Shipped</span>
        <span className="sm:hidden">Cars</span>
      </button>
    </div>
  );
}
