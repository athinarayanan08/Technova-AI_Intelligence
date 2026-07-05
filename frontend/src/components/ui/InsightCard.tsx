import React from 'react';
import type { AiInsight, InsightType } from '../../types';
import Badge from './Badge';
import type { BadgeVariant } from './Badge';

// ============================================================
// INSIGHT CARD COMPONENT — TechNova Design System
// Displays AI-generated organizational insights with
// severity theming, evidence display, and glassmorphism styling
// ============================================================

interface InsightCardProps {
  insight: AiInsight;
  onDismiss?: (id: string) => void;
  onResolve?: (id: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

// ── Type → Display config mapping ────────────────────────────────────────────

interface InsightTypeConfig {
  label:   string;
  variant: BadgeVariant;
  icon:    string;
  accent:  string;        // CSS color for left border
  glow:    string;        // rgba glow
}

const INSIGHT_TYPE_CONFIG: Record<InsightType, InsightTypeConfig> = {
  EMPLOYEE_BURNOUT: {
    label:   'Burnout Risk',
    variant: 'danger',
    icon:    '🔥',
    accent:  '#f43f5e',
    glow:    'rgba(244, 63, 94, 0.12)',
  },
  PROJECT_RISK: {
    label:   'Project Risk',
    variant: 'warning',
    icon:    '⚠️',
    accent:  '#f59e0b',
    glow:    'rgba(245, 158, 11, 0.12)',
  },
  TEAM_VELOCITY: {
    label:   'Team Velocity',
    variant: 'info',
    icon:    '⚡',
    accent:  '#06b6d4',
    glow:    'rgba(6, 182, 212, 0.12)',
  },
  ORG_HEALTH: {
    label:   'Org Health',
    variant: 'purple',
    icon:    '🏢',
    accent:  '#8b5cf6',
    glow:    'rgba(139, 92, 246, 0.12)',
  },
  PROMOTION_RECOMMENDATION: {
    label:   'Promotion',
    variant: 'success',
    icon:    '⭐',
    accent:  '#10b981',
    glow:    'rgba(16, 185, 129, 0.12)',
  },
  KNOWLEDGE_GAP: {
    label:   'Knowledge Gap',
    variant: 'default',
    icon:    '📚',
    accent:  '#94a3b8',
    glow:    'rgba(148, 163, 184, 0.08)',
  },
};

// ── Severity → color ──────────────────────────────────────────────────────────

const SEVERITY_COLOR: Record<AiInsight['severity'], string> = {
  INFO:     '#94a3b8',
  LOW:      '#06b6d4',
  MEDIUM:   '#f59e0b',
  HIGH:     '#f43f5e',
  CRITICAL: '#ef4444',
};

const SEVERITY_BG: Record<AiInsight['severity'], string> = {
  INFO:     'rgba(148, 163, 184, 0.1)',
  LOW:      'rgba(6, 182, 212, 0.1)',
  MEDIUM:   'rgba(245, 158, 11, 0.1)',
  HIGH:     'rgba(244, 63, 94, 0.1)',
  CRITICAL: 'rgba(239, 68, 68, 0.12)',
};

// ── Evidence status dot ────────────────────────────────────────────────────────

const EVIDENCE_DOT: Record<AiInsight['evidence'][0]['status'], string> = {
  NORMAL:   '#10b981',
  WARNING:  '#f59e0b',
  CRITICAL: '#f43f5e',
};

// ── Helper: relative timestamp ────────────────────────────────────────────────

function formatRelativeTime(isoString: string): string {
  const now  = Date.now();
  const then = new Date(isoString).getTime();
  const diff = Math.floor((now - then) / 1000);   // seconds

  if (diff < 60)          return 'just now';
  if (diff < 3600)        return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)       return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800)      return `${Math.floor(diff / 86400)}d ago`;

  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  });
}

// ── Shield Icon ───────────────────────────────────────────────────────────────

