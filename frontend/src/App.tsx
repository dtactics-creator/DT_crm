import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { PermissionProvider } from './contexts/PermissionContext';
import { ToastProvider } from './components/ui/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import RequirePermission from './components/RequirePermission';
import AppLayout from './components/layout/AppLayout';
import BrandLoader from './components/BrandLoader';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Projects from './pages/Projects';
import Masters from './pages/Masters';
import Employees from './pages/Employees';
import Roles from './pages/Roles';
import Templates from './pages/Templates';
import Reports from './pages/Reports';
import Profile from './pages/Profile';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 },
  },
});

function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <BrandLoader />;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

import React from 'react';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: Error | null}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, color: 'red', background: 'white', position: 'fixed', zIndex: 9999, inset: 0 }}>
          <h2>Something went wrong.</h2>
          <pre>{this.state.error?.toString()}</pre>
          <pre>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <PermissionProvider>
                <ToastProvider>
                  <Routes>
                    <Route path="/login" element={<LoginRoute />} />
                    <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/leads" element={<RequirePermission perm="leads.view"><Leads /></RequirePermission>} />
                      <Route path="/projects" element={<RequirePermission perm="projects.view"><Projects /></RequirePermission>} />
                      <Route path="/masters" element={<RequirePermission perm="masters.view"><Masters /></RequirePermission>} />
                      <Route path="/employees" element={<RequirePermission perm="employees.view"><Employees /></RequirePermission>} />
                      <Route path="/roles" element={<RequirePermission perm="roles.view"><Roles /></RequirePermission>} />
                      <Route path="/templates" element={<RequirePermission perm="templates.view"><Templates /></RequirePermission>} />
                      <Route path="/reports" element={<RequirePermission perm="reports.view"><Reports /></RequirePermission>} />
                      <Route path="/profile" element={<Profile />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </ToastProvider>
              </PermissionProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
