import React, { useState, useMemo } from 'react';
import { isSameChart, formatScatterScore, OVERLAP_PAGE_SIZE } from '../lib/utils/scatterTooltipPlacement.js';

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
  const [manualPage, setManualPage] = useState<number | null>(null);

  React.useEffect(() => {
    setManualPage(null);
  }, [selectedDot]);

  const rawData = payload && payload.length ? payload[0].payload : null;
  const overlaps: any[] = useMemo(() => rawData?.overlappingItems || [], [rawData]);
  const hasOverlap = overlaps.length > 1;

  const activeChart = useMemo(() => {
    if (!rawData) return null;
    if (!selectedDot) return rawData;

    const matchInOverlaps = overlaps.find((item: any) => isSameChart(selectedDot, item));
    if (matchInOverlaps) return matchInOverlaps;

    if (isSameChart(selectedDot, rawData)) return selectedDot;

    return rawData;
  }, [rawData, selectedDot, overlaps]);

  const selectedIndex = useMemo(() => {
    if (!activeChart || overlaps.length === 0) return 0;
    const idx = overlaps.findIndex((item: any) => isSameChart(activeChart, item));
    return idx >= 0 ? idx : 0;
  }, [activeChart, overlaps]);

  const totalPages = Math.ceil(overlaps.length / OVERLAP_PAGE_SIZE) || 1;
  const autoPage = Math.floor(selectedIndex / OVERLAP_PAGE_SIZE);
  const currentPage = Math.min(Math.max(0, manualPage ?? autoPage), totalPages - 1);
  const visibleOverlaps = useMemo(() => {
    return overlaps.slice(currentPage * OVERLAP_PAGE_SIZE, (currentPage + 1) * OVERLAP_PAGE_SIZE);
  }, [overlaps, currentPage]);

  if (active && payload && payload.length && (selectedDot || hoveredDot) && activeChart) {
    const data = activeChart;
    const displayScore = formatScatterScore(data.score ?? data.avgScore);

    return (
      <div 
        role="tooltip"
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
          <span style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{displayScore.toLocaleString()}</span>
          
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)' }}>
                Charts at this position ({overlaps.length}):
              </span>
              {totalPages > 1 && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Page {currentPage + 1} / {totalPages}
                </span>
              )}
            </div>

            {visibleOverlaps.map((item: any, idx: number) => {
              const isSelectedItem = isSameChart(data, item);
              const itemDisplayScore = formatScatterScore(item.score ?? item.avgScore);

              return (
                <div 
                  key={item.id || item.chartId || idx} 
                  role="button"
                  tabIndex={0}
                  aria-selected={isSelectedItem}
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (onSelectDot) onSelectDot(item);
                    }
                  }}
                >
                  <span style={{ color: isSelectedItem ? 'var(--accent-gold)' : 'inherit', fontWeight: isSelectedItem ? 700 : 400 }}>
                    {isSelectedItem ? '► ' : '• '}{item.difficulty ? `[${item.difficulty}] ` : ''}{item.name || item.title}
                  </span>
                  <span style={{ fontFamily: 'monospace' }}>{itemDisplayScore.toLocaleString()}</span>
                </div>
              );
            })}

            {totalPages > 1 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setManualPage(Math.max(0, currentPage - 1));
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: currentPage === 0 ? 'rgba(255,255,255,0.3)' : 'var(--text-primary)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: currentPage === 0 ? 'default' : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}
                >
                  ◄ Prev
                </button>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {currentPage * OVERLAP_PAGE_SIZE + 1}-{Math.min((currentPage + 1) * OVERLAP_PAGE_SIZE, overlaps.length)} of {overlaps.length}
                </span>
                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages - 1}
                  onClick={(e) => {
                    e.stopPropagation();
                    setManualPage(Math.min(totalPages - 1, currentPage + 1));
                  }}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: currentPage >= totalPages - 1 ? 'rgba(255,255,255,0.3)' : 'var(--text-primary)',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    cursor: currentPage >= totalPages - 1 ? 'default' : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 600
                  }}
                >
                  Next ►
                </button>
              </div>
            )}
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

