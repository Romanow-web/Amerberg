import { Employee, Result, DashboardData } from '../types';

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  { employee_id: 'E001', name: 'Serhii', team: 'Sales', status: 'active', role: 'Manager', start_date: '2024-01-01' },
  { employee_id: 'E002', name: 'Nick', team: 'Sales', status: 'active', role: 'Sales Rep', start_date: '2024-02-01' },
  { employee_id: 'E003', name: 'Vitalii', team: 'Support', status: 'active', role: 'Support Agent', start_date: '2024-03-01' },
  { employee_id: 'E004', name: 'Salim', team: 'Sales', status: 'active', role: 'Sales Rep', start_date: '2024-01-15' },
  { employee_id: 'E005', name: 'Egor', team: 'Dev', status: 'active', role: 'Developer', start_date: '2023-11-01' },
  { employee_id: 'E006', name: 'Nazar', team: 'Dev', status: 'inactive', role: 'Developer', start_date: '2023-10-01' },
  { employee_id: 'E007', name: 'Vlad', team: 'Marketing', status: 'active', role: 'Marketer', start_date: '2024-05-01' },
  { employee_id: 'E008', name: 'Mansur', team: 'Sales', status: 'active', role: 'Sales Rep', start_date: '2024-04-01' },
  { employee_id: 'E009', name: 'Anna', team: 'Support', status: 'active', role: 'Support Agent', start_date: '2024-03-15' },
  { employee_id: 'E010', name: 'Dmytro', team: 'Dev', status: 'active', role: 'Developer', start_date: '2024-01-01' },
];

const generateMockResults = (): Result[] => {
  const results: Result[] = [];
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];
  
  MOCK_EMPLOYEES.forEach(emp => {
    months.forEach(month => {
      // Random value between 10 and 100, slightly trending up
      const base = 20 + Math.random() * 50;
      const trend = months.indexOf(month) * 2;
      const value = Math.floor(base + trend + (emp.team === 'Sales' ? 30 : 0));
      
      if (emp.status === 'inactive' && months.indexOf(month) > 3) return;

      results.push({
        id: `${emp.employee_id}-${month}`,
        month: month,
        employee_id: emp.employee_id,
        metric_type: 'sales',
        metric_value: value,
        notes: Math.random() > 0.8 ? 'Great job!' : undefined
      });
    });
  });
  return results;
};

const MOCK_RESULTS = generateMockResults();

// API Service
const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyKSzxazliVjaX2uPYD5bI9Oe2g8ZHyaPm9cx9pE4fhpNHVLeiP3SZofmmJsrRCYsSp/exec';

export const api = {
  async getData(): Promise<DashboardData> {
    if (!GOOGLE_SCRIPT_URL) {
      console.warn('No Google Script URL provided, using mock data.');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        employees: MOCK_EMPLOYEES,
        results: MOCK_RESULTS
      };
    }

    try {
      const [employeesRes, resultsRes] = await Promise.all([
        fetch(`${GOOGLE_SCRIPT_URL}?action=employees`),
        fetch(`${GOOGLE_SCRIPT_URL}?action=results`)
      ]);

      if (!employeesRes.ok) throw new Error('Failed to fetch employees');
      if (!resultsRes.ok) throw new Error('Failed to fetch results');

      const rawEmployees = await employeesRes.json();
      const rawResults = await resultsRes.json();

      // Defensive filtering for Employees
      // Require: employee_id, name
      const employees = (Array.isArray(rawEmployees) ? rawEmployees : [])
        .filter((emp: any) => {
          return emp && typeof emp === 'object' && emp.employee_id && emp.name;
        });

      // Defensive filtering for Results
      // Require: employee_id, month, metric_type
      // Require: metric_value to be a valid number (allow 0)
      const results = (Array.isArray(rawResults) ? rawResults : [])
        .map((res: any) => {
          // Normalize month if it's an ISO string
          let normalizedMonth = res.month;
          if (typeof normalizedMonth === 'string' && normalizedMonth.includes('T')) {
            try {
              normalizedMonth = new Date(normalizedMonth).toISOString().slice(0, 7);
            } catch (e) {
              // Keep original if parsing fails
            }
          }

          return {
            ...res,
            month: normalizedMonth,
            metric_value: res.metric_value === '' || res.metric_value === null || res.metric_value === undefined ? 0 : Number(res.metric_value)
          };
        })
        .filter((res: any) => {
          return (
            res &&
            typeof res === 'object' &&
            res.employee_id &&
            res.month &&
            res.metric_type &&
            !isNaN(res.metric_value)
          );
        });

      return {
        employees,
        results
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async addResult(result: Omit<Result, 'id'>): Promise<Result> {
    if (!GOOGLE_SCRIPT_URL) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newResult = { ...result, id: Math.random().toString(36).substr(2, 9) };
      MOCK_RESULTS.push(newResult);
      return newResult;
    }

    const payload = {
      ...result,
      id: Date.now()
    };

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) throw new Error('Failed to add result');
    const savedData = await response.json();
    return {
      ...savedData,
      id: String(savedData.id || payload.id)
    };
  }
};
