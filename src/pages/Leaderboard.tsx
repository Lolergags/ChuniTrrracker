import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api/client.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';
import type { ApiPlayer } from '../lib/types/index.js';

const Leaderboard: React.FC = () => {
  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [server, setServer] = useState('jp');
  const [version, setVersion] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  
  const { setActivePlayer } = useContext(GlobalContext);
  const navigate = useNavigate();

  useEffect(() => {
    setIsLoading(true);
    api.getLeaderboard(page, 50, server, version)
      .then(response => {
        setPlayers(response.data);
        setTotalPages(response.totalPages || 1);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoading(false));
  }, [page, server, version]);

  const handleRowClick = (username: string) => {
    setActivePlayer(username);
    navigate('/');
  };

  const VERSIONS = [
    'all',
    'X-VERSE-X',
    'X-VERSE',
    'VERSE',
    'LUMINOUS PLUS',
    'LUMINOUS',
    'SUN PLUS',
    'SUN',
    'NEW PLUS',
    'NEW',
    'PARADISE LOST',
    'PARADISE',
    'CRYSTAL PLUS',
    'CRYSTAL',
    'AMAZON PLUS',
    'AMAZON',
    'STAR PLUS',
    'STAR',
    'AIR PLUS',
    'AIR',
    'CHUNITHM PLUS',
    'CHUNITHM'
  ];

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Global Leaderboard</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Compare Overpower among all imported players.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Server</label>
          <select 
            value={server} 
            onChange={e => setServer(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--code-bg, #1f2028)', color: 'white' }}
          >
            <option value="jp">Japan (JP)</option>
            <option value="intl">International (Intl)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Track List (up to version)</label>
          <select 
            value={version} 
            onChange={e => setVersion(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', backgroundColor: 'var(--code-bg, #1f2028)', color: 'white' }}
          >
            <option value="all">All Versions</option>
            {VERSIONS.filter(v => v !== 'all').map(v => (
              <option key={v} value={v}>Up to {v}</option>
            ))}
          </select>
        </div>
      </div>
      
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
                <th style={{ padding: '1rem' }}>Possession</th>
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
                  <td style={{ padding: '1rem', color: (page === 1 && idx === 0) ? 'var(--rank-ajc)' : 'var(--text-primary)', fontWeight: 'bold' }}>#{((page - 1) * 50) + idx + 1}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{player.username}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-secondary)', fontWeight: 'bold' }}>{(player.totalOp || 0).toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>{(player.opPercent || 0).toFixed(2)}%</td>
                  <td style={{ 
                    padding: '1rem', 
                    fontWeight: 'bold', 
                    color: player.possession === 'Rainbow' ? '#ff66ff' : player.possession === 'Platinum' ? '#e5e4e2' : player.possession === 'Gold' ? '#ffd700' : player.possession === 'Silver' ? '#c0c0c0' : 'var(--text-secondary)',
                    textShadow: player.possession === 'Rainbow' ? '0 0 10px rgba(255,102,255,0.5)' : player.possession === 'Platinum' ? '0 0 10px rgba(229,228,226,0.5)' : 'none'
                  }}>
                    {player.possession !== 'None' ? player.possession : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

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
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
