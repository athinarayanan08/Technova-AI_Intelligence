import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { orgService, departmentService, teamService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function OrgSetupPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('dept');

  // Form states
  const [deptName, setDeptName] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamDeptId, setTeamDeptId] = useState<number>(1);

  // Fetch departments
  const { data: departments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: () => departmentService.getAll().then((res) => res.data),
  });

  // Fetch teams
  const { data: teams } = useQuery({
    queryKey: ['admin-teams'],
    queryFn: () => teamService.getAll().then((res) => res.data),
  });

  // Create department mutation
  const createDeptMutation = useMutation({
    mutationFn: () =>
      departmentService.create({
        name: deptName,
        organization_id: 1,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setDeptName('');
      alert('Department created successfully!');
    },
  });

  // Create team mutation
  const createTeamMutation = useMutation({
    mutationFn: () =>
      teamService.create({
        name: teamName,
        department_id: teamDeptId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-teams'] });
      setTeamName('');
      alert('Team squad created successfully!');
    },
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Organization Architecture</h1>
          <p className="page-subtitle">Configure operational taxonomy departments, teams, & permissions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button className={`tab-btn ${activeTab === 'dept' ? 'active' : ''}`} onClick={() => setActiveTab('dept')}>
          Departments ({departments?.length || 0})
        </button>
        <button className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`} onClick={() => setActiveTab('team')}>
          Teams ({teams?.length || 0})
        </button>
      </div>

      {activeTab === 'dept' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* List */}
          <div className="card glass">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Active Departments</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Created On</th>
                  </tr>
                </thead>
                <tbody>
                  {departments?.map((d: any) => (
                    <tr key={d.id}>
                      <td>{d.id}</td>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{d.name}</td>
                      <td>{new Date(d.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div className="card glass" style={{ height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Create Department Node</h2>
            <form onSubmit={(e) => { e.preventDefault(); createDeptMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Department Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Platform DevOps"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary w-full" disabled={createDeptMutation.isPending}>
                Create Department
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
          {/* List */}
          <div className="card glass">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Active Team Units</h2>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Team Name</th>
                    <th>Department ID</th>
                    <th>Created On</th>
                  </tr>
                </thead>
                <tbody>
                  {teams?.map((t: any) => (
                    <tr key={t.id}>
                      <td>{t.id}</td>
                      <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{t.name}</td>
                      <td>{t.department_id}</td>
                      <td>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form */}
          <div className="card glass" style={{ height: 'fit-content' }}>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Create Team Unit</h2>
            <form onSubmit={(e) => { e.preventDefault(); createTeamMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Team Name</label>
                <input
                  type="text"
                  className="input"
                  required
                  placeholder="e.g. Alpha Squad"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Department Group</label>
                <select className="input" value={teamDeptId} onChange={(e) => setTeamDeptId(Number(e.target.value))}>
                  {departments?.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={createTeamMutation.isPending}>
                Create Team Unit
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
