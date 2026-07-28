import React from 'react';

interface PenguinIconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export function PenguinIcon({ size = 24, className = '', style = {} }: PenguinIconProps) {
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
      <circle cx="16" cy="16" r="15" fill="var(--accent-glow)" opacity="0.3" />

      {/* Headphone Band */}
      <path
        d="M6 16C6 10.4772 10.4772 6 16 6C21.5228 6 26 10.4772 26 16"
        stroke="var(--accent-primary)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Penguin Body (Navy/Dark Slate) */}
      <path
        d="M16 8C11.5817 8 8 11.5817 8 16V22C8 25.3137 11.5817 28 16 28C20.4183 28 24 25.3137 24 22V16C24 11.5817 20.4183 8 16 8Z"
        fill="#0f172a"
        stroke="var(--accent-primary)"
        strokeWidth="1.25"
      />

      {/* White Belly Oval */}
      <path
        d="M16 13C13.2386 13 11 15.6863 11 19V23C11 25.2091 13.2386 27 16 27C18.7614 27 21 25.2091 21 23V19C21 15.6863 18.7614 13 16 13Z"
        fill="#f8fafc"
      />

      {/* Eyes */}
      <circle cx="13.5" cy="13.5" r="1.5" fill="#0f172a" />
      <circle cx="14" cy="13" r="0.5" fill="#ffffff" />
      
      <circle cx="18.5" cy="13.5" r="1.5" fill="#0f172a" />
      <circle cx="19" cy="13" r="0.5" fill="#ffffff" />

      {/* Beak */}
      <path
        d="M14.5 15.5L17.5 15.5L16 18Z"
        fill="var(--accent-gold)"
      />

      {/* Chunithm Arcade Headphone Earcups */}
      <rect x="4.5" y="13" width="3.5" height="7" rx="1.75" fill="var(--accent-primary)" stroke="#0f172a" strokeWidth="0.8" />
      <rect x="24" y="13" width="3.5" height="7" rx="1.75" fill="var(--accent-primary)" stroke="#0f172a" strokeWidth="0.8" />
    </svg>
  );
}
