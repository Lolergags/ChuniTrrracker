import React, { useContext } from 'react';
import { usePlayerData } from '../lib/hooks/usePlayerData';
import { UserContext } from '../App';

const Dashboard: React.FC = () => {
  const { username } = useContext(UserContext);
  const { data, isLoading, error } = usePlayerData(username);

  return (
    <div className="glass-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 className="text-gradient">Player Dashboard</h1>
      </div>
      
      {isLoading && <p style={{ color: 'var(--text-secondary)' }}>Fetching data from Kamaitachi & Beerpsi... This might take a few seconds.</p>}
      {error && <p style={{ color: 'var(--rank-aj)' }}>Error loading data: {(error as Error).message}</p>}
      
      {!isLoading && !error && data && (
        <>
          <p style={{ color: 'var(--text-secondary)' }}>
            Showing statistics for <strong style={{ color: 'var(--text-primary)' }}>{username}</strong> based on {data.processedScores.length.toLocaleString()} logged scores.
          </p>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '2rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total OP</h3>
              <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>{data.stats.totalOp.toFixed(2)}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Avg Score</h3>
              <h2 className="text-gradient" style={{ fontSize: '2.5rem' }}>{data.stats.averageScore.toLocaleString()}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--rank-ajc)', marginBottom: '0.5rem' }}>AJC Count</h3>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--rank-ajc)' }}>{data.stats.ajcCount.toLocaleString()}</h2>
            </div>
            <div className="glass-panel" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <h3 style={{ color: 'var(--rank-aj)', marginBottom: '0.5rem' }}>AJ Count</h3>
              <h2 style={{ fontSize: '2.5rem', color: 'var(--rank-aj)' }}>{data.stats.ajCount.toLocaleString()}</h2>
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
                {data.processedScores.slice(0, 15).map((score, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{score.songTitle}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        background: 'rgba(255,255,255,0.1)', 
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>{score.chartType} {score.level}</span> ({score.constant.toFixed(1)})
                    </td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>{score.score.toLocaleString()}</td>
                    <td style={{ padding: '1rem', color: `var(--rank-${score.lamp.toLowerCase()})`, fontWeight: 'bold' }}>{score.lamp}</td>
                    <td style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{(score.op / 10000).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
