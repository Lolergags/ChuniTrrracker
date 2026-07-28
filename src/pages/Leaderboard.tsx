import React, { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api/client.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';
import type { ApiPlayer } from '../lib/types/index.js';
import { ALL_VERSIONS } from '../lib/constants.js';

const Leaderboard: React.FC = () => {
  const { setActivePlayer, filters, setFilters } = useContext(GlobalContext);

  const [searchParams, setSearchParams] = useSearchParams();
  const previousVersionRef = useRef<string | null>(null);
  
  // The URL takes precedence. If no URL, fallback to GlobalContext, else defaults.
  const page = parseInt(searchParams.get('page') || '1', 10);
  
  const ctxServerMap: Record<string, string> = { 'JP': 'jp', 'INT': 'intl', 'PL_OFFLINE': 'pl_offline', 'OMNI': 'omni' };
  const getContextServer = () => ctxServerMap[filters.server] || 'jp';
  const server = searchParams.get('server') || getContextServer();
  const version = searchParams.get('version') || filters.version || 'X-VERSE-X';

  const isPlOffline = server === 'pl_offline';
  const plIndex = ALL_VERSIONS.indexOf('PARADISE LOST');
  const versionOptions = isPlOffline && plIndex !== -1 ? ALL_VERSIONS.slice(plIndex) : ALL_VERSIONS;

  // Sync to GlobalContext whenever server or version changes
  useEffect(() => {
    const revMap: Record<string, string> = { 'jp': 'JP', 'intl': 'INT', 'pl_offline': 'PL_OFFLINE', 'omni': 'OMNI' };
    const ctxServer = revMap[server] || 'JP';
    
    if (filters.server !== ctxServer || filters.version !== version) {
      setFilters({ ...filters, server: ctxServer, version });
    }
  }, [server, version, filters, setFilters]);

  const setPage = (p: number | ((prev: number) => number)) => {
    const newPage = typeof p === 'function' ? p(page) : p;
    setSearchParams(prev => { prev.set('page', newPage.toString()); return prev; });
  };
  
  const setServer = (s: string) => {
    setSearchParams(prev => {
      prev.set('server', s);
      prev.set('page', '1');
      if (s === 'pl_offline') {
        const activeVer = prev.get('version') || filters.version || 'X-VERSE-X';
        const activeIdx = ALL_VERSIONS.indexOf(activeVer as any);
        if (activeIdx !== -1 && activeIdx < plIndex) {
          previousVersionRef.current = activeVer;
          prev.set('version', 'PARADISE LOST');
        }
      } else if (previousVersionRef.current) {
        prev.set('version', previousVersionRef.current);
        previousVersionRef.current = null;
      }
      return prev;
    });
  };
  
  const setVersion = (v: string) => {
    setSearchParams(prev => { prev.set('version', v); prev.set('page', '1'); return prev; });
  };

  const [players, setPlayers] = useState<ApiPlayer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
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
    navigate('/dashboard');
  };

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
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            <option value="jp">Japan (JP)</option>
            <option value="intl">International (Intl)</option>
            <option value="pl_offline">Paradise Lost (Offline)</option>
            <option value="omni">Omnimix (All)</option>
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Track List (up to version)</label>
          <select 
            value={version} 
            onChange={e => setVersion(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.15)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
          >
            {versionOptions.map(v => (
              <option key={v} value={v}>{v}</option>
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
        <div className="scrollable-content-wrapper" style={{ marginTop: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)', textTransform: 'uppercase', fontSize: '0.9rem' }}>
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
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.2s', cursor: 'pointer' }} 
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'} 
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem', color: (page === 1 && idx === 0) ? 'var(--accent-gold)' : 'var(--text-primary)', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>#{((page - 1) * 50) + idx + 1}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-primary)', fontWeight: '600' }}>{player.username}</td>
                  <td style={{ padding: '1rem', color: 'var(--accent-primary)', fontWeight: 'bold', fontFamily: 'var(--font-heading)' }}>{(player.totalOp || 0).toFixed(2)}</td>
                  <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-heading)' }}>{(player.opPercent || 0).toFixed(2)}%</td>
                  <td style={{ 
                    padding: '1rem', 
                    fontWeight: 'bold', 
                    fontFamily: 'var(--font-heading)',
                    color: player.possession === 'Rainbow' ? '#f472b6' : player.possession === 'Platinum' ? '#cbd5e1' : player.possession === 'Gold' ? '#eab308' : player.possession === 'Silver' ? '#94a3b8' : 'var(--text-muted)',
                    textShadow: player.possession === 'Rainbow' ? '0 0 8px rgba(244,114,182,0.4)' : player.possession === 'Platinum' ? '0 0 8px rgba(203,213,225,0.3)' : 'none'
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
