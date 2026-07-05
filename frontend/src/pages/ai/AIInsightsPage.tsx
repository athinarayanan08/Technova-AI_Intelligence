import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { aiService, projectService, employeeService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function AIInsightsPage() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string | null>(null);
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'insights' | 'agentic'>('insights');
  
  // Agentic Analyzer states
  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const [analysisDate, setAnalysisDate] = useState(getLocalDateString());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Fetch all insights
  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights', filterType],
    queryFn: () =>
      aiService.getInsights({
        insight_type: filterType || undefined,
        current_only: true,
      }).then((res) => res.data),
  });

  // Analyze single project mutation
  const analyzeProjectMutation = useMutation({
    mutationFn: (projectId: number) => aiService.analyzeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  // Analyze single employee mutation
  const analyzeEmployeeMutation = useMutation({
    mutationFn: (employeeId: number) => aiService.analyzeEmployee(employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
    },
  });

  const handleRunAgenticAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    try {
      const res = await aiService.runAgenticAnalysis({ date: analysisDate });
      if (res.data.success) {
        setAnalysisResult(res.data);
      } else {
        setAnalysisError(res.data.message || 'No reports found for this date.');
      }
    } catch (err: any) {
      setAnalysisError(err.response?.data?.detail || 'Failed to complete agentic report analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadAgenticReport = () => {
    if (!analysisResult) return;
    const dateStr = new Date().toLocaleDateString();
    
    let reportContent = `==================================================\n`;
    reportContent += `       AI OPERATIONAL INTELLIGENCE PLATFORM       \n`;
    reportContent += `       AGENTIC TEAM BRIEF - ${analysisDate}       \n`;
    reportContent += `==================================================\n`;
    reportContent += `Generated On: ${dateStr}\n\n`;
    reportContent += `--- TEAM-WIDE PROGRESS SUMMARY ---\n`;
    reportContent += `${analysisResult.summary}\n\n`;
    
    reportContent += `--- STRATEGIC ACTION RECOMMENDATIONS ---\n`;
    reportContent += `${analysisResult.recommendations}\n\n`;
    
    reportContent += `==================================================\n`;
    reportContent += `     Agentic Team Analyzer (Secure & Verified)   \n`;
    reportContent += `==================================================\n`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Agentic_Team_Report_${analysisDate}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading AI insights dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">AI Intelligence Insights</h1>
          <p className="page-subtitle">Continuous diagnostic monitoring of risk patterns, velocity, & burnout triggers</p>
        </div>
      </div>

      {/* Main Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('insights')}
          style={{
            background: activeTab === 'insights' ? 'rgba(6,182,212,0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'insights' ? '2px solid var(--cyan)' : '2px solid transparent',
            color: activeTab === 'insights' ? 'var(--cyan)' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          💡 Operational Insights
        </button>
        <button
          onClick={() => setActiveTab('agentic')}
          style={{
            background: activeTab === 'agentic' ? 'rgba(6,182,212,0.1)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'agentic' ? '2px solid var(--cyan)' : '2px solid transparent',
            color: activeTab === 'agentic' ? 'var(--cyan)' : '#94a3b8',
            fontSize: '0.95rem',
            fontWeight: 600,
            padding: '0.5rem 1rem',
            cursor: 'pointer'
          }}
        >
          🤖 Agentic Team Analyzer
        </button>
      </div>

      {activeTab === 'insights' ? (
        <>
          {/* Filter Tabs */}
          <div className="tabs">
            <button
              className={`tab-btn ${filterType === null ? 'active' : ''}`}
              onClick={() => setFilterType(null)}
            >
              All Insights
            </button>
            <button
              className={`tab-btn ${filterType === 'PROJECT_RISK' ? 'active' : ''}`}
              onClick={() => setFilterType('PROJECT_RISK')}
            >
              Project Risks
            </button>
            <button
              className={`tab-btn ${filterType === 'EMPLOYEE_BURNOUT' ? 'active' : ''}`}
              onClick={() => setFilterType('EMPLOYEE_BURNOUT')}
            >
              Employee Burnout
            </button>
            <button
              className={`tab-btn ${filterType === 'PROMOTION_RECOMMENDATION' ? 'active' : ''}`}
              onClick={() => setFilterType('PROMOTION_RECOMMENDATION')}
            >
              Promotions
            </button>
          </div>

          {/* Grid */}
          <div className="insights-grid">
            {insights?.map((insight: any) => (
              <div
                key={insight.id}
                className={`insight-card glass ${
                  insight.verdict?.includes('RISK') || insight.verdict?.includes('CRITICAL')
                    ? 'risk'
                    : insight.verdict?.includes('BURNOUT') || insight.verdict?.includes('RISK')
                    ? 'burnout'
                    : 'promotion'
                }`}
                style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Badge variant={
                    insight.type === 'PROJECT_RISK' ? 'danger' : insight.type === 'EMPLOYEE_BURNOUT' ? 'warning' : 'success'
                  }>
                    {insight.type.replace('_', ' ')}
                  </Badge>
                  <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                    {new Date(insight.generated_at).toLocaleString()}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{insight.subject_name}</h3>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Verdict:</span>
                  <strong style={{
                    fontSize: '0.9rem',
                    color: insight.verdict?.includes('RISK') || insight.verdict?.includes('CRITICAL') ? '#f43f5e' : '#10b981'
                  }}>{insight.verdict}</strong>
                </div>

                {/* Score Bar */}
                {insight.score !== null && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.2rem' }}>
                      <span>Calculated Metric Value</span>
                      <span>{insight.score}%</span>
                    </div>
                    <div className="score-bar">
                      <div
                        className="score-fill"
                        style={{
                          width: `${insight.score}%`,
                          backgroundColor: insight.verdict?.includes('RISK') || insight.verdict?.includes('CRITICAL') ? '#f43f5e' : '#10b981'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                <div style={{ borderLeft: '2px solid rgba(255,255,255,0.08)', paddingLeft: '0.75rem', margin: '0.5rem 0' }}>
                  <span style={{ fontSize: '0.72rem', color: '#cbd5e1', display: 'block', fontWeight: 600, marginBottom: '0.25rem' }}>AI Action Plan:</span>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    {insight.recommendation}
                  </p>
                </div>

                {/* Grounded Evidence Breakdown */}
                {insight.evidence_json && (
                  <div style={{ background: 'rgba(0,0,0,0.15)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>Grounded Data Points:</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.25rem', fontSize: '0.75rem', color: '#cbd5e1' }}>
                      {Object.entries(insight.evidence_json).map(([key, val]: any) => (
                        <div key={key}>
                          <span style={{ color: '#475569' }}>{key.replace(/_/g, ' ')}:</span> {val}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>🛡️ Auditable Narrative</span>
                  {insight.subject_entity === 'project' && (
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => analyzeProjectMutation.mutate(insight.subject_id)}
                      disabled={analyzeProjectMutation.isPending}
                    >
                      {analyzeProjectMutation.isPending && analyzeProjectMutation.variables === insight.subject_id ? 'Analyzing...' : '🔄 Run Diagnosis'}
                    </button>
                  )}
                  {insight.subject_entity === 'employee' && (
                    <button
                      className="btn-ghost"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => analyzeEmployeeMutation.mutate(insight.subject_id)}
                      disabled={analyzeEmployeeMutation.isPending}
                    >
                      {analyzeEmployeeMutation.isPending && analyzeEmployeeMutation.variables === insight.subject_id ? 'Analyzing...' : '🔄 Run Diagnosis'}
                    </button>
                  )}
                </div>

              </div>
            ))}

            {insights?.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <span className="empty-state-icon">🤖</span>
                <p className="empty-state-text">No active insights found matching selection.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '2rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 600 }}>🤖 Agentic Team Report Analyzer</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Triggers the Agentic Intelligence loops to synthesize all employee shift reports for a specific date, identify common roadblocks, and compile action summaries.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="label" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>Select Target Date</label>
              <input
                type="date"
                className="input"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                style={{ width: '200px' }}
              />
            </div>
            <button
              onClick={handleRunAgenticAnalysis}
              className="btn-primary"
              disabled={isAnalyzing}
              style={{ alignSelf: 'flex-end', height: '38px', padding: '0 1.5rem' }}
            >
              {isAnalyzing ? 'Running Agentic Loops...' : '⚡ Analyze Team Reports'}
            </button>
          </div>

          {analysisError && (
            <div style={{ padding: '0.75rem', background: 'rgba(244,63,94,0.1)', border: '1px solid #f43f5e', color: '#f43f5e', borderRadius: '6px', fontSize: '0.85rem' }}>
              ⚠️ {analysisError}
            </div>
          )}

          {analysisResult && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '0.25rem 0.5rem', borderRadius: '4px', border: '1px solid #10b981' }}>
                  ✓ Analysis Complete for {analysisDate}
                </span>
                <button
                  onClick={downloadAgenticReport}
                  style={{
                    background: 'rgba(6,182,212,0.15)',
                    border: '1px solid var(--cyan)',
                    color: 'var(--cyan)',
                    fontSize: '0.8rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500
                  }}
                >
                  📥 Download Report (.txt)
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: 'var(--cyan)', fontWeight: 600, marginBottom: '0.5rem' }}>📋 Executive Summary & Velocity</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                    {analysisResult.summary}
                  </p>
                </div>
                
                <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <h3 style={{ fontSize: '0.9rem', color: '#8b5cf6', fontWeight: 600, marginBottom: '0.5rem' }}>💡 Action Plan & Recommendations</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-line' }}>
                    {analysisResult.recommendations}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
