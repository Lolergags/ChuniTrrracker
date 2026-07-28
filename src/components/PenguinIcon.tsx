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
      {/* Cyberpunk Arcade Crest Ring */}
      <circle cx="18" cy="18" r="16.5" stroke={strokeColor} strokeWidth="1.2" strokeOpacity="0.3" strokeDasharray="3 3" />
      <circle cx="18" cy="18" r="14" fill="var(--accent-glow)" opacity="0.15" />

      {/* Futuristic Arcade Headphones Arch */}
      <path
        d="M 9.5 16 C 9.5 10 13.5 6.5 18 6.5 C 22.5 6.5 26.5 10 26.5 16"
        stroke={strokeColor}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Sleek Geometric Ear Cups */}
      <path d="M 6.5 13.5 L 9.5 12 L 9.5 19 L 6.5 17.5 Z" fill={strokeColor} stroke={strokeColor} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 29.5 13.5 L 26.5 12 L 26.5 19 L 29.5 17.5 Z" fill={strokeColor} stroke={strokeColor} strokeWidth="1.2" strokeLinejoin="round" />

      {/* Futuristic Penguin Head Silhouette */}
      <path
        d="M 18 9 C 13.5 9 10.5 12.5 10.5 17 V 22.5 C 10.5 25.5 13.5 27.5 18 27.5 C 22.5 27.5 25.5 25.5 25.5 22.5 V 17 C 25.5 12.5 22.5 9 18 9 Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Inner Face Mask Arch */}
      <path
        d="M 13.5 22 V 18 C 13.5 15.5 15.5 13.8 18 13.8 C 20.5 13.8 22.5 15.5 22.5 18 V 22 C 22.5 24 20.5 25.5 18 25.5 C 15.5 25.5 13.5 24 13.5 22 Z"
        stroke={strokeColor}
        strokeWidth="1.2"
        strokeOpacity="0.6"
      />

      {/* Sharp Geometric Gold Beak */}
      <path
        d="M 14.5 16 L 21.5 16 L 18 19.5 Z"
        fill="var(--accent-gold)"
        stroke="var(--accent-gold)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Glowing Mascot Eye Dots */}
      <circle cx="15" cy="14" r="1.2" fill={strokeColor} />
      <circle cx="21" cy="14" r="1.2" fill={strokeColor} />

      {/* Rhythm Wave Wings at Base */}
      <path d="M 8.5 23.5 C 10.5 25 13 25.5 15 24.5" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 27.5 23.5 C 25.5 25 23 25.5 21 24.5" stroke={strokeColor} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
