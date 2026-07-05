import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function MyTasksPage() {
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<any | null>(null);

  // Fetch tasks
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => taskService.getMyTasks().then((res) => res.data),
  });

  // Task update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      taskService.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Loading personal workspace tasks...</p>
      </div>
    );
  }

  const columns = [
    { id: 'TODO', label: 'To Do', color: '#cbd5e1' },
    { id: 'IN_PROGRESS', label: 'In Progress', color: '#06b6d4' },
    { id: 'IN_REVIEW', label: 'In Review', color: '#8b5cf6' },
    { id: 'DONE', label: 'Done', color: '#10b981' },
  ];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">My Workspace Tasks</h1>
          <p className="page-subtitle">Personal operations pipeline · Update status triggers AI metrics directly</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map((col) => {
          const colTasks = tasks?.filter((t: any) => t.status === col.id) || [];
          return (
            <div key={col.id} className="kanban-column">
              <div className="kanban-col-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: col.color, fontWeight: 600 }}>{col.label}</span>
                <Badge variant="default">{colTasks.length}</Badge>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
                {colTasks.map((task: any) => (
                  <div key={task.id} className="kanban-card" onClick={() => setSelectedTask(task)}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.5rem' }}>
                      {task.title}
                    </h4>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <Badge variant={
                        task.priority === 'CRITICAL' || task.priority === 'HIGH' ? 'danger' : 'default'
                      }>
                        {task.priority}
                      </Badge>
                      <span style={{ fontSize: '0.72rem', color: '#475569' }}>
                        📅 {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                      </span>
                    </div>

                    <select
                      className="input"
                      style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem', marginTop: '0.75rem' }}
                      value={task.status}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatusMutation.mutate({ id: task.id, status: e.target.value })}
                    >
                      <option value="TODO">To Do</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="IN_REVIEW">In Review</option>
                      <option value="DONE">Done</option>
                      <option value="BLOCKED">Blocked</option>
                    </select>

                  </div>
                ))}

                {colTasks.length === 0 && (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#475569', fontSize: '0.8rem' }}>
                    No tasks
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Task detail modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Task Details</h3>
              <button className="modal-close" onClick={() => setSelectedTask(null)}>✕</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h4 className="label">Title</h4>
                <p style={{ color: 'var(--text-primary)' }}>{selectedTask.title}</p>
              </div>

              <div>
                <h4 className="label">Description</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{selectedTask.description || 'No description provided.'}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 className="label">Priority</h4>
                  <Badge variant="danger">{selectedTask.priority}</Badge>
                </div>
                <div>
                  <h4 className="label">Story Points</h4>
                  <Badge variant="purple">{selectedTask.story_points || 'Not estimated'}</Badge>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <h4 className="label">Progress</h4>
                  <p>{selectedTask.progress_pct}%</p>
                </div>
                <div>
                  <h4 className="label">Due Date</h4>
                  <p>{selectedTask.due_date || 'No due date'}</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
