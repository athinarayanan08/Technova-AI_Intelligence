import React from 'react';

// ============================================================
// BADGE COMPONENT — TechNova Design System
// ============================================================

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'default'
  | 'purple';

interface BadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  size?: 'sm' | 'md';
  dot?: boolean;          // show colored dot before label
  glow?: boolean;         // add subtle glow effect matching variant
  className?: string;
  style?: React.CSSProperties;
}

const VARIANT_CONFIG: Record<BadgeVariant, {
  bgColor: string;
  textColor: string;
  borderColor: string;
  dotColor: string;
  glowColor: string;
}> = {
  success: {
    bgColor:     'rgba(16, 185, 129, 0.1)',
    textColor:   '#34d399',
    borderColor: 'rgba(16, 185, 129, 0.22)',
    dotColor:    '#10b981',
    glowColor:   'rgba(16, 185, 129, 0.25)',
  },
  warning: {
    bgColor:     'rgba(245, 158, 11, 0.1)',
    textColor:   '#fbbf24',
    borderColor: 'rgba(245, 158, 11, 0.22)',
    dotColor:    '#f59e0b',
    glowColor:   'rgba(245, 158, 11, 0.25)',
  },
  danger: {
    bgColor:     'rgba(244, 63, 94, 0.1)',
    textColor:   '#fb7185',
    borderColor: 'rgba(244, 63, 94, 0.22)',
    dotColor:    '#f43f5e',
    glowColor:   'rgba(244, 63, 94, 0.25)',
  },
  info: {
    bgColor:     'rgba(6, 182, 212, 0.1)',
    textColor:   '#06b6d4',
    borderColor: 'rgba(6, 182, 212, 0.22)',
    dotColor:    '#06b6d4',
    glowColor:   'rgba(6, 182, 212, 0.25)',
  },
  purple: {
    bgColor:     'rgba(139, 92, 246, 0.1)',
    textColor:   '#a78bfa',
    borderColor: 'rgba(139, 92, 246, 0.22)',
    dotColor:    '#8b5cf6',
    glowColor:   'rgba(139, 92, 246, 0.25)',
  },
  default: {
    bgColor:     'rgba(255, 255, 255, 0.06)',
    textColor:   '#94a3b8',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    dotColor:    '#64748b',
    glowColor:   'transparent',
  },
};

const Badge: React.FC<BadgeProps> = ({
  variant,
  children,
  size = 'md',
  dot = false,
  glow = false,
  className = '',
  style,
}) => {
  const config = VARIANT_CONFIG[variant];

  const isSmall = size === 'sm';

  const baseStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: isSmall ? '3px' : '5px',
    padding: isSmall ? '2px 7px' : '3px 10px',
    fontSize: isSmall ? '10px' : '0.75rem',
    fontWeight: 600,
    letterSpacing: '0.03em',
    lineHeight: isSmall ? '1.5' : '1.6',
    borderRadius: '9999px',
    border: `1px solid ${config.borderColor}`,
    backgroundColor: config.bgColor,
    color: config.textColor,
    whiteSpace: 'nowrap' as const,
    userSelect: 'none' as const,
    transition: 'all 0.2s ease',
    ...(glow && variant !== 'default' ? {
      boxShadow: `0 0 10px ${config.glowColor}`,
    } : {}),
    ...style,
  };

  const dotStyle: React.CSSProperties = {
    width: isSmall ? '5px' : '6px',
    height: isSmall ? '5px' : '6px',
    borderRadius: '50%',
    backgroundColor: config.dotColor,
    flexShrink: 0,
    boxShadow: `0 0 4px ${config.dotColor}`,
  };

  return (
    <span
      style={baseStyle}
      className={`badge badge-${variant}${isSmall ? ' badge-sm' : ''} ${className}`.trim()}
    >
      {dot && <span style={dotStyle} aria-hidden="true" />}
      {children}
    </span>
  );
};

export default Badge;
