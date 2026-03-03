export interface Employee {
  employee_id: string;
  name: string;
  team?: string;
  status: 'active' | 'inactive';
  start_date?: string;
  role?: string;
}

export type MetricType = 'signed_contracts' | 'cars_shipped';

export interface Result {
  id: string; // unique id for the result row
  month: string; // YYYY-MM
  employee_id: string;
  metric_type: MetricType;
  metric_value: number;
  notes?: string;
}

export interface DashboardData {
  employees: Employee[];
  results: Result[];
  agentResults: Result[];
  supervisorResults: Result[];
}

export interface KPI {
  label: string;
  value: string | number;
  change?: number; // percentage
  trend?: 'up' | 'down' | 'neutral';
}

export type UserRole = 'admin' | 'viewer';

export interface User {
  email: string;
  role: UserRole;
  name: string;
}
