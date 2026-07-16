import { useState, useEffect, useContext } from 'react';
import { api } from '../lib/api/client.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';
import { CronBuilder } from '../components/CronBuilder.js';

export function Admin() {
  const { playersList, refreshPlayers, isAdmin, setIsAdmin } = useContext(GlobalContext);
  
  // Auth state
  const [apiKey, setApiKey] = useState('');
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
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const [syncAllProgress, setSyncAllProgress] = useState({ current: 0, total: 0, currentUser: '' });

  // Scheduler state
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [syncCron, setSyncCron] = useState<string>('0 12 * * *');
  const [scrapeCron, setScrapeCron] = useState<string>('0 0 * * *');
  const [schedulerScrapeStartId, setSchedulerScrapeStartId] = useState<number>(1);
  const [schedulerScrapeEndId, setSchedulerScrapeEndId] = useState<number>(5000);

  useEffect(() => {
    // Check initial auth on mount
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      api.verifyAdmin(savedKey)
        .then(() => setIsAdmin(true))
        .catch(() => {
          localStorage.removeItem('adminKey');
          setIsAdmin(false);
        });
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    
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

      // Poll sync-all status
      try {
        const syncData = await api.getSyncAllStatus();
        setIsSyncingAll(syncData.isSyncing);
        if (syncData.isSyncing) {
          setSyncAllProgress(syncData);
          setSyncAllMessage(`Syncing ${syncData.current} / ${syncData.total}...`);
        } else {
          setSyncAllMessage((prev) => prev.startsWith('Syncing') ? 'Sync complete.' : prev);
          setSyncAllProgress({ current: 0, total: 0, currentUser: '' });
        }
      } catch (err) {
        // ignore
      }

      // Poll scheduler status
      try {
        const schedData = await api.getSchedulerStatus();
        setSchedulerStatus((prev: any) => {
          if (!prev) {
            setSyncCron(schedData.syncCronString || '0 12 * * *');
            setScrapeCron(schedData.scrapeCronString || '0 0 * * *');
            setSchedulerScrapeStartId(schedData.scrapeStartId);
            setSchedulerScrapeEndId(schedData.scrapeEndId);
          }
          return schedData;
        });
      } catch (err) {
        // ignore
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [status, isAdmin]);

  const handleLogin = async () => {
    if (!apiKey.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      await api.verifyAdmin(apiKey);
      localStorage.setItem('adminKey', apiKey);
      setIsAdmin(true);
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
      await refreshPlayers();
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
      setIsSyncingAll(true);
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

  const handleStartScheduler = async () => {
    try {
      const res = await api.startScheduler(
        syncCron,
        scrapeCron,
        schedulerScrapeStartId,
        schedulerScrapeEndId
      );
      setSchedulerStatus(res.status);
    } catch (err) {
      alert("Failed to start scheduler");
    }
  };

  const handleStopScheduler = async () => {
    try {
      const res = await api.stopScheduler();
      setSchedulerStatus(res.status);
    } catch (err) {
      alert("Failed to stop scheduler");
    }
  };

  if (!isAdmin) {
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
      
      {/* 1. Unified System Automation Hub */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>System Automation & Worker Status</h2>
        
        {schedulerStatus ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ marginBottom: '0.5rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
              <strong>Scheduler Engine:</strong> 
              <span style={{ color: schedulerStatus.isEnabled ? 'var(--rank-rainbow)' : 'var(--rank-failed)', marginLeft: '0.5rem', fontWeight: 'bold' }}>
                {schedulerStatus.isEnabled ? 'RUNNING' : 'STOPPED'}
              </span>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: isSyncingAll ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Global Sync Worker</h3>
                <div style={{ color: isSyncingAll ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {isSyncingAll ? `Syncing (${syncAllProgress.current} / ${syncAllProgress.total})` : 'Idle'}
                </div>
                {schedulerStatus.isEnabled && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Next Run: {schedulerStatus.nextSyncTime ? new Date(schedulerStatus.nextSyncTime).toLocaleString() : 'N/A'}
                  </div>
                )}
              </div>

              <div style={{ padding: '1rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: isScraping ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1rem' }}>Discovery Scraper</h3>
                <div style={{ color: isScraping ? 'var(--accent-primary)' : 'var(--text-secondary)' }}>
                  {isScraping ? `Scraping ID: ${status.split(': ')[1] || 'Running'}` : 'Idle'}
                </div>
                {schedulerStatus.isEnabled && (
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Next Run: {schedulerStatus.nextScrapeTime ? new Date(schedulerStatus.nextScrapeTime).toLocaleString() : 'N/A'}
                  </div>
                )}
              </div>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Schedule Configuration</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Define how often automated background tasks should run.
                {schedulerStatus.isEnabled && <span style={{ color: 'var(--accent-primary)', marginLeft: '0.5rem' }}>(Click 'Apply Schedules' below to save changes)</span>}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
                <label style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ minWidth: '120px' }}>Sync Cron:</span>
                  <CronBuilder value={syncCron} onChange={setSyncCron} />
                </label>
                <label style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ minWidth: '120px' }}>Scrape Cron:</span>
                  <CronBuilder value={scrapeCron} onChange={setScrapeCron} />
                </label>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <label style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    Scrape Start ID:
                    <input 
                      type="number" 
                      value={schedulerScrapeStartId} 
                      onChange={(e) => setSchedulerScrapeStartId(parseInt(e.target.value) || 1)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </label>
                  <label style={{ color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    Scrape End ID:
                    <input 
                      type="number" 
                      value={schedulerScrapeEndId} 
                      onChange={(e) => setSchedulerScrapeEndId(parseInt(e.target.value) || 5000)}
                      style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button 
                onClick={handleStartScheduler}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Apply Schedules & Start
              </button>
              <button 
                onClick={handleStopScheduler}
                disabled={!schedulerStatus.isEnabled}
                style={{ padding: '0.75rem 1.5rem', backgroundColor: !schedulerStatus.isEnabled ? 'var(--bg-color)' : 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: !schedulerStatus.isEnabled ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
              >
                Stop Scheduler
              </button>
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--text-secondary)' }}>Loading scheduler state...</div>
        )}
      </div>

      {/* 2. Manual Controls */}
      {/* 2. Manual Controls */}
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Manual Overrides & Database Controls</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Delete Player */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Delete Player</h3>
            <input 
              type="text"
              list="admin-players-list"
              placeholder="Search or select a player..."
              value={playerToDelete}
              onChange={(e) => setPlayerToDelete(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            />
            <datalist id="admin-players-list">
              {playersList.map(p => <option key={p} value={p} />)}
            </datalist>
            <button 
              onClick={handleDeletePlayer}
              disabled={!playersList.includes(playerToDelete)}
              style={{ padding: '0.5rem 1rem', background: 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: playersList.includes(playerToDelete) ? 'pointer' : 'not-allowed', width: '100%' }}
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
              disabled={isSyncingAll}
              style={{ padding: '0.5rem 1rem', background: isSyncingAll ? 'var(--bg-color)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isSyncingAll ? 'not-allowed' : 'pointer', width: '100%' }}
            >
              {isSyncingAll ? 'Sync in Progress...' : 'Trigger Full Re-sync'}
            </button>
            {syncAllMessage && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {syncAllMessage}
              {isSyncingAll && syncAllProgress.currentUser && <div style={{ color: 'var(--text-primary)', marginTop: '0.25rem' }}>Currently syncing: {syncAllProgress.currentUser}</div>}
            </div>}
          </div>

          {/* Discovery Scraper */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Kamaitachi Scraper</h3>
            <div style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Start ID:
                <input 
                  type="number" 
                  value={startId} 
                  onChange={(e) => setStartId(parseInt(e.target.value) || 1)}
                  style={{ width: '60%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>
              <label style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                End ID:
                <input 
                  type="number" 
                  value={endId} 
                  onChange={(e) => setEndId(parseInt(e.target.value) || startId)}
                  style={{ width: '60%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                onClick={startScrape}
                disabled={isScraping}
                style={{ flex: 1, padding: '0.5rem', backgroundColor: isScraping ? 'var(--bg-color)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                Start
              </button>
              <button 
                onClick={stopScrape}
                disabled={!isScraping}
                style={{ flex: 1, padding: '0.5rem', backgroundColor: !isScraping ? 'var(--bg-color)' : 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: !isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}
              >
                Stop
              </button>
            </div>
          </div>

          {/* DB Backup */}
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-primary)' }}>Database Backup</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Download a full SQLite database snapshot instantly without interrupting server operations.
            </p>
            <button 
              onClick={handleBackup}
              style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
            >
              Download Backup (.sqlite)
            </button>
          </div>

        </div>
      </div>
      
      <div style={{ textAlign: 'center' }}>
        <button 
          onClick={() => {
            localStorage.removeItem('adminKey');
            setIsAdmin(false);
          }}
          style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', textDecoration: 'underline', cursor: 'pointer' }}
        >
          Logout Admin
        </button>
      </div>

    </div>
  );
}
