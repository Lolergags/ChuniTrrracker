import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api/client.js';
import type { ApiSong, LampType } from '../lib/types/index.js';

const SongAnalytics: React.FC = () => {
  const [songs, setSongs] = useState<ApiSong[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  
  const [leaderboard, setLeaderboard] = useState<Array<{ username: string, score: number, lamp: LampType, op: number, timeAchieved: number }>>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);

  useEffect(() => {
    api.getSongs()
      .then(data => setSongs(data))
      .catch(err => console.error(err));
  }, []);

  // Fetch leaderboard when chart selection changes
  useEffect(() => {
    if (!selectedSongId) {
      setLeaderboard([]);
      return;
    }
    const [songId, difficulty] = selectedSongId.split('-');
    setIsLoadingBoard(true);
    api.getChartLeaderboard(Number(songId), difficulty)
      .then(data => setLeaderboard(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingBoard(false));
  }, [selectedSongId]);

  // Get a flat list of all charts (song + difficulty)
  const allCharts = useMemo(() => {
    const list: { id: number; title: string; difficulty: string; constant: number; level: string; uniqueId: string }[] = [];
    songs.forEach(song => {
      song.charts.forEach(chart => {
        list.push({
          id: song.id,
          title: song.title,
          difficulty: chart.difficulty,
          constant: chart.constant,
          level: chart.level,
          uniqueId: `${song.id}-${chart.difficulty}`
        });
      });
    });
    // Sort alphabetically, then by difficulty constant
    return list.sort((a, b) => a.title.localeCompare(b.title) || b.constant - a.constant);
  }, [songs]);

  const filteredCharts = useMemo(() => {
    if (!searchFilter) return allCharts.slice(0, 100); // Only show first 100 to prevent lag if no search
    const lower = searchFilter.toLowerCase();
    return allCharts.filter(c => c.title.toLowerCase().includes(lower) || c.level.includes(lower));
  }, [allCharts, searchFilter]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Song Leaderboards</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Search for a song and select a chart to view the leaderboard across all imported players.
      </p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Left column: Song List */}
        <div style={{ flex: '1 1 300px' }}>
          <input 
            type="text" 
            placeholder="Search song title or level (e.g. 14+)..." 
            value={searchFilter}
            onChange={e => setSearchFilter(e.target.value)}
            style={{ 
              width: '100%',
              padding: '0.75rem', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(0,0,0,0.3)',
              color: 'var(--text-primary)',
              marginBottom: '1rem'
            }}
          />
          <div style={{ height: '500px', overflowY: 'auto', paddingRight: '0.5rem' }}>
            {filteredCharts.map(chart => (
              <div 
                key={chart.uniqueId}
                onClick={() => setSelectedSongId(chart.uniqueId)}
                style={{
                  padding: '1rem',
                  background: selectedSongId === chart.uniqueId ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.2)',
                  border: selectedSongId === chart.uniqueId ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>{chart.title}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  <span style={{ color: 'var(--accent-secondary)' }}>{chart.difficulty} {chart.level}</span> (CC: {chart.constant.toFixed(1)})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column: Leaderboard */}
        <div style={{ flex: '2 1 400px' }}>
          {selectedSongId ? (
            <div className="glass-panel">
              <h2 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Chart Leaderboard</h2>
              {isLoadingBoard ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading leaderboard...</p>
              ) : leaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No imported players have played this chart yet!</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th style={{ padding: '1rem' }}>Rank</th>
                      <th style={{ padding: '1rem' }}>Player</th>
                      <th style={{ padding: '1rem' }}>Score</th>
                      <th style={{ padding: '1rem' }}>Lamp</th>
                      <th style={{ padding: '1rem' }}>OP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((row, idx) => (
                      <tr key={row.username} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: idx === 0 ? 'var(--rank-ajc)' : 'var(--text-secondary)' }}>#{idx + 1}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.username}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>{row.score.toLocaleString()}</td>
                        <td style={{ padding: '1rem', color: `var(--rank-${row.lamp.toLowerCase()})`, fontWeight: 'bold' }}>{row.lamp}</td>
                        <td style={{ padding: '1rem', color: 'var(--accent-secondary)' }}>{(row.op / 10000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Select a chart from the left to view its leaderboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongAnalytics;
