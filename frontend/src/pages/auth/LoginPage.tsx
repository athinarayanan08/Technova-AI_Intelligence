import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Tab state: 'staff' (Manager, Team Lead, Employee) or 'admin' (Admin)
  const [activePortal, setActivePortal] = useState<'admin' | 'staff'>('staff');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authService.login(email, password);
      const { access_token, refresh_token, user } = res.data;
      login(user, access_token, refresh_token);
      navigate('/dashboard');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to the backend server. Please verify the API is running on port 8000.');
      } else {
        setError(err.response.data?.detail || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (role: string) => {
    const creds: Record<string, { email: string; password: string }> = {
      admin: { email: 'admin@technova.com', password: 'Admin@123' },
      manager: { email: 'rajan@technova.com', password: 'Manager@123' },
      lead: { email: 'priya.sharma@technova.com', password: 'Lead@123' },
      employee: { email: 'adhi.rajan@technova.com', password: 'Employee@123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div className="login-page-container">

      <div className="login-grid-wrapper">
        
        {/* Left Side Panel */}
        <div className="login-left-panel">
          <div className="login-badge-pill">
            <span>🔐</span> Secure Access Portal
          </div>
          
          <h1 className="login-hero-title">
            Unlock evidence-grounded operations.
          </h1>
          
          <p className="login-hero-desc">
            Access Techno's RAG-driven dashboard to track attendance records, report defection pipelines, and automate employee health check analytics.
          </p>

          {/* Quick logins styled like contact options in reference image */}
          <div className="login-demo-pills">
            <button 
              type="button" 
              className="login-demo-pill-card" 
              onClick={() => {
                setActivePortal('admin');
                quickLogin('admin');
              }}
            >
              <div className="login-demo-pill-left">
                <div className="login-demo-pill-icon">💻</div>
                <div className="login-demo-pill-text">
                  <span className="login-demo-pill-name">CTO Admin Access</span>
                  <span className="login-demo-pill-subtitle">CTO/Admin credentials</span>
                </div>
              </div>
              <span className="login-demo-pill-arrow">➔</span>
            </button>

            <button 
              type="button" 
              className="login-demo-pill-card" 
              onClick={() => {
                setActivePortal('staff');
                quickLogin('manager');
              }}
            >
              <div className="login-demo-pill-left">
                <div className="login-demo-pill-icon">💼</div>
                <div className="login-demo-pill-text">
                  <span className="login-demo-pill-name">Manager Workspace</span>
                  <span className="login-demo-pill-subtitle">Managerial dashboard controls</span>
                </div>
              </div>
              <span className="login-demo-pill-arrow">➔</span>
            </button>

            <button 
              type="button" 
              className="login-demo-pill-card" 
              onClick={() => {
                setActivePortal('staff');
                quickLogin('employee');
              }}
            >
              <div className="login-demo-pill-left">
                <div className="login-demo-pill-icon">👥</div>
                <div className="login-demo-pill-text">
                  <span className="login-demo-pill-name">Staff & Leads Login</span>
                  <span className="login-demo-pill-subtitle">Team member workspace logs</span>
                </div>
              </div>
              <span className="login-demo-pill-arrow">➔</span>
            </button>
          </div>
        </div>

        {/* Right Side Form Card */}
        <div className="login-split-card">
          
          {/* Portal Tabs */}
          <div className="login-segment-tabs">
            <button 
              type="button" 
              className={`login-segment-btn ${activePortal === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setActivePortal('staff');
                setEmail('');
                setPassword('');
              }}
            >
              Staff Workspace
            </button>
            <button 
              type="button" 
              className={`login-segment-btn ${activePortal === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setActivePortal('admin');
                setEmail('');
                setPassword('');
              }}
            >
              Admin Portal
            </button>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', marginBottom: '1.5rem', textAlign: 'center' }}>
            {activePortal === 'admin' ? 'Administrator Authentication' : 'Personnel Sign In'}
          </h2>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="login-field-glow-group">
              <label className="label" htmlFor="email" style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder={activePortal === 'admin' ? 'admin@technova.com' : 'employee@technova.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="login-field-glow-group">
              <label className="label" htmlFor="password" style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.5rem', display: 'block' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="login-error" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>⚠️</span> {error}
              </div>
            )}

            <button type="submit" className="login-submit-glow-btn w-full" disabled={loading}>
              {loading ? (
                <span className="btn-loading">
                  <span className="spinner-sm" /> Authenticating...
                </span>
              ) : (
                activePortal === 'admin' ? 'Sign In as Admin' : 'Sign In to Workspace'
              )}
            </button>
          </form>

        </div>

      </div>
    </div>
  );
}
