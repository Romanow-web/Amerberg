import React, { useEffect, useState } from 'react';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { EmployeeTable } from './pages/Employees';
import { useAuth } from './context/AuthContext';
import { api } from './services/api';
import { DashboardData } from './types';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees'>('dashboard');
  const [data, setData] = useState<DashboardData>({ employees: [], results: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const result = await api.getData();
      setData(result);
      setError(null);
    } catch (err) {
      setError('Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  if (authLoading) return null;

  if (!user) {
    return <LoginPage />;
  }

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}
      
      {activeTab === 'dashboard' ? (
        <Dashboard data={data} loading={loading} onRefresh={fetchData} />
      ) : (
        <EmployeeTable data={data} onDataUpdate={fetchData} onLocalDataUpdate={setData} />
      )}
    </Layout>
  );
}
