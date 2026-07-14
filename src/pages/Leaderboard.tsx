import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api/client.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';

const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<Array<{ username: string, totalOp: number, opPercent: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { setActivePlayer } = useContext(GlobalContext);
  const navigate = useNavigate();

  useEffect(() => {
    api.getLeaderboard()
      .then(data => setPlayers(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, []);

  const handleRowClick = (username: string) => {
    setActivePlayer(username);
    navigate('/');
  };

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Global Leaderboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Compare Overpower among all imported players.
      </p>
      
      {isLoading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Loading leaderboard data...
        </div>
      ) : players.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
          No players found in the database.
        </div>
      ) : (
        <div style={{ marginTop: '2rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem' }}>Rank</th>
                <th style={{ padding: '1rem' }}>Player</th>
                <th style={{ padding: '1rem' }}>Total OP</th>
                <th style={{ padding: '1rem' }}>OP %</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player, idx) => (
                <tr 
                  key={player.username} 
                  onClick={() => handleRowClick(player.username)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }} 
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} 
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem', color: idx === 0 ? 'var(--rank-ajc)' : 'var(--text-primary)', fontWeight: 'bold' }}>#{idx + 1}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{player.username}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{player.totalOp.toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{player.opPercent.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
