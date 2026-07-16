import { useState, useEffect, useContext } from 'react';
import { api } from '../lib/api/client.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';

export function Admin() {
  const { playersList } = useContext(GlobalContext);
  
  // Auth state
  const [apiKey, setApiKey] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Scraper state
  const [status, setStatus] = useState<string>('Idle');
  const [startId, setStartId] = useState<number>(1);
  const [endId, setEndId] = useState<number>(5000);
  const [isScraping, setIsScraping] = useState<boolean>(false);

  // New controls state
  const [playerToDelete, setPlayerToDelete] = useState('');
  const [deleteMessage, setDeleteMessage] = useState('');
  const [syncAllMessage, setSyncAllMessage] = useState('');

  useEffect(() => {
    // Check initial auth on mount
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      api.verifyAdmin(savedKey)
        .then(() => setIsLoggedIn(true))
        .catch(() => {
          localStorage.removeItem('adminKey');
          setIsLoggedIn(false);
        });
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    
    // Poll scraper status only if logged in
    const interval = setInterval(async () => {
      try {
        const data = await api.getScraperStatus();
        setIsScraping(data.isScraping);
        if (data.isScraping) {
          setStatus(`Scraping... Current ID: ${data.currentScrapeId}`);
        } else if (status.startsWith('Scraping')) {
          setStatus('Stopped.');
        }
      } catch (err) {
        // ignore fetch errors
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [status, isLoggedIn]);

  const handleLogin = async () => {
    if (!apiKey.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.verifyAdmin(apiKey);
      localStorage.setItem('adminKey', apiKey);
      setIsLoggedIn(true);
    } catch (err: any) {
      setAuthError('Invalid API Key');
    } finally {
      setAuthLoading(false);
    }
  };

  const startScrape = async () => {
    setStatus('Starting...');
    try {
      const data = await api.startScraper(startId, endId);
      setStatus(data.message || 'Scraping...');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const stopScrape = async () => {
    try {
      const data = await api.stopScraper();
      setStatus(data.message || 'Stopped.');
    } catch (err: any) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete) return;
    if (!window.confirm(`Are you sure you want to completely delete ${playerToDelete} and all their scores? This cannot be undone.`)) {
      return;
    }
    
    setDeleteMessage('Deleting...');
    try {
      const data = await api.deletePlayer(playerToDelete);
      setDeleteMessage(data.message || 'Deleted successfully.');
      setPlayerToDelete('');
      // Force refresh of the global players list after deletion
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: any) {
      setDeleteMessage(`Error: ${err.message}`);
    }
  };

  const handleSyncAll = async () => {
    if (!window.confirm('Trigger a full re-sync for all players in the database? This may take a while in the background.')) return;
    
    setSyncAllMessage('Starting sync...');
    try {
      const data = await api.syncAllPlayers();
      setSyncAllMessage(data.message || 'Background sync started.');
    } catch (err: any) {
      setSyncAllMessage(`Error: ${err.message}`);
    }
  };

  const handleBackup = () => {
    try {
      api.downloadBackup();
    } catch (err: any) {
      alert('Failed to download backup: ' + err.message);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="glass-panel" style={{ maxWidth: '400px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>Admin Login</h2>
        <input 
          type="password"
          placeholder="Admin API Key"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: '1rem' }}
        />
        {authError && <div style={{ color: 'var(--rank-failed)', marginBottom: '1rem', fontSize: '0.9rem' }}>{authError}</div>}
        <button 
          onClick={handleLogin}
          disabled={authLoading}
          style={{ width: '100%', padding: '0.75rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
        >
          {authLoading ? 'Verifying...' : 'Login'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="text-gradient">Database Controls</h2>
          <button 
            onClick={handleBackup}
            style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Download DB Backup (.sqlite)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Delete Player */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Delete Player</h3>
            <select 
              value={playerToDelete}
              onChange={(e) => setPlayerToDelete(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              <option value="">Select a player...</option>
              {playersList.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button 
              onClick={handleDeletePlayer}
              disabled={!playerToDelete}
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: playerToDelete ? 'pointer' : 'not-allowed', width: '100%' }}
            >
              Delete Player Data
            </button>
            {deleteMessage && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{deleteMessage}</div>}
          </div>

          {/* Sync All Players */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Global Force Sync</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Triggers a background sync for all {playersList.length} players currently in the database, bypassing the 5-minute cooldown.
            </p>
            <button 
              onClick={handleSyncAll}
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', width: '100%' }}
            >
              Trigger Full Re-sync
            </button>
            {syncAllMessage && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{syncAllMessage}</div>}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Kamaitachi Scraper (Discovery)</h2>
        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ color: 'var(--text-secondary)' }}>
            Start ID:
            <input 
              type="number" 
              value={startId} 
              onChange={(e) => setStartId(parseInt(e.target.value) || 1)}
              style={{ marginLeft: '1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </label>

          <label style={{ color: 'var(--text-secondary)' }}>
            End ID:
            <input 
              type="number" 
              value={endId} 
              onChange={(e) => setEndId(parseInt(e.target.value) || startId)}
              style={{ marginLeft: '1.4rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <button 
            onClick={startScrape}
            disabled={isScraping}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: isScraping ? 'var(--bg-color)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            Start Global Discovery
          </button>
          <button 
            onClick={stopScrape}
            disabled={!isScraping}
            style={{ padding: '0.75rem 1.5rem', backgroundColor: !isScraping ? 'var(--bg-color)' : 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: !isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
          >
            Stop Scraper
          </button>
        </div>

        <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
          <strong>Status:</strong> {status}
        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => {
            localStorage.removeItem('adminKey');
            setIsLoggedIn(false);
          }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Logout Admin
        </button>
      </div>

    </div>
  );
}
