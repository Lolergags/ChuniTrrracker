import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis, BarChart, Bar, Legend, LineChart, Line, Brush } from 'recharts';
import { RotateCcw, User, Music, Activity } from 'lucide-react';
import { api } from '../lib/api/client.js';
import type { ApiHeatmapData, ApiChartMeta, ApiLampDistribution, ApiOpYield, ApiPlayerOpDistribution } from '../lib/types/index.js';
import { useGlobal } from '../lib/context/useGlobal.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';
import { LampTooltip } from '../components/ChartTooltips.js';
import { clampDomainX, clampDomainY, getSmartYTicks, panDomain, calculateDotRadius } from '../lib/utils/scatterZoom.js';
import { useIsMobile } from '../lib/hooks/useIsMobile.js';
import { ScatterScrollbar } from '../components/ScatterScrollbar.js';

const GRADES = ['SSS+', 'SSS', 'SS+', 'SS', 'S+', 'S', '< S'];

const CustomTooltip = React.memo(({ active, payload, selectedDot, hoveredDot }: any) => {
  if (active && payload && payload.length && (selectedDot || hoveredDot)) {
    const rawData = payload[0].payload;
    const overlaps = rawData.overlappingItems || [];

    let activeChart = rawData;
    if (selectedDot) {
      const matchInOverlaps = overlaps.find((item: any) =>
        (selectedDot.id && item.id === selectedDot.id) ||
        (selectedDot.chartId && item.chartId === selectedDot.chartId) ||
        ((selectedDot.songId || selectedDot.song_id) && (item.songId || item.song_id) && (selectedDot.songId || selectedDot.song_id) === (item.songId || item.song_id) && (!selectedDot.difficulty || !item.difficulty || selectedDot.difficulty === item.difficulty)) ||
        ((item.title || item.name) === (selectedDot.title || selectedDot.name) && Math.abs(item.constant - selectedDot.constant) < 0.01 && Math.abs((item.score || item.avgScore) - (selectedDot.score || selectedDot.avgScore)) < 1)
      );

      if (matchInOverlaps) {
        activeChart = matchInOverlaps;
      }
    }

    const data = activeChart;

    return (
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 5px 0' }}>{data.title || data.name}</p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Level: <span style={{ color: 'var(--text-primary)' }}>{data.difficulty} {data.constant?.toFixed(1)}</span></p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Avg Score: <span style={{ color: 'var(--text-primary)' }}>{Math.round(data.avgScore || data.score || 0).toLocaleString()}</span></p>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Plays: <span style={{ color: 'var(--text-primary)' }}>{data.playCount}</span></p>
        <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>
          Double-click dot to view leaderboard
        </div>
      </div>
    );
  }
  return null;
});

const CustomScatterDot = React.memo((props: any) => {
  const { cx, cy, fill, payload, hoveredDot, onSelectDot, onNavigateSong, selectedDot } = props;
  const clickTimerRef = useRef<number | null>(null);

  if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (onNavigateSong) {
        onNavigateSong(selectedDot || payload);
      }
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      if (onSelectDot) {
        onSelectDot(payload);
      }
    }, 220);
  };

  const isHovered = hoveredDot && (
    (hoveredDot.chartId && payload.chartId === hoveredDot.chartId) ||
    (hoveredDot.id && payload.id === hoveredDot.id) ||
    ((hoveredDot.songId || hoveredDot.song_id) && (payload.songId || payload.song_id) && (hoveredDot.songId || hoveredDot.song_id) === (payload.songId || payload.song_id) && hoveredDot.difficulty === payload.difficulty) ||
    ((hoveredDot.name || hoveredDot.title) === (payload.name || payload.title) && Math.abs(hoveredDot.constant - payload.constant) < 0.01 && Math.abs((hoveredDot.score || hoveredDot.avgScore) - (payload.score || payload.avgScore)) < 1)
  );

  const overlapCount = payload.overlappingItems?.length || payload.overlapCount || 1;
  const { dotR } = calculateDotRadius(overlapCount, false, isHovered);

  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={dotR} 
      fill={fill || '#ff66ff'} 
      fillOpacity={isHovered ? 0.9 : 0.65} 
      stroke={isHovered ? 'rgba(255,255,255,0.8)' : 'none'} 
      strokeWidth={isHovered ? 1.5 : 0} 
      style={{ cursor: 'pointer', transition: 'r 0.15s ease' }} 
      onClick={handleClick}
    />
  );
});

const CustomSelectedScatterDot = React.memo((props: any) => {
  const { cx, cy, payload, selectedDot, onSelectDot, onNavigateSong, onUpdateCoords } = props;
  const clickTimerRef = useRef<number | null>(null);
  const prevCoordsRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (cx != null && cy != null && !isNaN(cx) && !isNaN(cy) && onUpdateCoords) {
      const prev = prevCoordsRef.current;
      if (!prev || Math.abs(prev.x - cx) > 0.5 || Math.abs(prev.y - cy) > 0.5) {
        prevCoordsRef.current = { x: cx, y: cy };
        onUpdateCoords({ x: cx, y: cy });
      }
    }
  }, [cx, cy, onUpdateCoords]);

  if (cx == null || cy == null || isNaN(cx) || isNaN(cy)) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (clickTimerRef.current !== null) {
      window.clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
      if (onNavigateSong) {
        onNavigateSong(selectedDot || payload);
      }
      return;
    }

    clickTimerRef.current = window.setTimeout(() => {
      clickTimerRef.current = null;
      if (onSelectDot) {
        onSelectDot(payload);
      }
    }, 220);
  };

  const overlapCount = payload.overlappingItems?.length || payload.overlapCount || 1;
  const { dotR } = calculateDotRadius(overlapCount, true, false);

  if (overlapCount > 1) {
    const badgeOffset = Math.max(7, dotR * 0.75);
    return (
      <g style={{ cursor: 'pointer' }} onClick={handleClick}>
        <circle cx={cx} cy={cy} r={dotR + 4.5} fill="none" stroke="var(--accent-gold)" strokeWidth={2.5} strokeDasharray="3 2" opacity={0.95} />
        <circle cx={cx} cy={cy} r={dotR} fill="#ffffff" fillOpacity={0.95} stroke="var(--accent-gold)" strokeWidth={1.5} />
        <circle cx={cx + badgeOffset} cy={cy - badgeOffset} r={6.5} fill="var(--accent-gold)" stroke="#000" strokeWidth={1} />
        <text x={cx + badgeOffset} y={cy - badgeOffset + 3.5} textAnchor="middle" fill="#000" fontSize="9" fontWeight="bold" pointerEvents="none">
          {overlapCount > 9 ? '+' : overlapCount}
        </text>
      </g>
    );
  }

  return (
    <circle 
      cx={cx} 
      cy={cy} 
      r={dotR} 
      fill="#ffffff" 
      fillOpacity={1} 
      stroke="var(--accent-secondary)" 
      strokeWidth={2.5} 
      style={{ cursor: 'pointer' }} 
      onClick={handleClick}
    />
  );
});

