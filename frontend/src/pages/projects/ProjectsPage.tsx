import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectService, departmentService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [deptId, setDeptId] = useState<number>(1);
  const [priority, setPriority] = useState('MEDIUM');

  // Fetch projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getAll().then((res) => res.data),
  });

  // Fetch departments for form
  const { data: departments } = useQuery({
    queryKey: ['departments-all'],
    queryFn: () => departmentService.getAll().then((res) => res.data),
  });

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: () =>
      projectService.create({
        name,
        description,
        department_id: deptId,
        priority,
        status: 'PLANNING',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowModal(false);
      setName('');
      setDescription('');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Fetching enterprise projects array...</p>
      </div>
    );
  }

  const filtered = filterStatus
    ? projects?.filter((p: any) => p.status === filterStatus)
    : projects;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Enterprise Projects</h1>
          <p className="page-subtitle">Track status & milestone completion across departments</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          🚀 Start New Project
        </button>
      </div>

      {/* Filter tabs */}
      <div className="tabs">
        <button className={`tab-btn ${filterStatus === null ? 'active' : ''}`} onClick={() => setFilterStatus(null)}>All</button>
        <button className={`tab-btn ${filterStatus === 'ACTIVE' ? 'active' : ''}`} onClick={() => setFilterStatus('ACTIVE')}>Active</button>
        <button className={`tab-btn ${filterStatus === 'PLANNING' ? 'active' : ''}`} onClick={() => setFilterStatus('PLANNING')}>Planning</button>
        <button className={`tab-btn ${filterStatus === 'COMPLETED' ? 'active' : ''}`} onClick={() => setFilterStatus('COMPLETED')}>Completed</button>
      </div>

      {/* Grid */}
      <div className="insights-grid">
        {filtered?.map((p: any) => (
          <div
            key={p.id}
            className="insight-card glass"
            style={{ cursor: 'pointer', borderTop: '4px solid var(--cyan)' }}
            onClick={() => navigate(`/projects/${p.id}`)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <Badge variant={p.status === 'ACTIVE' ? 'success' : 'default'}>{p.status}</Badge>
              <Badge variant={p.priority === 'CRITICAL' || p.priority === 'HIGH' ? 'danger' : 'default'}>{p.priority}</Badge>
            </div>

            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700, margin: '0.25rem 0' }}>
              {p.name}
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0', minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
              {p.description || 'No description provided.'}
            </p>

            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                <span>Completion Status</span>
                <span>{p.completion_pct}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${p.completion_pct}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <span>Department ID: {p.department_id}</span>
              <span>📅 {p.end_date || 'No due date'}</span>
            </div>

          </div>
        ))}

        {filtered?.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-icon">🚀</span>
            <p className="empty-state-text">No projects match criteria.</p>
          </div>
        )}
      </div>

      {/* New Project Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Project Initiative</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Project Name</label>
                <input type="text" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Target Department</label>
                <select className="input" value={deptId} onChange={(e) => setDeptId(Number(e.target.value))}>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Priority</label>
                <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Launching Initiative...' : '🚀 Launch Initiative'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
