import { useState, useRef, useEffect } from 'react';
import { aiService } from '../../services';
import Badge from '../../components/ui/Badge';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  loading?: boolean;
  structuredResponse?: {
    answer: string;
    risk_level: string;
    evidence: any[];
    recommendations: string[];
    data_sources: string[];
  };
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your Organizational Intelligence Assistant. Ask me questions about projects, employee workloads, burnout risk levels, or promotion suggestions. I fetch real operational data first and ground my answers in evidence.",
    },
  ]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getChartData = (evidence: any[]) => {
    if (!evidence) return null;
    
    // Check current_user task summary
    const currentUserEv = evidence.find((e) => e.source === 'current_user');
    if (currentUserEv?.data?.task_summary) {
      const ts = currentUserEv.data.task_summary;
      return [
        { name: 'Completed', value: ts.completed, color: '#10b981' },
        { name: 'In Review', value: ts.in_review, color: '#8b5cf6' },
        { name: 'In Progress', value: ts.in_progress, color: '#06b6d4' },
        { name: 'To Do', value: ts.todo, color: '#f59e0b' },
      ].filter(d => d.value > 0);
    }

    // Check project task breakdown
    const taskBreakdownEv = evidence.find((e) => e.source === 'task_breakdown');
    if (taskBreakdownEv?.data) {
      const tb = taskBreakdownEv.data;
      return [
        { name: 'Completed', value: tb.DONE || tb.completed || 0, color: '#10b981' },
        { name: 'In Review', value: tb.IN_REVIEW || tb.in_review || 0, color: '#8b5cf6' },
        { name: 'In Progress', value: tb.IN_PROGRESS || tb.in_progress || 0, color: '#06b6d4' },
        { name: 'To Do', value: tb.TODO || tb.todo || 0, color: '#f59e0b' },
      ].filter(d => d.value > 0);
    }

    return null;
  };

  const handleSend = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsgId = Math.random().toString();
    const aiMsgId = Math.random().toString();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: queryText },
      { id: aiMsgId, sender: 'ai', text: '', loading: true },
    ]);
    setQuestion('');
    setLoading(true);

    try {
      const res = await aiService.askAssistant({ question: queryText });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                loading: false,
                text: res.data.answer,
                structuredResponse: res.data,
              }
            : msg
        )
      );
    } catch (err: any) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMsgId
            ? {
                ...msg,
                loading: false,
                text: 'Sorry, I failed to connect to the intelligence engine. Please ensure Groq API key is valid.',
              }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = (msg: ChatMessage) => {
    if (!msg.structuredResponse) return;
    const responseData = msg.structuredResponse;
    const dateStr = new Date().toLocaleDateString();
    
    let reportContent = `==================================================\n`;
    reportContent += `       AI OPERATIONAL INTELLIGENCE PLATFORM       \n`;
    reportContent += `             EXECUTIVE DECISION BRIEF             \n`;
    reportContent += `==================================================\n`;
    reportContent += `Generated On: ${dateStr}\n\n`;
    reportContent += `--- ANALYSIS SUMMARY ---\n`;
    reportContent += `${responseData.answer}\n\n`;
    
    if (responseData.risk_level) {
      reportContent += `--- DIAGNOSTIC RISK LEVEL ---\n`;
      reportContent += `Risk Rating: ${responseData.risk_level}\n\n`;
    }
    
    if (responseData.recommendations && responseData.recommendations.length > 0) {
      reportContent += `--- STRATEGIC ACTION RECOMMENDATIONS ---\n`;
      responseData.recommendations.forEach((rec, i) => {
        reportContent += `${i + 1}. ${rec}\n`;
      });
      reportContent += `\n`;
    }
    
    if (responseData.data_sources && responseData.data_sources.length > 0) {
      reportContent += `--- DATA SOURCES AUDITED ---\n`;
      reportContent += responseData.data_sources.join(', ') + `\n\n`;
    }
    
    reportContent += `==================================================\n`;
    reportContent += `      Evidence-backed RAG analysis (Secure)     \n`;
    reportContent += `==================================================\n`;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `AI_Decision_Report_${new Date().getTime()}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const sampleQueries = [
    "Generate workspace report",
    "Why is Project Alpha delayed?",
    "Who is at risk of burnout?",
    "Give me the latest risk level of Project Alpha",
  ];

  return (
    <div className="chat-container animate-fade-in">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h1 className="page-title gradient-text">Grounded RAG AI Assistant</h1>
          <p className="page-subtitle">Decisions support interface · Strictly grounded in Postgres & Elasticsearch data</p>
        </div>
        <Badge variant="purple" glow>
          🔒 GROUNDED ENGINE (NO HALLUCINATIONS)
        </Badge>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg) => (
          <div key={msg.id} className={`chat-bubble ${msg.sender}`}>
            {msg.loading ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="spinner-sm" style={{ borderTopColor: 'var(--cyan)' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Retrieving DB Context & Analyzing Patterns...
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Answer text */}
                <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)' }}>
                  {msg.text}
                </p>

                {/* Structured RAG Response info */}
                {msg.structuredResponse && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    
                    {msg.structuredResponse.risk_level && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginRight: '0.5rem' }}>Calculated Risk Rating:</span>
                        <Badge variant={msg.structuredResponse.risk_level.includes('HIGH') ? 'danger' : 'success'}>
                          {msg.structuredResponse.risk_level}
                        </Badge>
                      </div>
                    )}

                    {/* Recommendations */}
                    {msg.structuredResponse.recommendations && msg.structuredResponse.recommendations.length > 0 && (
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>Recommendations:</span>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {msg.structuredResponse.recommendations.map((rec, i) => (
                            <li key={i} style={{ marginBottom: '0.2rem' }}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Render visual chart if task data is present */}
                    {(() => {
                      const chartData = getChartData(msg.structuredResponse.evidence);
                      if (!chartData || chartData.length === 0) return null;
                      return (
                        <div style={{ marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'block', marginBottom: '0.4rem', fontWeight: 600 }}>
                            📊 AI Visual Report Analysis:
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', height: '110px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px', padding: '0.5rem' }}>
                            <div style={{ width: '50%', height: '100%' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={20}
                                    outerRadius={32}
                                    paddingAngle={2}
                                    dataKey="value"
                                  >
                                    {chartData.map((entry: any, index: number) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                  </Pie>
                                  <Tooltip
                                    contentStyle={{ background: '#0f172a', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '6px' }}
                                    itemStyle={{ color: '#f1f5f9', fontSize: '9px' }}
                                  />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '0.2rem', justifyContent: 'center' }}>
                              {chartData.map((entry: any, index: number) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', color: '#94a3b8' }}>
                                  <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: entry.color }} />
                                  <span>{entry.name}: {entry.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })()}



                    {/* Data sources chips */}
                    {msg.structuredResponse.data_sources && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {msg.structuredResponse.data_sources.map((src) => (
                            <span key={src} style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: '#94a3b8', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.03)' }}>
                              💾 {src}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadReport(msg)}
                          style={{
                            background: 'rgba(6,182,212,0.15)',
                            border: '1px solid var(--cyan)',
                            color: 'var(--cyan)',
                            fontSize: '0.7rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontWeight: 500,
                            transition: 'all 0.2s'
                          }}
                        >
                          📥 Download Brief
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {sampleQueries.map((q) => (
            <button
              key={q}
              className="chip"
              onClick={() => handleSend(q)}
              disabled={loading}
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              💡 {q}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(question);
        }}
        className="chat-input-bar"
      >
        <input
          type="text"
          className="input"
          style={{ flex: 1 }}
          placeholder="Ask AI Assistant (e.g. 'Explain the risk level of Project Alpha')..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <button type="submit" className="btn-primary" disabled={loading}>
          Ask Engine ⚡
        </button>
      </form>
    </div>
  );
}
