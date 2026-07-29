import React, { useRef, useState, useEffect } from 'react';
import { sanitizeRangeInputs } from '../lib/utils/scatterZoom.js';

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
    const [finalMin, finalMax] = sanitizeRangeInputs(
      inputMin,
      inputMax,
      min,
      max,
      orientation,
      curMin,
      curMax
    );

    // 1. Explicitly blur active input element before closing popover
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    // 2. Hide popover state without destroying DOM nodes
    setIsEditing(false);

    // 3. Update zoom domain callback
    onZoomChange([finalMin, finalMax]);
    setInputMin(finalMin.toString());
    setInputMax(finalMax.toString());
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || isEditing) return;
    const rect = containerRef.current.getBoundingClientRect();
    let mode: 'pan' | 'min' | 'max' = 'pan';

    // 24px hit-test radius for comfortable mobile touch grabbing
    const hitRadius = 24;

    if (orientation === 'horizontal') {
      const leftPx = ((curMin - min) / fullSpan) * rect.width;
      const rightPx = ((curMax - min) / fullSpan) * rect.width;
      const clickX = e.clientX - rect.left;

      if (Math.abs(clickX - leftPx) <= hitRadius) {
        mode = 'min';
      } else if (Math.abs(clickX - rightPx) <= hitRadius) {
        mode = 'max';
      } else if (clickX >= leftPx && clickX <= rightPx && isZoomed) {
        mode = 'pan';
      } else {
        const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
        const clickVal = min + clickRatio * fullSpan;
        const targetSpan = isZoomed ? zoomSpan : fullSpan * 0.4;
        const halfSpan = targetSpan / 2;
        let newMin = Math.max(min, clickVal - halfSpan);
        let newMax = newMin + targetSpan;
        if (newMax > max) {
          newMax = max;
          newMin = Math.max(min, max - targetSpan);
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

      if (Math.abs(clickYFromBottom - bottomPx) <= hitRadius) {
        mode = 'min';
      } else if (Math.abs(clickYFromBottom - topPx) <= hitRadius) {
        mode = 'max';
      } else if (clickYFromBottom >= bottomPx && clickYFromBottom <= topPx && isZoomed) {
        mode = 'pan';
      } else {
        const clickRatio = Math.max(0, Math.min(1, clickYFromBottom / rect.height));
        const clickVal = min + clickRatio * fullSpan;
        const targetSpan = isZoomed ? zoomSpan : fullSpan * 0.4;
        const halfSpan = targetSpan / 2;
        let newMin = Math.max(min, clickVal - halfSpan);
        let newMax = newMin + targetSpan;
        if (newMax > max) {
          newMax = max;
          newMin = Math.max(min, max - targetSpan);
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

  const scrollbarRafRef = useRef<number | null>(null);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    if (scrollbarRafRef.current !== null) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    scrollbarRafRef.current = requestAnimationFrame(() => {
      scrollbarRafRef.current = null;
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const minStep = orientation === 'horizontal' ? 0.1 : 1000;
      const { startPos, startMin, startMax, mode } = dragRef.current;

      let deltaVal: number;
      if (orientation === 'horizontal') {
        const deltaX = clientX - startPos;
        deltaVal = (deltaX / rect.width) * fullSpan;
      } else {
        const deltaY = startPos - clientY;
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
    });
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

    return (
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        height: '430px',
        boxSizing: 'border-box',
        marginRight: '0.2rem',
        paddingTop: marginTop || 0,
        paddingBottom: marginBottom || 0,
        gap: '0.2rem'
      }}>
        {/* Rotated Score Label & Active Range Side Text */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          fontSize: '0.68rem',
          color: 'var(--text-secondary)',
          whiteSpace: 'nowrap',
          userSelect: 'none'
        }}>
          {isZoomed ? (
            <span
              onClick={() => setIsEditing(true)}
              title="Click to type exact score values"
              style={{
                background: 'rgba(56, 189, 248, 0.15)',
                color: accentColor,
                padding: '0.3rem 0.15rem',
                borderRadius: '4px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Score {formatVal(curMin)}–{formatVal(curMax)} ✎
            </span>
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              title="Click to type exact score values"
              style={{ opacity: 0.6, cursor: 'pointer' }}
            >
              {label || 'Score View'} ✎
            </span>
          )}
        </div>

        {/* Absolute Floating Popover Editor for Vertical Mode (Kept in DOM to prevent mobile unmount scroll jump) */}
        <div 
          onTouchStart={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              handleApplyInputs();
            }
          }}
          style={{
            display: isEditing ? 'flex' : 'none',
            visibility: isEditing ? 'visible' : 'hidden',
            position: 'absolute',
            left: '26px',
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 100,
            background: 'var(--bg-glass)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--accent-primary)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
            padding: '0.6rem 0.75rem',
            borderRadius: '8px',
            flexDirection: 'column',
            gap: '0.4rem',
            width: '120px'
          }}
        >
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>Set Score Range</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <label style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Max Score:</label>
            <input
              type="number"
              step="1000"
              value={inputMax}
              onChange={(e) => setInputMax(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyInputs();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.3rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
            />
            <label style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>Min Score:</label>
            <input
              type="number"
              step="1000"
              value={inputMin}
              onChange={(e) => setInputMin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyInputs();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.3rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        {/* Slim 18px Vertical Track Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center' }}>
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{
              position: 'relative',
              width: '18px',
              flex: 1,
              background: 'rgba(0, 0, 0, 0.4)',
              borderRadius: '9px',
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
            {/* Viewport Thumb Box */}
            <div
              style={{
                position: 'absolute',
                bottom: `${bottomPercent}%`,
                height: `${heightPercent}%`,
                left: '1px',
                right: '1px',
                background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.15)',
                border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.35)'}`,
                borderRadius: '5px',
                boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1px 0',
                boxSizing: 'border-box',
                transition: isDragging ? 'none' : 'bottom 0.15s ease, height 0.15s ease'
              }}
            >
              {/* Top Handle Line */}
              <div style={{ width: '100%', height: '4px', cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '10px', height: '3px', background: accentColor, borderRadius: '1.5px' }} />
              </div>

              {/* Bottom Handle Line */}
              <div style={{ width: '100%', height: '4px', cursor: 'ns-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ width: '10px', height: '3px', background: accentColor, borderRadius: '1.5px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Ultra-Compact Horizontal Orientation (18px Track Height with Floating Popover)
  const leftPercent = Math.max(0, Math.min(100, ((curMin - min) / fullSpan) * 100));
  const widthPercent = Math.max(4, Math.min(100 - leftPercent, (zoomSpan / fullSpan) * 100));
  const tickValues = [1, 3, 5, 7, 9, 11, 13, 15].filter(v => v >= min && v <= max);

  return (
    <div style={{
      position: 'relative',
      marginTop: '0.4rem',
      width: '100%',
      boxSizing: 'border-box',
      paddingLeft: paddingLeft || 0,
      paddingRight: paddingRight || 0
    }}>
      {/* Floating Popover Editor for Horizontal Mode (Kept in DOM to prevent mobile unmount scroll jump) */}
      <div 
        onTouchStart={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            handleApplyInputs();
          }
        }}
        style={{
          display: isEditing ? 'flex' : 'none',
          visibility: isEditing ? 'visible' : 'hidden',
          position: 'absolute',
          left: paddingLeft || 0,
          bottom: '100%',
          marginBottom: '0.4rem',
          zIndex: 100,
          background: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          border: '1px solid var(--accent-primary)',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
          padding: '0.6rem 0.75rem',
          borderRadius: '8px',
          flexDirection: 'column',
          gap: '0.4rem',
          width: '180px'
        }}
      >
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-primary)' }}>Set Level Range</div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
            <label style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Min Level:</label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="15.4"
              value={inputMin}
              onChange={(e) => setInputMin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyInputs();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.3rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
          <span style={{ marginTop: '0.8rem', color: 'var(--text-secondary)' }}>–</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', flex: 1 }}>
            <label style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Max Level:</label>
            <input
              type="number"
              step="0.1"
              min="1.0"
              max="15.4"
              value={inputMax}
              onChange={(e) => setInputMax(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleApplyInputs();
                if (e.key === 'Escape') setIsEditing(false);
              }}
              data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              style={{ width: '100%', fontSize: '0.75rem', padding: '0.2rem 0.3rem', background: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{label || 'Level Constant'}</span>
          {isZoomed ? (
            <span 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.15)', color: accentColor, padding: '0.05rem 0.3rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
            >
              Level {formatVal(curMin)}–{formatVal(curMax)} ✎
            </span>
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              title="Click to type exact values"
              style={{ fontSize: '0.68rem', opacity: 0.6, cursor: 'pointer' }}
            >
              (Drag / ✎)
            </span>
          )}
        </span>
      </div>

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          height: '18px',
          background: 'rgba(0, 0, 0, 0.4)',
          borderRadius: '9px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          cursor: isDragging ? 'grabbing' : 'pointer',
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.4rem', pointerEvents: 'none', opacity: 0.35 }}>
          {tickValues.map(t => (
            <span key={t} style={{ fontSize: '0.6rem', color: '#fff', fontWeight: 600 }}>{t}</span>
          ))}
        </div>

        <div
          style={{
            position: 'absolute',
            left: `${leftPercent}%`,
            width: `${widthPercent}%`,
            top: '1px',
            bottom: '1px',
            background: isZoomed ? `${accentColor}33` : 'rgba(255, 255, 255, 0.15)',
            border: `1.5px solid ${isZoomed ? accentColor : 'rgba(255, 255, 255, 0.35)'}`,
            borderRadius: '5px',
            boxShadow: isZoomed ? `0 0 10px ${accentColor}55` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1px',
            boxSizing: 'border-box',
            transition: isDragging ? 'none' : 'left 0.15s ease, width 0.15s ease'
          }}
        >
          <div style={{ height: '100%', width: '4px', cursor: 'ew-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ height: '10px', width: '3px', background: accentColor, borderRadius: '1.5px' }} />
          </div>

          <div style={{ height: '100%', width: '4px', cursor: 'ew-resize', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ height: '10px', width: '3px', background: accentColor, borderRadius: '1.5px' }} />
          </div>
        </div>
      </div>
    </div>
  );
};
