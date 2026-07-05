import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeService, aiService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch employees
  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => employeeService.getAll().then((res) => res.data),
  });

  // Run AI Burnout analysis mutation
  const burnoutMutation = useMutation({
    mutationFn: (id: number) => aiService.analyzeEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      alert('Burnout diagnosis run successfully. View results in Executive Dashboard or AI Insights tab.');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Retrieving organizational headcount registry...</p>
      </div>
    );
  }

  const filtered = employees?.filter((emp: any) =>
    emp.name.toLowerCase().includes(search.toLowerCase()) ||
    emp.email.toLowerCase().includes(search.toLowerCase()) ||
    emp.position?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'danger';
      case 'MANAGER': return 'warning';
      case 'TEAM_LEAD': return 'purple';
      default: return 'info';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Team Members & Personnel</h1>
          <p className="page-subtitle">Directory of active personnel, department allocations, & burnout triggers</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder="Search by name, email or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      <div className="insights-grid">
        {filtered?.map((emp: any) => (
          <div key={emp.id} className="insight-card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div className="avatar avatar-lg" style={{ background: 'linear-gradient(135deg, var(--cyan), var(--purple))' }}>
                {emp.name.charAt(0)}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700 }}>{emp.name}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{emp.position || 'Specialist'}</p>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div>📧 Email: {emp.email}</div>
              <div>🏢 Department ID: {emp.department_id || 'Not assigned'}</div>
              <div>👥 Team ID: {emp.team_id || 'Not assigned'}</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
              <Badge variant={getRoleColor(emp.role)}>{emp.role}</Badge>
              
              <button
                className="btn-ghost"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                onClick={() => burnoutMutation.mutate(emp.id)}
                disabled={burnoutMutation.isPending}
              >
                {burnoutMutation.isPending && burnoutMutation.variables === emp.id ? 'Analyzing...' : '🧠 Run Burnout Check'}
              </button>
            </div>

          </div>
        ))}

        {filtered?.length === 0 && (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <span className="empty-state-icon">👥</span>
            <p className="empty-state-text">No team members matched your search criteria.</p>
          </div>
        )}
      </div>

    </div>
  );
}
