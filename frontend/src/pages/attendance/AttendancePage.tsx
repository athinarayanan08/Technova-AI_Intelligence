import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function AttendancePage() {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;

  // Fetch current user attendance
  const { data: records, isLoading } = useQuery({
    queryKey: ['my-attendance'],
    queryFn: () => attendanceService.getAll().then((res) => res.data),
  });

  // Fetch today's status using local date
  const { data: todayRecord } = useQuery({
    queryKey: ['my-attendance-today', localDateStr],
    queryFn: () => attendanceService.getToday(localDateStr).then((res) => res.data),
  });

  // Check-in check-out mutation
  const markMutation = useMutation({
    mutationFn: (status: string) => {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const localDate = `${y}-${m}-${d}`;
      return attendanceService.markAttendance({
        date: localDate,
        check_in: now.toISOString(),
        status,
        notes,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
      setNotes('');
    },
  });

  const checkOutMutation = useMutation({
    mutationFn: (id: number) => {
      const now = new Date();
      return attendanceService.update(id, {
        check_out: now.toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['my-attendance-today'] });
    },
  });

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Syncing attendance record matrix...</p>
      </div>
    );
  }

  // Calculate totals
  const totalDays = records?.length || 0;
  const overtimeSum = records?.reduce((acc: number, r: any) => acc + (r.overtime_hours || 0), 0) || 0;
  const presentDays = records?.filter((r: any) => r.status === 'PRESENT' || r.status === 'WORK_FROM_HOME').length || 0;
  const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 100;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">My Attendance Registry</h1>
          <p className="page-subtitle">Punch card log stream · Data feeds directly into burn-out flags</p>
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem' }}>
        
        {/* Punch Card Controls */}
        <div className="card glass" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.15rem' }}>Today's Operations</h2>
          
          {todayRecord ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Status:</span>
                <Badge variant="success">{todayRecord.status}</Badge>
              </div>
              <div>
                <span>Checked In:</span>
                <p style={{ color: '#f1f5f9' }}>{new Date(todayRecord.check_in).toLocaleTimeString()}</p>
              </div>
              {todayRecord.check_out ? (
                <div>
                  <span>Checked Out:</span>
                  <p style={{ color: '#f1f5f9' }}>{new Date(todayRecord.check_out).toLocaleTimeString()}</p>
                </div>
              ) : (
                <button
                  className="btn-danger w-full"
                  onClick={() => checkOutMutation.mutate(todayRecord.id)}
                  disabled={checkOutMutation.isPending}
                >
                  {checkOutMutation.isPending ? 'Processing...' : '⏹️ Punch Out / End Shift'}
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="label">Activity / Work Note</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Working on Project Alpha bug fixes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => markMutation.mutate('PRESENT')}
                  disabled={markMutation.isPending}
                >
                  🏢 Punch Present
                </button>
                <button
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => markMutation.mutate('WORK_FROM_HOME')}
                  disabled={markMutation.isPending}
                >
                  🏠 Work From Home
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>Attendance Rate: <strong>{attendanceRate}%</strong></div>
            <div>Cumulative Overtime: <strong>{overtimeSum.toFixed(1)} hrs</strong></div>
          </div>

        </div>

        {/* History List */}
        <div className="card glass">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Recent Activity Logs</h2>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>In</th>
                  <th>Out</th>
                  <th>Hours</th>
                  <th>Overtime</th>
                </tr>
              </thead>
              <tbody>
                {records?.map((record: any) => (
                  <tr key={record.id}>
                    <td>{new Date(record.date).toLocaleDateString()}</td>
                    <td>
                      <Badge variant={record.status === 'PRESENT' ? 'success' : 'info'}>
                        {record.status}
                      </Badge>
                    </td>
                    <td>{record.check_in ? new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>{record.check_out ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                    <td>{record.working_hours ? `${record.working_hours} h` : '-'}</td>
                    <td>{record.overtime_hours ? `+${record.overtime_hours} h` : '-'}</td>
                  </tr>
                ))}

                {(!records || records.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#475569' }}>
                      No attendance logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

    </div>
  );
}
