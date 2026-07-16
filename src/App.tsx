import React, { useContext, useState, useDeferredValue, useMemo } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Activity, BarChart2, Trophy, Search, DownloadCloud, User, Settings } from 'lucide-react';
import { Landing } from './pages/Landing.js';
import Dashboard from './pages/Dashboard.js';
import Leaderboard from './pages/Leaderboard.js';
import SongAnalytics from './pages/SongAnalytics.js';
import PerformanceAnalysis from './pages/PerformanceAnalysis.js';
import { ImportDataForm } from './components/ImportDataForm.js';
import { Admin } from './pages/Admin.js';
import { GlobalProvider, GlobalContext } from './lib/context/GlobalContext.js';

const AppContent = () => {
  const { playersList, setActivePlayer, isAdmin } = useContext(GlobalContext);
  const [searchInput, setSearchInput] = useState('');
  const deferredSearchInput = useDeferredValue(searchInput);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const searchResults = useMemo(() => {
    if (!deferredSearchInput.trim()) return [];
    const lowerQuery = deferredSearchInput.toLowerCase();
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
    
    return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 51);
  }, [playersList, deferredSearchInput]);

  const handleSelectPlayer = (username: string) => {
    setActivePlayer(username);
    setSearchInput('');
    setShowDropdown(false);
    navigate('/dashboard');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim();
    if (query) {
      if (playersList.some(p => p.toLowerCase() === query.toLowerCase())) {
        const matchedPlayer = playersList.find(p => p.toLowerCase() === query.toLowerCase())!;
        handleSelectPlayer(matchedPlayer);
      } else {
        alert("Player not found in database.");
      }
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo">
          <NavLink to="/" style={{ textDecoration: 'none' }}>
            <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity /> ChuniTrrracker
            </h2>
          </NavLink>
        </div>
        
        <div className="nav-links">
          <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><User size={18} /> Dashboard</span>
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trophy size={18} /> Leaderboard</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BarChart2 size={18} /> Song Leaderboards</span>
          </NavLink>
          <NavLink to="/performance" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={18} /> Performance</span>
          </NavLink>
          <NavLink to="/import" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><DownloadCloud size={18} /> Import Data</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Settings size={18} /> Admin</span>
            </NavLink>
          )}
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
          <div>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="search" 
              value={searchInput} 
              onChange={(e) => {
                setSearchInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              placeholder="Search Players..."
              style={{ 
                padding: '0.5rem 1rem 0.5rem 2rem', 
                borderRadius: 'var(--radius-full)', 
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                outline: 'none',
                width: '250px'
              }}
            />
            {showDropdown && deferredSearchInput.trim().length > 0 && (
              <ul style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '0.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-md)',
                listStyle: 'none',
                padding: '0.5rem 0',
                zIndex: 50,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
              }}>
                {searchResults.slice(0, 50).map(player => (
                  <li 
                    key={player}
                      onClick={() => handleSelectPlayer(player)}
                      style={{
                        padding: '0.5rem 1rem',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {player}
                  </li>
                ))}
                {searchResults.length === 0 && (
                  <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>No matches</li>
                )}
                {searchResults.length > 50 && (
                  <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Keep typing to refine...</li>
                )}
              </ul>
            )}
          </div>
        </form>
      </nav>
      
      <main className="container animate-fade-in">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics" element={<SongAnalytics />} />
          <Route path="/performance" element={<PerformanceAnalysis />} />
          <Route path="/import" element={<ImportDataForm />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </>
  );
};

function App() {
  return (
    <GlobalProvider>
      <AppContent />
    </GlobalProvider>
  );
}

export default App;
