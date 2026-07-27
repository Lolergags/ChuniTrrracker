import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid, Brush } from 'recharts';
import { Search, ChevronRight, RotateCcw } from 'lucide-react';
import { useGlobal } from '../lib/context/useGlobal.js';
import { api } from '../lib/api/client.js';
import type { ApiPlayerStats, ApiProcessedScore } from '../lib/types/index.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';
import { LampTooltip, ScatterTooltip } from '../components/ChartTooltips.js';

export function Dashboard() {
  const { activePlayer, setActivePlayer, playersList, filters } = useGlobal();
  const [stats, setStats] = useState<ApiPlayerStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [scatterZoomX, setScatterZoomX] = useState<[number, number] | null>(null);
  
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
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-gradient">Player Dashboard</h1>
        <GlobalFilterBar />
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>
          Showing statistics for <strong style={{ color: 'var(--text-primary)' }}>{stats.username}</strong> based on {stats.scoreCount.toLocaleString()} logged scores.
        </p>
        <button
          onClick={() => setActivePlayer(null)}
          className="hover-card"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-secondary)',
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          Clear Selected User
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
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
                  tick={{ fontSize: 12, dy: 6 }}
                />
                <YAxis stroke="var(--text-secondary)" tickFormatter={(tick) => `${Math.round(tick * 100)}%`} />
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
              Individual played charts plotted by Level Constant and Score. Bubble size represents chart play count.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginRight: '0.2rem' }}>Filter Level:</span>
            {[
              { label: 'All', range: null },
              { label: '1-12+', range: [1.0, 12.9] },
              { label: '13-13+', range: [13.0, 13.9] },
              { label: '14-14+', range: [14.0, 14.9] },
              { label: '15+', range: [15.0, 15.4] }
            ].map(preset => {
              const isActive = preset.range === null ? !scatterZoomX : (scatterZoomX && scatterZoomX[0] === preset.range[0] && scatterZoomX[1] === preset.range[1]);
              return (
                <button
                  key={preset.label}
                  onClick={() => setScatterZoomX(preset.range as [number, number] | null)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '4px',
                    background: isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.08)',
                    border: '1px solid ' + (isActive ? 'var(--accent-primary)' : 'rgba(255,255,255,0.15)'),
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: isActive ? 'bold' : 'normal',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
            {scatterZoomX && (
              <button
                onClick={() => setScatterZoomX(null)}
                title="Reset Zoom"
                style={{ padding: '0.3rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.8rem' }}
              >
                <RotateCcw size={13} /> Reset
              </button>
            )}
          </div>
        </div>

        <div className="scrollable-content-wrapper" style={{ overflowY: 'hidden' }}>
          <div className="chart-min-width-md" style={{ height: '430px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis 
                  type="number" 
                  dataKey="constant" 
                  name="Level Constant" 
                  domain={scatterZoomX || ['dataMin - 0.5', 'dataMax + 0.2']} 
                  stroke="var(--text-secondary)" 
                  tick={{ dy: 6 }}
                  tickFormatter={(val) => val.toFixed(1)}
                />
                <YAxis 
                  type="number" 
                  dataKey="score" 
                  name="Score" 
                  domain={[(dataMin: number) => Math.max(dataMin - 2000, 975000), 1010000]} 
                  ticks={[975000, 990000, 1000000, 1005000, 1007500, 1009000, 1010000]}
                  stroke="var(--text-secondary)"
                  tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
                  tickFormatter={(val) => {
                    if (val === 1010000) return '1010k (AJC)';
                    if (val === 1009000) return '1009k (SSS+)';
                    if (val === 1007500) return '1007.5k (SSS)';
                    if (val === 1005000) return '1005k (SS+)';
                    if (val === 1000000) return '1000k (SS)';
                    if (val === 990000) return '990k (S+)';
                    if (val === 975000) return '975k (S)';
                    return (val / 1000).toFixed(0) + 'k';
                  }}
                  width={85}
                />
                <ZAxis type="number" dataKey="playCount" domain={[0, 'dataMax']} range={[30, 400]} name="Play Count" />
                <Tooltip content={<ScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Scatter 
                  name="Scores" 
                  data={uniqueScores.map(s => ({
                    name: s.songTitle,
                    score: s.score,
                    constant: s.constant,
                    opDisplay: Number((s.op / 10000).toFixed(2)),
                    playCount: s.playCount || 1,
                    lamp: s.lamp
                  }))} 
                  fill="var(--accent-primary)" 
                  fillOpacity={0.6} 
                />
                <Brush dataKey="constant" height={25} stroke="var(--accent-primary)" fill="rgba(0,0,0,0.4)" tickFormatter={(val) => typeof val === 'number' ? val.toFixed(1) : val} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
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
              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{score.songTitle}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    background: 'rgba(255,255,255,0.1)', 
                    borderRadius: '4px',
                    fontSize: '0.85rem'
                  }}>{score.difficulty} {score.level}</span> ({score.constant.toFixed(1)})
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
