import { Employee, Result, DashboardData } from '../types';

// Mock Data
const MOCK_EMPLOYEES: Employee[] = [
  { employee_id: 'E001', name: 'Serhii (SV)', team: 'Sales', status: 'active', role: 'SV', start_date: '2024-01-01' },
  { employee_id: 'E002', name: 'Nick', team: 'Sales', status: 'active', role: 'Agent', start_date: '2024-02-01' },
  { employee_id: 'E003', name: 'Vitalii', team: 'Support', status: 'active', role: 'Agent', start_date: '2024-03-01' },
  { employee_id: 'E004', name: 'Salim', team: 'Sales', status: 'active', role: 'Agent', start_date: '2024-01-15' },
  { employee_id: 'E005', name: 'Egor', team: 'Dev', status: 'active', role: 'Agent', start_date: '2023-11-01' },
  { employee_id: 'E006', name: 'Nazar', team: 'Dev', status: 'inactive', role: 'Agent', start_date: '2023-10-01' },
  { employee_id: 'E007', name: 'Vlad', team: 'Marketing', status: 'active', role: 'Agent', start_date: '2024-05-01' },
  { employee_id: 'E008', name: 'Mansur', team: 'Sales', status: 'active', role: 'Agent', start_date: '2024-04-01' },
  { employee_id: 'E009', name: 'Anna', team: 'Support', status: 'active', role: 'Agent', start_date: '2024-03-15' },
  { employee_id: 'E010', name: 'Dmytro', team: 'Dev', status: 'active', role: 'Agent', start_date: '2024-01-01' },
];

const generateMockResults = (): Result[] => {
  const results: Result[] = [];
  const months = ['2025-09', '2025-10', '2025-11', '2025-12', '2026-01', '2026-02'];
  
  MOCK_EMPLOYEES.forEach(emp => {
    months.forEach(month => {
      if (emp.status === 'inactive' && months.indexOf(month) > 3) return;

      // Signed Contracts
      const baseContracts = 20 + Math.random() * 50;
      const trendContracts = months.indexOf(month) * 2;
      const contractsValue = Math.floor(baseContracts + trendContracts + (emp.team === 'Sales' ? 30 : 0));
      
      results.push({
        id: `${emp.employee_id}-${month}-contracts`,
        month: month,
        employee_id: emp.employee_id,
        metric_type: 'signed_contracts',
        metric_value: contractsValue,
        notes: Math.random() > 0.8 ? 'Great job!' : undefined
      });

      // Cars Shipped
      const baseCars = 10 + Math.random() * 30;
      const trendCars = months.indexOf(month) * 1.5;
      const carsValue = Math.floor(baseCars + trendCars + (emp.team === 'Sales' ? 15 : 0));

      results.push({
        id: `${emp.employee_id}-${month}-cars`,
        month: month,
        employee_id: emp.employee_id,
        metric_type: 'cars_shipped',
        metric_value: carsValue,
      });
    });
  });
  return results;
};

const MOCK_RESULTS = generateMockResults();

// API Service
const GOOGLE_SCRIPT_URL = (import.meta as any).env.VITE_GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbyKSzxazliVjaX2uPYD5bI9Oe2g8ZHyaPm9cx9pE4fhpNHVLeiP3SZofmmJsrRCYsSp/exec';

export const api = {
  async getData(): Promise<DashboardData> {
    if (!GOOGLE_SCRIPT_URL) {
      console.warn('No Google Script URL provided, using mock data.');
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const employeeMap = new Map(MOCK_EMPLOYEES.map(e => [e.employee_id, e]));
      const agentResults = MOCK_RESULTS.filter(r => employeeMap.get(r.employee_id)?.role !== 'SV');
      const supervisorResults = MOCK_RESULTS.filter(r => employeeMap.get(r.employee_id)?.role === 'SV');

      console.log('--- DEBUG: MOCK DATA ---');
      console.log('Total Employees:', MOCK_EMPLOYEES.length);
      console.log('Total Results:', MOCK_RESULTS.length);
      console.log('Agent Results (non-SV):', agentResults.length);
      console.log('Supervisor Results (SV):', supervisorResults.length);

      return {
        employees: MOCK_EMPLOYEES,
        results: MOCK_RESULTS,
        agentResults,
        supervisorResults
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

      const employeeMap = new Map(employees.map(e => [e.employee_id, e]));

      // Defensive filtering for Results
      // Require: employee_id, month, metric_type
      // Require: metric_value to be a valid number (allow 0)
      const allResults = (Array.isArray(rawResults) ? rawResults : [])
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

      // Split results into agent and supervisor categories
      const agentResults = allResults.filter(r => {
        const emp = employeeMap.get(r.employee_id);
        return emp && emp.role !== 'SV';
      });

      const supervisorResults = allResults.filter(r => {
        const emp = employeeMap.get(r.employee_id);
        return emp && emp.role === 'SV';
      });

      console.log('--- DEBUG: API DATA ---');
      console.log('Total Employees:', employees.length);
      console.log('Total Results:', allResults.length);
      console.log('Agent Results (non-SV):', agentResults.length);
      console.log('Supervisor Results (SV):', supervisorResults.length);

      return {
        employees,
        results: allResults,
        agentResults,
        supervisorResults
      };
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async addResult(result: Omit<Result, 'id'>): Promise<Result> {
    return this.upsertResult(result);
  },

  async upsertResult(result: Omit<Result, 'id'>): Promise<Result> {
    if (!GOOGLE_SCRIPT_URL) {
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if result exists
      const existingIndex = MOCK_RESULTS.findIndex(r => 
        r.employee_id === result.employee_id && 
        r.month === result.month && 
        r.metric_type === result.metric_type
      );

      if (existingIndex >= 0) {
        // Update
        MOCK_RESULTS[existingIndex] = { ...MOCK_RESULTS[existingIndex], ...result };
        return MOCK_RESULTS[existingIndex];
      } else {
        // Create
        const newResult = { ...result, id: Math.random().toString(36).substr(2, 9) };
        MOCK_RESULTS.push(newResult);
        return newResult;
      }
    }

    const payload = {
      action: 'upsertResult',
      data: {
        ...result,
        id: Date.now() // Fallback ID if creating new
      }
    };

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8', // Use text/plain to avoid CORS preflight issues with GAS
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) throw new Error('Failed to upsert result');
      
      const savedData = await response.json();
      
      // Handle case where backend might not support upsertResult yet and returns error or null
      if (savedData.error) {
        console.warn('Backend returned error for upsertResult, falling back to addResult logic if needed:', savedData.error);
        throw new Error(savedData.error);
      }

      return {
        ...savedData,
        id: String(savedData.id || payload.data.id)
      };
    } catch (error) {
      console.error('Upsert Error:', error);
      // Fallback for now if the script doesn't support the action structure
      // We'll try the old addResult way if it was a "create" intent, but here we can't easily distinguish without more logic.
      // For now, re-throw.
      throw error;
    }
  }
};
