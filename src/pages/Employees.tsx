import React, { useMemo, useState, useRef } from 'react';
import { DashboardData, Employee, Result, MetricType } from '../types';
import { getMonthName, parseCSV } from '../utils';
import { Search, Filter, Download, ChevronLeft, ChevronRight, X, Upload, Plus, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '../components/Button';
import { MetricSelector } from '../components/MetricSelector';
import { StatusSelector, AgentStatusFilter } from '../components/StatusSelector';

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
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('signed_contracts');
  const [agentStatus, setAgentStatus] = useState<AgentStatusFilter>('active');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get all unique months
  const months = useMemo(() => {
    if (!data?.results) return [];
    return Array.from(new Set(data.results.map(r => r.month))).sort().reverse();
  }, [data.results]);

  // Months for table display (Oldest -> Newest)
  const tableMonths = useMemo(() => [...months].reverse(), [months]);

  // Filter data
  const filteredEmployees = useMemo(() => {
    if (!data?.employees) return [];
    return data.employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emp.team?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = agentStatus === 'all' || emp.status === agentStatus;
      
      return matchesSearch && matchesStatus;
    });
  }, [data.employees, searchTerm, agentStatus]);

  // Pivot data for table: Employee -> { [Month]: Value, Total: Sum }
  const tableData = useMemo(() => {
    return filteredEmployees.map(emp => {
      // Filter results by employee AND selected metric
      const empResults = data.results.filter(r => 
        r.employee_id === emp.employee_id && 
        r.metric_type === selectedMetric
      );
      
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
  }, [filteredEmployees, data.results, selectedMonth, selectedMetric]);

  // Export to CSV
  const handleExport = () => {
    const headers = ['Name', 'Team', 'Status', ...tableMonths, 'Total'];
    const csvRows = [
      headers.join(','),
      ...tableData.map(row => [
        row.name,
        row.team || '',
        row.status,
        ...tableMonths.map(m => row.monthlyData[m] || 0),
        row.total
      ].join(','))
    ];
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `employee_results_${selectedMetric}.csv`;
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
          const newEmployees = rows
            .filter((r: any) => agentStatus === 'all' || (r.status || 'active') === agentStatus)
            .map((r: any) => ({
              employee_id: r.employee_id || Math.random().toString(36).substr(2, 9),
              name: r.name,
              team: r.team,
              status: r.status || 'active',
              start_date: r.start_date,
              role: r.role
            })) as Employee[];
          
          if (newEmployees.length === 0 && rows.length > 0) {
            alert('No employees imported. The imported data does not match the currently filtered status.');
            return;
          }

          onLocalDataUpdate({
            ...data,
            employees: [...data.employees, ...newEmployees]
          });
          alert(`Imported ${newEmployees.length} employees successfully!`);
        } else if (isResults) {
          const filteredEmpIds = new Set(filteredEmployees.map(e => e.employee_id));
          const newResults = rows
            .filter((r: any) => filteredEmpIds.has(r.employee_id))
            .map((r: any) => ({
              id: r.id || Math.random().toString(36).substr(2, 9),
              month: r.month,
              employee_id: r.employee_id,
              metric_type: r.metric_type || selectedMetric,
              metric_value: Number(r.metric_value),
              notes: r.notes
            })) as Result[];

          if (newResults.length === 0 && rows.length > 0) {
            alert('No results imported. The imported data does not match the currently filtered employees.');
            return;
          }

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
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex flex-col lg:flex-row justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4 flex-1">
            <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Search</span>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search employees or teams..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Metric</span>
              <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Agent Status</span>
              <StatusSelector value={agentStatus} onChange={setAgentStatus} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Period</span>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="appearance-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl py-2 pl-4 pr-10 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="all">All Months</option>
                  {months.map(m => (
                    <option key={m} value={m}>{getMonthName(m)}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImport} 
              accept=".csv" 
              className="hidden" 
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              icon={<Upload size={18} />}
              size="md"
              className="flex-1 sm:flex-none"
            >
              Import
            </Button>
            <Button
              onClick={handleExport}
              variant="primary"
              icon={<Download size={18} />}
              size="md"
              className="flex-1 sm:flex-none"
            >
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky left-0 top-0 bg-slate-50 dark:bg-slate-900 z-30">
                  Employee
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-50 dark:bg-slate-900 z-20">
                  Team
                </th>
                {tableMonths.map(m => (
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
                  {tableMonths.map(m => (
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
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Edit Results</h4>
                  <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-medium">
                    {selectedMetric === 'signed_contracts' ? 'Signed Contracts' : 'Cars Shipped'}
                  </div>
                </div>
                
                <EditResultsForm 
                  employee={selectedEmployee} 
                  months={months} 
                  data={data}
                  metricType={selectedMetric}
                  onUpdate={() => {
                    onDataUpdate();
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

function EditResultsForm({ employee, months, data, metricType, onUpdate }: { employee: Employee, months: string[], data: DashboardData, metricType: MetricType, onUpdate: () => void }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<'delta' | 'absolute'>('delta');
  
  // Initialize values from existing data
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    // Show last 6 months by default or all available if less
    const monthsToShow = months.slice(0, 6);
    monthsToShow.forEach(m => {
      // Initialize with empty string for delta mode, or current value for absolute mode
      initial[m] = '';
    });
    return initial;
  });

  // Reset values when edit mode changes
  React.useEffect(() => {
    const initial: Record<string, string> = {};
    const monthsToShow = months.slice(0, 6);
    monthsToShow.forEach(m => {
      if (editMode === 'absolute') {
        const result = data.results.find(r => r.employee_id === employee.employee_id && r.month === m && r.metric_type === metricType);
        initial[m] = result ? String(result.metric_value) : '';
      } else {
        initial[m] = ''; // Delta starts empty (0)
      }
    });
    setValues(initial);
  }, [editMode, data.results, employee.employee_id, months, metricType]);

  const handleSave = async (month: string) => {
    const valStr = values[month];
    
    // Validation
    if (valStr === '' && editMode === 'absolute') {
      // If absolute and empty, maybe treat as 0 or warn? Let's treat as 0 if empty in absolute mode too?
      // Requirement says: "In 'Add delta' mode, if current value is empty -> treat as 0."
      // For absolute, let's allow 0.
    }
    
    if (valStr !== '' && isNaN(Number(valStr))) {
      alert('Please enter a valid number');
      return;
    }

    const inputVal = valStr === '' ? 0 : Number(valStr);
    
    // Calculate final value
    let finalValue = inputVal;
    if (editMode === 'delta') {
      const currentResult = data.results.find(r => r.employee_id === employee.employee_id && r.month === month && r.metric_type === metricType);
      const currentVal = currentResult ? currentResult.metric_value : 0;
      finalValue = currentVal + inputVal;
    }

    if (finalValue < 0) {
      alert('Resulting value cannot be negative');
      return;
    }

    setLoading(month);
    try {
      await api.upsertResult({
        month: month,
        employee_id: employee.employee_id,
        metric_value: finalValue,
        metric_type: metricType
      });
      
      onUpdate();
      
      // Reset input if delta mode
      if (editMode === 'delta') {
        setValues(prev => ({ ...prev, [month]: '' }));
      }
      
      // Optional: show success toast/alert
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
      {/* Edit Mode Toggle */}
      <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg w-fit mb-4">
        <button
          onClick={() => setEditMode('delta')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            editMode === 'delta' 
              ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Add Delta (+/-)
        </button>
        <button
          onClick={() => setEditMode('absolute')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            editMode === 'absolute' 
              ? 'bg-white dark:bg-slate-600 shadow-sm text-indigo-600 dark:text-indigo-400' 
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
          }`}
        >
          Set Value
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 max-h-[50vh] overflow-y-auto pr-2">
        {monthsToShow.map(m => {
          const currentResult = data.results.find(r => r.employee_id === employee.employee_id && r.month === m && r.metric_type === metricType);
          const currentVal = currentResult ? currentResult.metric_value : 0;

          return (
            <div key={m} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg">
              <div className="w-24">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{getMonthName(m)}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Current: {currentVal}</div>
              </div>
              
              <div className="flex-1 relative">
                <input 
                  type="number" 
                  value={values[m] || ''}
                  onChange={e => setValues(prev => ({ ...prev, [m]: e.target.value }))}
                  className={`w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-sm ${
                    editMode === 'delta' 
                      ? 'border-indigo-300 dark:border-indigo-700 focus:ring-indigo-500' 
                      : 'border-slate-300 dark:border-slate-600 focus:ring-slate-500'
                  }`}
                  placeholder={editMode === 'delta' ? '+/-' : '0'}
                />
                {editMode === 'delta' && values[m] && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                    New: {currentVal + Number(values[m])}
                  </div>
                )}
              </div>

              <button 
                onClick={() => handleSave(m)}
                disabled={loading === m}
                className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50 min-w-[60px]"
              >
                {loading === m ? '...' : 'Save'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
