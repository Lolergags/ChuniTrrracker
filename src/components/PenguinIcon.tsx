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
      {/* 3D Perspective Ground Slider Key Blocks (Wireframes) */}
      {/* Key 1 (Pink) */}
      <path d="M 3.5 28.5 L 5.8 25.5 L 7.8 25.5 L 5.5 28.5 Z" stroke="#f43f5e" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 2 (Pink) */}
      <path d="M 7.2 28.5 L 9.5 25.5 L 11.5 25.5 L 9.2 28.5 Z" stroke="#f43f5e" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 3 (Cyan) */}
      <path d="M 10.9 28.5 L 13.2 25.5 L 15.2 25.5 L 12.9 28.5 Z" stroke="#38bdf8" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 4 (Cyan) */}
      <path d="M 14.6 28.5 L 16.9 25.5 L 18.9 25.5 L 16.6 28.5 Z" stroke="#0284c7" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 5 (Purple) */}
      <path d="M 18.3 28.5 L 20.6 25.5 L 22.6 25.5 L 20.3 28.5 Z" stroke="#a855f7" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 6 (Cyan Peak) */}
      <path d="M 22.0 28.5 L 24.3 25.5 L 26.3 25.5 L 24.0 28.5 Z" stroke="#00f2ff" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 7 (Blue) */}
      <path d="M 25.7 28.5 L 28.0 25.5 L 30.0 25.5 L 27.7 28.5 Z" stroke="#3b82f6" strokeWidth="1" strokeLinejoin="round" />
      {/* Key 8 (Purple) */}
      <path d="M 29.4 28.5 L 31.7 25.5 L 33.7 25.5 L 31.4 28.5 Z" stroke="#c084fc" strokeWidth="1" strokeLinejoin="round" />

      {/* Rising Neon Bar Graph Columns */}
      {/* Bar 1 (Pink) */}
      <rect x="4.1" y="17.5" width="2" height="7" rx="1" stroke="#f43f5e" strokeWidth="1.2" />
      {/* Bar 2 (Pink) */}
      <rect x="7.8" y="9.5" width="2" height="15" rx="1" stroke="#f43f5e" strokeWidth="1.2" />
      {/* Bar 3 (Cyan) */}
      <rect x="11.5" y="13" width="2" height="11.5" rx="1" stroke="#38bdf8" strokeWidth="1.2" />
      {/* Bar 4 (Cyan) */}
      <rect x="15.2" y="8" width="2" height="16.5" rx="1" stroke="#0284c7" strokeWidth="1.2" />
      {/* Bar 5 (Purple) */}
      <rect x="18.9" y="15" width="2" height="9.5" rx="1" stroke="#a855f7" strokeWidth="1.2" />
      {/* Bar 6 (Cyan Peak) */}
      <rect x="22.6" y="5" width="2" height="19.5" rx="1" stroke="#00f2ff" strokeWidth="1.2" />
      {/* Bar 7 (Blue) */}
      <rect x="26.3" y="9" width="2" height="15.5" rx="1" stroke="#3b82f6" strokeWidth="1.2" />
      {/* Bar 8 (Purple) */}
      <rect x="30.0" y="12" width="2" height="12.5" rx="1" stroke="#c084fc" strokeWidth="1.2" />
    </svg>
  );
}
