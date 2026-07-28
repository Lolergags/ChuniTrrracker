import { useEffect, useState, useMemo, useDeferredValue, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';
import { Search, ChevronRight, RotateCcw, UserX } from 'lucide-react';
import { useGlobal } from '../lib/context/useGlobal.js';
import { api } from '../lib/api/client.js';
import type { ApiPlayerStats, ApiProcessedScore } from '../lib/types/index.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';
import { PlayerAutocomplete } from '../components/PlayerAutocomplete.js';
import { LampTooltip, ScatterTooltip } from '../components/ChartTooltips.js';
import { clampDomainX, clampDomainY, getSmartYTicks, panDomain } from '../lib/utils/scatterZoom.js';
import { useIsMobile } from '../lib/hooks/useIsMobile.js';
import { ScatterScrollbar } from '../components/ScatterScrollbar.js';

export function Dashboard() {
  const navigate = useNavigate();
  const { activePlayer, setActivePlayer, playersList, filters } = useGlobal();
  const [stats, setStats] = useState<ApiPlayerStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [playerInput, setPlayerInput] = useState(activePlayer || '');

  useEffect(() => {
    setPlayerInput(activePlayer || '');
  }, [activePlayer]);

  const [scatterZoomX, setScatterZoomX] = useState<[number, number] | null>(null);
  const [scatterZoomY, setScatterZoomY] = useState<[number, number] | null>(null);
  const [isPanDragging, setIsPanDragging] = useState(false);
  const [selectedDot, setSelectedDot] = useState<any | null>(null);
  const scatterContainerRef = useRef<HTMLDivElement>(null);

  const isMobile = useIsMobile();

  const scatterYWidth = scatterZoomY ? (isMobile ? 35 : 45) : (isMobile ? 45 : 55);
  const scatterClipX = 20 + scatterYWidth;
  
  const filteredPlayers = useMemo(() => {
    if (!deferredSearchQuery.trim()) return [];
    const lowerQuery = deferredSearchQuery.toLowerCase();
    const exactMatches = [];
    const startsWithMatches = [];
    const containsMatches = [];
    
    for (let i = 0; i < playersList.length; i++) {
      const lowerPlayer = playersList[i].toLowerCase();
      if (lowerPlayer === lowerQuery) {
        exactMatches.push(playersList[i]);
      } else if (lowerPlayer.startsWith(lowerQuery)) {
        startsWithMatches.push(playersList[i]);
      } else if (lowerPlayer.includes(lowerQuery)) {
        containsMatches.push(playersList[i]);
      }
    }
    
    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 50);
  }, [playersList, deferredSearchQuery]);
  const [scores, setScores] = useState<ApiProcessedScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApiProcessedScore | 'lampValue', direction: 'asc' | 'desc' } | null>({ key: 'op', direction: 'desc' });
  const itemsPerPage = 10;

  useEffect(() => {
    if (!activePlayer) return;
    setIsLoading(true);
    setError(null);
    Promise.all([
      api.getPlayer(activePlayer, filters),
      api.getPlayerScores(activePlayer, 5000, filters)
    ]).then(([playerStats, playerScores]) => {
      setStats(playerStats);
      setScores(playerScores);
    }).catch(err => {
      console.error(err);
      setError(err.message || 'Failed to load player data');
    }).finally(() => {
      setIsLoading(false);
    });
  }, [activePlayer, filters]);

  useEffect(() => {
    setPage(1);
  }, [activePlayer, filters]);

  const uniqueScores = useMemo(() => {
    return Array.from(
      scores.filter(s => s.score >= 975000).reduce((map, s) => {
        if (!map.has(s.songId) || map.get(s.songId)!.op < s.op) {
          map.set(s.songId, s);
        }
        return map;
      }, new Map<number, ApiProcessedScore>()).values()
    );
  }, [scores]);

  const sortedScores = useMemo(() => {
    let sortableItems = [...uniqueScores];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let valA: any, valB: any;
        if (sortConfig.key === 'lampValue') {
          const lampOrder: Record<string, number> = { FAILED: 0, CLEAR: 1, FC: 2, AJ: 3, AJC: 4 };
          valA = lampOrder[a.lamp] ?? 0;
          valB = lampOrder[b.lamp] ?? 0;
        } else if (sortConfig.key === 'songTitle') {
          valA = a.songTitle.toLowerCase();
          valB = b.songTitle.toLowerCase();
        } else if (sortConfig.key === 'constant') {
          valA = a.constant;
          valB = b.constant;
        } else {
          valA = a[sortConfig.key as keyof ApiProcessedScore];
          valB = b[sortConfig.key as keyof ApiProcessedScore];
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [uniqueScores, sortConfig]);

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

  const scatterZoomXRef = useRef(scatterZoomX);
  scatterZoomXRef.current = scatterZoomX;

  const scatterZoomYRef = useRef(scatterZoomY);
  scatterZoomYRef.current = scatterZoomY;

  const defaultXDomain = useMemo<[number, number]>(() => {
    const constants = uniqueScores.map(s => s.constant);
    if (!constants.length) return [1.0, 16.0];
    const minConst = Math.min(...constants);
    const maxConst = Math.max(...constants);
    return [
      Math.max(1.0, Number((minConst - 0.5).toFixed(1))),
      Math.min(16.0, Number((maxConst + 0.6).toFixed(1)))
    ];
  }, [uniqueScores]);

  const defaultYDomain = useMemo<[number, number]>(() => {
    const scores = uniqueScores.map(s => s.score);
    if (!scores.length) return [975000, 1010000];
    const lowest = Math.min(...scores);
    const defYMin = Math.max(0, Math.floor(lowest / 5000) * 5000);
    return [defYMin, 1010000];
  }, [uniqueScores]);

  const defaultXRef = useRef<[number, number]>(defaultXDomain);
  defaultXRef.current = defaultXDomain;

  const defaultYRef = useRef<[number, number]>(defaultYDomain);
  defaultYRef.current = defaultYDomain;

  useEffect(() => {
    const elem = scatterContainerRef.current;
    if (!elem) return;

    const getDomains = () => {
      const defX = defaultXRef.current;
      const defY = defaultYRef.current;
      const curX = scatterZoomXRef.current || defX;
      const curY = scatterZoomYRef.current || defY;
      return { defX, defY, curX, curY };
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const { defX, defY, curX, curY } = getDomains();

      const rect = elem.getBoundingClientRect();
      const plotLeft = rect.left + 85;
      const plotWidth = Math.max(100, rect.width - 105);
      const plotTop = rect.top + 20;
      const plotHeight = Math.max(100, rect.height - 60);

      const xFrac = Math.max(0, Math.min(1, (e.clientX - plotLeft) / plotWidth));
      const yFrac = Math.max(0, Math.min(1, 1 - (e.clientY - plotTop) / plotHeight));

      const focalX = curX[0] + xFrac * (curX[1] - curX[0]);
      const focalY = curY[0] + yFrac * (curY[1] - curY[0]);

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.3;
      const spanX = (curX[1] - curX[0]) * zoomFactor;
      const spanY = (curY[1] - curY[0]) * zoomFactor;

      if (spanX < 0.2 && spanY < 1000 && e.deltaY < 0) return;

      const rawMinX = focalX - xFrac * spanX;
      const rawMaxX = focalX + (1 - xFrac) * spanX;
      const rawMinY = focalY - yFrac * spanY;
      const rawMaxY = focalY + (1 - yFrac) * spanY;

      const [newMinX, newMaxX] = clampDomainX(rawMinX, rawMaxX, defX);
      const [newMinY, newMaxY] = clampDomainY(rawMinY, rawMaxY, defY);

      if (newMinX <= defX[0] && newMaxX >= defX[1]) {
        setScatterZoomX(null);
      } else {
        setScatterZoomX([newMinX, newMaxX]);
      }

      if (newMinY <= defY[0] && newMaxY >= defY[1]) {
        setScatterZoomY(null);
      } else {
        setScatterZoomY([newMinY, newMaxY]);
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
      setIsPanDragging(true);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!panRef.current.isDragging) return;
      e.preventDefault();
      const { defX, defY } = getDomains();

      if (elem.scrollWidth > elem.clientWidth && !scatterZoomXRef.current) {
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
        setScatterZoomX(null);
      } else {
        setScatterZoomX([newMinX, newMaxX]);
      }

      if (newMinY <= defY[0] && newMaxY >= defY[1]) {
        setScatterZoomY(null);
      } else {
        setScatterZoomY([newMinY, newMaxY]);
      }
    };

    const handleMouseUp = () => {
      if (panRef.current.isDragging) {
        panRef.current.isDragging = false;
        setIsPanDragging(false);
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
      } else if (e.touches.length === 2) {
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

        // 1-finger horizontal touch drag smoothly scrolls the graph DOM container around while sliders remain anchored
        if (dx > dy && elem.scrollWidth > elem.clientWidth) {
          e.preventDefault();
          elem.scrollLeft = panRef.current.startScrollLeft - deltaX;
          return;
        }

        // If move is predominantly vertical and graph is unzoomed, allow native page scroll
        if (dy > dx && !scatterZoomXRef.current && !scatterZoomYRef.current) {
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
          setScatterZoomX(null);
        } else {
          setScatterZoomX([newMinX, newMaxX]);
        }

        if (newMinY <= defY[0] && newMaxY >= defY[1]) {
          setScatterZoomY(null);
        } else {
          setScatterZoomY([newMinY, newMaxY]);
        }
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        if (currentDist < 15) return;

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
          setScatterZoomX(null);
        } else {
          setScatterZoomX([newMinX, newMaxX]);
        }

        if (newMinY <= defY[0] && newMaxY >= defY[1]) {
          setScatterZoomY(null);
        } else {
          setScatterZoomY([newMinY, newMaxY]);
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
    };
  }, [isLoading, stats, uniqueScores]);

  const requestSort = (key: keyof ApiProcessedScore | 'lampValue') => {
    let direction: 'asc' | 'desc' = 'desc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
    setPage(1);
  };

  if (playersList.length === 0) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 className="text-gradient">No Players Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>The database currently has no players. Have the server administrator import players to begin tracking data.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2 className="text-gradient" style={{ color: 'var(--rank-failed)' }}>Error</h2>
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>{error}</p>
      </div>
    );
  }

  if (!activePlayer) {
    return (
      <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', maxWidth: '600px', margin: '0 auto' }}>
        <h2 className="text-gradient">No Player Selected</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '1.5rem 0' }}>
          Search for a player below to view their dashboard.
        </p>
        
        <div style={{ 
          position: 'relative', 
          maxWidth: '400px', 
          margin: '0 auto 2rem auto' 
        }}>
          <Search style={{ 
            position: 'absolute', 
            left: '1rem', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: 'var(--text-secondary)' 
          }} size={20} />
          <input
            type="text"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredPlayers.length > 0 && searchQuery.trim().length > 0) {
                setActivePlayer(filteredPlayers[0]);
              }
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem 0.75rem 3rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              fontSize: '1rem',
              outline: 'none'
            }}
          />
        </div>

        {deferredSearchQuery.trim().length > 0 ? (
          filteredPlayers.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              {filteredPlayers.map(player => (
                <button 
                  key={player}
                  onClick={() => setActivePlayer(player)}
                  className="hover-card"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '0.75rem 1.5rem',
                    borderRadius: 'var(--radius-full)',
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '1.1rem'
                  }}
                >
                  {player} <ChevronRight size={16} />
                </button>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No players match your search.</p>
          )
        ) : null}
      </div>
    );
  }

  if (isLoading || !stats) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading player data...</div>;
  }

  return (
    <div className="glass-panel">
      {/* Dashboard Control Header */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem',
        marginBottom: '1.5rem',
        paddingBottom: '1.25rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Row 1: Dashboard Title & Player Selector */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="text-gradient" style={{ margin: 0 }}>Player Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0', fontSize: '0.9rem' }}>
              Showing statistics for <strong style={{ color: 'var(--text-primary)' }}>{stats.username}</strong> ({stats.scoreCount.toLocaleString()} logged scores)
            </p>
          </div>

          {/* Quick Player Autocomplete Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', minWidth: '240px' }}>
            <PlayerAutocomplete
              value={playerInput}
              onChange={(val) => {
                setPlayerInput(val);
                if (playersList.includes(val)) {
                  setActivePlayer(val);
                }
              }}
              placeholder="Switch player..."
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />

            <button
              onClick={() => {
                setActivePlayer(null);
                setPlayerInput('');
              }}
              className="hover-card"
              title="Clear selected player"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: 'var(--text-secondary)',
                padding: '0.45rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexShrink: 0
              }}
            >
              <UserX size={15} /> Clear
            </button>
          </div>
        </div>

        {/* Row 2: Global Filters Bar (Server, Version, Difficulty) */}
        <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'flex-end', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', width: '100%' }}>
          <GlobalFilterBar showRating={false} />
        </div>
      </div>
      
      <div className="dashboard-stat-grid" style={{ display: 'grid', width: '100%', boxSizing: 'border-box' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total OP</h3>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>{stats.totalOp.toFixed(2)}</h2>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {stats.opPercent.toFixed(2)}% of max ({stats.totalPossibleOp.toFixed(2)})
          </div>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Avg Score</h3>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>{stats.averageScore.toLocaleString()}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--rank-ajc)', marginBottom: '0.5rem' }}>AJC Count</h3>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--rank-ajc)' }}>{stats.ajcCount.toLocaleString()}</h2>
        </div>
        <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <h3 style={{ color: 'var(--rank-aj)', marginBottom: '0.5rem' }}>AJ Count</h3>
          <h2 style={{ fontSize: '2.5rem', color: 'var(--rank-aj)' }}>{stats.ajCount.toLocaleString()}</h2>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Clear Rate & Lamp Breakdown by Level</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Proportional breakdown of Clear, Full Combo, All Justice, and AJC lamps achieved across chart level folders.
        </p>
        <div className="scrollable-content-wrapper">
          <div className="chart-min-width-sm" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.levelStats}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                stackOffset="expand"
              >
                <XAxis 
                  dataKey="level" 
                  stroke="var(--text-secondary)" 
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  tick={{ fontSize: 13, dy: 6, fill: 'var(--text-secondary)' }}
                />
                <YAxis stroke="var(--text-secondary)" tick={{ fontSize: 13, fill: 'var(--text-secondary)' }} tickFormatter={(tick) => `${Math.round(tick * 100)}%`} />
                <Tooltip content={<LampTooltip />} />
                <Legend content={(props: any) => {
                  const { payload } = props;
                  const order = ['All Justice Critical', 'All Justice', 'Full Combo', 'Clear', 'Failed'];
                  const sortedPayload = [...(payload || [])]
                    .filter(p => p.value !== 'Unplayed')
                    .sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
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
                <Bar dataKey="AJC" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" activeBar={false} />
                <Bar dataKey="AJ" stackId="a" fill="var(--rank-aj)" name="All Justice" activeBar={false} />
                <Bar dataKey="FC" stackId="a" fill="var(--rank-fc)" name="Full Combo" activeBar={false} />
                <Bar dataKey="CLEAR" stackId="a" fill="var(--rank-clear)" name="Clear" activeBar={false} />
                <Bar dataKey="FAILED" stackId="a" fill="var(--rank-failed)" name="Failed" activeBar={false} />
                <Bar dataKey="UNPLAYED" stackId="a" fill="rgba(255,255,255,0.05)" stroke="none" activeBar={false} legendType="none" tooltipType="none" name="Unplayed" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem', width: '100%', minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Score vs Level Constant Scatter</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Drag slider edges to resize, drag center to pan. Scroll mouse wheel to zoom in/out.
            </p>
          </div>
          {(scatterZoomX || scatterZoomY) && (
            <button
              onClick={() => { setScatterZoomX(null); setScatterZoomY(null); }}
              title="Reset Zoom"
              style={{ padding: '0.35rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-primary)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', fontWeight: 'bold' }}
            >
              <RotateCcw size={14} /> Reset Zoom
            </button>
          )}
        </div>

        <div style={{ display: 'flex', width: '100%', alignItems: 'stretch', gap: '0.25rem' }}>
          <ScatterScrollbar
            orientation="vertical"
            min={defaultYDomain[0]}
            max={1010000}
            currentZoom={scatterZoomY}
            onZoomChange={setScatterZoomY}
            accentColor="var(--accent-primary)"
            label="Score"
            marginTop="25px"
            marginBottom="25px"
          />

          <div 
            ref={scatterContainerRef}
            className="scrollable-content-wrapper" 
            style={{ flex: 1, minWidth: 0, overflowY: 'hidden', cursor: isPanDragging ? 'grabbing' : 'grab', touchAction: 'pan-y' }}
          >
            <div className="chart-min-width-md" style={{ height: '430px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart 
                  margin={{ top: 25, right: 30, bottom: 25, left: 20 }}
                >
                  <defs>
                    <clipPath id="custom-scatter-clip">
                      <rect x={scatterClipX} y="-500" width="10000" height="875" />
                    </clipPath>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    type="number" 
                    dataKey="constant" 
                    allowDataOverflow={true}
                    domain={scatterZoomX || defaultXDomain} 
                    stroke="var(--text-secondary)" 
                    tick={{ fontSize: isMobile ? 11 : 13, dy: 6, fill: 'var(--text-secondary)' }}
                    tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="score" 
                    name="Score" 
                    allowDataOverflow={true}
                    domain={scatterZoomY || defaultYDomain} 
                    ticks={getSmartYTicks(scatterZoomY ? scatterZoomY[0] : defaultYDomain[0], scatterZoomY ? scatterZoomY[1] : 1010000, defaultYDomain[0])}
                    stroke="var(--text-secondary)"
                    tick={{ fontSize: isMobile ? 11 : 13, fill: 'var(--text-secondary)' }}
                    tickFormatter={(val) => {
                      if (typeof val !== 'number') return val;
                      if (val % 1000 === 0) return (val / 1000).toFixed(0) + 'k';
                      return (val / 1000).toFixed(1) + 'k';
                    }}
                    width={scatterYWidth}
                  />
                  <ZAxis type="number" dataKey="playCount" domain={[0, 'dataMax']} range={[20, 1200]} name="Play Count" />
                  <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Scores" 
                    data={uniqueScores.map(s => ({
                      name: s.songTitle,
                      score: s.score,
                      constant: s.constant,
                      opDisplay: Number((s.op / 10000).toFixed(2)),
                      playCount: s.playCount || 1,
                      lamp: s.lamp,
                      songId: s.songId,
                      difficulty: s.difficulty
                    }))} 
                    fill="var(--accent-primary)" 
                    fillOpacity={0.6}
                    onClick={(node: any) => {
                      if (node && (node.payload || node.name)) {
                        setSelectedDot(node.payload || node);
                      }
                    }} 
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {(() => {
          const constants = uniqueScores.map(s => s.constant);
          const minC = constants.length ? Math.max(1.0, Math.min(...constants) - 0.2) : 1.0;
          const maxC = constants.length ? Math.min(15.4, Math.max(...constants) + 0.2) : 15.4;
          return (
            <ScatterScrollbar
              orientation="horizontal"
              min={minC}
              max={maxC}
              currentZoom={scatterZoomX}
              onZoomChange={setScatterZoomX}
              accentColor="var(--accent-primary)"
              label="Level Constant"
              paddingLeft={isMobile ? '65px' : '85px'}
              paddingRight="30px"
            />
          );
        })()}

        {selectedDot && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--accent-primary)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                {selectedDot.name || selectedDot.title}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Constant: <strong style={{ color: 'var(--text-primary)' }}>{selectedDot.constant?.toFixed(1)}</strong> | Score: <strong style={{ color: 'var(--text-primary)' }}>{selectedDot.score?.toLocaleString()}</strong> {selectedDot.opDisplay ? `| OP: ${selectedDot.opDisplay}` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {selectedDot.lamp && (
                <span className={`badge badge-${selectedDot.lamp.toLowerCase()}`}>
                  {selectedDot.lamp}
                </span>
              )}
              {selectedDot.songId && selectedDot.difficulty && (
                <button
                  onClick={() => navigate(`/analytics?songId=${selectedDot.songId}&diff=${selectedDot.difficulty}&player=${encodeURIComponent(activePlayer)}`)}
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
        )}
      </div>

      <h2 className="text-gradient" style={{ marginTop: '3rem', marginBottom: '1rem' }}>All Plays (by OP)</h2>
      <div className="scrollable-content-wrapper">
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('songTitle')}>
                Song {sortConfig?.key === 'songTitle' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('constant')}>
                Level {sortConfig?.key === 'constant' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('score')}>
                Score {sortConfig?.key === 'score' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('lampValue')}>
                Lamp {sortConfig?.key === 'lampValue' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
              <th style={{ padding: '1rem', cursor: 'pointer', userSelect: 'none' }} onClick={() => requestSort('op')}>
                OP {sortConfig?.key === 'op' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedScores.slice((page - 1) * itemsPerPage, page * itemsPerPage).map((score, idx) => (
              <tr 
                key={idx} 
                onClick={() => navigate(`/analytics?songId=${score.songId}&diff=${score.difficulty}&player=${encodeURIComponent(activePlayer)}`)}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                title="Click to view on Song Leaderboard"
              >
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{score.songTitle}</td>
                <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                  <span className={`badge badge-${score.difficulty.toLowerCase()}`} style={{ marginRight: '0.35rem' }}>{score.difficulty} {score.level}</span>
                  <span style={{ fontSize: '0.85rem' }}>({score.constant.toFixed(1)})</span>
                </td>
                <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>{score.score.toLocaleString()}</td>
                <td style={{ padding: '1rem', color: `var(--rank-${score.lamp.toLowerCase()})`, fontWeight: 'bold' }}>{score.lamp}</td>
                <td style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{(score.op / 10000).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {uniqueScores.length > itemsPerPage && (() => {
        const totalPages = Math.ceil(uniqueScores.length / itemsPerPage);
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem' }}>
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: page === 1 ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: page === 1 ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer' }}
            >
              Previous
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              Page 
              <input 
                type="number" 
                value={page || ''} 
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (!isNaN(val)) {
                    setPage(Math.min(Math.max(1, val), totalPages));
                  } else if (e.target.value === '') {
                    setPage(0 as any);
                  }
                }}
                onBlur={() => {
                  if (!page || page < 1) setPage(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e') {
                    e.preventDefault();
                  }
                }}
                style={{ width: '50px', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px' }} 
                min={1} 
                max={totalPages} 
              />
              of {totalPages}
            </div>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: page === totalPages ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: page === totalPages ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}
            >
              Next
            </button>
          </div>
        );
      })()}
    </div>
  );
};

export default Dashboard;
