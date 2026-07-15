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

      <h2 className="text-gradient" style={{ marginTop: '3rem', marginBottom: '1rem' }}>Top 15 Plays (by OP)</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem' }}>Song</th>
              <th style={{ padding: '1rem' }}>Level</th>
              <th style={{ padding: '1rem' }}>Score</th>
              <th style={{ padding: '1rem' }}>Lamp</th>
              <th style={{ padding: '1rem' }}>OP</th>
            </tr>
          </thead>
          <tbody>
            {scores.slice(0, 15).map((score, idx) => (
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
    </div>
  );
};

export default Dashboard;
