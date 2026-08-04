import React from 'react';

const LAMP_ORDER = ['AJC', 'AJ', 'FC', 'CLEAR', 'FAILED'];
const LAMP_NAMES: Record<string, string> = {
  'AJC': 'All Justice Critical',
  'AJ': 'All Justice',
  'FC': 'Full Combo',
  'CLEAR': 'Clear',
  'FAILED': 'Failed'
};

export const LampTooltip = React.memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const validItems = payload
      .filter((p: any) => p.dataKey?.toUpperCase() !== 'UNPLAYED' && p.value > 0)
      .sort((a: any, b: any) => LAMP_ORDER.indexOf(a.dataKey?.toUpperCase()) - LAMP_ORDER.indexOf(b.dataKey?.toUpperCase()));

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
              <span style={{ flex: 1, marginRight: '12px' }}>{LAMP_NAMES[keyUpper] || entry.name}</span>
              <span style={{ fontWeight: 'bold' }}>{entry.value}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return null;
});

export const ScatterTooltip = React.memo(({ active, payload, selectedDot, hoveredDot, onSelectDot, onNavigateSong }: any) => {
  if (active && payload && payload.length && (selectedDot || hoveredDot)) {
    const rawData = payload[0].payload;
    const overlaps = rawData.overlappingItems || [];
    const hasOverlap = overlaps.length > 1;

    let activeChart = rawData;
    if (selectedDot) {
      const matchInOverlaps = overlaps.find((item: any) =>
        (selectedDot.chartId && item.chartId === selectedDot.chartId) ||
        (selectedDot.id && item.id === selectedDot.id) ||
        ((selectedDot.songId || selectedDot.song_id) && (item.songId || item.song_id) && (selectedDot.songId || selectedDot.song_id) === (item.songId || item.song_id) && (!selectedDot.difficulty || !item.difficulty || selectedDot.difficulty === item.difficulty)) ||
        ((item.title || item.name) === (selectedDot.title || selectedDot.name) && Math.abs(item.constant - selectedDot.constant) < 0.01 && Math.abs((item.score || item.avgScore) - (selectedDot.score || selectedDot.avgScore)) < 1)
      );

      if (matchInOverlaps) {
        activeChart = matchInOverlaps;
      } else if (
        (selectedDot.chartId && rawData.chartId === selectedDot.chartId) ||
        (selectedDot.id && rawData.id === selectedDot.id) ||
        ((selectedDot.songId || selectedDot.song_id) && (rawData.songId || rawData.song_id) && (selectedDot.songId || selectedDot.song_id) === (rawData.songId || rawData.song_id) && (!selectedDot.difficulty || !rawData.difficulty || selectedDot.difficulty === rawData.difficulty)) ||
        ((rawData.title || rawData.name) === (selectedDot.title || selectedDot.name) && Math.abs(rawData.constant - selectedDot.constant) < 0.01)
      ) {
        activeChart = selectedDot;
      }
    }

    const data = activeChart;

    return (
      <div 
        style={{
          backgroundColor: 'var(--bg-primary)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '8px',
          padding: '12px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          maxWidth: '320px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          cursor: onNavigateSong ? 'pointer' : 'default'
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (onNavigateSong) {
            onNavigateSong(data);
          }
        }}
      >
        {hasOverlap && (
          <div style={{
            display: 'inline-block',
            marginBottom: '6px',
            padding: '2px 8px',
            background: 'var(--accent-gold)',
            color: '#000',
            fontWeight: 700,
            fontSize: '0.75rem',
            borderRadius: '4px'
          }}>
            ⚡ {overlaps.length} Overlapping Charts
          </div>
        )}

        <p 
          style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '1.05rem', wordBreak: 'break-word', cursor: 'pointer' }}
          title="Double-click to open leaderboard"
        >
          {data.name || data.title}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Score:</span>
          <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{(data.score || data.avgScore)?.toLocaleString()}</span>
          
          {data.opDisplay !== undefined && (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>OP Yield:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-secondary)' }}>{data.opDisplay}</span>
            </>
          )}
          
          {data.playCount !== undefined && (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>Play Count:</span>
              <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>{data.playCount}</span>
            </>
          )}

          {data.lamp && (
            <>
              <span style={{ color: 'var(--text-secondary)' }}>Lamp:</span>
              <span style={{ fontWeight: 'bold', color: `var(--rank-${data.lamp?.toLowerCase() || 'clear'})` }}>{data.lamp}</span>
            </>
          )}
          
          <span style={{ color: 'var(--text-secondary)' }}>Constant:</span>
          <span>{data.constant?.toFixed(1)}</span>
        </div>

        {hasOverlap && (
          <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed rgba(255,255,255,0.15)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)', marginBottom: '4px' }}>
              Charts at this position ({overlaps.length}):
            </div>
            {overlaps.map((item: any, i: number) => {
              const isSelectedItem = (
                (data.chartId && item.chartId === data.chartId) ||
                (data.id && item.id === data.id) ||
                ((data.songId || data.song_id) && (item.songId || item.song_id) && (data.songId || data.song_id) === (item.songId || item.song_id) && (!data.difficulty || !item.difficulty || data.difficulty === item.difficulty)) ||
                ((item.name || item.title) === (data.name || data.title) && Math.abs(item.constant - data.constant) < 0.01)
              );
              return (
                <div 
                  key={i} 
                  style={{ 
                    fontSize: '0.78rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    color: isSelectedItem ? 'var(--accent-gold)' : 'var(--text-secondary)', 
                    padding: '3px 6px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    background: isSelectedItem ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectDot) {
                      onSelectDot(item);
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    if (onNavigateSong) {
                      onNavigateSong(item);
                    }
                  }}
                >
                  <span style={{ color: isSelectedItem ? 'var(--accent-gold)' : 'inherit', fontWeight: isSelectedItem ? 700 : 400 }}>
                    {isSelectedItem ? '► ' : '• '}{item.difficulty ? `[${item.difficulty}] ` : ''}{item.name || item.title}
                  </span>
                  <span style={{ fontFamily: 'monospace' }}>{(item.score || item.avgScore)?.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
          {hasOverlap ? 'Click list item to select | Double-click to open' : 'Double-click dot to view leaderboard'}
        </div>
      </div>
    );
  }
  return null;
});
