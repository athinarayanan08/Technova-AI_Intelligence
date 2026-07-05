import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore, isAdmin, isManager, isTeamLead } from '../store/authStore';
import { notificationService } from '../services';
import { useQuery } from '@tanstack/react-query';

const navItems = [
  // All roles
  { path: '/dashboard', label: 'Executive Dashboard', icon: '📊', roles: ['ADMIN', 'MANAGER'] },
  { path: '/my-tasks', label: 'My Tasks', icon: '✅', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { path: '/daily-report', label: 'Daily Report', icon: '📝', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { path: '/bugs', label: 'Bug Reports', icon: '🐛', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  // Team lead+
  { path: '/tasks', label: 'All Tasks', icon: '📋', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD'] },
  { path: '/projects', label: 'Projects', icon: '🚀', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD'] },
  { path: '/employees', label: 'Team Members', icon: '👥', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD'] },
  // Manager+
  { path: '/ai/insights', label: 'AI Insights', icon: '🤖', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  { path: '/ai/assistant', label: 'AI Assistant', icon: '💬', roles: ['ADMIN', 'MANAGER', 'TEAM_LEAD', 'EMPLOYEE'] },
  // Admin
  { path: '/admin/setup', label: 'Org Setup', icon: '⚙️', roles: ['ADMIN'] },
];

export default function DashboardLayout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const { data: notifications } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationService.getAll(true).then(r => r.data),
    refetchInterval: 30000,
  });

  const unreadCount = notifications?.length || 0;
  const userRole = user?.role || 'EMPLOYEE';

  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleColor: Record<string, string> = {
    ADMIN: '#f43f5e',
    MANAGER: '#f59e0b',
    TEAM_LEAD: '#8b5cf6',
    EMPLOYEE: '#06b6d4',
  };

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
              <path d="M16 2L30 9V23L16 30L2 23V9L16 2Z" fill="url(#hexGrad2)" />
              <circle cx="16" cy="16" r="5" fill="white" fillOpacity="0.9" />
              <defs>
                <linearGradient id="hexGrad2" x1="0" y1="0" x2="32" y2="32">
                  <stop offset="0%" stopColor="#a3e635" />
                  <stop offset="100%" stopColor="#d946ef" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {sidebarOpen && (
            <div>
              <span className="sidebar-logo-text">Techno</span>
              <span className="sidebar-logo-sub">AI Platform</span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'sidebar-nav-item--active' : ''}`
              }
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {sidebarOpen && <span className="sidebar-nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ borderColor: roleColor[userRole] }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          {sidebarOpen && (
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.name}</span>
              <span className="sidebar-user-role" style={{ color: roleColor[userRole] }}>
                {userRole}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <button
            className="topbar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>

          <div className="topbar-right">
            <button
              className="topbar-notif-btn"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px' }}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>

            <NavLink to="/notifications" className="topbar-notif-btn">
              🔔
              {unreadCount > 0 && (
                <span className="topbar-notif-badge">{unreadCount}</span>
              )}
            </NavLink>

            <div className="topbar-user">
              <div className="topbar-avatar" style={{ background: `${roleColor[userRole]}22`, borderColor: roleColor[userRole] }}>
                {user?.name?.charAt(0)}
              </div>
              <div className="topbar-user-info">
                <span>{user?.name}</span>
                <span style={{ color: roleColor[userRole], fontSize: '11px' }}>{userRole}</span>
              </div>
            </div>

            <button className="btn-ghost" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
