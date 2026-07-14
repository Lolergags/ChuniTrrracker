import React, { useEffect, useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api/client.js';
import type { ApiSong, ChartLeaderboardResponse } from '../lib/types/index.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';

const SongAnalytics: React.FC = () => {
  const [songs, setSongs] = useState<ApiSong[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortType, setSortType] = useState<'title' | 'constant' | 'notes'>('constant');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [diffFilters, setDiffFilters] = useState<string[]>([]);
  const [minConst, setMinConst] = useState<string>('');
  const [maxConst, setMaxConst] = useState<string>('');
  const [chartPage, setChartPage] = useState(1);

  useEffect(() => {
    setChartPage(1);
  }, [searchFilter, diffFilters, minConst, maxConst, sortType, sortOrder]);

  const toggleDiff = (diff: string) => {
    setDiffFilters(prev => 
      prev.includes(diff) ? prev.filter(d => d !== diff) : [...prev, diff]
    );
  };
  
  const [leaderboard, setLeaderboard] = useState<ChartLeaderboardResponse['data']>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [gradeDistribution, setGradeDistribution] = useState<ChartLeaderboardResponse['gradeDistribution']>([]);
  const [normalDistribution, setNormalDistribution] = useState<ChartLeaderboardResponse['normalDistribution']>([]);
  const [isLoadingBoard, setIsLoadingBoard] = useState(false);

  const { setActivePlayer } = useContext(GlobalContext);
  const navigate = useNavigate();

  useEffect(() => {
    api.getSongs()
      .then(data => setSongs(data))
      .catch(err => console.error(err));
  }, []);

  // Reset page when chart changes
  useEffect(() => {
    setPage(1);
  }, [selectedSongId]);

  // Fetch leaderboard when chart selection or page changes
  useEffect(() => {
    if (!selectedSongId) {
      setLeaderboard([]);
      setGradeDistribution([]);
      setNormalDistribution([]);
      return;
    }
    const [songId, difficulty] = selectedSongId.split('-');
    setIsLoadingBoard(true);
    api.getChartLeaderboard(Number(songId), difficulty, page, 10)
      .then(response => {
        setLeaderboard(response.data);
        setTotalPages(response.totalPages || 1);
        setGradeDistribution(response.gradeDistribution);
        setNormalDistribution(response.normalDistribution);
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoadingBoard(false));
  }, [selectedSongId, page]);

  const handleRowClick = (username: string) => {
    setActivePlayer(username);
    navigate('/');
  };

  // Get a flat list of all charts (song + difficulty)
  const allCharts = useMemo(() => {
    const list: { id: number; title: string; difficulty: string; constant: number; level: string; noteCount: number; uniqueId: string }[] = [];
    songs.forEach(song => {
      song.charts.forEach(chart => {
        list.push({
          id: song.id,
          title: song.title,
          difficulty: chart.difficulty,
          constant: chart.constant,
          level: chart.level,
          noteCount: chart.noteCount || 0,
          uniqueId: `${song.id}-${chart.difficulty}`
        });
      });
    });
    // Sort alphabetically, then by difficulty constant
    return list.sort((a, b) => a.title.localeCompare(b.title) || b.constant - a.constant);
  }, [songs]);

  const filteredCharts = useMemo(() => {
    let result = allCharts;

    // Filter by difficulty (multi-select)
    if (diffFilters.length > 0) {
      result = result.filter(c => diffFilters.includes(c.difficulty));
    }

    // Filter by Constant Range
    if (minConst !== '') {
      result = result.filter(c => c.constant >= Number(minConst));
    }
    if (maxConst !== '') {
      result = result.filter(c => c.constant <= Number(maxConst));
    }

    // Filter by text (name or level)
    if (searchFilter) {
      const lower = searchFilter.toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(lower) || c.level.includes(lower));
    }

    // Sort
    result = [...result].sort((a, b) => {
      let comparison = 0;
      if (sortType === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortType === 'notes') {
        comparison = a.noteCount - b.noteCount;
      } else {
        comparison = a.constant - b.constant;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [allCharts, searchFilter, diffFilters, minConst, maxConst, sortType, sortOrder]);

  const paginatedCharts = useMemo(() => {
    const startIndex = (chartPage - 1) * 50;
    return filteredCharts.slice(startIndex, startIndex + 50);
  }, [filteredCharts, chartPage]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Song Leaderboards</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
        Search for a song and select a chart to view the leaderboard across all imported players.
      </p>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Left column: Song List */}
        <div style={{ flex: '1 1 300px', position: 'sticky', top: '2rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Search song title or level (e.g. 14+)..." 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ 
                flex: '1',
                padding: '0.75rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            {['BAS', 'ADV', 'EXP', 'MAS', 'ULT'].map(diff => (
              <button
                key={diff}
                onClick={() => toggleDiff(diff)}
                style={{
                  padding: '0.25rem 0.75rem',
                  borderRadius: 'var(--radius-full)',
                  background: diffFilters.includes(diff) ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
                  color: '#fff',
                  border: diffFilters.includes(diff) ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                {diff}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <input 
              type="number"
              placeholder="Min CC"
              value={minConst}
              onChange={e => setMinConst(e.target.value)}
              style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}
              step="0.1"
            />
            <input 
              type="number"
              placeholder="Max CC"
              value={maxConst}
              onChange={e => setMaxConst(e.target.value)}
              style={{ width: '80px', padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', outline: 'none' }}
              step="0.1"
            />

            <select 
              value={sortType}
              onChange={(e) => setSortType(e.target.value as 'title' | 'constant' | 'notes')}
              style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="constant">Sort: Constant</option>
              <option value="title">Sort: Name</option>
              <option value="notes">Sort: Note Count</option>
            </select>

            <button 
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.3)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', transition: 'background 0.2s' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
            >
              {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
          <div style={{ height: '500px', overflowY: 'auto', paddingRight: '0.5rem', marginBottom: '1rem' }}>
            {paginatedCharts.map(chart => (
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

          {filteredCharts.length > 50 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button 
                onClick={() => setChartPage(p => Math.max(1, p - 1))}
                disabled={chartPage === 1}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: chartPage === 1 ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: chartPage === 1 ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: chartPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                Prev
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Page 
                <input 
                  type="number" 
                  value={chartPage || ''} 
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val)) {
                      setChartPage(Math.min(Math.max(1, val), Math.ceil(filteredCharts.length / 50)));
                    } else if (e.target.value === '') {
                      setChartPage(0 as any);
                    }
                  }}
                  onBlur={() => {
                    if (!chartPage || chartPage < 1) setChartPage(1);
                  }}
                  style={{ width: '50px', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px' }} 
                  min={1} 
                  max={Math.ceil(filteredCharts.length / 50)} 
                />
                of {Math.ceil(filteredCharts.length / 50)}
              </div>
              <button 
                onClick={() => setChartPage(p => Math.min(Math.ceil(filteredCharts.length / 50), p + 1))}
                disabled={chartPage === Math.ceil(filteredCharts.length / 50)}
                style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: chartPage === Math.ceil(filteredCharts.length / 50) ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: chartPage === Math.ceil(filteredCharts.length / 50) ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: chartPage === Math.ceil(filteredCharts.length / 50) ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          )}
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
                      <tr 
                        key={row.username} 
                        onClick={() => handleRowClick(row.username)}
                        style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', transition: 'background 0.2s', cursor: 'pointer' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} 
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <td style={{ padding: '1rem', fontWeight: 'bold', color: (page === 1 && idx === 0) ? 'var(--rank-ajc)' : 'var(--text-secondary)' }}>#{((page - 1) * 10) + idx + 1}</td>
                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{row.username}</td>
                        <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>{row.score.toLocaleString()}</td>
                        <td style={{ padding: '1rem', color: `var(--rank-${row.lamp.toLowerCase()})`, fontWeight: 'bold' }}>{row.lamp}</td>
                        <td style={{ padding: '1rem', color: 'var(--accent-secondary)' }}>{(row.op / 10000).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {leaderboard.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
              )}

              {gradeDistribution.length > 0 && (
                <div style={{ marginTop: '3rem' }}>
                  <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Score Distribution</h3>
                  <div style={{ width: '100%', height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                        <YAxis stroke="var(--text-secondary)" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        />
                        <Bar dataKey="count" fill="var(--accent-primary)" name="Players" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {normalDistribution.length > 0 && (
                <div style={{ marginTop: '3rem' }}>
                  <h3 className="text-gradient" style={{ marginBottom: '1.5rem' }}>Normal Distribution</h3>
                  <div style={{ width: '100%', height: '250px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={normalDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="bucket" stroke="var(--text-secondary)" tick={{ fontSize: 12 }} />
                        <YAxis stroke="var(--text-secondary)" allowDecimals={false} tick={{ fontSize: 12 }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                          itemStyle={{ color: 'var(--text-primary)' }}
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                        />
                        <Line type="monotone" dataKey="count" stroke="#ff66ff" strokeWidth={3} dot={{ r: 4, fill: '#ff66ff', strokeWidth: 0 }} name="Players" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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
