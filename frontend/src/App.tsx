import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './store/authStore';

// Lazy load pages for performance
const LoginPage = React.lazy(() => import('./pages/auth/LoginPage'));
const DashboardLayout = React.lazy(() => import('./layouts/DashboardLayout'));
const ExecutiveDashboard = React.lazy(() => import('./pages/dashboard/ExecutiveDashboard'));
const ProjectsPage = React.lazy(() => import('./pages/projects/ProjectsPage'));
const ProjectDetailPage = React.lazy(() => import('./pages/projects/ProjectDetailPage'));
const TasksPage = React.lazy(() => import('./pages/tasks/TasksPage'));
const MyTasksPage = React.lazy(() => import('./pages/tasks/MyTasksPage'));
const EmployeesPage = React.lazy(() => import('./pages/employees/EmployeesPage'));
const BugsPage = React.lazy(() => import('./pages/bugs/BugsPage'));
const DailyReportPage = React.lazy(() => import('./pages/reports/DailyReportPage'));
const AIAssistantPage = React.lazy(() => import('./pages/ai/AIAssistantPage'));
const AIInsightsPage = React.lazy(() => import('./pages/ai/AIInsightsPage'));
const OrgSetupPage = React.lazy(() => import('./pages/admin/OrgSetupPage'));
const NotificationsPage = React.lazy(() => import('./pages/notifications/NotificationsPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ children, allowedRoles }: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to their default landing page to prevent 403 error loops
    if (user.role === 'ADMIN' || user.role === 'MANAGER') {
      return <Navigate to="/dashboard" replace />;
    } else if (user.role === 'TEAM_LEAD') {
      return <Navigate to="/tasks" replace />;
    } else {
      return <Navigate to="/my-tasks" replace />;
    }
  }
  return <>{children}</>;
}

function DashboardRedirect() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN' || user.role === 'MANAGER') {
    return <Navigate to="/dashboard" replace />;
  } else if (user.role === 'TEAM_LEAD') {
    return <Navigate to="/tasks" replace />;
  } else {
    return <Navigate to="/my-tasks" replace />;
  }
}

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <React.Suspense fallback={
          <div className="loading-screen">
            <div className="loading-spinner" />
            <p>Loading TechNova AI Platform...</p>
          </div>
        }>
          <Routes>
            <Route path="/login" element={
              isAuthenticated ? <DashboardRedirect /> : <LoginPage />
            } />

            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardRedirect />} />
              <Route path="dashboard" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                  <ExecutiveDashboard />
                </ProtectedRoute>
              } />

              {/* Employee routes */}
              <Route path="my-tasks" element={<MyTasksPage />} />
              <Route path="bugs" element={<BugsPage />} />
              <Route path="daily-report" element={<DailyReportPage />} />
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Team Lead + Manager routes */}
              <Route path="tasks" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TEAM_LEAD']}>
                  <TasksPage />
                </ProtectedRoute>
              } />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />

              {/* Manager + Admin routes */}
              <Route path="employees" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TEAM_LEAD']}>
                  <EmployeesPage />
                </ProtectedRoute>
              } />
              <Route path="ai/insights" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE']}>
                  <AIInsightsPage />
                </ProtectedRoute>
              } />
              <Route path="ai/assistant" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE']}>
                  <AIAssistantPage />
                </ProtectedRoute>
              } />

              {/* Admin only */}
              <Route path="admin/setup" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <OrgSetupPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<DashboardRedirect />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
