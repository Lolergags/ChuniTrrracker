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
      {/* Sleek Minimalist Outline - Leaning Forward 3/4 Stance */}
      <g transform="rotate(-8 16 16)">
        {/* Headphone Band Arch Outline */}
        <path
          d="M 7.5 13.5 C 7.5 7.5 11.5 5 16 5 C 20.5 5 24.5 7.5 24.5 13.5"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Headphone Earcups Outlines */}
        <rect
          x="5"
          y="11.5"
          width="3.2"
          height="6"
          rx="1.6"
          stroke={strokeColor}
          strokeWidth="1.6"
        />
        <rect
          x="23.8"
          y="11.5"
          width="3.2"
          height="6"
          rx="1.6"
          stroke={strokeColor}
          strokeWidth="1.6"
        />

        {/* Minimalist Body Contour Outline */}
        <path
          d="M 16 7.5 C 11.8 7.5 8.5 11.2 8.5 15.5 V 22 C 8.5 25.2 11.8 27.5 16 27.5 C 20.2 27.5 23.5 25.2 23.5 22 V 15.5 C 23.5 11.2 20.2 7.5 16 7.5 Z"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />

        {/* Minimalist Inner Belly Outline */}
        <path
          d="M 12 22.5 V 19 C 12 16.5 13.8 14.5 16 14.5 C 18.2 14.5 20 16.5 20 19 V 22.5 C 20 24.5 18.2 25.8 16 25.8 C 13.8 25.8 12 24.5 12 22.5 Z"
          stroke={strokeColor}
          strokeWidth="1.3"
          strokeOpacity="0.6"
        />

        {/* Minimalist Beak Outline (Gold Accent) */}
        <path
          d="M 13.8 15.2 L 18.2 15.2 L 16 17.5 Z"
          stroke="var(--accent-gold)"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        {/* Minimalist Eye Dots */}
        <circle cx="13.2" cy="12.5" r="1.1" fill={strokeColor} />
        <circle cx="18.8" cy="12.5" r="1.1" fill={strokeColor} />

        {/* Minimalist Flipper Strokes */}
        <path
          d="M 6.8 18.5 C 5.2 19.8 4.8 21.5 6.5 22"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 25.2 18.5 C 26.8 19.8 27.2 21.5 25.5 22"
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Feet Lines */}
        <path
          d="M 11.8 27.5 L 14 28.5 M 18 28.5 L 20.2 27.5"
          stroke="var(--accent-gold)"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
