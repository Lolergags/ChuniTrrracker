import React, { useContext } from 'react';
import { UserContext } from '../App';
import { usePlayerData } from '../lib/hooks/usePlayerData';

const Leaderboard: React.FC = () => {
  // Currently just showing the active player since we don't have a backend to fetch all players
  const { username } = useContext(UserContext);
  const { data, isLoading } = usePlayerData(username);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Global Leaderboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Compare your Overpower with other players globally.
        <br/><small>(Note: Showing local search cache only. Full global leaderboard requires backend aggregation.)</small>
      </p>
      
      <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '1rem' }}>Rank</th>
              <th style={{ padding: '1rem' }}>Player</th>
              <th style={{ padding: '1rem' }}>Total OP</th>
              <th style={{ padding: '1rem' }}>Avg Score</th>
              <th style={{ padding: '1rem' }}>AJC / AJ</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} style={{ padding: '1rem', color: 'var(--text-secondary)', textAlign: 'center' }}>Loading player data...</td>
              </tr>
            )}
            {!isLoading && data && (
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>#1</td>
                <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{username}</td>
                <td style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{data.stats.totalOp.toFixed(2)}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{data.stats.averageScore.toLocaleString()}</td>
                <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                  <span style={{ color: 'var(--rank-ajc)' }}>{data.stats.ajcCount}</span> / <span style={{ color: 'var(--rank-aj)' }}>{data.stats.ajCount}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
