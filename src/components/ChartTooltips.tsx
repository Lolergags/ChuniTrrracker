import React from 'react';

export const LampTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const order = ['AJC', 'AJ', 'FC', 'CLEAR', 'FAILED'];
    const names: Record<string, string> = {
      'AJC': 'All Justice Critical',
      'AJ': 'All Justice',
      'FC': 'Full Combo',
      'CLEAR': 'Clear',
      'FAILED': 'Failed'
    };

    const validItems = payload
      .filter((p: any) => p.dataKey?.toUpperCase() !== 'UNPLAYED' && p.value > 0)
      .sort((a: any, b: any) => order.indexOf(a.dataKey?.toUpperCase()) - order.indexOf(b.dataKey?.toUpperCase()));

    if (validItems.length === 0) return null;

    return (
      <div style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 'var(--radius-md)',
        padding: '10px',
        color: 'var(--text-primary)',
        fontSize: '14px'
      }}>
        <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>Level {label}</p>
        {validItems.map((entry: any, index: number) => {
          const keyUpper = entry.dataKey?.toUpperCase();
          return (
            <div key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ width: 12, height: 12, backgroundColor: entry.color, display: 'inline-block', marginRight: 8, borderRadius: '2px' }}></span>
              <span style={{ flex: 1, marginRight: '12px' }}>{names[keyUpper] || entry.name}</span>
              <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
};

export const ScatterTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div style={{
        backgroundColor: 'var(--bg-primary)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '12px',
        color: 'var(--text-primary)',
        fontSize: '14px',
        maxWidth: '300px'
      }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.1rem', wordBreak: 'break-word' }}>
          {data.name}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Score:</span>
          <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{data.score.toLocaleString()}</span>
          
          <span style={{ color: 'var(--text-secondary)' }}>OP Yield:</span>
          <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{data.opDisplay}</span>
          
          <span style={{ color: 'var(--text-secondary)' }}>Lamp:</span>
          <span style={{ fontWeight: 'bold', color: `var(--rank-${data.lamp?.toLowerCase() || 'clear'})` }}>{data.lamp || 'CLEAR'}</span>
          
          <span style={{ color: 'var(--text-secondary)' }}>Constant:</span>
          <span>{data.constant?.toFixed(1)}</span>
        </div>
      </div>
    );
  }
  return null;
};
