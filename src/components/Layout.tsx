import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { cn } from '../utils';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'employees';
  onTabChange: (tab: 'dashboard' | 'employees') => void;
}

export function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = React.useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // Sync with system theme changes if no preference is saved
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-200 flex flex-col">
      {/* Navbar */}
      <nav className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 fixed top-0 left-0 right-0 z-50 h-auto sm:h-16 bg-opacity-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16">
          <div className="flex justify-between h-full">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                  TP
                </div>
                <span className="font-bold text-xl tracking-tight hidden sm:block">
                  Team Performance
                </span>
              </div>
              <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                <button
                  onClick={() => onTabChange('dashboard')}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors',
                    activeTab === 'dashboard'
                      ? 'border-indigo-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => onTabChange('employees')}
                  className={cn(
                    'inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium h-full transition-colors',
                    activeTab === 'employees'
                      ? 'border-indigo-500 text-gray-900 dark:text-white'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:border-gray-300 hover:text-gray-700 dark:hover:text-gray-300'
                  )}
                >
                  Employee Results
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-700">
                <div className="flex flex-col items-end hidden md:flex">
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</span>
                </div>
                <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                  <UserIcon size={16} />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Mobile menu tabs */}
        <div className="sm:hidden border-t border-slate-200 dark:border-slate-700 flex">
          <button
            onClick={() => onTabChange('dashboard')}
            className={cn(
              'flex-1 py-3 text-sm font-medium text-center',
              activeTab === 'dashboard'
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => onTabChange('employees')}
            className={cn(
              'flex-1 py-3 text-sm font-medium text-center',
              activeTab === 'employees'
                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 dark:text-gray-400'
            )}
          >
            Employees
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-28 sm:mt-16 flex-grow w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
          Designed by <a href="https://rvvs.us" target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium transition-colors">Romanow Web Studio</a>.
        </div>
      </footer>
    </div>
  );
}
