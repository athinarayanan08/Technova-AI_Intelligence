import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bugService, projectService, aiService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function BugsPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [analyzedBug, setAnalyzedBug] = useState<any>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number>(1);
  const [severity, setSeverity] = useState('MEDIUM');
  const [steps, setSteps] = useState('');

  // Fetch bugs
  const { data: bugs, isLoading } = useQuery({
    queryKey: ['bugs'],
    queryFn: () => bugService.getAll().then((res) => res.data),
  });

  // Fetch projects for reporting
  const { data: projects } = useQuery({
    queryKey: ['projects-all-bugs'],
    queryFn: () => projectService.getAll().then((res) => res.data),
  });

  // Report bug mutation
  const reportMutation = useMutation({
    mutationFn: () =>
      bugService.create({
        title,
        description,
        project_id: projectId,
        severity,
        steps_to_reproduce: steps,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bugs'] });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setSteps('');
    },
  });

  const handleAnalyzeBug = async (bug: any) => {
    setAnalyzedBug(bug);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const res = await aiService.analyzeBug(bug.id);
      setAnalysisResult(res.data);
    } catch (err) {
      setAnalysisResult({
        diagnosis: "Failed to connect to the AI diagnostic engine.",
        solution_steps: ["Ensure the AI engine is configured correctly.", "Check API connection."],
        target_files: ["Verify backend app logs."]
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Syncing QA defect lists...</p>
      </div>
    );
  }

  const criticalOpenCount = bugs?.filter((b: any) =>
    (b.severity === 'CRITICAL' || b.severity === 'HIGH') &&
    (b.status === 'OPEN' || b.status === 'IN_PROGRESS')
  ).length || 0;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">QA Bug Registry & Tracking</h1>
          <p className="page-subtitle">Report defects · System monitors critical counts to calculate customer issues rating</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          🐛 Report Platform Defect
        </button>
      </div>

      {/* Critical Open Info Banner */}
      {criticalOpenCount > 0 && (
        <div className="alert-banner alert-warning">
          <span>⚠️</span>
          <div>
            There are currently <strong>{criticalOpenCount} Critical/High severity unresolved bugs</strong>. This is exerting negative pressure on the Customer Issues sub-score.
          </div>
        </div>
      )}

      {/* Bug Table */}
      <div className="card glass">
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Reported System Defects</h2>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Project ID</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Reported On</th>
                <th>AI Diagnostic</th>
              </tr>
            </thead>
            <tbody>
              {bugs?.map((bug: any) => (
                <tr key={bug.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bug.title}</td>
                  <td>{bug.project_id}</td>
                  <td>
                    <Badge variant={
                      bug.severity === 'CRITICAL' || bug.severity === 'HIGH' ? 'danger' : 'warning'
                    }>
                      {bug.severity}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={
                      bug.status === 'RESOLVED' || bug.status === 'CLOSED' ? 'success' : 'danger'
                    }>
                      {bug.status}
                    </Badge>
                  </td>
                  <td>{new Date(bug.created_at).toLocaleDateString()}</td>
                  <td>
                    <button
                      className="btn-secondary"
                      onClick={() => handleAnalyzeBug(bug)}
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', border: '1px solid var(--purple)', color: 'var(--purple)', background: 'transparent' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(217, 70, 239, 0.08)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      🤖 Diagnose
                    </button>
                  </td>
                </tr>
              ))}

              {(!bugs || bugs.length === 0) && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#475569' }}>
                    No system defects reported yet. Clear log backlog.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Bug Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Report System Defect</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); reportMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Defect Summary / Title</label>
                <input type="text" className="input" required placeholder="e.g. Login endpoint timeout on high traffic" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Target Project</label>
                <select className="input" value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
                  {projects?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Severity Level</label>
                <select className="input" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label className="label">Steps to Reproduce & Expected Behavior</label>
                <textarea className="input" placeholder="1. Navigate to login... 2. Observe timeout..." value={steps} onChange={(e) => setSteps(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary w-full" disabled={reportMutation.isPending}>
                {reportMutation.isPending ? 'Filing Defect Record...' : '🐛 File Defect Record'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {(analyzedBug || isAnalyzing) && (
        <div className="modal-overlay" onClick={() => setAnalyzedBug(null)}>
          <div className="modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  🤖 AI Bug Diagnostic Report
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Defect ID: #{analyzedBug?.id} · {analyzedBug?.title}
                </span>
              </div>
              <button className="modal-close" onClick={() => setAnalyzedBug(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.25rem' }}>
              {isAnalyzing ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '1rem' }}>
                  <div className="loading-spinner" style={{ borderColor: 'var(--purple)', borderTopColor: 'transparent' }} />
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Synthesizing traceback patterns & calculating fix steps...</p>
                </div>
              ) : (
                <>
                  {/* Diagnosis */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>
                      🔍 Root Cause Diagnosis
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', margin: 0 }}>
                      {analysisResult?.diagnosis}
                    </p>
                  </div>

                  {/* Solution Steps */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>
                      🛠️ Recommended Action Plan
                    </h4>
                    <div style={{ background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {analysisResult?.solution_steps?.map((step: string, i: number) => (
                          <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Target Files */}
                  <div>
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', fontWeight: 600 }}>
                      📂 Target Files / Components to Review
                    </h4>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {analysisResult?.target_files?.map((file: string, i: number) => (
                        <span key={i} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          📄 {file}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button className="btn-primary w-full" onClick={() => setAnalyzedBug(null)} style={{ marginTop: '0.5rem' }}>
                    Acknowledge Analysis
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
