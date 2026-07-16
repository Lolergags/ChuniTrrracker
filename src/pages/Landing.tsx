import React, { useContext, useState, useDeferredValue, useMemo } from 'react';
import { Activity, Trophy, BarChart2, DownloadCloud, ChevronRight, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { GlobalContext } from '../lib/context/GlobalContext.js';

export function Landing() {
  const { playersList, setActivePlayer } = useContext(GlobalContext);
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

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

  return (
    <div className="animate-fade-in" style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
      <div style={{ marginBottom: '3rem', maxWidth: '800px' }}>
        <h1 className="text-gradient" style={{ fontSize: '4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
          <Activity size={56} /> ChuniTrrracker
        </h1>
        <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Advanced statistics and Overpower tracking for Chunithm. 
          Analyze your gameplay, visualize your progression, and compare your skills globally.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1200px', marginBottom: '4rem' }}>
        <div className="glass-panel hover-card" onClick={() => navigate('/leaderboard')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '1rem', background: 'rgba(255, 204, 0, 0.1)', borderRadius: '50%', color: 'var(--rank-ss)', marginBottom: '1rem' }}>
            <Trophy size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Global Leaderboards</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Compete with other players based on total Overpower, average score, and clear rates.</p>
        </div>
        
        <div className="glass-panel hover-card" onClick={() => navigate('/analytics')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '1rem', background: 'rgba(0, 255, 204, 0.1)', borderRadius: '50%', color: 'var(--accent-primary)', marginBottom: '1rem' }}>
            <BarChart2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Song Analytics</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Discover the easiest charts to farm, average server scores, and regional completion rates.</p>
        </div>

        <div className="glass-panel hover-card" onClick={() => navigate('/import')} style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ padding: '1rem', background: 'rgba(255, 102, 255, 0.1)', borderRadius: '50%', color: 'var(--accent-secondary)', marginBottom: '1rem' }}>
            <DownloadCloud size={32} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Import Data</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Sync your scores directly from Kamaitachi to instantly populate your personal dashboard.</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', width: '100%' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1.5rem', fontSize: '2rem' }}>Get Started</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
          Search for your profile to view your dashboard.
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
                navigate('/dashboard');
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

        {playersList.length === 0 ? (
          <p style={{ color: 'var(--rank-failed)' }}>No players found in database. Please import data first.</p>
        ) : deferredSearchQuery.trim().length > 0 ? (
          filteredPlayers.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              {filteredPlayers.map(player => (
                <button 
                  key={player}
                  onClick={() => {
                    setActivePlayer(player);
                    navigate('/dashboard');
                  }}
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
    </div>
  );
}
