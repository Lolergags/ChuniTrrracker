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
      {/* 6 Larger 3D Perspective Ground Slider Key Blocks */}
      {/* Key 1 (Pink) */}
      <path d="M 3 29.5 L 5.5 24.5 L 8.2 24.5 L 5.7 29.5 Z" stroke="#f43f5e" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Key 2 (Magenta) */}
      <path d="M 8 29.5 L 10.5 24.5 L 13.2 24.5 L 10.7 29.5 Z" stroke="#e11d48" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Key 3 (Sky Blue) */}
      <path d="M 13 29.5 L 15.5 24.5 L 18.2 24.5 L 15.7 29.5 Z" stroke="#38bdf8" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Key 4 (Electric Cyan) */}
      <path d="M 18 29.5 L 20.5 24.5 L 23.2 24.5 L 20.7 29.5 Z" stroke="#00f2ff" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Key 5 (Cobalt Blue) */}
      <path d="M 23 29.5 L 25.5 24.5 L 28.2 24.5 L 25.7 29.5 Z" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Key 6 (Purple) */}
      <path d="M 28 29.5 L 30.5 24.5 L 33.2 24.5 L 30.7 29.5 Z" stroke="#a855f7" strokeWidth="1.5" strokeLinejoin="round" />

      {/* 6 Rising Neon Bar Graph Columns */}
      {/* Bar 1 (Pink) */}
      <rect x="4.2" y="14.5" width="2.8" height="9.5" rx="1.4" stroke="#f43f5e" strokeWidth="1.5" />
      {/* Bar 2 (Magenta) */}
      <rect x="9.2" y="6.5" width="2.8" height="17.5" rx="1.4" stroke="#e11d48" strokeWidth="1.5" />
      {/* Bar 3 (Sky Blue) */}
      <rect x="14.2" y="11.5" width="2.8" height="12.5" rx="1.4" stroke="#38bdf8" strokeWidth="1.5" />
      {/* Bar 4 (Electric Cyan Peak) */}
      <rect x="19.2" y="2.5" width="2.8" height="21.5" rx="1.4" stroke="#00f2ff" strokeWidth="1.5" />
      {/* Bar 5 (Cobalt Blue) */}
      <rect x="24.2" y="7.5" width="2.8" height="16.5" rx="1.4" stroke="#3b82f6" strokeWidth="1.5" />
      {/* Bar 6 (Purple) */}
      <rect x="29.2" y="10.5" width="2.8" height="13.5" rx="1.4" stroke="#a855f7" strokeWidth="1.5" />
    </svg>
  );
}
