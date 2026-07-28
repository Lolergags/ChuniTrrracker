import React from 'react';

interface PenguinIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  strokeColor?: string;
}

export function PenguinIcon({ 
  size = 24, 
  className = '', 
  style = {},
  strokeColor = 'var(--accent-primary)'
}: PenguinIconProps) {
  const numericSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={numericSize}
      height={numericSize}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Soft Background Radial Glow */}
      <circle cx="16" cy="16" r="14" fill="var(--accent-glow)" opacity="0.12" />

      {/* Chunithm AIR Motion Rays / Chevron Arch Above Peak */}
      <path
        d="M 10 9 L 16 5 L 22 9"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 12.5 11.5 L 16 9 L 19.5 11.5"
        stroke="var(--accent-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Chunithm 16-Key Touch Slider Bar Graph */}
      {/* Keybeam 1 */}
      <rect x="4" y="22" width="2.2" height="6" rx="0.8" fill={strokeColor} opacity="0.4" />
      {/* Keybeam 2 */}
      <rect x="6.8" y="20" width="2.2" height="8" rx="0.8" fill={strokeColor} opacity="0.5" />
      {/* Keybeam 3 */}
      <rect x="9.6" y="17" width="2.2" height="11" rx="0.8" fill={strokeColor} opacity="0.65" />
      {/* Keybeam 4 */}
      <rect x="12.4" y="14" width="2.2" height="14" rx="0.8" fill={strokeColor} opacity="0.8" />
      {/* Keybeam 5 (Peak - Gold) */}
      <rect x="15.2" y="11" width="2.2" height="17" rx="0.8" fill="var(--accent-gold)" />
      {/* Keybeam 6 (Secondary Peak - Crimson) */}
      <rect x="18" y="13" width="2.2" height="15" rx="0.8" fill="var(--accent-secondary)" />
      {/* Keybeam 7 */}
      <rect x="20.8" y="16" width="2.2" height="12" rx="0.8" fill={strokeColor} opacity="0.85" />
      {/* Keybeam 8 */}
      <rect x="23.6" y="19" width="2.2" height="9" rx="0.8" fill={strokeColor} opacity="0.65" />
      {/* Keybeam 9 */}
      <rect x="26.4" y="22" width="2.2" height="6" rx="0.8" fill={strokeColor} opacity="0.45" />

      {/* Chunithm Ground Slider Rail Line */}
      <rect x="3" y="28" width="26" height="2" rx="1" fill={strokeColor} />
      <line x1="3" y1="28.5" x2="29" y2="28.5" stroke="var(--bg-primary)" strokeWidth="0.5" />
    </svg>
  );
}
