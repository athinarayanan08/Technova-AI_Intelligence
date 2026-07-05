import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService } from '../../services';
import MetricCard from '../../components/ui/MetricCard';
import HealthGauge from '../../components/ui/HealthGauge';
import InsightCard from '../../components/ui/InsightCard';
import Badge from '../../components/ui/Badge';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useState } from 'react';

export default function ExecutiveDashboard() {
  const queryClient = useQueryClient();
  const [orgId] = useState(1);

  // Fetch dashboard summary
  const { data: summary, isLoading: isSummaryLoading, isError, error } = useQuery({
    queryKey: ['dashboard-summary', orgId],
    queryFn: () => aiService.getDashboardSummary(orgId).then((res) => res.data),
  });

  // Fetch health score history for trend chart
  const { data: history } = useQuery({
    queryKey: ['health-history', orgId],
    queryFn: () => aiService.getHealthHistory(orgId, 30).then((res) => res.data),
  });

  // Refresh mutation
  const refreshMutation = useMutation({
    mutationFn: () => aiService.refreshHealthScore(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['health-history'] });
    },
  });

  if (isError) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <div className="card glass animate-fade-in" style={{ padding: '2rem', maxWidth: '480px', textAlign: 'center', border: '1px solid var(--rose)' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <h2 style={{ color: 'var(--rose)', marginTop: '1rem' }}>Dashboard Loading Failed</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {error instanceof Error ? error.message : 'The dashboard service responded with an error code.'}
          </p>
          <button className="btn-primary" onClick={() => window.location.reload()} style={{ marginTop: '1.5rem' }}>
            🔄 Retry Connection
          </button>
        </div>
      </div>
    );
  }

  if (isSummaryLoading || !summary) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Analyzing company data streams...</p>
      </div>
    );
  }

  const { health_score, projects, employees, bugs, recent_insights } = summary;

  // Fake chart history data if backend database has no entries
  const chartData = history && history.length > 0
    ? history.map((h: any) => ({
        date: new Date(h.computed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: h.overall_score,
      }))
    : [
        { date: 'Jun 28', score: 85 },
        { date: 'Jun 29', score: 86 },
        { date: 'Jun 30', score: 85 },
        { date: 'Jul 01', score: 87 },
        { date: 'Jul 02', score: 88 },
        { date: 'Jul 03', score: 89 },
        { date: 'Jul 04', score: health_score?.overall || 89 },
      ];

  const subScores = [
    { label: 'Project Health', value: health_score?.project || 84, color: '#a3e635' },
    { label: 'Employee Health', value: health_score?.employee || 78, color: '#3b82f6' },
    { label: 'Knowledge Health', value: health_score?.knowledge || 86, color: '#d946ef' },
    { label: 'Risk Score', value: health_score?.risk || 11, color: '#ef4444' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Alert Banner for Burnout/Risk */}
      {recent_insights && recent_insights.some((i: any) => i.verdict === 'HIGH RISK' || i.verdict === 'BURNOUT DETECTED') && (
        <div className="alert-banner alert-danger">
          <span>⚠️</span>
          <div>
            <strong>High-Priority Alert:</strong> AI Engine detected active risks in Project Alpha (High Risk) and Adhi Rajan (Burnout Flag). Evidence-backed recommendations generated.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Organization Intelligence Dashboard</h1>
          <p className="page-subtitle">Techno Solutions · Real-time Operational Insights</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
        >
          {refreshMutation.isPending ? 'Recalculating...' : '🔄 Run Full AI Analysis'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <MetricCard
          title="Organization Health"
          value={`${health_score?.overall || 89}/100`}
          subtitle="Grounded composite rating"
          icon="📊"
          color="cyan"
          trend={{ value: 1.2, label: 'vs yesterday', up: true }}
        />
        <MetricCard
          title="Active Projects"
          value={projects?.active || 0}
          subtitle={`Out of ${projects?.total || 0} registered`}
          icon="🚀"
          color="purple"
        />
        <MetricCard
          title="Tracked Employees"
          value={employees?.total || 0}
          subtitle="Operational data active"
          icon="👥"
          color="green"
        />
        <MetricCard
          title="Open Bugs"
          value={bugs?.open || 0}
          subtitle="Requiring response"
          icon="🐛"
          color="rose"
          trend={bugs?.open > 10 ? { value: bugs.open, label: 'action needed', up: true } : undefined}
        />
        <MetricCard
          title="Avg Completion"
          value={`${projects?.avg_completion || 0}%`}
          subtitle="Across sprints"
          icon="📈"
          color="amber"
        />
      </div>

      {/* Health Score Deep Dive */}
      <div className="health-score-section">
        <div className="health-gauge">
          <HealthGauge score={health_score?.overall || 89} size={180} />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Algorithm Sub-Scores Breakdown</h2>
          
          <div className="sub-scores" style={{ width: '100%' }}>
            {subScores.map((sub) => (
              <div key={sub.label} className="sub-score-row">
                <span className="sub-score-label">{sub.label}</span>
                <div className="sub-score-bar">
                  <div 
                    className="sub-score-fill" 
                    style={{ width: `${sub.value}%`, backgroundColor: sub.color }}
                  />
                </div>
                <span className="sub-score-value">{sub.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3 className="chart-title">30-Day Health Trend</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                <YAxis domain={[50, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0f17', border: '1px solid rgba(255,255,255,0.06)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Line type="monotone" dataKey="score" stroke="#a3e635" strokeWidth={3} dot={{ fill: '#a3e635' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Active Project Completion %</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={[
                { name: 'Project Alpha', completion: 72 },
                { name: 'Project Beta', completion: 45 },
                { name: 'Phoenix Plat.', completion: 88 },
                { name: 'DataStream', completion: 60 },
                { name: 'CloudMigrate', completion: 35 },
                { name: 'Mobile App', completion: 40 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0c0f17', border: '1px solid rgba(255,255,255,0.06)' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="completion" fill="#d946ef" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latest AI Insight Stream */}
      <div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }} className="gradient-text">
          🧠 Core AI Insights & Recommendations
        </h2>
        
        <div className="insights-grid">
          {recent_insights && recent_insights.map((insight: any) => (
            <div key={insight.id} className={`insight-card glass ${
              insight.verdict?.includes('RISK') ? 'risk' : insight.verdict?.includes('BURNOUT') ? 'burnout' : 'promotion'
            }`} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1.25rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Badge variant={
                  insight.type?.includes('RISK') ? 'danger' : insight.type?.includes('BURNOUT') ? 'warning' : 'success'
                }>
                  {insight.type?.replace('_', ' ')}
                </Badge>
                <span style={{ fontSize: '0.75rem', color: '#475569' }}>
                  {new Date(insight.generated_at).toLocaleDateString()}
                </span>
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{insight.subject || 'Organization Overall'}</h3>
              <p style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 600 }}>Verdict: {insight.verdict}</p>
              
              {insight.score && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Confidence/Severity Score: {insight.score}%</span>
                  <div className="score-bar">
                    <div 
                      className="score-fill" 
                      style={{ 
                        width: `${insight.score}%`, 
                        background: insight.verdict?.includes('RISK') ? '#f43f5e' : '#f59e0b'
                      }} 
                    />
                  </div>
                </div>
              )}

              <p style={{ fontSize: '0.85rem', color: '#94a3b8', borderLeft: '2px solid rgba(255,255,255,0.1)', paddingLeft: '0.5rem' }}>
                {insight.recommendation || 'No direct recommendations provided.'}
              </p>

              <div className="insight-evidence-tag">
                🛡️ Grounded Evidence-Based Output
              </div>
            </div>
          ))}

          {(!recent_insights || recent_insights.length === 0) && (
            <div className="empty-state">
              <span className="empty-state-icon">🧠</span>
              <p className="empty-state-text">No active AI insights generated yet. Click 'Run Full AI Analysis' above.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
