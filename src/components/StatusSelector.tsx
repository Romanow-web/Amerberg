import React from 'react';

export type AgentStatusFilter = 'active' | 'no_active' | 'all';

interface StatusSelectorProps {
  value: AgentStatusFilter;
  onChange: (value: AgentStatusFilter) => void;
  className?: string;
}

export function StatusSelector({ value, onChange, className = '' }: StatusSelectorProps) {
  return (
    <div className={`flex bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 ${className}`}>
      <button
        onClick={() => onChange('active')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
          value === 'active' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        Active
      </button>
      <button
        onClick={() => onChange('no_active')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
          value === 'no_active' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        Inactive
      </button>
      <button
        onClick={() => onChange('all')}
        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${
          value === 'all' 
            ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' 
            : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        All
      </button>
    </div>
  );
}
