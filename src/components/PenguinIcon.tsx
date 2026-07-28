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
      {/* Outer Headphone Arch Outline */}
      <path
        d="M6.5 16C6.5 10.7533 10.7533 6.5 16 6.5C21.2467 6.5 25.5 10.7533 25.5 16"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Headphone Earcups */}
      <rect 
        x="4" 
        y="13" 
        width="3" 
        height="6.5" 
        rx="1.5" 
        stroke={strokeColor} 
        strokeWidth="1.8" 
        fill="var(--bg-secondary)" 
      />
      <rect 
        x="25" 
        y="13" 
        width="3" 
        height="6.5" 
        rx="1.5" 
        stroke={strokeColor} 
        strokeWidth="1.8" 
        fill="var(--bg-secondary)" 
      />

      {/* Penguin Body Outline */}
      <path
        d="M16 8.5C11.8579 8.5 8.5 11.8579 8.5 16V22.5C8.5 25.5376 11.8579 28 16 28C20.1421 28 23.5 25.5376 23.5 22.5V16C23.5 11.8579 20.1421 8.5 16 8.5Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* White Belly Outline Arch */}
      <path
        d="M11.5 22.5V19.5C11.5 17.0147 13.5147 15 16 15C18.4853 15 20.5 17.0147 20.5 19.5V22.5C20.5 24.5 18.5 26 16 26C13.5 26 11.5 24.5 11.5 22.5Z"
        stroke={strokeColor}
        strokeWidth="1.4"
        strokeOpacity="0.75"
        strokeDasharray="none"
      />

      {/* Eye Outline Dots */}
      <circle cx="13.5" cy="13.5" r="1.2" fill={strokeColor} />
      <circle cx="18.5" cy="13.5" r="1.2" fill={strokeColor} />

      {/* Beak Outline */}
      <path
        d="M14.5 16L17.5 16L16 18.5Z"
        fill="var(--accent-gold)"
        stroke="var(--accent-gold)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Cute Flippers Outline */}
      <path
        d="M6 19.5C7.2 20.5 8.5 20 8.5 18.5"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M26 19.5C24.8 20.5 23.5 20 23.5 18.5"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
