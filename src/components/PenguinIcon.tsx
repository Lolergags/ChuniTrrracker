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
      {/* Gold Headphones Band */}
      <path
        d="M 9 14 C 9 8 13.5 4.5 18 4.5 C 22.5 4.5 27 8 27 14"
        stroke="var(--accent-gold)"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Earcups */}
      <rect x="6" y="10.5" width="5.5" height="9" rx="2.75" fill="var(--accent-gold)" stroke="#0f172a" strokeWidth="1.5" />
      <rect x="24.5" y="10.5" width="5.5" height="9" rx="2.75" fill="var(--accent-gold)" stroke="#0f172a" strokeWidth="1.5" />

      {/* Outer Navy Body Silhouette */}
      <path
        d="M 17.5 6 C 12 6 8.5 10 8.5 15 V 23.5 C 8.5 27.5 12 30 17.5 30 C 23 30 26.5 27 26.5 23 V 15 C 26.5 10 23 6 17.5 6 Z"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1.5"
      />

      {/* Black Tail behind */}
      <path d="M 25 21.5 C 29 22 30.5 24.5 27.5 27 C 25.5 26.5 24.8 24 25 21.5 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="1" />

      {/* White Face & Belly Patch */}
      <path
        d="M 17.5 10.5 C 13.5 10.5 10.5 12.5 10.5 16.5 V 23.5 C 10.5 26.8 13.5 28.5 17.5 28.5 C 21.5 28.5 24 26.8 24 23.5 V 16.5 C 24 12.5 21.5 10.5 17.5 10.5 Z"
        fill="#ffffff"
      />

      {/* Striped Track Jacket (Black & White) */}
      <path
        d="M 16.5 17.5 C 21.5 18 24.5 20.5 25 24.5 C 23.5 27.5 19.5 28.5 16.5 28.5 C 14.5 28.5 12.5 27.5 11.5 25.5 C 13 22 15 19 16.5 17.5 Z"
        fill="#0f172a"
        stroke="#0f172a"
        strokeWidth="1"
      />

      {/* White Jacket Stripes */}
      <path d="M 19 19 L 20.5 24.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M 21.5 20 L 23 24" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" />

      {/* Bent Flipper Sleeve */}
      <path
        d="M 15.5 19 C 13.5 21 14.5 24 16.5 24.5 C 18 24 18.5 22 17.5 20 Z"
        fill="#0f172a"
        stroke="#ffffff"
        strokeWidth="0.8"
      />

      {/* Cute Round Black Eyes */}
      <circle cx="14" cy="14" r="1.6" fill="#0f172a" />
      <circle cx="19.5" cy="14" r="1.6" fill="#0f172a" />

      {/* Gold Triangle Beak */}
      <path
        d="M 13.5 16 L 20 16 L 16.5 19.5 Z"
        fill="var(--accent-gold)"
        stroke="#0f172a"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Stepping Front Foot (Navy) & Back Webbed Foot (Gold) */}
      <path d="M 11 29 L 14.5 32 L 16.5 29 Z" fill="#0f172a" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M 22 28.5 L 25 31.5 L 27 28.5 Z" fill="var(--accent-gold)" stroke="#0f172a" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
