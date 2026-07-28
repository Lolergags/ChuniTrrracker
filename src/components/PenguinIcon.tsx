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
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Background Soft Aura */}
      <circle cx="18" cy="18" r="15" fill="var(--accent-glow)" opacity="0.12" />

      {/* Chunithm AIR Motion Chevrons (Upward Rays) */}
      <path
        d="M 12 7.5 L 18 3.5 L 24 7.5"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 14.5 10.5 L 18 8 L 21.5 10.5"
        stroke="var(--accent-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.85"
      />

      {/* Statistical Overpower Rank Star (Center Peak) */}
      <path
        d="M 18 10.5 L 19.2 13.2 L 22.2 13.2 L 19.8 15 L 20.8 17.8 L 18 16 L 15.2 17.8 L 16.2 15 L 13.8 13.2 L 16.8 13.2 Z"
        fill="var(--accent-gold)"
        stroke="var(--accent-gold)"
        strokeWidth="0.5"
      />

      {/* Ascending Trend Line (OP Growth Trajectory) */}
      <path
        d="M 5 25.5 Q 11 23 15 19.5 T 23 14 T 31 9.5"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="31" cy="9.5" r="2" fill={strokeColor} />

      {/* Chunithm 16-Key Touch Slider + Statistical Bar Chart Base */}
      {/* Bar 1 */}
      <rect x="5.5" y="23" width="3.2" height="7.5" rx="1" fill={strokeColor} fillOpacity="0.35" stroke={strokeColor} strokeWidth="1" />
      {/* Bar 2 */}
      <rect x="10.8" y="20.5" width="3.2" height="10" rx="1" fill={strokeColor} fillOpacity="0.5" stroke={strokeColor} strokeWidth="1" />
      {/* Bar 3 */}
      <rect x="16.1" y="17.5" width="3.2" height="13" rx="1" fill={strokeColor} fillOpacity="0.65" stroke={strokeColor} strokeWidth="1" />
      {/* Bar 4 */}
      <rect x="21.4" y="14" width="3.2" height="16.5" rx="1" fill={strokeColor} fillOpacity="0.85" stroke={strokeColor} strokeWidth="1" />
      {/* Bar 5 (Peak OP Bar) */}
      <rect x="26.7" y="10.5" width="3.2" height="20" rx="1" fill="var(--accent-gold)" stroke="var(--accent-gold)" strokeWidth="1" />

      {/* Touch Slider Base Ground Rail */}
      <rect x="4" y="30.5" width="28" height="2" rx="1" fill={strokeColor} />
    </svg>
  );
}
