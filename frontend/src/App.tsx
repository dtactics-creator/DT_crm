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
import { lazy, Suspense } from 'react';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Leads = lazy(() => import('./pages/Leads'));
const Projects = lazy(() => import('./pages/Projects'));
const Clients = lazy(() => import('./pages/Clients'));
const Masters = lazy(() => import('./pages/Masters'));
const Employees = lazy(() => import('./pages/Employees'));
const Roles = lazy(() => import('./pages/Roles'));
const Templates = lazy(() => import('./pages/Templates'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const AuditLogs = lazy(() => import('./pages/AuditLogs'));
const Quotations = lazy(() => import('./pages/Quotations'));
const Settings = lazy(() => import('./pages/Settings'));
const Campaigns = lazy(() => import('./pages/Campaigns'));
const CampaignDashboard = lazy(() => import('./pages/CampaignDashboard'));
const CampaignMasters = lazy(() => import('./pages/CampaignMasters'));
const CampaignTemplates = lazy(() => import('./pages/CampaignTemplates'));
const CampaignSetup = lazy(() => import('./pages/CampaignSetup'));
const Tasks = lazy(() => import('./pages/Tasks'));
const ProjectManagementMasters = lazy(() => import('./pages/ProjectManagementMasters'));

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

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
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
                  <Suspense fallback={<BrandLoader />}>
                    <Routes>
                      <Route path="/login" element={<LoginRoute />} />
                      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/leads" element={<RequirePermission perm="leads.view"><Leads /></RequirePermission>} />
                        <Route path="/projects" element={<RequirePermission perm="projects.view"><Projects /></RequirePermission>} />
                        <Route path="/clients" element={<RequirePermission perm="clients.view"><Clients /></RequirePermission>} />
                        <Route path="/tasks" element={<RequirePermission perm="tasks.view"><Tasks /></RequirePermission>} />
                        <Route path="/project-management/masters" element={<RequirePermission perm="masters.view"><ProjectManagementMasters /></RequirePermission>} />
                        <Route path="/masters" element={<RequirePermission perm="masters.view"><Masters /></RequirePermission>} />
                        <Route path="/employees" element={<RequirePermission perm="employees.view"><Employees /></RequirePermission>} />
                        <Route path="/roles" element={<RequirePermission perm="roles.view"><Roles /></RequirePermission>} />
                        <Route path="/templates" element={<RequirePermission perm="templates.view"><Templates /></RequirePermission>} />
                        <Route path="/reports" element={<RequirePermission perm="reports.view"><Reports /></RequirePermission>} />
                        <Route path="/audit-logs" element={<RequirePermission perm="audit_logs.view"><AuditLogs /></RequirePermission>} />
                        <Route path="/quotations" element={<RequirePermission perm="quotations.view"><Quotations /></RequirePermission>} />
                        <Route path="/settings" element={<RequirePermission perm="masters.edit"><Settings /></RequirePermission>} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/campaign-dashboard" element={<CampaignDashboard />} />
                        <Route path="/campaigns" element={<Campaigns />} />
                        <Route path="/campaign-masters" element={<CampaignMasters />} />
                        <Route path="/campaign-templates" element={<CampaignTemplates />} />
                        <Route path="/campaign-setup" element={<CampaignSetup />} />
                      </Route>
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ToastProvider>
              </PermissionProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

