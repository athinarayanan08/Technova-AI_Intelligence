import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService, taskService, bugService, aiService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch project details
  const { data: project, isLoading: isProjectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getById(projectId).then((res) => res.data),
  });

  // Fetch tasks
  const { data: tasks } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => taskService.getAll({ project_id: projectId }).then((res) => res.data),
  });

  // Fetch bugs
  const { data: bugs } = useQuery({
    queryKey: ['project-bugs', projectId],
    queryFn: () => bugService.getAll(projectId).then((res) => res.data),
  });

  // Fetch AI insights for this project
  const { data: insights } = useQuery({
    queryKey: ['project-insights', projectId],
    queryFn: () =>
      aiService.getInsights({
        subject_entity: 'project',
        current_only: true,
      }).then((res) => {
        const list = res.data || [];
        return list.filter((i: any) => i.subject_id === projectId);
      }),
  });

  // Run AI Risk Analysis Mutation
  const analyzeMutation = useMutation({
    mutationFn: () => aiService.analyzeProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-insights', projectId] });
    },
  });

  if (isProjectLoading || !project) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Compiling project repository metrics...</p>
      </div>
    );
  }

  const latestInsight = insights && insights.length > 0 ? insights[0] : null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Breadcrumbs & Header */}
      <div>
        <span style={{ fontSize: '0.8rem', color: '#475569', cursor: 'pointer' }} onClick={() => navigate('/projects')}>
          ◀ Back to Projects
        </span>
        <div className="page-header" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          <div>
            <h1 className="page-title">{project.name}</h1>
            <p className="page-subtitle">{project.description || 'No description provided.'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Badge variant="info">{project.priority} PRIORITY</Badge>
            <Badge variant={project.status === 'ACTIVE' ? 'success' : 'default'}>{project.status}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>Tasks ({tasks?.length || 0})</button>
        <button className={`tab-btn ${activeTab === 'bugs' ? 'active' : ''}`} onClick={() => setActiveTab('bugs')}>Bugs ({bugs?.length || 0})</button>
        <button className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>AI Risk Diagnosis</button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
          
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.2rem' }}>About Initiative</h2>
            <p style={{ color: 'var(--text-secondary)' }}>{project.description || 'Detailed project overview not configured yet.'}</p>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                <span>Initiative Milestone Status</span>
                <span>{project.completion_pct}% Complete</span>
              </div>
              <div className="progress-bar" style={{ height: '8px' }}>
                <div className="progress-fill" style={{ width: `${project.completion_pct}%` }} />
              </div>
            </div>
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem' }}>System Metadata</h2>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Budget Allocation:</span>
              <p style={{ color: 'var(--text-primary)' }}>${project.budget?.toLocaleString() || 'Unspecified'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Start Date:</span>
              <p style={{ color: 'var(--text-primary)' }}>{project.start_date || 'TBD'}</p>
            </div>
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target Deadline:</span>
              <p style={{ color: 'var(--text-primary)' }}>{project.end_date || 'TBD'}</p>
            </div>
          </div>

        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="card glass">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Associated Operational Tasks</h2>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {tasks?.map((t: any) => (
                  <tr key={t.id}>
                    <td>{t.title}</td>
                    <td>
                      <Badge variant={t.priority === 'CRITICAL' || t.priority === 'HIGH' ? 'danger' : 'default'}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={t.status === 'DONE' ? 'success' : 'info'}>
                        {t.status}
                      </Badge>
                    </td>
                    <td>{t.due_date || 'TBD'}</td>
                    <td>{t.progress_pct}%</td>
                  </tr>
                ))}

                {(!tasks || tasks.length === 0) && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
                      No tasks assigned to this project yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="card glass">
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Open Bug Reports</h2>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Resolved Date</th>
                </tr>
              </thead>
              <tbody>
                {bugs?.map((b: any) => (
                  <tr key={b.id}>
                    <td>{b.title}</td>
                    <td>
                      <Badge variant={b.severity === 'CRITICAL' || b.severity === 'HIGH' ? 'danger' : 'warning'}>
                        {b.severity}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={b.status === 'OPEN' ? 'danger' : 'success'}>
                        {b.status}
                      </Badge>
                    </td>
                    <td>{b.resolved_at ? new Date(b.resolved_at).toLocaleDateString() : 'Active'}</td>
                  </tr>
                ))}

                {(!bugs || bugs.length === 0) && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
                      No bugs reported.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem' }}>
          
          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.2rem' }}>AI Diagnostics Console</h2>
              <button
                className="btn-primary"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
              >
                {analyzeMutation.isPending ? 'Running Diagnostics...' : '⚡ Run Diagnostic Risk Check'}
              </button>
            </div>

            {latestInsight ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Diagnosis Verdict:</span>
                    <h3 style={{
                      color: latestInsight.verdict?.includes('RISK') ? '#f43f5e' : '#10b981',
                      fontSize: '1.2rem',
                      fontWeight: 700
                    }}>
                      ⚠️ {latestInsight.verdict}
                    </h3>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Risk Index:</span>
                    <p style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{latestInsight.score}%</p>
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.25rem' }}>Action Recommendations:</h4>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.4, borderLeft: '3px solid var(--cyan)', paddingLeft: '0.75rem' }}>
                    {latestInsight.recommendation}
                  </p>
                </div>

                {latestInsight.evidence_json && (
                  <div>
                    <h4 style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>Attached Evidence Log:</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                      {Object.entries(latestInsight.evidence_json).map(([k, v]: any) => (
                        <div key={k}>
                          <strong>{k.replace(/_/g, ' ')}:</strong> {JSON.stringify(v)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-state-icon">🤖</span>
                <p className="empty-state-text">No active risk analysis snapshot has been run for this project. Trigger analysis above.</p>
              </div>
            )}
          </div>

          <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1rem' }}>Grounded RAG Guardrails</h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              The AI risk diagnostic pipeline retrieves structured metrics from database models (tasks, bugs, dates, assignees) and provides grounded interpretations. Generative models never synthesize metrics from raw memory.
            </p>
          </div>

        </div>
      )}

    </div>
  );
}
