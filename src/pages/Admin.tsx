import React, { useState, useEffect } from 'react';
import { api } from '../lib/api/client.js';

export function Admin() {
  const [status, setStatus] = useState<string>('Idle');
  const [startId, setStartId] = useState<number>(1);
  const [isTestMode, setIsTestMode] = useState<boolean>(true);
  const [isScraping, setIsScraping] = useState<boolean>(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/scraper/status`);
        const data = await res.json();
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
  }, [status]);

  const startScrape = async () => {
    setStatus('Starting...');
    try {
      const data = await api.startScraper(startId, isTestMode);
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

  return (
    <div style={{ maxWidth: '600px', margin: '2rem auto', padding: '2rem', backgroundColor: 'var(--surface-color)', borderRadius: '12px' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>Global Sync Admin</h2>
      
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ color: 'var(--text-secondary)' }}>
          Start ID:
          <input 
            type="number" 
            value={startId} 
            onChange={(e) => setStartId(parseInt(e.target.value) || 1)}
            style={{ marginLeft: '1rem', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', color: 'white' }}
          />
        </label>

        <label style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input 
            type="checkbox" 
            checked={isTestMode} 
            onChange={(e) => setIsTestMode(e.target.checked)}
          />
          Test Mode (Stop after 4 users)
        </label>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
        <button 
          onClick={startScrape}
          disabled={isScraping}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: isScraping ? 'var(--bg-color)' : 'var(--accent-primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          Start Sync
        </button>
        <button 
          onClick={stopScrape}
          disabled={!isScraping}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: !isScraping ? 'var(--bg-color)' : 'var(--accent-danger)', color: 'white', border: 'none', borderRadius: '6px', cursor: !isScraping ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}
        >
          Stop Sync
        </button>
      </div>

      <div style={{ padding: '1rem', backgroundColor: 'var(--bg-color)', borderRadius: '6px', color: 'var(--text-secondary)' }}>
        <strong>Status:</strong> {status}
      </div>
    </div>
  );
}
