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
      {/* Subtle Ambient Aura */}
      <circle cx="16" cy="16" r="15" fill="var(--accent-glow)" opacity="0.15" />

      {/* Pingy - Leaning Forward, Facing Slightly Forward */}
      <g transform="rotate(-8 16 16)">
        {/* Headphone Band Arch */}
        <path
          d="M 7.5 13.5 C 7.5 8 11.5 5.5 16 5.5 C 20.5 5.5 24.5 8 24.5 13.5"
          stroke="var(--accent-primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Headphone Earcups (Cyan with Dark Border) */}
        <rect
          x="5"
          y="11.5"
          width="3.5"
          height="6.5"
          rx="1.75"
          fill="var(--accent-primary)"
          stroke="#0f172a"
          strokeWidth="0.8"
        />
        <rect
          x="23.5"
          y="11.5"
          width="3.5"
          height="6.5"
          rx="1.75"
          fill="var(--accent-primary)"
          stroke="#0f172a"
          strokeWidth="0.8"
        />

        {/* Solid Navy Body (Leaning Forward, Subtle Dark Rim) */}
        <path
          d="M 16 7.5 C 11.5 7.5 8 11.5 8 16 V 22.5 C 8 25.8 11.5 28 16 28 C 20.5 28 24 25.8 24 22.5 V 16 C 24 11.5 20.5 7.5 16 7.5 Z"
          fill="#0f172a"
          stroke="rgba(255, 255, 255, 0.15)"
          strokeWidth="0.8"
        />

        {/* Crisp White Belly (Front-Center Curve) */}
        <path
          d="M 16 13.5 C 13.2 13.5 11 16 11 19.5 V 23.5 C 11 25.8 13.2 27 16 27 C 18.8 27 21 25.8 21 23.5 V 19.5 C 21 16 18.8 13.5 16 13.5 Z"
          fill="#f8fafc"
        />

        {/* Expressive Cute Mascot Eyes */}
        <ellipse cx="13.2" cy="12.5" rx="1.3" ry="1.7" fill="#0f172a" />
        <circle cx="13.6" cy="11.8" r="0.5" fill="#ffffff" />

        <ellipse cx="18.8" cy="12.5" rx="1.3" ry="1.7" fill="#0f172a" />
        <circle cx="19.2" cy="11.8" r="0.5" fill="#ffffff" />

        {/* Cheerful Beak (Gold) */}
        <path
          d="M 13.5 14.8 C 13.5 14.8 16 14 18.5 14.8 C 18.5 17 13.5 17 13.5 14.8 Z"
          fill="var(--accent-gold)"
          stroke="#0f172a"
          strokeWidth="0.5"
        />

        {/* Outstretched Navy Flippers */}
        <path
          d="M 7.5 17.5 C 5.5 19 5 21 6.8 22 C 8 22.2 9.2 20.5 8.5 18.8"
          fill="#0f172a"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="0.8"
        />
        <path
          d="M 24.5 17.5 C 26.5 19 27 21 25.2 22 C 24 22.2 22.8 20.5 23.5 18.8"
          fill="#0f172a"
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth="0.8"
        />

        {/* Feet at Base (Solid Gold) */}
        <path
          d="M 11.5 27.2 L 14 28.2 M 18 28.2 L 20.5 27.2"
          stroke="var(--accent-gold)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
