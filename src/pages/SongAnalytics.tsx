import React, { useEffect, useState, useMemo, useContext, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api/client.js';
import type { ApiSong, ChartLeaderboardResponse } from '../lib/types/index.js';
import { GlobalContext } from '../lib/context/GlobalContext.js';
import { ALL_VERSIONS } from '../lib/constants.js';

const SongAnalytics: React.FC = () => {
  const [searchParams] = useSearchParams();
  const urlSongId = searchParams.get('songId');
  const urlDiff = searchParams.get('diff');
  const urlPlayer = searchParams.get('player');

  const [songs, setSongs] = useState<ApiSong[]>([]);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [sortType, setSortType] = useState<'title' | 'constant' | 'notes'>('constant');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [diffFilters, setDiffFilters] = useState<string[]>([]);
  const [minConst, setMinConst] = useState<string>('');
  const [maxConst, setMaxConst] = useState<string>('');
  const [serverFilter, setServerFilter] = useState<string>('JP');
  const [versionFilter, setVersionFilter] = useState<string>('ALL');
  const [chartPage, setChartPage] = useState(1);

  const checkMobile = () => 
    typeof window !== 'undefined' && 
    (window.innerWidth <= 768 || (window.innerHeight <= 500 && window.innerWidth <= 1024));

  const [isMobile, setIsMobile] = useState(checkMobile);

  useEffect(() => {
    const handleResize = () => setIsMobile(checkMobile());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const initialPlayerRef = useRef<string | null>(urlPlayer);

  useEffect(() => {
    setChartPage(1);
  }, [searchFilter, diffFilters, minConst, maxConst, versionFilter, sortType, sortOrder]);

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

  // Sync searchParams to selectedSongId
  useEffect(() => {
    if (urlSongId && urlDiff) {
      const target = `${urlSongId}-${urlDiff}`;
      setSelectedSongId(target);
      if (urlPlayer) {
        initialPlayerRef.current = urlPlayer;
      }
    }
  }, [urlSongId, urlDiff, urlPlayer]);

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
    const targetPlayer = initialPlayerRef.current;
    api.getChartLeaderboard(Number(songId), difficulty, page, 10, targetPlayer || undefined)
      .then(response => {
        setLeaderboard(response.data);
        setTotalPages(response.totalPages || 1);
        setGradeDistribution(response.gradeDistribution);
        setNormalDistribution(response.normalDistribution);
        if (targetPlayer && response.userPage && page === 1) {
          setPage(response.userPage);
          initialPlayerRef.current = null;
        }
      })
      .catch(err => console.error(err))
      .finally(() => setIsLoadingBoard(false));
  }, [selectedSongId, page]);

  const handleRowClick = (username: string) => {
    setActivePlayer(username);
    navigate('/dashboard');
  };

  // Get a flat list of all charts (song + difficulty)
  const allCharts = useMemo(() => {
    const list: { id: number; title: string; difficulty: string; constant: number; level: string; noteCount: number; version: string; is_jp_active: number; is_intl_active: number; is_pl_offline_active: number; uniqueId: string }[] = [];
    songs.forEach(song => {
      if (serverFilter === 'JP' && song.is_jp_active !== 1) return;
      if (serverFilter === 'INT' && song.is_intl_active !== 1) return;
      if (serverFilter === 'PL_OFFLINE' && song.is_pl_offline_active !== 1) return;
      
      song.charts.forEach(chart => {
        if (serverFilter === 'PL_OFFLINE' && chart.difficulty === 'ULT') return;
        list.push({
          id: song.id,
          title: song.title,
          difficulty: chart.difficulty,
          constant: chart.constant,
          level: chart.level,
          noteCount: chart.noteCount || 0,
          version: chart.version || song.version,
          is_jp_active: song.is_jp_active,
          is_intl_active: song.is_intl_active,
          is_pl_offline_active: song.is_pl_offline_active,
          uniqueId: `${song.id}-${chart.difficulty}`
        });
      });
    });
    // Sort alphabetically, then by difficulty constant
    return list.sort((a, b) => a.title.localeCompare(b.title) || b.constant - a.constant);
  }, [songs, serverFilter]);

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

    // Filter by Version (Strict, not cumulative)
    if (versionFilter !== 'ALL') {
      result = result.filter(c => c.version === versionFilter);
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
  }, [allCharts, searchFilter, diffFilters, minConst, maxConst, versionFilter, sortType, sortOrder]);

  const paginatedCharts = useMemo(() => {
    const startIndex = (chartPage - 1) * 50;
    return filteredCharts.slice(startIndex, startIndex + 50);
  }, [filteredCharts, chartPage]);

  const activeChart = useMemo(() => {
    if (!selectedSongId) return null;
    return allCharts.find(c => c.uniqueId === selectedSongId) || null;
  }, [selectedSongId, allCharts]);

  return (
    <div className="glass-panel">
      <h1 className="text-gradient" style={{ marginBottom: '1rem' }}>Song Leaderboards</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        Search for a song and select a chart to view the leaderboard across all imported players.
      </p>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'center' }}>
        {/* Left column: Song List */}
        <div className="sticky-column" style={{ flex: isMobile ? '1 1 100%' : '1 1 320px', maxWidth: isMobile ? '100%' : '380px', minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
            <input 
              type="text" 
              placeholder="Search song title or level (e.g. 14+)..." 
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ 
                width: '100%',
                padding: '0.65rem 0.85rem', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '0.9rem'
              }}
            />

            {/* Difficulty Pills */}
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['BAS', 'ADV', 'EXP', 'MAS', 'ULT'].map(diff => {
                const isActive = diffFilters.includes(diff);
                const diffColor = diff === 'BAS' ? 'var(--diff-bas)' : diff === 'ADV' ? 'var(--diff-adv)' : diff === 'EXP' ? 'var(--diff-exp)' : diff === 'MAS' ? 'var(--diff-mas)' : 'var(--diff-ult)';
                return (
                  <button
                    key={diff}
                    onClick={() => toggleDiff(diff)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      borderRadius: 'var(--radius-full)',
                      background: isActive ? diffColor : 'rgba(0,0,0,0.3)',
                      color: '#fff',
                      border: isActive ? `1px solid ${diffColor}` : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: isActive ? `0 0 10px ${diffColor}55` : 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-heading)',
                      letterSpacing: '0.05em',
                      transition: 'all 0.2s'
                    }}
                  >
                    {diff}
                  </button>
                );
              })}
            </div>

            {/* Server & Version Grid */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select 
                value={serverFilter}
                onChange={e => setServerFilter(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', fontSize: '0.85rem' }}
              >
                <option value="JP">Japan (JP)</option>
                <option value="INT">International (Intl)</option>
                <option value="PL_OFFLINE">Paradise Lost (Offline)</option>
                <option value="OMNI">Omnimix (All)</option>
              </select>

              <select 
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
                style={{ flex: 1, minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <option value="ALL">All Versions</option>
                {(serverFilter === 'PL_OFFLINE' ? ALL_VERSIONS.slice(ALL_VERSIONS.indexOf('PARADISE LOST')) : ALL_VERSIONS).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            {/* Min/Max CC & Sort Controls */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input 
                type="number"
                placeholder="Min CC"
                value={minConst}
                onChange={e => setMinConst(e.target.value)}
                style={{ flex: '1 1 70px', minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none', fontSize: '0.85rem' }}
                step="0.1"
                data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              />
              <input 
                type="number"
                placeholder="Max CC"
                value={maxConst}
                onChange={e => setMaxConst(e.target.value)}
                style={{ flex: '1 1 70px', minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)', outline: 'none', fontSize: '0.85rem' }}
                step="0.1"
                data-1p-ignore="true" data-bwignore="true" autoComplete="off" autoCorrect="off" spellCheck="false"
              />

              <select 
                value={sortType}
                onChange={(e) => setSortType(e.target.value as 'title' | 'constant' | 'notes')}
                style={{ flex: '1 1 110px', minWidth: 0, padding: '0.5rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                <option value="constant">Sort: Constant</option>
                <option value="title">Sort: Name</option>
                <option value="notes">Sort: Notes</option>
              </select>

              <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'background 0.2s', fontSize: '0.85rem' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>

          <div style={{ height: '480px', overflowY: 'auto', paddingRight: '0.25rem', marginBottom: '1rem' }}>
            {paginatedCharts.map(chart => (
              <div 
                key={chart.uniqueId}
                onClick={() => setSelectedSongId(chart.uniqueId)}
                style={{
                  padding: '0.85rem 1rem',
                  background: selectedSongId === chart.uniqueId ? 'rgba(99, 102, 241, 0.2)' : 'rgba(0,0,0,0.2)',
                  border: selectedSongId === chart.uniqueId ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.05)',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '0.5rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chart.title}
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span className={`badge badge-${chart.difficulty.toLowerCase()}`}>{chart.difficulty} {chart.level}</span>
                      <span>CC: {chart.constant.toFixed(1)}</span>
                    </div>
                  </div>
                  {chart.noteCount > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      {chart.noteCount} notes
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredCharts.length > 50 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0' }}>
              <button 
                onClick={() => setChartPage(p => Math.max(1, p - 1))}
                disabled={chartPage === 1}
                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', background: chartPage === 1 ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: chartPage === 1 ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: chartPage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                Prev
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e') {
                      e.preventDefault();
                    }
                  }}
                  style={{ width: '45px', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }} 
                  min={1} 
                  max={Math.ceil(filteredCharts.length / 50)} 
                />
                of {Math.ceil(filteredCharts.length / 50)}
              </div>
              <button 
                onClick={() => setChartPage(p => Math.min(Math.ceil(filteredCharts.length / 50), p + 1))}
                disabled={chartPage === Math.ceil(filteredCharts.length / 50)}
                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--radius-md)', background: chartPage === Math.ceil(filteredCharts.length / 50) ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: chartPage === Math.ceil(filteredCharts.length / 50) ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: chartPage === Math.ceil(filteredCharts.length / 50) ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Right column: Leaderboard */}
        <div style={{ flex: '1 1 450px', minWidth: 0 }}>
          {selectedSongId ? (
            <div className="glass-panel" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div>
                  <h2 className="text-gradient" style={{ margin: 0, fontSize: '1.4rem' }}>
                    {activeChart ? activeChart.title : 'Chart Leaderboard'}
                  </h2>
                  {activeChart && (
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      Constant: <strong style={{ color: 'var(--text-primary)' }}>{activeChart.constant.toFixed(1)}</strong> ({activeChart.version})
                    </div>
                  )}
                </div>
                {activeChart && (
                  <span className={`badge badge-${activeChart.difficulty.toLowerCase()}`}>
                    {activeChart.difficulty} {activeChart.level}
                  </span>
                )}
              </div>
              {isLoadingBoard ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading leaderboard...</p>
              ) : leaderboard.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No imported players have played this chart yet!</p>
              ) : (
                <div className="scrollable-content-wrapper">
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '420px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Rank</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Player</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Score</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>Lamp</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>OP</th>
                        <th style={{ padding: '0.75rem 0.5rem' }}>OP%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((row, idx) => {
                        const isHighlighted = !!(urlPlayer && row.username.toLowerCase() === urlPlayer.toLowerCase());
                        return (
                          <tr 
                            key={row.username} 
                            onClick={() => handleRowClick(row.username)}
                            style={{ 
                              borderBottom: '1px solid rgba(255,255,255,0.05)', 
                              transition: 'background 0.2s', 
                              cursor: 'pointer',
                              background: isHighlighted ? 'rgba(255, 102, 255, 0.15)' : 'transparent',
                              boxShadow: isHighlighted ? 'inset 4px 0 0 var(--accent-primary)' : 'none'
                            }}
                            onMouseEnter={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }} 
                            onMouseLeave={(e) => { if (!isHighlighted) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold', color: (page === 1 && idx === 0) ? 'var(--rank-ajc)' : 'var(--text-secondary)' }}>#{((page - 1) * 10) + idx + 1}</td>
                            <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>{row.username}</td>
                            <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'monospace', fontSize: '1.05rem' }}>{row.score.toLocaleString()}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: `var(--rank-${row.lamp.toLowerCase()})`, fontWeight: 'bold' }}>{row.lamp}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--accent-secondary)' }}>{(row.op / 10000).toFixed(2)}</td>
                            <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>{row.opPercent}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {leaderboard.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', padding: '0.75rem 0', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <button 
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: page === 1 ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: page === 1 ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: page === 1 ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                  >
                    Previous
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
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
                      style={{ width: '45px', padding: '0.2rem', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', fontSize: '0.85rem' }} 
                      min={1} 
                      max={totalPages} 
                    />
                    of {totalPages}
                  </div>
                  <button 
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', background: page === totalPages ? 'rgba(255,255,255,0.05)' : 'var(--accent-primary)', color: page === totalPages ? 'var(--text-secondary)' : '#fff', border: 'none', cursor: page === totalPages ? 'not-allowed' : 'pointer', fontSize: '0.85rem' }}
                  >
                    Next
                  </button>
                </div>
              )}

              {gradeDistribution.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Grade Rank Breakdown for Selected Chart</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Number of logged players achieving each clear grade rank on this chart.
                  </p>
                  <div className="scrollable-content-wrapper">
                    <div className="chart-min-width-sm" style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={gradeDistribution} margin={{ top: 10, right: 15, left: -15, bottom: 20 }}>
                          <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{ fontSize: isMobile ? 11 : 13, dy: 4, fill: 'var(--text-secondary)' }} />
                          <YAxis stroke="var(--text-secondary)" allowDecimals={false} tick={{ fontSize: isMobile ? 11 : 13, fill: 'var(--text-secondary)' }} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 'var(--radius-md)' }}
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          />
                          <Bar dataKey="count" fill="var(--accent-primary)" name="Players" radius={[4, 4, 0, 0]} activeBar={false} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {normalDistribution.length > 0 && (
                <div style={{ marginTop: '2.5rem' }}>
                  <h3 className="text-gradient" style={{ marginBottom: '0.25rem' }}>Score Distribution Bell Curve</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                    Frequency of player scores grouped into score buckets.
                  </p>
                  <div className="scrollable-content-wrapper">
                    <div className="chart-min-width-sm" style={{ height: '240px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={normalDistribution} margin={{ top: 10, right: 20, left: -15, bottom: 20 }}>
                          <XAxis 
                            dataKey="bucket" 
                            stroke="var(--text-secondary)" 
                            tick={{ fontSize: isMobile ? 10 : 12, dy: 4, fill: 'var(--text-secondary)' }} 
                            interval="preserveStartEnd"
                            tickFormatter={(val) => String(val).replace(/,000$/, 'k')}
                          />
                          <YAxis stroke="var(--text-secondary)" allowDecimals={false} tick={{ fontSize: isMobile ? 11 : 13, fill: 'var(--text-secondary)' }} />
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
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', height: '100%', minHeight: '300px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              Select a chart from the left to view its leaderboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongAnalytics;
