import React from 'react';

interface PenguinIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function PenguinIcon({ 
  size = 24, 
  className = '', 
  style = {}
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
      {/* 4 3D Perspective Ground Slider Key Blocks (Shifted Slightly Left) */}
      {/* Key 1 (Pink) */}
      <path d="M 2.8 29.5 L 5.3 24 L 9.0 24 L 6.5 29.5 Z" stroke="#f43f5e" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Key 2 (Sky Blue) */}
      <path d="M 9.8 29.5 L 12.3 24 L 16.0 24 L 13.5 29.5 Z" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Key 3 (Electric Cyan Peak) */}
      <path d="M 16.8 29.5 L 19.3 24 L 23.0 24 L 20.5 29.5 Z" stroke="#00f2ff" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Key 4 (Purple) */}
      <path d="M 23.8 29.5 L 26.3 24 L 30.0 24 L 27.5 29.5 Z" stroke="#a855f7" strokeWidth="1.8" strokeLinejoin="round" />

      {/* 4 Rising Neon Bar Graph Columns (Floating with 2px Vertical Padding Above Slider) */}
      {/* Bar 1 (Pink) */}
      <rect x="4.0" y="11.5" width="4.0" height="10.5" rx="2.0" stroke="#f43f5e" strokeWidth="1.8" />
      {/* Bar 2 (Sky Blue) */}
      <rect x="11.0" y="5.5" width="4.0" height="16.5" rx="2.0" stroke="#38bdf8" strokeWidth="1.8" />
      {/* Bar 3 (Electric Cyan Peak) */}
      <rect x="18.0" y="1.5" width="4.0" height="20.5" rx="2.0" stroke="#00f2ff" strokeWidth="1.8" />
      {/* Bar 4 (Purple) */}
      <rect x="25.0" y="8.5" width="4.0" height="13.5" rx="2.0" stroke="#a855f7" strokeWidth="1.8" />
    </svg>
  );
}
