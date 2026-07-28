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
      {/* 3/4 Side-Angled Pingy - Leaning Forward */}
      <g transform="rotate(-12 16 16)">
        {/* Headphone Band Arch */}
        <path
          d="M 9.5 12.5 C 9.5 7.5 14.5 5 18 6.5"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Outer Body Silhouette (Tilted Forward) */}
        <path
          d="M 9.5 22.5 C 7.5 19.5 8 13.5 12.5 9.5 C 16.5 6 21 8 22.5 11.5 C 24 15 23.5 20.5 21 24 C 18 27.5 12.5 27 9.5 22.5 Z"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* White Belly Side Curve */}
        <path
          d="M 14.5 11.5 C 17.5 13.5 19.5 17.5 18.5 22.5 C 17.5 25 14 26 12 24.5"
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeOpacity="0.7"
        />

        {/* Beak Pointing Right */}
        <path
          d="M 21.5 12.5 L 26.5 14.5 L 21 16.5 Z"
          fill="var(--accent-gold)"
          stroke="var(--accent-gold)"
          strokeWidth="0.8"
          strokeLinejoin="round"
        />

        {/* Side Eye */}
        <circle cx="18.5" cy="11.5" r="1.3" fill={strokeColor} />

        {/* Side Headphone Earcup */}
        <rect
          x="10"
          y="10.5"
          width="4.5"
          height="7.5"
          rx="2.25"
          transform="rotate(-10 12.25 14.25)"
          stroke={strokeColor}
          strokeWidth="1.8"
          fill="var(--bg-secondary)"
        />

        {/* Side Flipper Reaching Back */}
        <path
          d="M 12 17.5 C 8.5 19.5 7.5 22.5 9.5 23.5 C 11.5 24 13.5 21.5 14 19.5"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Feet at Base */}
        <path
          d="M 11 26.5 L 14 27.5 M 17 26.5 L 20 27.5"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
