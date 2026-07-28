import React from 'react';

interface TrrrackerIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function TrrrackerIcon({ 
  size = 32, 
  className = '', 
  style = {}
}: TrrrackerIconProps) {
  const numericSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={numericSize}
      height={numericSize}
      viewBox="0.5 0.5 30.5 30.5"
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* 4 3D Perspective Ground Slider Key Blocks */}
      {/* Key 1 (Pink) */}
      <path d="M 1.8 29.5 L 4.3 24 L 8.0 24 L 5.5 29.5 Z" stroke="#f43f5e" strokeWidth="1.8" strokeLinejoin="round" />

      {/* Key 2 (Sky Blue) */}
      <path d="M 8.8 29.5 L 11.3 24 L 15.0 24 L 12.5 29.5 Z" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />

      {/* Key 3 (Electric Cyan Peak) */}
      <path d="M 15.8 29.5 L 18.3 24 L 22.0 24 L 19.5 29.5 Z" stroke="#00f2ff" strokeWidth="1.8" strokeLinejoin="round" />

      {/* Key 4 (Purple) */}
      <path d="M 22.8 29.5 L 25.3 24 L 29.0 24 L 26.5 29.5 Z" stroke="#a855f7" strokeWidth="1.8" strokeLinejoin="round" />

      {/* 4 Rising Neon Bar Graph Columns (Rounded Top, Flat Bottom) */}
      {/* Bar 1 (Pink) */}
      <path d="M 4.15 21.5 V 13.5 A 2.0 2.0 0 0 1 8.15 13.5 V 21.5 Z" stroke="#f43f5e" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Bar 2 (Sky Blue) */}
      <path d="M 11.15 21.5 V 7.5 A 2.0 2.0 0 0 1 15.15 7.5 V 21.5 Z" stroke="#38bdf8" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Bar 3 (Electric Cyan Peak) */}
      <path d="M 18.15 21.5 V 3.5 A 2.0 2.0 0 0 1 22.15 3.5 V 21.5 Z" stroke="#00f2ff" strokeWidth="1.8" strokeLinejoin="round" />
      {/* Bar 4 (Purple) */}
      <path d="M 25.15 21.5 V 10.5 A 2.0 2.0 0 0 1 29.15 10.5 V 21.5 Z" stroke="#a855f7" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
