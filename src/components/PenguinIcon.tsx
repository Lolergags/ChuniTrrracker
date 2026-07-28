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
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {/* Outer Cyan Arcade Aura Glow */}
      <circle cx="16" cy="16" r="15" fill="var(--accent-glow)" opacity="0.25" />

      {/* Filled 3/4 Side-Angled Pingy - Leaning Forward */}
      <g transform="rotate(-12 16 16)">
        {/* Headphone Band Arch */}
        <path
          d="M 9.5 12.5 C 9.5 7.5 14.5 5 18 6.5"
          stroke="var(--accent-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Navy/Dark Slate Solid Body (Leaning Forward) */}
        <path
          d="M 9.5 22.5 C 7.5 19.5 8 13.5 12.5 9.5 C 16.5 6 21 8 22.5 11.5 C 24 15 23.5 20.5 21 24 C 18 27.5 12.5 27 9.5 22.5 Z"
          fill="#0f172a"
          stroke="var(--accent-primary)"
          strokeWidth="1.25"
        />

        {/* Solid White Belly Oval (3/4 Front Side) */}
        <path
          d="M 14.5 11.5 C 17.5 13.5 19.5 17.5 18.5 22.5 C 17.5 25.5 13.5 26.5 11.5 24.5 C 10.5 23.5 12.5 16 14.5 11.5 Z"
          fill="#f8fafc"
        />

        {/* Beak Pointing Right (Solid Gold) */}
        <path
          d="M 21.5 12.5 L 26.5 14.5 L 21 16.5 Z"
          fill="var(--accent-gold)"
          stroke="#0f172a"
          strokeWidth="0.5"
        />

        {/* Side Eye with White Specular Shine */}
        <circle cx="18.5" cy="11.5" r="1.5" fill="#0f172a" />
        <circle cx="19" cy="11" r="0.5" fill="#ffffff" />

        {/* Side Headphone Earcup (Chunithm Cyan) */}
        <rect
          x="9.5"
          y="10.5"
          width="4.5"
          height="7.5"
          rx="2.25"
          transform="rotate(-10 11.75 14.25)"
          fill="var(--accent-primary)"
          stroke="#0f172a"
          strokeWidth="0.8"
        />

        {/* Navy Side Flipper Reaching Back */}
        <path
          d="M 12 17.5 C 8.5 19.5 7.5 22.5 9.5 23.5 C 11.5 24 13.5 21.5 14 19.5"
          fill="#0f172a"
          stroke="var(--accent-primary)"
          strokeWidth="1.2"
        />

        {/* Feet at Base (Solid Gold) */}
        <path
          d="M 10.5 25.5 L 13.5 27.5 L 14.5 26 M 16.5 25.5 L 19.5 27.5 L 20.5 26"
          fill="var(--accent-gold)"
        />
      </g>
    </svg>
  );
}
