import React, { useState, useEffect, useRef } from 'react';

interface DualSliderProps {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  formatLabel?: (val: number) => string;
}

export const DualSlider: React.FC<DualSliderProps> = ({ min, max, step, value, onChange, formatLabel }) => {
  const [minVal, setMinVal] = useState(value[0]);
  const [maxVal, setMaxVal] = useState(value[1]);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef<'min' | 'max' | null>(null);

  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
  }, [value[0], value[1]]);

  const getPercent = (val: number) => Math.round(((val - min) / (max - min)) * 100);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const val = min + percent * (max - min);
    
    // Determine which thumb is closer
    const distMin = Math.abs(val - minVal);
    const distMax = Math.abs(val - maxVal);
    
    if (distMin <= distMax) {
      isDragging.current = 'min';
      updateValue(val, 'min');
    } else {
      isDragging.current = 'max';
      updateValue(val, 'max');
    }
    
    // Add global listeners for dragging
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const updateValue = (val: number, type: 'min' | 'max') => {
    // Snap to step
    let snapped = Math.round(val / step) * step;
    
    if (type === 'min') {
      snapped = Math.max(min, Math.min(snapped, maxVal - step));
      setMinVal(snapped);
    } else {
      snapped = Math.max(minVal + step, Math.min(snapped, max));
      setMaxVal(snapped);
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const val = min + percent * (max - min);
    updateValue(val, isDragging.current);
  };

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const handlePointerUp = () => {
    if (isDragging.current) {
      onChangeRef.current([latestVals.current[0], latestVals.current[1]]);
    }
    isDragging.current = null;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  };

  const latestVals = useRef([minVal, maxVal]);
  useEffect(() => {
    latestVals.current = [minVal, maxVal];
  }, [minVal, maxVal]);

  return (
    <div 
      style={{ position: 'relative', width: '200px', height: '40px', display: 'flex', alignItems: 'center', margin: '0 10px', touchAction: 'none' }}
    >
      <div style={{ position: 'absolute', width: '100%', display: 'flex', justifyContent: 'space-between', top: '-5px', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
        <span>{formatLabel ? formatLabel(minVal) : minVal}</span>
        <span>{formatLabel ? formatLabel(maxVal) : maxVal}</span>
      </div>
      
      <div 
        ref={containerRef}
        onPointerDown={handlePointerDown}
        style={{ position: 'relative', width: '100%', height: '24px', display: 'flex', alignItems: 'center', cursor: 'pointer', zIndex: 10 }}
      >
        <div style={{ position: 'relative', width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
          <div style={{
            position: 'absolute',
            height: '100%',
            backgroundColor: 'var(--accent-primary)',
            borderRadius: '2px',
            left: `${getPercent(minVal)}%`,
            width: `${getPercent(maxVal) - getPercent(minVal)}%`
          }} />
          
          <div style={{
            position: 'absolute',
            left: `calc(${getPercent(minVal)}% - 8px)`,
            top: '-6px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none' // The container handles the clicks
          }} />

          <div style={{
            position: 'absolute',
            left: `calc(${getPercent(maxVal)}% - 8px)`,
            top: '-6px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: 'white',
            border: '2px solid var(--accent-primary)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none'
          }} />
        </div>
      </div>
    </div>
  );
};
