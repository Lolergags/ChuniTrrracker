import React, { useContext, useState } from 'react';
import { Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import { Activity, BarChart2, Trophy, Search, DownloadCloud } from 'lucide-react';
import Dashboard from './pages/Dashboard.js';
import Leaderboard from './pages/Leaderboard.js';
import SongAnalytics from './pages/SongAnalytics.js';
import PerformanceAnalysis from './pages/PerformanceAnalysis.js';
import { ImportDataForm } from './components/ImportDataForm.js';
import { GlobalProvider, GlobalContext } from './lib/context/GlobalContext.js';

const AppContent = () => {
  const { playersList, setActivePlayer } = useContext(GlobalContext);
  const [searchInput, setSearchInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleSelectPlayer = (username: string) => {
    setActivePlayer(username);
    setSearchInput('');
    setShowDropdown(false);
    navigate('/');
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
          <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity /> ChuniTrrracker
          </h2>
        </div>
        
        <div className="nav-links">
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
            {showDropdown && searchInput && (
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
                {playersList
                  .filter(p => p.toLowerCase().includes(searchInput.toLowerCase()))
                  .map(player => (
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
                {playersList.filter(p => p.toLowerCase().includes(searchInput.toLowerCase())).length === 0 && (
                  <li style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)' }}>No matches</li>
                )}
              </ul>
            )}
          </div>
        </form>
      </nav>
      
      <main className="container animate-fade-in">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics" element={<SongAnalytics />} />
          <Route path="/performance" element={<PerformanceAnalysis />} />
          <Route path="/import" element={<ImportDataForm />} />
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
