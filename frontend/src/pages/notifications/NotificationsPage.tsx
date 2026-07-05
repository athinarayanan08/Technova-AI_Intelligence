import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../../services';
import Badge from '../../components/ui/Badge';

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications-page'],
    queryFn: () => notificationService.getAll().then((res) => res.data),
  });

  // Mark single as read mutation
  const readMutation = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  // Mark all read mutation
  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-page'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Syncing active notification channels...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Inbox & Alert Feed</h1>
          <p className="page-subtitle">Personal warnings, tasks, burnout indicators, and system triggers</p>
        </div>
        {notifications && notifications.some((n: any) => !n.is_read) && (
          <button className="btn-secondary" onClick={() => markAllReadMutation.mutate()}>
            ✅ Mark All As Read
          </button>
        )}
      </div>

      {/* List */}
      <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
        {notifications?.map((notif: any) => (
          <div
            key={notif.id}
            onClick={() => !notif.is_read && readMutation.mutate(notif.id)}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              borderLeft: notif.is_read ? '3px solid transparent' : '3px solid var(--cyan)',
              background: notif.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(6,182,212,0.04)',
              cursor: notif.is_read ? 'default' : 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              transition: 'var(--transition)'
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.1rem' }}>
                  {notif.type?.includes('RISK') || notif.type?.includes('OVERDUE') ? '⚠️' : '🔔'}
                </span>
                <strong style={{ color: '#f1f5f9', fontSize: '0.925rem' }}>{notif.title}</strong>
                {!notif.is_read && <Badge variant="info">New</Badge>}
              </div>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.4 }}>{notif.message}</p>
              <span style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.25rem', display: 'block' }}>
                {new Date(notif.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        ))}

        {(!notifications || notifications.length === 0) && (
          <div className="empty-state">
            <span className="empty-state-icon">🔔</span>
            <p className="empty-state-text">Your alert inbox is completely clear.</p>
          </div>
        )}
      </div>

    </div>
  );
}
