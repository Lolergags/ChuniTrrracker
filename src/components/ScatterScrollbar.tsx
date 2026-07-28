import React, { useRef, useState } from 'react';

interface ScatterScrollbarProps {
  min: number;
  max: number;
  currentZoom: [number, number] | null;
  onZoomChange: (newZoom: [number, number] | null) => void;
  accentColor?: string;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  unitFormatter?: (val: number) => string;
}

export const ScatterScrollbar: React.FC<ScatterScrollbarProps> = ({
  min,
  max,
  currentZoom,
  onZoomChange,
  accentColor = 'var(--accent-primary)',
  orientation = 'horizontal',
  label,
  unitFormatter
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{ startPos: number; startMin: number; startMax: number }>({ startPos: 0, startMin: min, startMax: max });

  const fullSpan = Math.max(0.1, max - min);
  const curMin = currentZoom ? Math.max(min, currentZoom[0]) : min;
  const curMax = currentZoom ? Math.min(max, currentZoom[1]) : max;
  const zoomSpan = Math.max(0.1, curMax - curMin);

  const isZoomed = currentZoom !== null && (curMin > min + (orientation === 'horizontal' ? 0.05 : 1000) || curMax < max - (orientation === 'horizontal' ? 0.05 : 1000));

  const formatVal = (val: number) => {
    if (unitFormatter) return unitFormatter(val);
    if (orientation === 'horizontal') return val.toFixed(1);
    if (val >= 1000000) return `${(val / 1000).toFixed(1)}k`;
    return `${(val / 1000).toFixed(0)}k`;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    let clickRatio: number;
    if (orientation === 'horizontal') {
      clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    } else {
      // For vertical, top is max and bottom is min (1 - ratio)
      clickRatio = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
    }

    const clickVal = min + clickRatio * fullSpan;

    if (clickVal >= curMin && clickVal <= curMax && isZoomed) {
      dragRef.current = {
        startPos: orientation === 'horizontal' ? e.clientX : e.clientY,
        startMin: curMin,
        startMax: curMax
      };
      setIsDragging(true);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } else {
      const halfSpan = zoomSpan / 2;
      let newMin = Math.max(min, clickVal - halfSpan);
      let newMax = newMin + zoomSpan;
      if (newMax > max) {
        newMax = max;
        newMin = Math.max(min, max - zoomSpan);
      }
      onZoomChange([Number(newMin.toFixed(2)), Number(newMax.toFixed(2))]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    let deltaVal: number;
    if (orientation === 'horizontal') {
      const deltaX = e.clientX - dragRef.current.startPos;
      deltaVal = (deltaX / rect.width) * fullSpan;
    } else {
      // Invert Y delta (dragging up increases value)
      const deltaY = dragRef.current.startPos - e.clientY;
      deltaVal = (deltaY / rect.height) * fullSpan;
    }

    let newMin = dragRef.current.startMin + deltaVal;
    let newMax = dragRef.current.startMax + deltaVal;

    if (newMin < min) {
      newMin = min;
      newMax = min + zoomSpan;
    } else if (newMax > max) {
      newMax = max;
      newMin = max - zoomSpan;
    }

    onZoomChange([Number(newMin.toFixed(2)), Number(newMax.toFixed(2))]);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  };

  if (orientation === 'vertical') {
    const bottomPercent = Math.max(0, Math.min(100, ((curMin - min) / fullSpan) * 100));
    const heightPercent = Math.max(5, Math.min(100 - bottomPercent, (zoomSpan / fullSpan) * 100));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', boxSizing: 'border-box', marginRight: '0.4rem' }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.3rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
          {label || 'Score View'}
        </div>
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={{
            position: 'relative',
            width: '26px',
            flex: 1,
            minHeight: '280px',
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
          title={isZoomed ? `Score ${formatVal(curMin)} - ${formatVal(curMax)}` : 'Drag to scroll score range'}
        >
          {/* Zoomed Viewport Thumb Box */}
          <div
            style={{
              position: 'absolute',
              bottom: `${bottomPercent}%`,
              height: `${heightPercent}%`,
              left: '3px',
              right: '3px',
              background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.1)',
              border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.3)'}`,
              borderRadius: '4px',
              boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: isDragging ? 'none' : 'bottom 0.15s ease, height 0.15s ease'
            }}
          >
            <div style={{ height: '10px', width: '6px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}`, opacity: 0.8 }} />
          </div>
        </div>

        {isZoomed && (
          <button
            onClick={() => onZoomChange(null)}
            title="Reset Score Zoom"
            style={{
              background: 'transparent',
              border: 'none',
              color: accentColor,
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '0.3rem',
              padding: '0.1rem'
            }}
          >
            Reset Y
          </button>
        )}
      </div>
    );
  }

  // Horizontal Orientation
  const leftPercent = Math.max(0, Math.min(100, ((curMin - min) / fullSpan) * 100));
  const widthPercent = Math.max(4, Math.min(100 - leftPercent, (zoomSpan / fullSpan) * 100));

  const tickValues = [1, 3, 5, 7, 9, 11, 13, 15].filter(v => v >= min && v <= max);

  return (
    <div style={{ marginTop: '0.75rem', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label || 'Horizontal Viewport Slider'}</span>
          {isZoomed ? (
            <span style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: accentColor, padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
              Level {formatVal(curMin)} – {formatVal(curMax)}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>(Drag bar to scroll level range)</span>
          )}
        </span>
        {isZoomed && (
          <button
            onClick={() => onZoomChange(null)}
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', pointerEvents: 'none', opacity: 0.3 }}>
          {tickValues.map(t => (
            <span key={t} style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>{t}</span>
          ))}
        </div>

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
