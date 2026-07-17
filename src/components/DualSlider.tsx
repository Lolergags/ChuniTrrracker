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
  const minValRef = useRef(value[0]);
  const maxValRef = useRef(value[1]);

  useEffect(() => {
    setMinVal(value[0]);
    setMaxVal(value[1]);
    minValRef.current = value[0];
    maxValRef.current = value[1];
  }, [value]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), maxVal - step);
    setMinVal(val);
    minValRef.current = val;
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), minVal + step);
    setMaxVal(val);
    maxValRef.current = val;
  };

  const handleMouseUp = () => {
    onChange([minValRef.current, maxValRef.current]);
  };

  const getPercent = (val: number) => Math.round(((val - min) / (max - min)) * 100);

  return (
    <div style={{ position: 'relative', width: '200px', height: '40px', display: 'flex', alignItems: 'center', margin: '0 10px' }}>
      <div style={{ position: 'absolute', width: '100%', display: 'flex', justifyContent: 'space-between', top: '-5px', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>
        <span>{formatLabel ? formatLabel(minVal) : minVal}</span>
        <span>{formatLabel ? formatLabel(maxVal) : maxVal}</span>
      </div>
      
      <div style={{ position: 'relative', width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '2px', top: '10px' }}>
        <div style={{
          position: 'absolute',
          height: '100%',
          backgroundColor: 'var(--accent-primary)',
          borderRadius: '2px',
          left: `${getPercent(minVal)}%`,
          width: `${getPercent(maxVal) - getPercent(minVal)}%`
        }} />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minVal}
        onChange={handleMinChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={{ position: 'absolute', width: '100%', pointerEvents: 'none', appearance: 'none', background: 'transparent', zIndex: 3, top: '21px', left: 0, margin: 0 }}
        className="dual-slider-thumb"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxVal}
        onChange={handleMaxChange}
        onMouseUp={handleMouseUp}
        onTouchEnd={handleMouseUp}
        style={{ position: 'absolute', width: '100%', pointerEvents: 'none', appearance: 'none', background: 'transparent', zIndex: 4, top: '21px', left: 0, margin: 0 }}
        className="dual-slider-thumb"
      />
    </div>
  );
};
