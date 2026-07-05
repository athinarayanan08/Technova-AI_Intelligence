import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportService, projectService } from '../../services';
import Badge from '../../components/ui/Badge';
import { useState } from 'react';

export default function DailyReportPage() {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrowPlan, setTomorrowPlan] = useState('');
  const [moodScore, setMoodScore] = useState(3);
  const [hoursWorked, setHoursWorked] = useState(8);
  const [projectId, setProjectId] = useState<number | null>(null);
  
  // Forward message states
  const [messageToLeads, setMessageToLeads] = useState('');
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Fetch my daily reports
  const { data: reports, isLoading } = useQuery({
    queryKey: ['my-reports'],
    queryFn: () => reportService.getMy().then((res) => res.data),
  });

  // Fetch projects
  const { data: projects, isLoading: isProjectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getAll().then((res) => res.data),
  });

  const getLocalDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Submit report mutation
  const submitMutation = useMutation({
    mutationFn: () => {
      return reportService.submit({
        date: getLocalDateString(),
        content,
        blockers,
        tomorrow_plan: tomorrowPlan,
        mood_score: moodScore,
        hours_worked: hoursWorked,
        project_id: projectId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-reports'] });
      setContent('');
      setBlockers('');
      setTomorrowPlan('');
      setMoodScore(3);
      setHoursWorked(8);
      setProjectId(null);
      alert('Daily report submitted successfully!');
    },
    onError: (err: any) => {
      alert(err.response?.data?.detail || 'Failed to submit report. You may have already submitted a report today.');
    }
  });

  if (isLoading || isProjectsLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>Syncing daily workflow metrics...</p>
      </div>
    );
  }

  const handleSendToLeads = async () => {
    if (!messageToLeads.trim()) return;
    setIsSendingReport(true);
    setSendSuccess(false);
    try {
      await reportService.sendReport(messageToLeads);
      setSendSuccess(true);
      setMessageToLeads('');
    } catch (err) {
      alert('Failed to send report. Please check connection.');
    } finally {
      setIsSendingReport(false);
    }
  };



  const todayStr = getLocalDateString();
  const submittedToday = reports?.some((r: any) => r.date === todayStr);

  const moodEmojis = ['😞', '😐', '🙂', '😊', '😄'];

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title gradient-text">Daily Work Report</h1>
          <p className="page-subtitle">Submit daily logs · Text description is analyzed by AI semantic engines for blockers & progress</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        
        {/* Report Form */}
        <div className="card glass">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Today's Operational Submission</h2>
          
          {submittedToday ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <span style={{ fontSize: '2.5rem' }}>✅</span>
                <h3 style={{ marginTop: '1rem', color: '#10b981' }}>Report Submitted Today</h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem' }}>
                  Your operational metrics have been logged in the system. AI engines will run nightly diagnostic tests on this data.
                </p>
              </div>
              
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#f1f5f9', fontWeight: 600 }}>📬 Forward Report to Team Lead & Manager</h4>
                <p style={{ fontSize: '0.78rem', color: '#94a3b8', margin: 0 }}>
                  This will generate immediate notifications in their dashboards with your custom message.
                </p>
                <textarea
                  className="input"
                  rows={3}
                  placeholder="Type any updates or comments to send (e.g., 'Today's report submitted. Waiting on QA blocker')..."
                  value={messageToLeads}
                  onChange={(e) => setMessageToLeads(e.target.value)}
                />
                
                {sendSuccess && (
                  <div style={{ padding: '0.5rem', background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', color: '#10b981', borderRadius: '4px', fontSize: '0.8rem', textAlign: 'center' }}>
                    ✓ Message successfully forwarded to Leads!
                  </div>
                )}
                
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleSendToLeads}
                  disabled={isSendingReport || !messageToLeads.trim()}
                  style={{ alignSelf: 'flex-start', padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                >
                  {isSendingReport ? 'Sending...' : '⚡ Send to Team Lead & Manager'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="form-group">
                <label className="label">Project Association</label>
                <select
                  className="input"
                  value={projectId || ''}
                  onChange={(e) => setProjectId(e.target.value ? Number(e.target.value) : null)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '6px',
                    outline: 'none'
                  }}
                >
                  <option value="" style={{ background: '#0f172a' }}>-- Select Associated Project (Optional) --</option>
                  {projects?.map((proj: any) => (
                    <option key={proj.id} value={proj.id} style={{ background: '#0f172a' }}>
                      {proj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">What tasks did you work on today? (Detailed log)</label>
                <textarea
                  className="input"
                  required
                  placeholder="e.g. Implemented payment gateway authorization endpoints and resolved task checkout timeout..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Blockers / Constraints (If any)</label>
                <textarea
                  className="input"
                  placeholder="e.g. Waiting on API authentication document sign-off from DevLead"
                  value={blockers}
                  onChange={(e) => setBlockers(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">Planned Actions for Tomorrow</label>
                <textarea
                  className="input"
                  placeholder="e.g. Complete payment gateway end-to-end integration and run tests"
                  value={tomorrowPlan}
                  onChange={(e) => setTomorrowPlan(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="label">Shift Duration (Hours)</label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={24}
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(Number(e.target.value))}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Daily Mood Rating</label>
                  <div style={{ display: 'flex', gap: '0.25rem', height: '100%', alignItems: 'center' }}>
                    {moodEmojis.map((emoji, idx) => (
                      <button
                        key={idx}
                        type="button"
                        style={{
                          background: moodScore === idx + 1 ? 'rgba(6,182,212,0.2)' : 'transparent',
                          border: moodScore === idx + 1 ? '1px solid var(--cyan)' : '1px solid transparent',
                          fontSize: '1.25rem',
                          padding: '0.25rem',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                        onClick={() => setMoodScore(idx + 1)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="btn-primary w-full" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? 'Logging shift data...' : '📝 Submit Operations Report'}
              </button>

            </form>
          )}

        </div>

        {/* History Log Timeline */}
        <div className="card glass">
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1.25rem' }}>Previous Shift Logs</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '450px', overflowY: 'auto' }}>
            {reports?.map((rep: any) => (
              <div key={rep.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  <strong>📅 {new Date(rep.date).toLocaleDateString()}</strong>
                  <span>{moodEmojis[(rep.mood_score || 3) - 1]} Mood · {rep.hours_worked || 8} hrs</span>
                </div>
                {rep.project_id && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--cyan)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>📁 Project:</span>
                    <span style={{ fontWeight: 500, color: 'var(--cyan)' }}>
                      {projects?.find((p: any) => p.id === rep.project_id)?.name || `Project #${rep.project_id}`}
                    </span>
                  </div>
                )}
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {rep.content}
                </p>
                {rep.blockers && (
                  <p style={{ fontSize: '0.8rem', color: '#f43f5e', marginTop: '0.25rem' }}>
                    🚫 Blocker: {rep.blockers}
                  </p>
                )}
              </div>
            ))}

            {(!reports || reports.length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#475569' }}>
                No historical shift logs recorded.
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
