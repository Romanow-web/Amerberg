import React, { useMemo, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area
} from 'recharts';
import { DashboardData, Employee, Result, MetricType } from '../types';
import { formatNumber, getMonthName } from '../utils';
import { TrendingUp, TrendingDown, Users, Award, Check, RefreshCw, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import { MetricSelector } from '../components/MetricSelector';
import { StatusSelector, AgentStatusFilter } from '../components/StatusSelector';

interface DashboardProps {
  data: DashboardData;
  loading: boolean;
  onRefresh?: () => void;
}

export function Dashboard({ data, loading, onRefresh }: DashboardProps) {
  const [chartType, setChartType] = React.useState<'total' | 'top5' | 'all'>('total');
  const [timeRange, setTimeRange] = React.useState<number>(6); // months
  const [selectedMetric, setSelectedMetric] = React.useState<MetricType>('signed_contracts');

  // Process data for charts and KPIs
  const processedData = useMemo(() => {
    if (!data?.results?.length) return null;

    // 1. Filter by Metric, Status, and Role (Always Active and non-SV for Dashboard)
    const employeeMap = new Map(data.employees.map(e => [e.employee_id, e]));
    
    // Base results for charts and KPIs (Rule: Active, non-SV, and metric_value > 0)
    const baseResults = data.results.filter(r => {
      const isMetric = r.metric_type === selectedMetric;
      const emp = employeeMap.get(r.employee_id);
      const isActive = emp && emp.status === 'active';
      const isNotSV = emp && emp.role !== 'SV';
      const isPositive = r.metric_value > 0;
      return isMetric && isActive && isNotSV && isPositive;
    });

    // 2. Get sorted unique months
    const allMonths = Array.from(new Set(baseResults.map(r => r.month))).sort();
    if (allMonths.length === 0) return null;
    const latestMonth = allMonths[allMonths.length - 1];

    // 3. Identify "Current" range months
    const currentMonths = allMonths.slice(-timeRange);
    
    // 4. Identify "Previous" range months (for comparison)
    const prevStartIndex = -timeRange * 2;
    const prevEndIndex = -timeRange;
    const previousMonths = allMonths.slice(Math.max(0, allMonths.length + prevStartIndex), Math.max(0, allMonths.length + prevEndIndex));

    // 5. Filter results
    const currentResults = baseResults.filter(r => currentMonths.includes(r.month));
    const previousResults = baseResults.filter(r => previousMonths.includes(r.month));

    return {
      currentResults,
      previousResults,
      currentMonths,
      previousMonths,
      latestMonth
    };
  }, [data, selectedMetric, timeRange]);

  // Debug Logging
  useEffect(() => {
    if (processedData) {
      const totalKpiValue = processedData.currentResults.reduce((sum, r) => sum + r.metric_value, 0);
      console.log('--- KPI Debug ---');
      console.log('selectedDateRange:', timeRange);
      console.log('latestMonth:', processedData.latestMonth);
      console.log('filteredResults.length:', processedData.currentResults.length);
      console.log('totalKpiValue:', totalKpiValue);
      console.log('-----------------');
    }
  }, [processedData, timeRange]);

  // Prepare Chart Data
  const chartData = useMemo(() => {
    if (!processedData) return [];
    const { currentMonths, currentResults } = processedData;

    return currentMonths.map(month => {
      const monthResults = currentResults.filter(r => r.month === month);
      
      const entry: any = {
        name: getMonthName(month),
        date: month,
        Total: monthResults.reduce((sum, r) => sum + r.metric_value, 0),
      };

      // Add individual employee data for 'all' or 'top5' view
      monthResults.forEach(r => {
        const emp = data.employees?.find(e => e.employee_id === r.employee_id);
        if (emp) {
          entry[emp.name] = r.metric_value;
        }
      });

      return entry;
    });
  }, [processedData, data.employees]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    if (!processedData) return null;
    const { currentResults, previousResults } = processedData;

    // Total Results
    const currentTotal = currentResults.reduce((sum, r) => sum + r.metric_value, 0);
    const prevTotal = previousResults.reduce((sum, r) => sum + r.metric_value, 0);
    const totalChange = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    // Avg per Employee (Denominator already excludes 0s due to baseResults filtering)
    const currentAvg = currentResults.length ? currentTotal / currentResults.length : 0;
    const prevAvg = previousResults.length ? prevTotal / previousResults.length : 0;
    const avgChange = prevAvg ? ((currentAvg - prevAvg) / prevAvg) * 100 : 0;

    // Best Performer (Sum over the selected period)
    const employeeTotals = new Map<string, number>();
    currentResults.forEach(r => {
      const current = employeeTotals.get(r.employee_id) || 0;
      employeeTotals.set(r.employee_id, current + r.metric_value);
    });

    let bestPerformerId = '';
    let bestPerformerValue = -1;

    employeeTotals.forEach((value, id) => {
      if (value > bestPerformerValue) {
        bestPerformerValue = value;
        bestPerformerId = id;
      }
    });

    const bestPerformer = bestPerformerId 
      ? data.employees?.find(e => e.employee_id === bestPerformerId) 
      : null;

    return {
      total: { value: currentTotal, change: totalChange },
      avg: { value: currentAvg, change: avgChange },
      best: { name: bestPerformer?.name || '-', value: bestPerformerValue === -1 ? 0 : bestPerformerValue },
    };
  }, [processedData, data.employees]);

  // Determine top 5 employees for the legend/lines
  const top5Employees = useMemo(() => {
    if (!data?.agentResults?.length) return [];
    
    // Calculate total score for each employee across the selected range
    const scores = new Map<string, number>();
    chartData.forEach(monthData => {
      data.employees?.forEach(emp => {
        if (emp.role !== 'SV' && monthData[emp.name]) {
          scores.set(emp.name, (scores.get(emp.name) || 0) + (monthData[emp.name] as number));
        }
      });
    });

    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
  }, [chartData, data.employees]);

  if (loading) {
    return <div className="animate-pulse space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>)}
      </div>
      <div className="h-96 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
    </div>;
  }

  const colors = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6'];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Results</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{formatNumber(kpis?.total.value || 0)}</h3>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400">
              <Check size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            {kpis?.total.change !== undefined && (
              <span className={`flex items-center font-medium ${kpis.total.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpis.total.change >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                {Math.abs(kpis.total.change).toFixed(1)}%
              </span>
            )}
            <span className="text-slate-500 ml-2">vs previous period</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Avg per Employee</p>
              <h3 className="text-3xl font-bold mt-2 text-slate-900 dark:text-white">{formatNumber(Math.round(kpis?.avg.value || 0))}</h3>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-xl text-purple-600 dark:text-purple-400">
              <Users size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
             {kpis?.avg.change !== undefined && (
              <span className={`flex items-center font-medium ${kpis.avg.change >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {kpis.avg.change >= 0 ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
                {Math.abs(kpis.avg.change).toFixed(1)}%
              </span>
            )}
            <span className="text-slate-500 ml-2">vs previous period</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Performer</p>
              <h3 className="text-2xl font-bold mt-2 text-slate-900 dark:text-white truncate max-w-[180px]">{kpis?.best.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{kpis?.best.value} results</p>
            </div>
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-xl text-amber-600 dark:text-amber-400">
              <Award size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center text-sm">
            <span className="text-slate-500">Best result in period</span>
          </div>
        </motion.div>
      </div>

      {/* Main Chart */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700"
      >
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Performance Trends</h2>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                title="Refresh Data"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Metric</span>
              <MetricSelector value={selectedMetric} onChange={setSelectedMetric} />
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">View</span>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200 dark:border-slate-700 flex text-xs font-bold uppercase tracking-wider">
                <button 
                  onClick={() => setChartType('total')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${chartType === 'total' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  Total
                </button>
                <button 
                  onClick={() => setChartType('top5')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${chartType === 'top5' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  Top 5
                </button>
                <button 
                  onClick={() => setChartType('all')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${chartType === 'all' ? 'bg-white dark:bg-slate-700 shadow-sm text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  All
                </button>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Time Range</span>
              <div className="relative">
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(Number(e.target.value))}
                  className="appearance-none bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider px-4 py-2 pr-10 text-slate-600 dark:text-slate-300 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value={1}>Last 1 Month</option>
                  <option value={3}>Last 3 Months</option>
                  <option value={6}>Last 6 Months</option>
                  <option value={12}>Last Year</option>
                </select>
                <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'total' ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                  itemStyle={{ color: '#1e293b' }}
                />
                <Area type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
              </AreaChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-700" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Legend />
                {chartType === 'top5' 
                  ? top5Employees.map((name, index) => (
                      <Line 
                        key={name}
                        type="monotone" 
                        dataKey={name} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={2}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                      />
                    ))
                  : data.employees?.filter(e => e.status === 'active').map((emp, index) => (
                      <Line 
                        key={emp.name}
                        type="monotone" 
                        dataKey={emp.name} 
                        stroke={colors[index % colors.length]} 
                        strokeWidth={1.5}
                        dot={false}
                      />
                    ))
                }
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}
