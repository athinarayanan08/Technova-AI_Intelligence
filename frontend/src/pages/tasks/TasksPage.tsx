import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, projectService, employeeService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState<number>(1);
  const [assigneeId, setAssigneeId] = useState<number>(1);
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');

  // Fetch all tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['admin-all-tasks'],
    queryFn: () => taskService.getAll().then((res) => res.data),
  });

  // Fetch projects and employees for form creation
  const { data: projects } = useQuery({
    queryKey: ['projects-list-tasks'],
    queryFn: () => projectService.getAll().then((res) => res.data),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-list-tasks'],
    queryFn: () => employeeService.getAll().then((res) => res.data),
  });

  // Create task mutation
  const createMutation = useMutation({
    mutationFn: () =>
      taskService.create({
        title,
        description,
        project_id: projectId,
        assignee_id: assigneeId,
        priority,
        due_date: dueDate || undefined,
        status: 'TODO',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-tasks'] });
      setShowModal(false);
      setTitle('');
      setDescription('');
      setDueDate('');
      alert('Task created and assigned successfully!');
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Syncing task registry database...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Work Task Management</h1>
          <p className="page-subtitle">Assign operations · View status of all tasks across enterprise projects</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          ➕ Create & Assign Task
        </button>
      </div>

      {/* Task List Card */}
      <div className="card glass">
        <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Active Workspace Tasks</h2>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Project ID</th>
                <th>Assignee ID</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks?.map((task: any) => (
                <tr key={task.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{task.title}</td>
                  <td>{task.project_id}</td>
                  <td>{task.assignee_id || 'Unassigned'}</td>
                  <td>
                    <Badge variant={
                      task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'danger' : 'default'
                    }>
                      {task.priority}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={task.status === 'DONE' ? 'success' : 'info'}>
                      {task.status}
                    </Badge>
                  </td>
                  <td>{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'TBD'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Task Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create & Assign Task</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Task Title</label>
                <input type="text" className="input" required placeholder="e.g. Integrate auth validation checks" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea className="input" placeholder="Context details..." value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Project</label>
                  <select className="input" value={projectId} onChange={(e) => setProjectId(Number(e.target.value))}>
                    {projects?.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Assignee</label>
                  <select className="input" value={assigneeId} onChange={(e) => setAssigneeId(Number(e.target.value))}>
                    {employees?.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Priority</label>
                  <select className="input" value={priority} onChange={(e) => setPriority(e.target.value)}>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Due Date</label>
                  <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={createMutation.isPending}>
                Assign Task
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
