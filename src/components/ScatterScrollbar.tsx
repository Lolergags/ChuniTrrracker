import React, { useRef, useState } from 'react';

interface ScatterScrollbarProps {
  minX: number;
  maxX: number;
  currentZoomX: [number, number] | null;
  onZoomXChange: (newZoomX: [number, number] | null) => void;
  accentColor?: string;
}

export const ScatterScrollbar: React.FC<ScatterScrollbarProps> = ({
  minX,
  maxX,
  currentZoomX,
  onZoomXChange,
  accentColor = 'var(--accent-primary)'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startMin: number; startMax: number }>({ startX: 0, startMin: minX, startMax: maxX });

  const fullSpan = Math.max(0.1, maxX - minX);
  const curMin = currentZoomX ? Math.max(minX, currentZoomX[0]) : minX;
  const curMax = currentZoomX ? Math.min(maxX, currentZoomX[1]) : maxX;
  const zoomSpan = Math.max(0.1, curMax - curMin);

  const isZoomed = currentZoomX !== null && (curMin > minX + 0.05 || curMax < maxX - 0.05);

  const leftPercent = Math.max(0, Math.min(100, ((curMin - minX) / fullSpan) * 100));
  const widthPercent = Math.max(4, Math.min(100 - leftPercent, (zoomSpan / fullSpan) * 100));

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const clickVal = minX + clickRatio * fullSpan;

    // Check if clicked directly inside the thumb box
    if (clickVal >= curMin && clickVal <= curMax && isZoomed) {
      dragRef.current = {
        startX: e.clientX,
        startMin: curMin,
        startMax: curMax
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      // Clicked outside thumb: center the current zoom span around click position
      const halfSpan = zoomSpan / 2;
      let newMin = Math.max(minX, clickVal - halfSpan);
      let newMax = newMin + zoomSpan;
      if (newMax > maxX) {
        newMax = maxX;
        newMin = Math.max(minX, maxX - zoomSpan);
      }
      onZoomXChange([Number(newMin.toFixed(2)), Number(newMax.toFixed(2))]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaRatio = deltaX / rect.width;
    const deltaVal = deltaRatio * fullSpan;

    let newMin = dragRef.current.startMin + deltaVal;
    let newMax = dragRef.current.startMax + deltaVal;

    if (newMin < minX) {
      newMin = minX;
      newMax = minX + zoomSpan;
    } else if (newMax > maxX) {
      newMax = maxX;
      newMin = maxX - zoomSpan;
    }

    onZoomXChange([Number(newMin.toFixed(2)), Number(newMax.toFixed(2))]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  // Generate tick marks along the minimap
  const tickValues = [1, 3, 5, 7, 9, 11, 13, 15].filter(v => v >= minX && v <= maxX);

  return (
    <div style={{ marginTop: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Horizontal Viewport Slider</span>
          {isZoomed ? (
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: accentColor, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              Level {curMin.toFixed(1)} – {curMax.toFixed(1)}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(Drag bar to scroll level range)</span>
          )}
        </span>
        {isZoomed && (
          <button
            onClick={() => onZoomXChange(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0.1rem 0.3rem'
            }}
          >
            Show All Levels
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          height: '28px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '6px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {/* Tick labels underneath */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', pointerEvents: 'none', opacity: 0.3 }}>
          {tickValues.map(t => (
            <span key={t} style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>{t}</span>
          ))}
        </div>

        {/* Zoomed Viewport Thumb Box */}
        <div
          style={{
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            top: '3px',
            bottom: '3px',
            background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.1)',
            border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.3)'}`,
            borderRadius: '4px',
            boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: isDragging ? 'none' : 'left 0.15s ease, width 0.15s ease'
          }}
        >
          <div style={{ width: '12px', height: '8px', borderLeft: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, opacity: 0.8 }} />
        </div>
      </div>
    </div>
  );
};