const GradeHeatmap = React.memo(({ constants, grid, getConstantLabel }: {
  constants: number[];
  grid: Record<string, Record<number, { percent: number; count: number }>>;
  getConstantLabel: (c: number) => string;
}) => {
  return (
    <div style={{ display: 'inline-grid', gridTemplateColumns: `60px repeat(${constants.length}, 40px)`, gap: '2px', paddingBottom: '1rem' }}>
      {GRADES.map(grade => (
        <React.Fragment key={grade}>
          <div style={{ padding: '4px', textAlign: 'right', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
            {grade}
          </div>
          {constants.map(c => {
            const cell = grid[grade][c];
            const percent = cell?.percent || 0;
            const bg = `rgba(170, 59, 255, ${percent * 1.5})`;
            return (
              <div 
                key={c} 
                style={{ 
                  backgroundColor: bg, 
                  color: percent > 0.3 ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.75rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: '2px',
                  aspectRatio: '1',
                  fontWeight: percent > 0.3 ? 'bold' : 'normal'
                }}
                title={`${grade} @ Level ${getConstantLabel(c)}: ${(percent * 100).toFixed(1)}% (${cell?.count || 0} scores)`}
              >
                {percent > 0 ? (percent * 100).toFixed(0) : ''}
              </div>
            );
          })}
        </React.Fragment>
      ))}
      <div></div>
      {constants.map(c => (
        <div key={c} style={{ padding: '4px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
          {getConstantLabel(c)}
        </div>
      ))}
    </div>
  );
});

export function GlobalStats() {
  const navigate = useNavigate();
  const { filters } = useGlobal();
  const [heatmapData, setHeatmapData] = useState<ApiHeatmapData[]>([]);
  const [metaData, setMetaData] = useState<ApiChartMeta[]>([]);
  const [lampData, setLampData] = useState<ApiLampDistribution[]>([]);
  const [opYieldData, setOpYieldData] = useState<ApiOpYield[]>([]);
  const [playerOpData, setPlayerOpData] = useState<ApiPlayerOpDistribution[]>([]);
  
  const [globalScatterZoomX, setGlobalScatterZoomX] = useState<[number, number] | null>(null);
  const [globalScatterZoomY, setGlobalScatterZoomY] = useState<[number, number] | null>(null);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [selectedDot, setSelectedDot] = useState<any | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ x: number; y: number } | null>(null);
  const [hoveredDot, setHoveredDot] = useState<any | null>(null);
  const globalScatterContainerRef = useRef<HTMLDivElement>(null);
  const lastScatterDotClickRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);

  const handleUpdateGlobalCoords = useCallback((coords: { x: number; y: number }) => {
    setSelectedCoords(prev => {
      if (!prev || Math.abs(prev.x - coords.x) > 0.5 || Math.abs(prev.y - coords.y) > 0.5) {
        return coords;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    if (!selectedDot) {
      setSelectedCoords(null);
    }
  }, [selectedDot]);

  const isMobile = useIsMobile();

  const globalScatterYWidth = globalScatterZoomY ? (isMobile ? 35 : 45) : (isMobile ? 45 : 55);
  const globalScatterClipX = 20 + globalScatterYWidth;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoadingGlobal(true);
      // Fetch global data
      const apiFilters = { 
        ...filters, 
        ratingMin: filters.ratingMin || '0', 
        ratingMax: filters.ratingMax || '22.0' 
      };
      Promise.all([
        api.getHeatmap(apiFilters),
        api.getChartMeta(apiFilters),
        api.getLampDistribution(apiFilters),
        api.getOpYield(apiFilters),
        api.getPlayerOpDistribution(apiFilters)
      ]).then(([heatmap, meta, lamps, opYield, playerOp]) => {
        setHeatmapData(Array.isArray(heatmap) ? heatmap : []);
        setMetaData(Array.isArray(meta) ? meta : []);
        setLampData(Array.isArray(lamps) ? lamps : []);
        setOpYieldData(Array.isArray(opYield) ? opYield : []);
        setPlayerOpData(Array.isArray(playerOp) ? playerOp : []);
        setIsLoadingGlobal(false);
      }).catch(err => {
        console.error(err);
        setHeatmapData([]);
        setMetaData([]);
        setLampData([]);
        setOpYieldData([]);
        setPlayerOpData([]);
        setIsLoadingGlobal(false);
      });
    }, 150);
    return () => clearTimeout(timer);
  }, [filters]);

  const panRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    startDomainX: [number, number];
    startDomainY: [number, number];
    touchStartDist: number | null;
    touchStartZoomX: [number, number] | null;
    touchStartZoomY: [number, number] | null;
    touchFocalX: number;
    touchFocalY: number;
    startScrollLeft: number;
    lastTouchDist: number | null;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    startDomainX: [1.0, 15.4],
    startDomainY: [975000, 1010000],
    touchStartDist: null,
    touchStartZoomX: null,
    touchStartZoomY: null,
    touchFocalX: 0,
    touchFocalY: 0,
    startScrollLeft: 0,
    lastTouchDist: null
  });

  const globalScatterZoomXRef = useRef(globalScatterZoomX);
  globalScatterZoomXRef.current = globalScatterZoomX;

  const globalScatterZoomYRef = useRef(globalScatterZoomY);
  globalScatterZoomYRef.current = globalScatterZoomY;

  const defaultXDomain = useMemo<[number, number]>(() => {
    if (!metaData.length) return [1.0, 15.4];
    const valid = metaData.filter((d: any) => d.avgScore >= 975000);
    if (!valid.length) return [1.0, 15.4];
    const constants = valid.map((d: any) => d.constant);
    return [
      Math.max(1.0, Math.min(...constants) - 0.2),
      Math.min(15.4, Math.max(...constants) + 0.2)
    ];
  }, [metaData]);

  const defaultYDomain = useMemo<[number, number]>(() => {
    if (!metaData.length) return [975000, 1010000];
    const valid = metaData.filter((d: any) => d.avgScore >= 975000);
    if (!valid.length) return [975000, 1010000];
    const scoresList = valid.map((d: any) => d.avgScore);
    const minS = Math.min(...scoresList);
    const defYMin = Math.max(0, Math.floor((minS - 5000) / 5000) * 5000);
    return [defYMin, 1010000];
  }, [metaData]);

  const defaultXRef = useRef<[number, number]>(defaultXDomain);
  defaultXRef.current = defaultXDomain;

  const defaultYRef = useRef<[number, number]>(defaultYDomain);
  defaultYRef.current = defaultYDomain;

  const validMetaData = useMemo(() => {
    const raw = metaData.filter((d: any) => d.avgScore >= 975000);
    
    const curX = globalScatterZoomX || defaultXDomain;
    const curY = globalScatterZoomY || defaultYDomain;
    const spanX = Math.max(0.1, curX[1] - curX[0]);
    const spanY = Math.max(100, curY[1] - curY[0]);

    const keyStepX = spanX / 40;
    const keyStepY = spanY / 30;

    const grid = new Map<string, any[]>();
    for (const item of raw) {
      const itemScore = item.avgScore || (item as any).score || 0;
      const key = `${Math.round(item.constant / keyStepX)}_${Math.round(itemScore / keyStepY)}`;
      let list = grid.get(key);
      if (!list) {
        list = [];
        grid.set(key, list);
      }
      list.push(item);
    }

    return raw.map((item: any) => {
      const itemScore = item.avgScore || item.score || 0;
      const key = `${Math.round(item.constant / keyStepX)}_${Math.round(itemScore / keyStepY)}`;
      const overlappingItems = grid.get(key) || [item];
      
      return {
        ...item,
        overlappingItems,
        overlapCount: overlappingItems.length
      };
    });
  }, [metaData, globalScatterZoomX, globalScatterZoomY, defaultXDomain, defaultYDomain]);

  const scatterMinMaxC = useMemo(() => {
    const constants = validMetaData.map((d: any) => d.constant);
    const minC = constants.length ? Math.max(1.0, Math.min(...constants) - 0.2) : 1.0;
    const maxC = constants.length ? Math.min(15.4, Math.max(...constants) + 0.2) : 15.4;
    return { minC, maxC };
  }, [validMetaData]);

  const visibleScatterData = useMemo(() => {
    if (globalScatterZoomX || globalScatterZoomY) {
      const [minX, maxX] = globalScatterZoomX || defaultXDomain;
      const [minY, maxY] = globalScatterZoomY || defaultYDomain;

      const padX = (maxX - minX) * 0.15;
      const padY = (maxY - minY) * 0.15;

      const lowX = minX - padX;
      const highX = maxX + padX;
      const lowY = minY - padY;
      const highY = maxY + padY;

      return validMetaData.filter((d: any) => 
        d.constant >= lowX && 
        d.constant <= highX && 
        d.avgScore >= lowY && 
        d.avgScore <= highY
      );
    }

    return validMetaData;
  }, [validMetaData, globalScatterZoomX, globalScatterZoomY, defaultXDomain, defaultYDomain]);

  const activeSelectedNode = useMemo(() => {
    if (!selectedDot || !visibleScatterData.length) return null;

    const directMatch = visibleScatterData.find((item: any) =>
      (selectedDot.id && item.id === selectedDot.id) ||
      (selectedDot.chartId && item.chartId === selectedDot.chartId) ||
      ((selectedDot.songId || selectedDot.song_id) && (item.songId || item.song_id) && (selectedDot.songId || selectedDot.song_id) === (item.songId || item.song_id) && (!selectedDot.difficulty || !item.difficulty || item.difficulty === selectedDot.difficulty)) ||
      ((item.title || item.name) === (selectedDot.title || selectedDot.name) && Math.abs(item.constant - selectedDot.constant) < 0.01 && Math.abs((item.score || item.avgScore) - (selectedDot.score || selectedDot.avgScore)) < 1)
    );
    if (directMatch) return directMatch;

    return visibleScatterData.find((item: any) =>
      item.overlappingItems && item.overlappingItems.some((other: any) =>
        (other.id && selectedDot.id && other.id === selectedDot.id) ||
        (other.chartId && selectedDot.chartId && other.chartId === selectedDot.chartId) ||
        ((other.songId || other.song_id) && (selectedDot.songId || selectedDot.song_id) && (other.songId || other.song_id) === (selectedDot.songId || selectedDot.song_id) && (!other.difficulty || !selectedDot.difficulty || other.difficulty === selectedDot.difficulty)) ||
        ((other.title || other.name) === (selectedDot.title || selectedDot.name) && Math.abs(other.constant - selectedDot.constant) < 0.01 && Math.abs((other.score || other.avgScore) - (selectedDot.score || selectedDot.avgScore)) < 1)
      )
    ) || null;
  }, [visibleScatterData, selectedDot]);

  const overlappingGlobalDots = useMemo(() => {
    if (!selectedDot) return [];
    
    const parentCluster = validMetaData.find((m: any) => {
      if (m.overlappingItems && m.overlappingItems.length > 0) {
        return m.overlappingItems.some((other: any) =>
          (other.id && selectedDot.id && other.id === selectedDot.id) ||
          (other.chartId && selectedDot.chartId && other.chartId === selectedDot.chartId) ||
          ((other.songId || other.song_id) && (selectedDot.songId || selectedDot.song_id) && 
           (other.songId || other.song_id) === (selectedDot.songId || selectedDot.song_id) && 
           other.difficulty === selectedDot.difficulty) ||
          ((other.title || other.name) === (selectedDot.title || selectedDot.name) && 
           Math.abs(other.constant - selectedDot.constant) < 0.01 && 
           Math.abs((other.avgScore || other.score) - (selectedDot.avgScore || selectedDot.score)) < 1)
        );
      }
      return (m.id && selectedDot.id && m.id === selectedDot.id) ||
             (m.chartId && selectedDot.chartId && m.chartId === selectedDot.chartId) ||
             ((m.songId || m.song_id) && (selectedDot.songId || selectedDot.song_id) && 
              (m.songId || m.song_id) === (selectedDot.songId || selectedDot.song_id) && 
              m.difficulty === selectedDot.difficulty) ||
             ((m.title || m.name) === (selectedDot.title || selectedDot.name) && 
              Math.abs(m.constant - selectedDot.constant) < 0.01 && 
              Math.abs((m.avgScore || m.score) - (selectedDot.avgScore || selectedDot.score)) < 1);
    });

    if (parentCluster && parentCluster.overlappingItems && parentCluster.overlappingItems.length > 0) {
      return parentCluster.overlappingItems;
    }

    return [selectedDot];
  }, [selectedDot, validMetaData]);

  const currentGlobalDotIndex = useMemo(() => {
    if (!selectedDot || !overlappingGlobalDots.length) return 0;
    const selSongId = selectedDot.songId || selectedDot.song_id;
    const selChartId = selectedDot.chartId || selectedDot.id;
    const selScore = selectedDot.avgScore || selectedDot.score || 0;

    const idx = overlappingGlobalDots.findIndex((d: any) => {
      const dSongId = d.songId || d.song_id;
      const dChartId = d.chartId || d.id;
      const dScore = d.avgScore || d.score || 0;

      if (dChartId && selChartId && dChartId === selChartId) return true;
      if (dSongId && selSongId && dSongId === selSongId && d.difficulty && selectedDot.difficulty && d.difficulty === selectedDot.difficulty) return true;
      return (d.title || d.name) === (selectedDot.title || selectedDot.name) && Math.abs(d.constant - selectedDot.constant) < 0.01 && Math.abs(dScore - selScore) < 5;
    });

    return idx >= 0 ? idx : 0;
  }, [selectedDot, overlappingGlobalDots]);

  useEffect(() => {
    if (!selectedDot || overlappingGlobalDots.length <= 1) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (e.target as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentGlobalDotIndex + 1) % overlappingGlobalDots.length;
        setSelectedDot(overlappingGlobalDots[nextIndex]);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentGlobalDotIndex - 1 + overlappingGlobalDots.length) % overlappingGlobalDots.length;
        setSelectedDot(overlappingGlobalDots[prevIndex]);
      } else if (e.key === 'Escape') {
        setSelectedDot(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDot, overlappingGlobalDots, currentGlobalDotIndex]);

  useEffect(() => {
    const elem = globalScatterContainerRef.current;
    if (!elem) return;

    const getDomains = () => {
      const defX = defaultXRef.current;
      const defY = defaultYRef.current;
      const curX = globalScatterZoomXRef.current || defX;
      const curY = globalScatterZoomYRef.current || defY;
      return { defX, defY, curX, curY };
    };

    const updateZoomX = (val: [number, number] | null) => {
      globalScatterZoomXRef.current = val;
      setGlobalScatterZoomX(val);
    };

    const updateZoomY = (val: [number, number] | null) => {
      globalScatterZoomYRef.current = val;
      setGlobalScatterZoomY(val);
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { defX, defY, curX, curY } = getDomains();

      const rect = elem.getBoundingClientRect();
      const plotLeft = rect.left + 65;
      const plotWidth = Math.max(100, rect.width - 95);
      const plotTop = rect.top + 25;
      const plotHeight = Math.max(100, rect.height - 70);

      const xFrac = Math.max(0, Math.min(1, (e.clientX - plotLeft) / plotWidth));
      const yFrac = Math.max(0, Math.min(1, 1 - (e.clientY - plotTop) / plotHeight));

      const focalX = curX[0] + xFrac * (curX[1] - curX[0]);
      const focalY = curY[0] + yFrac * (curY[1] - curY[0]);

      // Exponential scaling based on deltaY magnitude for smooth wheel & trackpad zooming
      const zoomFactor = Math.pow(1.002, e.deltaY);
      const spanX = (curX[1] - curX[0]) * zoomFactor;
      const spanY = (curY[1] - curY[0]) * zoomFactor;

      const rawMinX = focalX - xFrac * spanX;
      const rawMaxX = focalX + (1 - xFrac) * spanX;
      const rawMinY = focalY - yFrac * spanY;
      const rawMaxY = focalY + (1 - yFrac) * spanY;

      const [newMinX, newMaxX] = clampDomainX(rawMinX, rawMaxX, defX);
      const [newMinY, newMaxY] = clampDomainY(rawMinY, rawMaxY, defY);

      if (newMinX <= defX[0] && newMaxX >= defX[1]) {
        updateZoomX(null);
      } else {
        updateZoomX([newMinX, newMaxX]);
      }

      if (newMinY <= defY[0] && newMaxY >= defY[1]) {
        updateZoomY(null);
      } else {
        updateZoomY([newMinY, newMaxY]);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const { curX, curY } = getDomains();
      panRef.current.isDragging = true;
      panRef.current.startX = e.clientX;
      panRef.current.startY = e.clientY;
      panRef.current.startScrollLeft = elem.scrollLeft;
      panRef.current.startDomainX = curX;
      panRef.current.startDomainY = curY;
      if (elem) elem.style.cursor = 'grabbing';
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!panRef.current.isDragging) return;
      const moveDist = Math.hypot(e.clientX - panRef.current.startX, e.clientY - panRef.current.startY);
      if (moveDist < 6) return;

      e.preventDefault();
      const { defX, defY } = getDomains();

      if (elem.scrollWidth > elem.clientWidth && !globalScatterZoomXRef.current) {
        elem.scrollLeft = panRef.current.startScrollLeft - (e.clientX - panRef.current.startX);
        return;
      }

      const rect = elem.getBoundingClientRect();
      const plotWidth = Math.max(100, rect.width - 105);
      const plotHeight = Math.max(100, rect.height - 60);

      const deltaX = -((e.clientX - panRef.current.startX) / plotWidth) * (panRef.current.startDomainX[1] - panRef.current.startDomainX[0]);
      const deltaY = ((e.clientY - panRef.current.startY) / plotHeight) * (panRef.current.startDomainY[1] - panRef.current.startDomainY[0]);

      const [newMinX, newMaxX] = panDomain(panRef.current.startDomainX, deltaX, defX, true);
      const [newMinY, newMaxY] = panDomain(panRef.current.startDomainY, deltaY, defY, false);

      if (newMinX <= defX[0] && newMaxX >= defX[1]) {
        updateZoomX(null);
      } else {
        updateZoomX([newMinX, newMaxX]);
      }

      if (newMinY <= defY[0] && newMaxY >= defY[1]) {
        updateZoomY(null);
      } else {
        updateZoomY([newMinY, newMaxY]);
      }
    };

    const handleMouseUp = () => {
      if (panRef.current.isDragging) {
        panRef.current.isDragging = false;
        if (elem) elem.style.cursor = 'grab';
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      const { curX, curY } = getDomains();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        const rect = elem.getBoundingClientRect();
        // If touch starts below the X-axis plot line (in bottom margin), allow native page scrolling
        if (t.clientY > rect.bottom - 40) {
          panRef.current.isDragging = false;
          return;
        }

        panRef.current.isDragging = true;
        panRef.current.startX = t.clientX;
        panRef.current.startY = t.clientY;
        panRef.current.startScrollLeft = elem.scrollLeft;
        panRef.current.startDomainX = curX;
        panRef.current.startDomainY = curY;
        setIsPanDragging(true);
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        panRef.current.isDragging = false;
        setIsPanDragging(false);
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        panRef.current.lastTouchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const { defX, defY, curX, curY } = getDomains();
      if (e.touches.length === 1 && panRef.current.isDragging) {
        const t = e.touches[0];
        const deltaX = t.clientX - panRef.current.startX;
        const deltaY = t.clientY - panRef.current.startY;
        const dx = Math.abs(deltaX);
        const dy = Math.abs(deltaY);

        const isDOMScrollable = elem.scrollWidth > elem.clientWidth + 5;

        // If DOM scrollbar is active (graph overflows container width), 1-finger horizontal swipe scrolls the container DOM
        if (dx > dy && isDOMScrollable) {
          e.preventDefault();
          elem.scrollLeft = panRef.current.startScrollLeft - deltaX;
          return;
        }

        // If move is predominantly vertical and graph is unzoomed, allow native page scroll
        if (dy > dx && !globalScatterZoomXRef.current && !globalScatterZoomYRef.current) {
          panRef.current.isDragging = false;
          return;
        }

        const moveDist = Math.hypot(dx, dy);
        if (moveDist < 6) return;

        e.preventDefault();

        const rect = elem.getBoundingClientRect();
        const plotWidth = Math.max(100, rect.width - 105);
        const plotHeight = Math.max(100, rect.height - 60);

        const dX = -((t.clientX - panRef.current.startX) / plotWidth) * (panRef.current.startDomainX[1] - panRef.current.startDomainX[0]);
        const dY = ((t.clientY - panRef.current.startY) / plotHeight) * (panRef.current.startDomainY[1] - panRef.current.startDomainY[0]);

        const [newMinX, newMaxX] = panDomain(panRef.current.startDomainX, dX, defX, true);
        const [newMinY, newMaxY] = panDomain(panRef.current.startDomainY, dY, defY, false);

        if (newMinX <= defX[0] && newMaxX >= defX[1]) {
          updateZoomX(null);
        } else {
          updateZoomX([newMinX, newMaxX]);
        }

        if (newMinY <= defY[0] && newMaxY >= defY[1]) {
          updateZoomY(null);
        } else {
          updateZoomY([newMinY, newMaxY]);
        }
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (currentDist < 5) return;

        const lastDist = panRef.current.lastTouchDist || currentDist;
        panRef.current.lastTouchDist = currentDist;

        const rawScale = lastDist / currentDist;
        const scale = 1 + (rawScale - 1) * 0.85;

        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;

        const rect = elem.getBoundingClientRect();
        const plotLeft = rect.left + 85;
        const plotWidth = Math.max(100, rect.width - 105);
        const plotTop = rect.top + 20;
        const plotHeight = Math.max(100, rect.height - 60);

        const xFrac = Math.max(0, Math.min(1, (midX - plotLeft) / plotWidth));
        const yFrac = Math.max(0, Math.min(1, 1 - (midY - plotTop) / plotHeight));

        const focalX = curX[0] + xFrac * (curX[1] - curX[0]);
        const focalY = curY[0] + yFrac * (curY[1] - curY[0]);

        const spanX = (curX[1] - curX[0]) * scale;
        const spanY = (curY[1] - curY[0]) * scale;

        const rawMinX = focalX - xFrac * spanX;
        const rawMaxX = focalX + (1 - xFrac) * spanX;
        const rawMinY = focalY - yFrac * spanY;
        const rawMaxY = focalY + (1 - yFrac) * spanY;

        const [newMinX, newMaxX] = clampDomainX(rawMinX, rawMaxX, defX);
        const [newMinY, newMaxY] = clampDomainY(rawMinY, rawMaxY, defY);

        if (elem.scrollLeft !== 0) elem.scrollLeft = 0;

        if (newMinX <= defX[0] && newMaxX >= defX[1]) {
          setGlobalScatterZoomX(null);
        } else {
          setGlobalScatterZoomX([newMinX, newMaxX]);
        }

        if (newMinY <= defY[0] && newMaxY >= defY[1]) {
          setGlobalScatterZoomY(null);
        } else {
          setGlobalScatterZoomY([newMinY, newMaxY]);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        panRef.current.lastTouchDist = null;
        panRef.current.isDragging = false;
        setIsPanDragging(false);
      }
    };

    elem.addEventListener('wheel', handleWheel, { passive: false });
    elem.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    elem.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      elem.removeEventListener('wheel', handleWheel);
      elem.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      elem.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isLoadingGlobal, metaData]);

  const getConstantLabel = useCallback((constant: number) => {
    return constant.toFixed(1);
  }, []);

  // Process Heatmap Data
  const { constants, grid } = useMemo(() => {
    if (!heatmapData.length) return { constants: [], grid: {} };
    
    // Get unique constants and sort them
    const constSet = new Set<number>();
    const countsByConst: Record<number, number> = {};
    
    heatmapData.forEach(d => {
      constSet.add(d.constant);
      countsByConst[d.constant] = (countsByConst[d.constant] || 0) + d.count;
    });
    
    const sortedConstants = Array.from(constSet).sort((a, b) => a - b);
    
    // Build grid [grade][constant] -> percentage 0-1
    const gridData: Record<string, Record<number, { percent: number, count: number }>> = {};
    GRADES.forEach(g => gridData[g] = {});
    
    heatmapData.forEach(d => {
      if (gridData[d.grade]) {
        gridData[d.grade][d.constant] = {
          count: d.count,
          percent: countsByConst[d.constant] > 0 ? d.count / countsByConst[d.constant] : 0
        };
      }
    });
    
    return { constants: sortedConstants, grid: gridData };
  }, [heatmapData]);

  const survivalData = useMemo(() => {
    return lampData.sort((a, b) => a.constant - b.constant).map(d => ({
      constant: getConstantLabel(d.constant),
      ajRate: d.total > 0 ? ((d.ajc + d.aj) / d.total) * 100 : 0,
      fcRate: d.total > 0 ? ((d.ajc + d.aj + d.fc) / d.total) * 100 : 0,
    }));
  }, [lampData]);

  const sortedLampData = useMemo(() => {
    return lampData.map(d => ({
      ...d,
      constantLabel: getConstantLabel(d.constant)
    })).sort((a, b) => a.constant - b.constant);
  }, [lampData]);

  const sortedOpYield = useMemo(() => {
    return opYieldData.map(d => ({
      ...d,
      constantLabel: getConstantLabel(d.constant)
    })).sort((a, b) => a.constant - b.constant);
  }, [opYieldData]);

  const opDistribution = useMemo(() => {
    const PERCENT_BUCKET_SIZE = 0.5;
    const buckets: Record<string, number> = {};

    for (let i = 0; i <= 200; i++) {
      const val = (i * PERCENT_BUCKET_SIZE).toFixed(1);
      buckets[`${val}%`] = 0;
    }

    playerOpData.forEach(p => {
      const percent = Math.min(100, Math.max(0, p.opPercent || 0));
      const bucketIndex = Math.min(200, Math.floor(percent / PERCENT_BUCKET_SIZE));
      const b = (bucketIndex * PERCENT_BUCKET_SIZE).toFixed(1);
      const key = `${b}%`;
      buckets[key] = (buckets[key] || 0) + 1;
    });

    return Object.entries(buckets).map(([bucket, count]) => ({
      bucket,
      count
    }));
  }, [playerOpData]);

  const totalFilteredScores = useMemo(() => {
    return metaData.reduce((acc, d: any) => acc + (d.playCount || 0), 0);
  }, [metaData]);

  const difficultyLabel = useMemo(() => {
    const d = filters.diff as string | string[];
    if (!d || d === 'MAS_ULT') return 'Master & Ultima (MAS, ULT)';
    if (d === 'ALL') return 'All Difficulties';
    if (Array.isArray(d)) return d.join(', ');
    return String(d);
  }, [filters.diff]);

  const smartYTicks = useMemo(() => 
    getSmartYTicks(
      globalScatterZoomY ? globalScatterZoomY[0] : defaultYDomain[0], 
      globalScatterZoomY ? globalScatterZoomY[1] : 1010000, 
      defaultYDomain[0]
    ), [globalScatterZoomY, defaultYDomain]
  );

  const handleNavigateSong = useCallback((data: any) => {
    const sId = data?.songId || data?.song_id;
    if (sId) {
      const diff = data.difficulty ? `&diff=${data.difficulty}` : '';
      navigate(`/analytics?songId=${sId}${diff}`);
    }
  }, [navigate]);

  const renderScatterDot = useCallback((props: any) => 
    <CustomScatterDot 
      {...props} 
      selectedDot={selectedDot} 
      hoveredDot={hoveredDot} 
      onSelectDot={setSelectedDot}
      onNavigateSong={handleNavigateSong}
    />
  , [selectedDot, hoveredDot, setSelectedDot, handleNavigateSong]);

  return (
    <div className="container animate-fade-in" style={{ padding: '2rem 0' }}>
      
      {/* Global Meta Section Header */}
      <div className="glass-panel" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        {/* Row 1: Title, Description & Filter Counters */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="text-gradient" style={{ margin: 0 }}>Global Stats</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.95rem' }}>
              Universal statistics aggregated across all players and songs on the server.
            </p>
          </div>

          {/* Live Filter Counter Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <div className="badge" style={{ background: 'rgba(170, 59, 255, 0.12)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)', padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} style={{ color: 'var(--accent-primary)' }} />
              <span>Players Filtered: <strong style={{ color: 'var(--accent-primary)' }}>{playerOpData.length.toLocaleString()}</strong></span>
            </div>

            <div className="badge" style={{ background: 'rgba(255, 215, 0, 0.12)', border: '1px solid var(--accent-gold)', color: 'var(--text-primary)', padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Music size={14} style={{ color: 'var(--accent-gold)' }} />
              <span>Charts Filtered: <strong style={{ color: 'var(--accent-gold)' }}>{metaData.length.toLocaleString()}</strong> ({difficultyLabel})</span>
            </div>

            <div className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'var(--text-secondary)', padding: '0.35rem 0.75rem', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Activity size={14} />
              <span>Scores Logged: <strong style={{ color: 'var(--text-primary)' }}>{totalFilteredScores.toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* Row 2: Global Filters Bar */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'flex-end', 
          alignItems: 'center', 
          flexWrap: 'wrap', 
          gap: '0.5rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <GlobalFilterBar showRating={true} />
        </div>
      </div>

      {isLoadingGlobal && heatmapData.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading global statistics...</p>
      ) : (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '2rem',
          opacity: isLoadingGlobal ? 0.45 : 1,
          pointerEvents: isLoadingGlobal ? 'none' : 'auto',
          transition: 'opacity 0.15s ease'
        }}>
          
          {/* Heatmap */}
          <div className="glass-panel" style={{ overflowX: 'auto' }}>
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Grade Rank Heatmap by Chart Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Shows the normalized percentage of scores for each Chart Constant that fall into a specific Grade. (Brighter = Higher %)
            </p>
            
            <GradeHeatmap constants={constants} grid={grid} getConstantLabel={getConstantLabel} />
          </div>

          {/* Survival Rate */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>AJ & FC Survival Rate by Chart Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The exact percentage chance of a player achieving an All Justice or Full Combo plotted against the Chart Constant. Shows the difficulty cliff.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-md" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={survivalData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constant" stroke="var(--text-secondary)" tick={{ fontSize: 13, dy: 6, fill: 'var(--text-secondary)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `${val}%`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(val: any) => [val.toFixed(1) + '%']}
                    />
                    <Legend />
                    <Line isAnimationActive={false} type="monotone" dataKey="ajRate" stroke="var(--rank-aj)" strokeWidth={3} name="All Justice Rate" dot={{ r: 3, fill: 'var(--rank-aj)' }} />
                    <Line isAnimationActive={false} type="monotone" dataKey="fcRate" stroke="var(--rank-fc)" strokeWidth={3} name="Full Combo Rate" dot={{ r: 3, fill: 'var(--rank-fc)' }} />
                    <Brush dataKey="constant" height={25} stroke="var(--accent-primary)" fill="rgba(0,0,0,0.4)" tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lamp Distribution Stacked Bar */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Server Lamp Distribution by Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Normalized distribution of all logged lamps across chart constants. Compare this against your personal dashboard.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-md" style={{ height: '350px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedLampData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} stackOffset="expand">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" tick={{ fontSize: 13, dy: 6, fill: 'var(--text-secondary)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} tickFormatter={(val) => `${Math.round(val * 100)}%`} />
                    <Tooltip content={<LampTooltip />} /><Legend content={(props: any) => {
                      const { payload } = props;
                      const order = ['All Justice Critical', 'All Justice', 'Full Combo', 'Clear', 'Failed'];
                      const sortedPayload = [...(payload || [])].sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
                      return (
                        <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px', marginTop: '10px' }}>
                          {sortedPayload.map((entry, index) => (
                            <li key={`item-${index}`} style={{ display: 'flex', alignItems: 'center', fontSize: '14px' }}>
                              <span style={{ width: 14, height: 14, backgroundColor: entry.color, display: 'inline-block', marginRight: 8, borderRadius: '2px' }}></span>
                              <span style={{ color: 'var(--text-primary)' }}>{entry.value}</span>
                            </li>
                          ))}
                        </ul>
                      );
                    }} />
                    <Bar isAnimationActive={false} dataKey="ajc" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" activeBar={false} />
                    <Bar isAnimationActive={false} dataKey="aj" stackId="a" fill="var(--rank-aj)" name="All Justice" activeBar={false} />
                    <Bar isAnimationActive={false} dataKey="fc" stackId="a" fill="var(--rank-fc)" name="Full Combo" activeBar={false} />
                    <Bar isAnimationActive={false} dataKey="clear" stackId="a" fill="var(--rank-clear)" name="Clear" activeBar={false} />
                    <Bar isAnimationActive={false} dataKey="failed" stackId="a" fill="var(--rank-failed)" name="Failed" activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lucrative OP Levels */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Average Overpower (OP%) Yield by Level</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The average percentage of maximum Overpower rewarded per play grouped by Chart Constant.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-sm" style={{ height: '300px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sortedOpYield} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="constantLabel" stroke="var(--text-secondary)" tick={{ fontSize: 13, dy: 6, fill: 'var(--text-secondary)' }} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} domain={[0, 100]} tickFormatter={(val) => val.toFixed(0) + '%'} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                      formatter={(val: any) => [val.toFixed(2) + '%', "Average OP Yield"]}
                    />
                    <Bar isAnimationActive={false} dataKey="avgOp" fill="var(--accent-secondary)" name="Average OP" radius={[4, 4, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Player Skill Stratification */}
          <div className="glass-panel">
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Player Overpower (OP) Distribution</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              The bell curve of total Overpower for all players on the server.
            </p>
            <div className="scrollable-content-wrapper">
              <div className="chart-min-width-sm" style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={opDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="bucket" stroke="var(--text-secondary)" tick={{ fontSize: 13, dy: 6, fill: 'var(--text-secondary)' }} interval={19} />
                    <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Bar isAnimationActive={false} dataKey="count" fill="var(--accent-primary)" name="Players" radius={[4, 4, 0, 0]} activeBar={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Bubble Chart */}
          <div className="glass-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <h2 className="text-gradient" style={{ marginBottom: '0.25rem', fontSize: '1.5rem' }}>Chart Level Constant vs Average Score Scatter</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Plotting <strong style={{ color: 'var(--accent-gold)' }}>{validMetaData.length.toLocaleString()}</strong> charts ({difficultyLabel}) across <strong style={{ color: 'var(--accent-primary)' }}>{playerOpData.length.toLocaleString()}</strong> players matching active filters. Drag slider edges to resize, drag center to pan. Scroll mouse wheel to zoom.
                </p>
              </div>
              {(globalScatterZoomX || globalScatterZoomY) && (
                <button
                  onClick={() => { setGlobalScatterZoomX(null); setGlobalScatterZoomY(null); }}
                  title="Reset Zoom"
                  style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-secondary)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 'bold' }}
                >
                  <RotateCcw size={14} /> Reset Zoom
                </button>
              )}
            </div>

            <div style={{ display: 'flex', width: '100%', alignItems: 'stretch', gap: '0.25rem' }}>
              <ScatterScrollbar
                orientation="vertical"
                min={defaultYDomain?.[0] ?? 975000}
                max={1010000}
                currentZoom={globalScatterZoomY}
                onZoomChange={setGlobalScatterZoomY}
                accentColor="var(--accent-secondary)"
                label="Score"
                marginTop="25px"
                marginBottom="45px"
              />

              <div 
                ref={globalScatterContainerRef}
                className="scrollable-content-wrapper" 
                style={{ flex: 1, minWidth: 0, overflowX: 'hidden', overflowY: 'hidden', cursor: isPanDragging ? 'grabbing' : 'grab', touchAction: 'pan-x pan-y' }}
              >
                <div className="chart-min-width-md" style={{ height: '430px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart 
                      margin={{ top: 25, right: 30, bottom: 25, left: 20 }}
                      onClick={() => {
                        if (!isPanDragging) {
                          setSelectedDot(null);
                          setHoveredDot(null);
                        }
                      }}
                    >
                      <defs>
                        <clipPath id="custom-scatter-clip">
                          <rect x={globalScatterClipX} y="-500" width="10000" height="878" />
                        </clipPath>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis 
                        type="number" 
                        dataKey="constant" 
                        allowDataOverflow={true}
                        stroke="var(--text-secondary)"
                        tick={{ fontSize: isMobile ? 11 : 13, dy: 6, fill: 'var(--text-secondary)' }}
                        domain={globalScatterZoomX || defaultXDomain}
                        tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="avgScore" 
                        name="Avg Score" 
                        allowDataOverflow={true}
                        domain={globalScatterZoomY || defaultYDomain}
                        ticks={smartYTicks}
                        stroke="var(--text-secondary)" 
                        tick={{ fontSize: isMobile ? 11 : 13, fill: 'var(--text-secondary)' }}
                        tickFormatter={(val) => {
                          if (typeof val !== 'number') return val;
                          if (val % 1000 === 0) return (val / 1000).toFixed(0) + 'k';
                          return (val / 1000).toFixed(1) + 'k';
                        }}
                        width={globalScatterYWidth}
                      />
                      <ZAxis type="number" dataKey="overlapCount" range={[20, 1200]} name="Overlap Count" />
                      <Tooltip content={selectedDot ? () => null : <CustomTooltip hoveredDot={hoveredDot} />} />
                      <Scatter 
                        name="Charts" 
                        data={visibleScatterData} 
                        isAnimationActive={false}
                        fill="#ff66ff" 
                        fillOpacity={0.6} 
                        shape={renderScatterDot}
                        onMouseEnter={(node: any) => {
                          if (node && (node.payload || node.title)) {
                            setHoveredDot(node.payload || node);
                          }
                        }}
                        onMouseLeave={() => setHoveredDot(null)}
                        onClick={(node: any) => {
                          const data = node?.payload || node;
                          if (!data || (!data.title && !data.name)) return;

                          const dotId = `${data.chartId || data.id || data.songId || data.song_id || ''}_${data.difficulty || ''}`;
                          const now = Date.now();
                          const last = lastScatterDotClickRef.current;

                          if (last.id === dotId && (now - last.time) < 500) {
                            handleNavigateSong(data);
                            lastScatterDotClickRef.current = { id: '', time: 0 };
                            return;
                          }

                          // First click: select the dot (keeps UI panel open)
                          lastScatterDotClickRef.current = { id: dotId, time: now };
                          setSelectedDot(data);
                        }}
                      />
                      {activeSelectedNode && (
                        <Scatter
                          name="SelectedChart"
                          data={[activeSelectedNode]}
                          isAnimationActive={false}
                          shape={(props: any) => (
                            <CustomSelectedScatterDot 
                              {...props} 
                              selectedDot={selectedDot} 
                              onSelectDot={setSelectedDot} 
                              onNavigateSong={handleNavigateSong} 
                              onUpdateCoords={handleUpdateGlobalCoords}
                            />
                          )}
                        />
                      )}
                    </ScatterChart>
                  </ResponsiveContainer>

                  {selectedDot && selectedCoords && (() => {
                    const popW = 280;
                    const popH = 180;
                    const containerW = globalScatterContainerRef.current?.clientWidth || 600;
                    const leftPos = (selectedCoords.x + 22 + popW <= containerW - 10)
                      ? selectedCoords.x + 22
                      : selectedCoords.x - popW - 22;
                    const clampedLeft = Math.min(Math.max(leftPos, 10), containerW - popW - 10);
                    const topPos = selectedCoords.y - (popH / 2);
                    const clampedTop = Math.min(Math.max(topPos, 10), 430 - popH - 10);

                    return (
                      <div 
                        style={{
                          position: 'absolute',
                          left: clampedLeft,
                          top: clampedTop,
                          zIndex: 100,
                          pointerEvents: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CustomTooltip 
                          active={true} 
                          payload={[{ payload: activeSelectedNode || selectedDot }]} 
                          selectedDot={selectedDot}
                        />
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            <ScatterScrollbar
              orientation="horizontal"
              min={scatterMinMaxC.minC}
              max={scatterMinMaxC.maxC}
              currentZoom={globalScatterZoomX}
              onZoomChange={setGlobalScatterZoomX}
              accentColor="var(--accent-secondary)"
              label="Level Constant"
              paddingLeft={isMobile ? '65px' : '85px'}
              paddingRight="30px"
            />

            {selectedDot && (
              <div style={{
                marginTop: '0.75rem',
                padding: '0.75rem 1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>{selectedDot.title || selectedDot.name}</span>
                      {selectedDot.difficulty && (
                        <span className={`badge badge-${selectedDot.difficulty.toLowerCase()}`}>
                          {selectedDot.difficulty}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Constant: <strong style={{ color: 'var(--text-primary)' }}>{selectedDot.constant?.toFixed(1)}</strong> | Avg Score: <strong style={{ color: 'var(--text-primary)' }}>{Math.round(selectedDot.avgScore || selectedDot.score || 0).toLocaleString()}</strong> {selectedDot.playCount ? `| Plays: ${selectedDot.playCount.toLocaleString()}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {overlappingGlobalDots.length > 1 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--accent-gold)' }}>
                        <button
                          onClick={() => {
                            const prevIndex = (currentGlobalDotIndex - 1 + overlappingGlobalDots.length) % overlappingGlobalDots.length;
                            setSelectedDot(overlappingGlobalDots[prevIndex]);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Previous overlapping chart"
                        >
                          ◄ Prev
                        </button>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent-gold)', padding: '0 0.25rem' }}>
                          {currentGlobalDotIndex + 1} / {overlappingGlobalDots.length} Overlapping
                        </span>
                        <button
                          onClick={() => {
                            const nextIndex = (currentGlobalDotIndex + 1) % overlappingGlobalDots.length;
                            setSelectedDot(overlappingGlobalDots[nextIndex]);
                          }}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            color: '#fff',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.2rem 0.5rem',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Next overlapping chart"
                        >
                          Next ►
                        </button>
                      </div>
                    )}
                    {(selectedDot.songId || selectedDot.song_id) && selectedDot.difficulty && (
                      <button
                        onClick={() => {
                          const sId = selectedDot.songId || selectedDot.song_id;
                          navigate(`/analytics?songId=${sId}&diff=${selectedDot.difficulty}`);
                        }}
                        style={{
                          background: 'var(--accent-primary)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}
                      >
                        View Leaderboard ➔
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedDot(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.8rem'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Overlapping Charts Selection Pills */}
                {overlappingGlobalDots.length > 1 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    flexWrap: 'wrap',
                    paddingTop: '0.4rem',
                    borderTop: '1px dashed rgba(255, 255, 255, 0.12)'
                  }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--accent-gold)', fontWeight: 600 }}>Select Overlapping Chart:</span>
                    {overlappingGlobalDots.map((item: any, idx: number) => {
                      const isCurrent = idx === currentGlobalDotIndex;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedDot(item)}
                          onDoubleClick={() => handleNavigateSong(item)}
                          title="Click to select • Double-click to view song analytics"
                          style={{
                            background: isCurrent ? 'var(--accent-gold)' : 'rgba(255, 255, 255, 0.08)',
                            color: isCurrent ? '#000' : 'var(--text-primary)',
                            border: isCurrent ? '1px solid var(--accent-gold)' : '1px solid rgba(255, 255, 255, 0.15)',
                            borderRadius: 'var(--radius-full)',
                            padding: '0.2rem 0.6rem',
                            fontSize: '0.78rem',
                            fontWeight: isCurrent ? 700 : 400,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {item.difficulty && (
                            <span className={`badge badge-${item.difficulty.toLowerCase()}`} style={{ padding: '0.1rem 0.35rem', fontSize: '0.7rem' }}>
                              {item.difficulty}
                            </span>
                          )}
                          <span>{item.title || item.name}</span>
                          <span style={{ opacity: 0.8, fontFamily: 'monospace', fontSize: '0.72rem' }}>({Math.round(item.avgScore || item.score || 0)?.toLocaleString()})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default GlobalStats;
