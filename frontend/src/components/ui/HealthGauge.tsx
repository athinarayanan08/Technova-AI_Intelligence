import React, { useEffect, useRef } from 'react';

// ============================================================
// HEALTH GAUGE COMPONENT — TechNova Design System
// SVG-based circular progress gauge with animated stroke,
// dynamic color, and radiant glow effects
// ============================================================

interface HealthGaugeProps {
  score: number;              // 0-100
  size?: number;              // diameter in px, default 180
  strokeWidth?: number;       // gauge thickness, default 14
  animated?: boolean;         // animate on mount, default true
  showLabel?: boolean;        // show 'HEALTH SCORE' label, default true
  label?: string;             // override label text
  className?: string;
  style?: React.CSSProperties;
}

// ── Color resolution by score ─────────────────────────────────────────────────

interface GaugeColors {
  primary:      string;
  secondary:    string;
  glow:         string;
  glowStrong:   string;
  textColor:    string;
  grade:        string;
  gradientId:   string;
}

function resolveColors(score: number): GaugeColors {
  if (score >= 85) {
    return {
      primary:    '#06b6d4',
      secondary:  '#0ea5e9',
      glow:       'rgba(6, 182, 212, 0.4)',
      glowStrong: 'rgba(6, 182, 212, 0.15)',
      textColor:  '#06b6d4',
      grade:      'A',
      gradientId: 'gauge-gradient-cyan',
    };
  } else if (score >= 70) {
    return {
      primary:    '#10b981',
      secondary:  '#34d399',
      glow:       'rgba(16, 185, 129, 0.4)',
      glowStrong: 'rgba(16, 185, 129, 0.15)',
      textColor:  '#34d399',
      grade:      'B',
      gradientId: 'gauge-gradient-green',
    };
  } else if (score >= 50) {
    return {
      primary:    '#f59e0b',
      secondary:  '#fbbf24',
      glow:       'rgba(245, 158, 11, 0.4)',
      glowStrong: 'rgba(245, 158, 11, 0.15)',
      textColor:  '#fbbf24',
      grade:      'C',
      gradientId: 'gauge-gradient-amber',
    };
  } else {
    return {
      primary:    '#f43f5e',
      secondary:  '#fb7185',
      glow:       'rgba(244, 63, 94, 0.4)',
      glowStrong: 'rgba(244, 63, 94, 0.15)',
      textColor:  '#fb7185',
      grade:      'D',
      gradientId: 'gauge-gradient-rose',
    };
  }
}

// ── Main Component ─────────────────────────────────────────────────────────────

const HealthGauge: React.FC<HealthGaugeProps> = ({
  score,
  size = 180,
  strokeWidth = 14,
  animated = true,
  showLabel = true,
  label = 'HEALTH SCORE',
  className = '',
  style,
}) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const colors = resolveColors(clampedScore);

  const arcRef = useRef<SVGCircleElement>(null);

  // ── Geometry ────────────────────────────────────────────────────────────────
  const center      = size / 2;
  const radius      = center - strokeWidth - 4;   // inner padding
  const circumference = 2 * Math.PI * radius;
  const progress    = clampedScore / 100;
  const dashOffset  = circumference * (1 - progress);

  // Unique IDs to support multiple gauges on same page
  const uid = useRef(`gauge-${Math.random().toString(36).slice(2, 8)}`).current;
  const filterId    = `${uid}-filter`;
  const glowId      = `${uid}-glow`;
  const gradientId  = `${uid}-gradient`;
  const trackGradId = `${uid}-track-grad`;

  // ── Animate stroke on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!animated || !arcRef.current) return;

    const el = arcRef.current;
    // Start fully hidden then animate to target
    el.style.strokeDashoffset = String(circumference);
    el.style.transition = 'none';

    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.2, 0.64, 1)';
        el.style.strokeDashoffset = String(dashOffset);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [clampedScore, circumference, dashOffset, animated]);

  // ── Wrapper style ────────────────────────────────────────────────────────────
  const wrapperStyle: React.CSSProperties = {
    display: 'inline-flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    ...style,
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: `${size}px`,
    height: `${size}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const centerContentStyle: React.CSSProperties = {
    position: 'absolute',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    userSelect: 'none',
    pointerEvents: 'none',
  };

  const scoreStyle: React.CSSProperties = {
    fontSize: `${size * 0.245}px`,
    fontWeight: 700,
    lineHeight: 1,
    letterSpacing: '-0.03em',
    color: colors.textColor,
    textShadow: `0 0 20px ${colors.glow}`,
    fontFamily: "'Inter', sans-serif",
  };

  const gradeStyle: React.CSSProperties = {
    fontSize: `${size * 0.1}px`,
    fontWeight: 600,
    color: colors.textColor,
    opacity: 0.7,
    lineHeight: 1,
    letterSpacing: '0.05em',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
    userSelect: 'none',
  };

  return (
    <div className={`health-score-display ${className}`.trim()} style={wrapperStyle}>
      <div style={containerStyle}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-label={`Health score: ${clampedScore} out of 100`}
          role="img"
          style={{ overflow: 'visible' }}
        >
          <defs>
            {/* Gradient for the active arc */}
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%"   stopColor={colors.primary}   />
              <stop offset="100%" stopColor={colors.secondary}  />
            </linearGradient>

            {/* Track gradient */}
            <linearGradient id={trackGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%"   stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.015)" />
            </linearGradient>

            {/* Glow filter for the arc */}
            <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Strong glow layer */}
            <filter id={glowId} x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
            </filter>
          </defs>

          {/* ── Outer ring (decorative) ── */}
          <circle
            cx={center}
            cy={center}
            r={radius + strokeWidth / 2 + 5}
            fill="none"
            stroke="rgba(255,255,255,0.02)"
            strokeWidth="1"
          />

          {/* ── Track circle ── */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${trackGradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* ── Glow layer (blurred duplicate, behind arc) ── */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={colors.primary}
            strokeWidth={strokeWidth + 6}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? dashOffset : dashOffset}
            strokeOpacity={0.2}
            transform={`rotate(-90 ${center} ${center})`}
            filter={`url(#${glowId})`}
            style={{ transition: animated ? 'stroke-dashoffset 1.4s cubic-bezier(0.34, 1.2, 0.64, 1)' : undefined }}
          />

          {/* ── Active progress arc ── */}
          <circle
            ref={arcRef}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? circumference : dashOffset}  // starts hidden if animated
            transform={`rotate(-90 ${center} ${center})`}
            filter={`url(#${filterId})`}
          />

          {/* ── Cap dot at the arc end (gleam) ── */}
          {clampedScore > 2 && (
            (() => {
              const angle = (progress * 360 - 90) * (Math.PI / 180);
              const x = center + radius * Math.cos(angle);
              const y = center + radius * Math.sin(angle);
              return (
                <circle
                  cx={x}
                  cy={y}
                  r={strokeWidth / 2 - 1}
                  fill={colors.secondary}
                  style={{ filter: `drop-shadow(0 0 6px ${colors.glow})` }}
                />
              );
            })()
          )}
        </svg>

        {/* ── Center text ── */}
        <div style={centerContentStyle}>
          <span style={scoreStyle}>{clampedScore}</span>
          <span style={gradeStyle}>Grade {colors.grade}</span>
        </div>
      </div>

      {/* ── Bottom label ── */}
      {showLabel && (
        <span style={labelStyle}>{label}</span>
      )}
    </div>
  );
};

export default HealthGauge;
