import React, { useRef, useState, useEffect } from 'react';

interface ScatterScrollbarProps {
  min: number;
  max: number;
  currentZoom: [number, number] | null;
  onZoomChange: (newZoom: [number, number] | null) => void;
  accentColor?: string;
  orientation?: 'horizontal' | 'vertical';
  label?: string;
  unitFormatter?: (val: number) => string;
  paddingLeft?: string | number;
  paddingRight?: string | number;
  marginTop?: string | number;
  marginBottom?: string | number;
}

export const ScatterScrollbar: React.FC<ScatterScrollbarProps> = ({
  min,
  max,
  currentZoom,
  onZoomChange,
  accentColor = 'var(--accent-primary)',
  orientation = 'horizontal',
  label,
  unitFormatter,
  paddingLeft,
  paddingRight,
  marginTop,
  marginBottom
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const fullSpan = Math.max(0.1, max - min);
  const curMin = currentZoom ? Math.max(min, currentZoom[0]) : min;
  const curMax = currentZoom ? Math.min(max, currentZoom[1]) : max;
  const zoomSpan = Math.max(0.1, curMax - curMin);

  const [inputMin, setInputMin] = useState(curMin.toString());
  const [inputMax, setInputMax] = useState(curMax.toString());

  useEffect(() => {
    setInputMin(curMin.toString());
    setInputMax(curMax.toString());
  }, [curMin, curMax]);

  const dragRef = useRef<{
    startPos: number;
    startMin: number;
    startMax: number;
    mode: 'pan' | 'min' | 'max';
  }>({ startPos: 0, startMin: min, startMax: max, mode: 'pan' });

  const isZoomed = currentZoom !== null && (curMin > min + (orientation === 'horizontal' ? 0.05 : 500) || curMax < max - (orientation === 'horizontal' ? 0.05 : 500));

  const formatVal = (val: number) => {
    if (unitFormatter) return unitFormatter(val);
    if (orientation === 'horizontal') return val.toFixed(1);
    if (val >= 1000000) return `${(val / 1000).toFixed(1)}k`;
    return `${(val / 1000).toFixed(0)}k`;
  };

  const handleApplyInputs = () => {
    const minVal = parseFloat(inputMin);
    const maxVal = parseFloat(inputMax);
    if (!isNaN(minVal) && !isNaN(maxVal) && minVal < maxVal) {
      const clampedMin = Math.max(min, minVal);
      const clampedMax = Math.min(max, maxVal);
      onZoomChange([
        orientation === 'horizontal' ? Number(clampedMin.toFixed(2)) : Math.round(clampedMin),
        orientation === 'horizontal' ? Number(clampedMax.toFixed(2)) : Math.round(clampedMax)
      ]);
    }
    setIsEditing(false);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isEditing) return;
    const rect = containerRef.current.getBoundingClientRect();
    let mode: 'pan' | 'min' | 'max' = 'pan';

    if (orientation === 'horizontal') {
      const leftPx = ((curMin - min) / fullSpan) * rect.width;
      const rightPx = ((curMax - min) / fullSpan) * rect.width;
      const clickX = e.clientX - rect.left;

      if (isZoomed && Math.abs(clickX - leftPx) <= 14) {
        mode = 'min';
      } else if (isZoomed && Math.abs(clickX - rightPx) <= 14) {
        mode = 'max';
      } else if (clickX >= leftPx && clickX <= rightPx && isZoomed) {
        mode = 'pan';
      } else {
        const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
        const clickVal = min + clickRatio * fullSpan;
        const halfSpan = zoomSpan / 2;
        let newMin = Math.max(min, clickVal - halfSpan);
        let newMax = newMin + zoomSpan;
        if (newMax > max) {
          newMax = max;
          newMin = Math.max(min, max - zoomSpan);
        }
        onZoomChange([Number(newMin.toFixed(2)), Number(newMax.toFixed(2))]);
        return;
      }

      dragRef.current = {
        startPos: e.clientX,
        startMin: curMin,
        startMax: curMax,
        mode
      };
    } else {
      const bottomPx = ((curMin - min) / fullSpan) * rect.height;
      const topPx = ((curMax - min) / fullSpan) * rect.height;
      const clickYFromBottom = rect.bottom - e.clientY;

      if (isZoomed && Math.abs(clickYFromBottom - bottomPx) <= 14) {
        mode = 'min';
      } else if (isZoomed && Math.abs(clickYFromBottom - topPx) <= 14) {
        mode = 'max';
      } else if (clickYFromBottom >= bottomPx && clickYFromBottom <= topPx && isZoomed) {
        mode = 'pan';
      } else {
        const clickRatio = Math.max(0, Math.min(1, clickYFromBottom / rect.height));
        const clickVal = min + clickRatio * fullSpan;
        const halfSpan = zoomSpan / 2;
        let newMin = Math.max(min, clickVal - halfSpan);
        let newMax = newMin + zoomSpan;
        if (newMax > max) {
          newMax = max;
          newMin = Math.max(min, max - zoomSpan);
        }
        onZoomChange([Math.round(newMin), Math.round(newMax)]);
        return;
      }

      dragRef.current = {
        startPos: e.clientY,
        startMin: curMin,
        startMax: curMax,
        mode
      };
    }

    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const minStep = orientation === 'horizontal' ? 0.1 : 1000;
    const { startPos, startMin, startMax, mode } = dragRef.current;

    let deltaVal: number;
    if (orientation === 'horizontal') {
      const deltaX = e.clientX - startPos;
      deltaVal = (deltaX / rect.width) * fullSpan;
    } else {
      const deltaY = startPos - e.clientY;
      deltaVal = (deltaY / rect.height) * fullSpan;
    }

    if (mode === 'pan') {
      let newMin = startMin + deltaVal;
      let newMax = startMax + deltaVal;

      if (newMin < min) {
        newMin = min;
        newMax = min + zoomSpan;
      } else if (newMax > max) {
        newMax = max;
        newMin = max - zoomSpan;
      }
      onZoomChange([
        orientation === 'horizontal' ? Number(newMin.toFixed(2)) : Math.round(newMin),
        orientation === 'horizontal' ? Number(newMax.toFixed(2)) : Math.round(newMax)
      ]);
    } else if (mode === 'min') {
      let newMin = Math.max(min, Math.min(startMax - minStep, startMin + deltaVal));
      onZoomChange([
        orientation === 'horizontal' ? Number(newMin.toFixed(2)) : Math.round(newMin),
        startMax
      ]);
    } else if (mode === 'max') {
      let newMax = Math.min(max, Math.max(startMin + minStep, startMax + deltaVal));
      onZoomChange([
        startMin,
        orientation === 'horizontal' ? Number(newMax.toFixed(2)) : Math.round(newMax)
      ]);
    }
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
    const heightPercent = Math.max(14, Math.min(100 - bottomPercent, (zoomSpan / fullSpan) * 100));
    const yTicks = [1010000, 1007500, 1000000, 975000, 900000].filter(v => v >= min && v <= max);

    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '430px',
        boxSizing: 'border-box',
        marginRight: '0.4rem',
        paddingTop: marginTop || 0,
        paddingBottom: marginBottom || 0
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label || 'Score View'}</div>
          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.2rem' }}>
              <input
                type="number"
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyInputs()}
                onBlur={handleApplyInputs}
                autoFocus
                style={{ width: '50px', fontSize: '0.7rem', padding: '0.1rem 0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '3px' }}
              />
              <input
                type="number"
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyInputs()}
                onBlur={handleApplyInputs}
                style={{ width: '50px', fontSize: '0.7rem', padding: '0.1rem 0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '3px' }}
              />
            </div>
          ) : isZoomed ? (
            <div 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.7rem', background: 'rgba(56, 189, 248, 0.15)', color: accentColor, padding: '0.1rem 0.35rem', borderRadius: '4px', marginTop: '0.15rem', cursor: 'pointer' }}
            >
              {formatVal(curMin)}–{formatVal(curMax)} ✎
            </div>
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.65rem', opacity: 0.6, cursor: 'pointer' }}
            >
              (Drag / ✎)
            </div>
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
            width: '32px',
            flex: 1,
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
          title={isZoomed ? `Score ${formatVal(curMin)} - ${formatVal(curMax)}` : 'Drag thumb to pan, drag edges to resize'}
        >
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0', pointerEvents: 'none', opacity: 0.35 }}>
            {yTicks.map(t => (
              <span key={t} style={{ fontSize: '0.625rem', color: '#fff', fontWeight: 600 }}>{formatVal(t)}</span>
            ))}
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: `${bottomPercent}%`,
              height: `${heightPercent}%`,
              left: '2px',
              right: '2px',
              background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.1)',
              border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.3)'}`,
              borderRadius: '4px',
              boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '2px 0',
              boxSizing: 'border-box',
              transition: isDragging ? 'none' : 'bottom 0.15s ease, height 0.15s ease'
            }}
          >
            <div style={{ width: '100%', height: '6px', cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '14px', height: '2px', background: accentColor, borderRadius: '1px' }} />
            </div>

            <div style={{ height: '8px', width: '6px', borderTop: `2px solid ${accentColor}`, borderBottom: `2px solid ${accentColor}`, opacity: 0.8 }} />

            <div style={{ width: '100%', height: '6px', cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <div style={{ width: '14px', height: '2px', background: accentColor, borderRadius: '1px' }} />
            </div>
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
              marginTop: '0.2rem',
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
    <div style={{
      marginTop: '0.75rem',
      width: '100%',
      boxSizing: 'border-box',
      paddingLeft: paddingLeft || 0,
      paddingRight: paddingRight || 0
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label || 'Horizontal Viewport Slider'}</span>
          {isEditing ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
              <input
                type="number"
                step="0.1"
                value={inputMin}
                onChange={(e) => setInputMin(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyInputs()}
                onBlur={handleApplyInputs}
                autoFocus
                style={{ width: '45px', fontSize: '0.75rem', padding: '0.1rem 0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '3px' }}
              />
              <span>–</span>
              <input
                type="number"
                step="0.1"
                value={inputMax}
                onChange={(e) => setInputMax(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyInputs()}
                onBlur={handleApplyInputs}
                style={{ width: '45px', fontSize: '0.75rem', padding: '0.1rem 0.2rem', background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '3px' }}
              />
            </span>
          ) : isZoomed ? (
            <span 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.15)', color: accentColor, padding: '0.1rem 0.4rem', borderRadius: '4px', cursor: 'pointer' }}
            >
              Level {formatVal(curMin)} – {formatVal(curMax)} ✎
            </span>
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.75rem', opacity: 0.7, cursor: 'pointer' }}
            >
              (Drag thumb to pan, drag edges to resize ✎)
            </span>
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
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem', pointerEvents: 'none', opacity: 0.35 }}>
          {tickValues.map(t => (
            <span key={t} style={{ fontSize: '0.7rem', color: '#fff', fontWeight: 600 }}>{t}</span>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            top: '2px',
            bottom: '2px',
            background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.1)',
            border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.3)'}`,
            borderRadius: '4px',
            boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 2px',
            boxSizing: 'border-box',
            transition: isDragging ? 'none' : 'left 0.15s ease, width 0.15s ease'
          }}
        >
          <div style={{ height: '100%', width: '6px', cursor: 'ew-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ height: '14px', width: '2px', background: accentColor, borderRadius: '1px' }} />
          </div>

          <div style={{ width: '8px', height: '8px', borderLeft: `2px solid ${accentColor}`, borderRight: `2px solid ${accentColor}`, opacity: 0.8 }} />

          <div style={{ height: '100%', width: '6px', cursor: 'ew-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ height: '14px', width: '2px', background: accentColor, borderRadius: '1px' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
