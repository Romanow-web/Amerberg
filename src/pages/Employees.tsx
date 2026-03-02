import React, { useMemo, useState, useRef } from 'react';
import { DashboardData, Employee, Result } from '../types';
import { getMonthName, parseCSV } from '../utils';
import { Search, Filter, Download, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface EmployeeTableProps {
  data: DashboardData;
  onDataUpdate: () => void;
  onLocalDataUpdate: (data: DashboardData) => void;
}

export function EmployeeTable({ data, onDataUpdate, onLocalDataUpdate }: EmployeeTableProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all unique months
  const months = useMemo(() => {
    if (!data?.results) return [];
    return Array.from(new Set(data.results.map(r => r.month))).sort().reverse();
  }, [data.results]);

  // Filter data
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter(emp => 
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.team?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data.employees, searchTerm]);

  // Pivot data for table: Employee -> { [Month]: Value, Total: Sum }
  const tableData = useMemo(() => {
    return filteredEmployees.map(emp => {
      const empResults = data.results.filter(r => r.employee_id === emp.employee_id);
      const monthlyData: Record<string, number> = {};
      let total = 0;

      empResults.forEach(r => {
        monthlyData[r.month] = r.metric_value;
        if (selectedMonth === 'all' || r.month === selectedMonth) {
          total += r.metric_value;
        }
      });

      return {
        ...emp,
        monthlyData,
        total
      };
    }).sort((a, b) => {
      // Supervisors (SV) always at the top
      if (a.role === 'SV' && b.role !== 'SV') return -1;
      if (a.role !== 'SV' && b.role === 'SV') return 1;
      // Then sort by total descending
      return b.total - a.total;
    });
  }, [filteredEmployees, data.results, selectedMonth]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Name', 'Team', 'Status', ...months, 'Total'];
    const csvRows = [
      headers.join(','),
      ...tableData.map(row => [
        row.name,
        row.team || '',
        row.status,
        ...months.map(m => row.monthlyData[m] || 0),
        row.total
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_results.csv';
    a.click();
  };

  // Import CSV
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const rows = parseCSV(text);
        
        // Determine if it's Employees or Results based on headers
        const isEmployees = rows[0].hasOwnProperty('employee_id') && rows[0].hasOwnProperty('name');
        const isResults = rows[0].hasOwnProperty('month') && rows[0].hasOwnProperty('metric_value');

        if (isEmployees) {
          const newEmployees = rows.map((r: any) => ({
            employee_id: r.employee_id || Math.random().toString(36).substr(2, 9),
            name: r.name,
            team: r.team,
            status: r.status || 'active',
            start_date: r.start_date,
            role: r.role
          })) as Employee[];
          
          onLocalDataUpdate({
            ...data,
            employees: [...data.employees, ...newEmployees]
          });
          alert(`Imported ${newEmployees.length} employees successfully!`);
        } else if (isResults) {
          const newResults = rows.map((r: any) => ({
            id: r.id || Math.random().toString(36).substr(2, 9),
            month: r.month,
            employee_id: r.employee_id,
            metric_type: r.metric_type || 'sales',
            metric_value: Number(r.metric_value),
            notes: r.notes
          })) as Result[];

          onLocalDataUpdate({
            ...data,
            results: [...data.results, ...newResults]
          });
          alert(`Imported ${newResults.length} results successfully!`);
        } else {
          alert('Unknown CSV format. Please use headers: employee_id, name, team, status, start_date, role (for employees) OR id, month, employee_id, metric_type, metric_value, notes (for results)');
        }
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV. Please check the format.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col md:flex-row justify-between gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700 border-none rounded-lg text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-slate-700 border-none rounded-lg py-2 pl-4 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Months</option>
              {months.map(m => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".csv" 
            className="hidden" 
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors font-medium"
          >
            <Upload size={18} />
            Import CSV
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors font-medium"
          >
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-240px)]">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 top-0 bg-slate-50 dark:bg-slate-900 z-30">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-900 z-20">
                  Team
                </th>
                {months.map(m => (
                  <th key={m} scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider whitespace-nowrap sticky top-0 bg-slate-50 dark:bg-slate-900 z-20">
                    {getMonthName(m)}
                  </th>
                ))}
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky right-0 top-0 bg-slate-50 dark:bg-slate-900 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {tableData.map((row) => (
                <tr 
                  key={row.employee_id} 
                  onClick={() => setSelectedEmployee(row)}
                  className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white dark:bg-slate-800 z-10">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-xs mr-3">
                        {row.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{row.name}</div>
                      {row.role === 'SV' && (
                        <span className="ml-2 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded uppercase">SV</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {row.team || '-'}
                  </td>
                  {months.map(m => (
                    <td key={m} className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-500 dark:text-slate-400 font-mono">
                      {row.monthlyData[m] || '-'}
                    </td>
                  ))}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-indigo-600 dark:text-indigo-400 sticky right-0 bg-white dark:bg-slate-800 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                    <div className="flex flex-col items-end">
                      <span>{row.total}</span>
                      {row.role === 'SV' && <span className="text-[10px] text-slate-400 font-normal uppercase">Team Total</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEmployee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setSelectedEmployee(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold text-lg">
                    {selectedEmployee.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedEmployee.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{selectedEmployee.team} • {selectedEmployee.status}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedEmployee(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>
              
              <div className="p-6">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 uppercase tracking-wider">Edit Results</h4>
                <EditResultsForm 
                  employee={selectedEmployee} 
                  months={months} 
                  data={data}
                  onUpdate={() => {
                    onDataUpdate();
                    // Keep modal open or close? Let's keep it open to see changes, or close it.
                    // Requirement says "update local state so table reflects new numbers".
                    // onDataUpdate triggers a re-fetch usually.
                  }} 
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function EditResultsForm({ employee, months, data, onUpdate }: { employee: Employee, months: string[], data: DashboardData, onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  // Initialize values from existing data
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    // Show last 6 months by default or all available if less
    const monthsToShow = months.slice(0, 6);
    monthsToShow.forEach(m => {
      const result = data.results.find(r => r.employee_id === employee.employee_id && r.month === m);
      initial[m] = result ? String(result.metric_value) : '';
    });
    return initial;
  });

  const handleSave = async (month: string) => {
    const val = values[month];
    if (val === '' || isNaN(Number(val)) || Number(val) < 0) {
      alert('Please enter a valid non-negative number');
      return;
    }

    setLoading(month);
    try {
      await api.upsertResult({
        month: month,
        employee_id: employee.employee_id,
        metric_value: Number(val),
        metric_type: 'sales'
      });
      
      // Optimistic update locally would be complex without full state management, 
      // but onUpdate() should trigger a refresh.
      // To make it feel "optimistic", we could update the 'data' prop directly if it was mutable, but it's not.
      // For now, we rely on the parent's onDataUpdate to refresh data.
      onUpdate();
      alert('Saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save result');
    } finally {
      setLoading(null);
    }
  };

  const monthsToShow = months.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-2">
        {monthsToShow.map(m => (
          <div key={m} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
            <div className="w-24 text-sm font-medium text-slate-700 dark:text-slate-300">
              {getMonthName(m)}
            </div>
            <input 
              type="number" 
              value={values[m] || ''}
              onChange={e => setValues(prev => ({ ...prev, [m]: e.target.value }))}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm"
              placeholder="0"
            />
            <button 
              onClick={() => handleSave(m)}
              disabled={loading === m}
              className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 min-w-[60px]"
            >
              {loading === m ? '...' : 'Save'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
