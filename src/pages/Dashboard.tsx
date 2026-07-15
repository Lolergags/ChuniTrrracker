import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, CartesianGrid } from 'recharts';
import { useGlobal } from '../lib/context/useGlobal.js';
import { api, type ApiPlayerStats, type ApiProcessedScore } from '../lib/api/client.js';
import { GlobalFilterBar } from '../components/GlobalFilterBar.js';

export function Dashboard() {
  const { activePlayer, playersList, filters } = useGlobal();
  const [stats, setStats] = useState<ApiPlayerStats | null>(null);
  const [scores, setScores] = useState<ApiProcessedScore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ApiProcessedScore | 'lampValue', direction: 'asc' | 'desc' } | null>({ key: 'op', direction: 'desc' });
  const itemsPerPage = 15;

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

  if (isLoading || !stats) {
    return <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading player data...</div>;
  }

  return (
    <div className="glass-panel">
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="text-gradient">Player Dashboard</h1>
        <GlobalFilterBar />
      </div>
      
      <p style={{ color: 'var(--text-secondary)' }}>
        Showing statistics for <strong style={{ color: 'var(--text-primary)' }}>{stats.username}</strong> based on {stats.scoreCount.toLocaleString()} logged scores.
      </p>
      
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
        <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Lamp Distribution by Level (Normalized)</h2>
        <div style={{ width: '100%', height: '400px' }}>
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
                tick={{ fontSize: 12 }}
              />
              <YAxis stroke="var(--text-secondary)" tickFormatter={(tick) => `${Math.round(tick * 100)}%`} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                itemStyle={{ color: 'var(--text-primary)' }}
                formatter={(value: any) => {
                  return [value, undefined];
                }}
              />
              <Legend payload={[
                { value: 'All Justice Critical', type: 'rect', color: 'var(--rank-ajc)' },
                { value: 'All Justice', type: 'rect', color: 'var(--rank-aj)' },
                { value: 'Full Combo', type: 'rect', color: 'var(--rank-fc)' },
                { value: 'Clear', type: 'rect', color: 'var(--rank-clear)' },
                { value: 'Failed', type: 'rect', color: 'var(--rank-failed)' }
              ]} />
              <Bar dataKey="AJC" stackId="a" fill="var(--rank-ajc)" name="All Justice Critical" />
              <Bar dataKey="AJ" stackId="a" fill="var(--rank-aj)" name="All Justice" />
              <Bar dataKey="FC" stackId="a" fill="var(--rank-fc)" name="Full Combo" />
              <Bar dataKey="CLEAR" stackId="a" fill="var(--rank-clear)" name="Clear" />
              <Bar dataKey="FAILED" stackId="a" fill="var(--rank-failed)" name="Failed" />
              <Bar dataKey="UNPLAYED" stackId="a" fill="rgba(255,255,255,0.05)" stroke="none" activeBar={false} legendType="none" tooltipType="none" name="Unplayed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem', height: '500px', width: '100%', minWidth: 0 }}>
        <h2 className="text-gradient" style={{ marginBottom: '0.5rem' }}>Personal Performance Scatter</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          All imported plays. Correlation between Score and Chart Constant. Bubble size represents OP.
        </p>
        <div style={{ height: 'calc(100% - 70px)' }}>
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                type="number" 
                dataKey="constant" 
                name="Level Constant" 
                domain={['dataMin - 0.5', 'dataMax + 0.2']} 
                stroke="var(--text-secondary)" 
                tickFormatter={(val) => val.toFixed(1)}
              />
              <YAxis 
                type="number" 
                dataKey="score" 
                name="Score" 
                domain={[(dataMin: number) => Math.max(dataMin - 2000, 975000), 1010000]} 
                stroke="var(--text-secondary)"
                tickFormatter={(val) => (val / 1000).toFixed(0) + 'k'} 
              />
              <ZAxis type="number" dataKey="opDisplay" range={[20, 150]} name="OP" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ backgroundColor: 'var(--bg-primary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
                itemStyle={{ color: 'var(--text-primary)' }}
              />
              <Scatter 
                name="Scores" 
                data={uniqueScores.map(s => ({
                  name: s.songTitle,
                  score: s.score,
                  constant: s.constant,
                  opDisplay: Number((s.op / 10000).toFixed(2)),
                  lamp: s.lamp
                }))} 
                fill="var(--accent-primary)" 
                fillOpacity={0.6} 
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      <h2 className="text-gradient" style={{ marginTop: '3rem', marginBottom: '1rem' }}>All Plays (by OP)</h2>
      <div style={{ overflowX: 'auto' }}>
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
