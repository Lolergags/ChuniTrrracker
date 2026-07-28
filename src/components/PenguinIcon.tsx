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
      {/* Official Chuni Penguin Pose - Leaning Forward with Visor Cap */}

      {/* Visor Cap Brim (Chunithm Yellow) */}
      <path
        d="M 9.5 8.5 C 13.5 6 18.5 6 22.5 8.5 L 24 10 C 19 8 13 8 8 10 Z"
        fill="var(--accent-gold)"
        stroke="var(--accent-gold)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Headphone Band Arch */}
      <path
        d="M 6.5 14.5 C 6.5 9 10.5 5 16 5 C 21.5 5 25.5 9 25.5 14.5"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinecap="round"
      />

      {/* Headphone Earcups */}
      <rect 
        x="4" 
        y="12.5" 
        width="3" 
        height="6.5" 
        rx="1.5" 
        stroke={strokeColor} 
        strokeWidth="1.6" 
        fill="var(--bg-secondary)" 
      />
      <rect 
        x="25" 
        y="12.5" 
        width="3" 
        height="6.5" 
        rx="1.5" 
        stroke={strokeColor} 
        strokeWidth="1.6" 
        fill="var(--bg-secondary)" 
      />

      {/* Chubby Leaning Body Silhouette */}
      <path
        d="M 16 7.5 C 11.5 7.5 8 11.5 8 16 V 22 C 8 25.5 11.5 28 16 28 C 20.5 28 24 25.5 24 22 V 16 C 24 11.5 20.5 7.5 16 7.5 Z"
        stroke={strokeColor}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* White Belly Arch */}
      <path
        d="M 11.5 23 V 18 C 11.5 15.5 13.5 13.5 16 13.5 C 18.5 13.5 20.5 15.5 20.5 18 V 23 C 20.5 25 18.5 26.5 16 26.5 C 13.5 26.5 11.5 25 11.5 23 Z"
        stroke={strokeColor}
        strokeWidth="1.3"
        strokeOpacity="0.75"
      />

      {/* Friendly Eyes */}
      <ellipse cx="13" cy="12.5" rx="1.3" ry="1.7" fill={strokeColor} />
      <circle cx="13.4" cy="11.8" r="0.5" fill="#ffffff" />

      <ellipse cx="19" cy="12.5" rx="1.3" ry="1.7" fill={strokeColor} />
      <circle cx="19.4" cy="11.8" r="0.5" fill="#ffffff" />

      {/* Cheerful Open Beak */}
      <path
        d="M 13.5 15 C 13.5 15 16 14.2 18.5 15 C 18.5 17 13.5 17 13.5 15 Z"
        fill="var(--accent-gold)"
        stroke="var(--accent-gold)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />

      {/* Expressive Flippers (Outstretched) */}
      <path
        d="M 7.5 17.5 C 5 19 4.5 21.5 6.5 22.5 C 8 23 9.5 21 8.5 19"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M 24.5 17.5 C 27 19 27.5 21.5 25.5 22.5 C 24 23 22.5 21 23.5 19"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Feet at Base */}
      <path
        d="M 11.5 27.5 L 14 28.5 M 18 28.5 L 20.5 27.5"
        stroke="var(--accent-gold)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
