import React from 'react';

// ============================================================
// METRIC CARD COMPONENT — TechNova Design System
// Premium glassmorphism metric display with glow effects
// ============================================================

export type MetricCardColor = 'cyan' | 'purple' | 'green' | 'amber' | 'rose';

interface MetricCardTrend {
  value: number;    // percentage change, e.g. 12.5
  label: string;    // e.g. 'vs last week'
  up: boolean;      // true = trending up
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: MetricCardTrend;
  color?: MetricCardColor;
  className?: string;
  animationDelay?: number;  // ms — for staggered entry animations
}

// ── Color token maps ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<MetricCardColor, {
  iconBg:     string;
  iconShadow: string;
  iconColor:  string;
  valueCss:   string;   // CSS gradient for value text
  borderGlow: string;
  accentLine: string;
}> = {
  cyan: {
    iconBg:     'rgba(6, 182, 212, 0.12)',
    iconShadow: '0 0 24px rgba(6, 182, 212, 0.35), 0 0 8px rgba(6, 182, 212, 0.2)',
    iconColor:  '#06b6d4',
    valueCss:   'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
    borderGlow: 'rgba(6, 182, 212, 0.18)',
    accentLine: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)',
  },
  purple: {
    iconBg:     'rgba(139, 92, 246, 0.12)',
    iconShadow: '0 0 24px rgba(139, 92, 246, 0.35), 0 0 8px rgba(139, 92, 246, 0.2)',
    iconColor:  '#a78bfa',
    valueCss:   'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
    borderGlow: 'rgba(139, 92, 246, 0.18)',
    accentLine: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
  },
  green: {
    iconBg:     'rgba(16, 185, 129, 0.12)',
    iconShadow: '0 0 24px rgba(16, 185, 129, 0.35), 0 0 8px rgba(16, 185, 129, 0.2)',
    iconColor:  '#34d399',
    valueCss:   'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
    borderGlow: 'rgba(16, 185, 129, 0.18)',
    accentLine: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
  },
  amber: {
    iconBg:     'rgba(245, 158, 11, 0.12)',
    iconShadow: '0 0 24px rgba(245, 158, 11, 0.35), 0 0 8px rgba(245, 158, 11, 0.2)',
    iconColor:  '#fbbf24',
    valueCss:   'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
    borderGlow: 'rgba(245, 158, 11, 0.18)',
    accentLine: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
  },
  rose: {
    iconBg:     'rgba(244, 63, 94, 0.12)',
    iconShadow: '0 0 24px rgba(244, 63, 94, 0.35), 0 0 8px rgba(244, 63, 94, 0.2)',
    iconColor:  '#fb7185',
    valueCss:   'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
    borderGlow: 'rgba(244, 63, 94, 0.18)',
    accentLine: 'linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)',
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

const TrendArrow: React.FC<{ up: boolean }> = ({ up }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ transform: up ? 'rotate(0deg)' : 'rotate(180deg)', flexShrink: 0 }}
  >
    <polyline points="18 15 12 9 6 15" />
  </svg>
);

// ── Main Component ─────────────────────────────────────────────────────────────

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'cyan',
  className = '',
  animationDelay = 0,
}) => {
  const tokens = COLOR_MAP[color];

  // ── Styles ───────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    background: 'var(--bg-card)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid var(--border)`,
    borderRadius: '20px',
    padding: '24px',
    boxShadow: `var(--shadow-lg)`,
    overflow: 'hidden',
    transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease',
    animation: `slideUp 0.4s ease ${animationDelay}ms both`,
    cursor: 'default',
  };

  const accentLineStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: tokens.accentLine,
    opacity: 0.7,
    borderRadius: '20px 20px 0 0',
  };

  const glowBlobStyle: React.CSSProperties = {
    position: 'absolute',
    top: '-30px',
    right: '-20px',
    width: '120px',
    height: '120px',
    background: tokens.iconBg,
    borderRadius: '50%',
    filter: 'blur(40px)',
    pointerEvents: 'none',
  };

  const iconWrapperStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    borderRadius: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: tokens.iconBg,
    boxShadow: tokens.iconShadow,
    color: tokens.iconColor,
    fontSize: '22px',
    marginBottom: '16px',
    border: `1px solid ${tokens.borderGlow}`,
    flexShrink: 0,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '6px',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '2.4rem',
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    background: tokens.valueCss,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '4px',
  };

  const subtitleStyle: React.CSSProperties = {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '2px',
    lineHeight: 1.4,
  };

  const trendStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    fontWeight: 600,
    padding: '4px 10px',
    borderRadius: '9999px',
    marginTop: '14px',
    ...(trend?.up
      ? {
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
          border: '1px solid rgba(16, 185, 129, 0.2)',
        }
      : {
          background: 'rgba(244, 63, 94, 0.1)',
          color: '#fb7185',
          border: '1px solid rgba(244, 63, 94, 0.2)',
        }
    ),
  };

  // ── Hover interaction via CSS class ─────────────────────────────────────────
  // Supplemented by the metric-card CSS class in index.css

  return (
    <div
      className={`metric-card metric-card-${color} ${className}`.trim()}
      style={cardStyle}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-3px)';
        el.style.boxShadow = `0 16px 48px rgba(0,0,0,0.15), 0 0 30px ${tokens.borderGlow}`;
        el.style.borderColor = tokens.borderGlow;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = '';
        el.style.boxShadow = 'var(--shadow-lg)';
        el.style.borderColor = 'var(--border)';
      }}
    >
      {/* Top accent line */}
      <div style={accentLineStyle} aria-hidden="true" />

      {/* Background glow blob */}
      <div style={glowBlobStyle} aria-hidden="true" />

      {/* Icon */}
      <div style={iconWrapperStyle} aria-hidden="true">
        {icon}
      </div>

      {/* Title */}
      <p style={titleStyle}>{title}</p>

      {/* Value */}
      <div style={valueStyle}>{value}</div>

      {/* Subtitle */}
      {subtitle && (
        <p style={subtitleStyle}>{subtitle}</p>
      )}

      {/* Trend */}
      {trend && (
        <div style={trendStyle}>
          <TrendArrow up={trend.up} />
          <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
          <span style={{ fontWeight: 400, opacity: 0.7 }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default MetricCard;