const ShieldIcon: React.FC<{ size?: number; color?: string }> = ({
  size  = 12,
  color = '#10b981',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

// ── Sparkle / AI Icon ─────────────────────────────────────────────────────────

const SparkleIcon: React.FC<{ size?: number; color?: string }> = ({
  size  = 14,
  color = '#8b5cf6',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={color}
    aria-hidden="true"
  >
    <path d="M12 2L9.19 9.19 2 12l7.19 2.81L12 22l2.81-7.19L22 12l-7.19-2.81z" />
  </svg>
);

// ── Dismiss Icon ─────────────────────────────────────────────────────────────

const XIcon: React.FC<{ size?: number }> = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6"  y1="6" x2="18" y2="18" />
  </svg>
);

// ── Check Icon ────────────────────────────────────────────────────────────────

const CheckIcon: React.FC<{ size?: number }> = ({ size = 13 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onDismiss,
  onResolve,
  className = '',
  style,
}) => {
  const typeConfig = INSIGHT_TYPE_CONFIG[insight.type];
  const sevColor   = SEVERITY_COLOR[insight.severity];
  const sevBg      = SEVERITY_BG[insight.severity];

  // ── Card styles ──────────────────────────────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'rgba(15, 23, 42, 0.7)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.07)',
    borderLeft: `3px solid ${typeConfig.accent}`,
    boxShadow: `0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`,
    overflow: 'hidden',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
    animation: 'slideUp 0.4s ease both',
    ...style,
  };

  const accentGlowStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '200px',
    height: '200px',
    background: typeConfig.glow,
    borderRadius: '50%',
    filter: 'blur(60px)',
    pointerEvents: 'none',
    transform: 'translate(-40%, -40%)',
  };

  const headerStyle: React.CSSProperties = {
    padding: '18px 20px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '12px',
  };

  const headerLeftStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  };

  const badgeRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  };

  const subjectNameStyle: React.CSSProperties = {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#f1f5f9',
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const verdictStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: sevColor,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    background: sevBg,
    borderRadius: '6px',
    border: `1px solid ${sevColor}33`,
  };

  const bodyStyle: React.CSSProperties = {
    padding: '14px 20px',
  };

  const recommendationStyle: React.CSSProperties = {
    fontSize: '0.8125rem',
    color: '#94a3b8',
    lineHeight: 1.6,
    marginBottom: '14px',
  };

  const evidenceGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '8px',
    marginBottom: '14px',
  };

  const evidenceItemStyle = (status: AiInsight['evidence'][0]['status']): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '10px',
    border: `1px solid ${EVIDENCE_DOT[status]}22`,
  });

  const evidenceLabelStyle: React.CSSProperties = {
    fontSize: '10px',
    color: '#475569',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const evidenceValueRowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const footerStyle: React.CSSProperties = {
    padding: '10px 20px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  };

  const evidenceTagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: '#10b981',
    fontWeight: 500,
    padding: '3px 9px',
    background: 'rgba(16, 185, 129, 0.08)',
    borderRadius: '9999px',
    border: '1px solid rgba(16, 185, 129, 0.18)',
  };

  const aiTagStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    color: '#a78bfa',
    fontWeight: 500,
    padding: '3px 9px',
    background: 'rgba(139, 92, 246, 0.08)',
    borderRadius: '9999px',
    border: '1px solid rgba(139, 92, 246, 0.18)',
  };

  const timestampStyle: React.CSSProperties = {
    fontSize: '11px',
    color: '#334155',
    fontWeight: 500,
  };

  const actionBtnStyle = (variant: 'dismiss' | 'resolve'): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: 600,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontFamily: "'Inter', sans-serif",
    ...(variant === 'dismiss'
      ? {
          background: 'rgba(255,255,255,0.05)',
          color: '#64748b',
        }
      : {
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }
    ),
  });

  const confidencePct = Math.round(insight.confidence * 100);

  return (
    <article
      className={`card ${className}`.trim()}
      style={cardStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.45), 0 0 20px ${typeConfig.glow}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement;
        el.style.transform = '';
        el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)';
      }}
    >
      {/* Background glow blob */}
      <div style={accentGlowStyle} aria-hidden="true" />

      {/* ── Header ── */}
      <header style={headerStyle}>
        <div style={headerLeftStyle}>
          {/* Badge row */}
          <div style={badgeRowStyle}>
            <Badge variant={typeConfig.variant} dot glow>
              {typeConfig.icon} {typeConfig.label}
            </Badge>

            {/* Severity badge */}
            <Badge
              variant={
                insight.severity === 'CRITICAL' || insight.severity === 'HIGH'
                  ? 'danger'
                  : insight.severity === 'MEDIUM'
                    ? 'warning'
                    : insight.severity === 'LOW'
                      ? 'info'
                      : 'default'
              }
              size="sm"
            >
              {insight.severity}
            </Badge>

            {/* Confidence */}
            <span style={{
              fontSize: '10px',
              color: '#475569',
              fontWeight: 600,
              letterSpacing: '0.03em',
            }}>
              {confidencePct}% confidence
            </span>
          </div>

          {/* Subject name */}
          <h3 style={subjectNameStyle} title={insight.subjectName}>
            {insight.subjectName}
          </h3>

          {/* Verdict */}
          <div style={verdictStyle}>
            <span style={{ fontSize: '13px' }}>
              {insight.severity === 'CRITICAL' || insight.severity === 'HIGH' ? '⚠' : 'ℹ'}
            </span>
            {insight.verdict}
          </div>
        </div>

        {/* ── Dismiss button ── */}
        {onDismiss && !insight.isDismissed && (
          <button
            onClick={() => onDismiss(insight.id)}
            title="Dismiss this insight"
            aria-label="Dismiss insight"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#334155',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = '#334155';
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <XIcon />
          </button>
        )}
      </header>

      {/* ── Body ── */}
      <section style={bodyStyle}>
        {/* Recommendation */}
        <p style={recommendationStyle}>
          {insight.recommendation}
        </p>

        {/* Evidence grid */}
        {insight.evidence.length > 0 && (
          <div style={evidenceGridStyle}>
            {insight.evidence.slice(0, 6).map((ev, idx) => (
              <div key={idx} style={evidenceItemStyle(ev.status)}>
                <span style={evidenceLabelStyle}>{ev.label}</span>
                <div style={evidenceValueRowStyle}>
                  <span
                    style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      background: EVIDENCE_DOT[ev.status],
                      flexShrink: 0,
                      boxShadow: `0 0 5px ${EVIDENCE_DOT[ev.status]}`,
                    }}
                  />
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: EVIDENCE_DOT[ev.status],
                  }}>
                    {ev.value}
                  </span>
                  {ev.benchmark !== undefined && (
                    <span style={{ fontSize: '11px', color: '#334155', marginLeft: '4px' }}>
                      / {ev.benchmark}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Footer ── */}
      <footer style={footerStyle}>
        {/* Left tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={evidenceTagStyle}>
            <ShieldIcon />
            Evidence Based
          </span>
          <span style={aiTagStyle}>
            <SparkleIcon />
            AI Generated
          </span>
        </div>

        {/* Right — timestamp + actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={timestampStyle}>
            {formatRelativeTime(insight.generatedAt)}
          </span>

          {onResolve && !insight.resolvedAt && (
            <button
              onClick={() => onResolve(insight.id)}
              aria-label="Mark insight as resolved"
              style={actionBtnStyle('resolve')}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.18)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.1)';
              }}
            >
              <CheckIcon />
              Resolve
            </button>
          )}
        </div>
      </footer>
    </article>
  );
};

export default InsightCard;
