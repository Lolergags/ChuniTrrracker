import React, { createContext, useContext, useState } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Activity, BarChart2, Home, Trophy, Search } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import SongAnalytics from './pages/SongAnalytics';
import PerformanceAnalysis from './pages/PerformanceAnalysis';

interface UserContextType {
  username: string;
  setUsername: (name: string) => void;
}

export const UserContext = createContext<UserContextType>({
  username: 'Lolergags',
  setUsername: () => {},
});

function App() {
  const [username, setUsername] = useState('Lolergags');
  const [searchInput, setSearchInput] = useState('Lolergags');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setUsername(searchInput);
  };

  return (
    <UserContext.Provider value={{ username, setUsername }}>
      <nav className="navbar">
        <div className="nav-logo">
          <h2 className="text-gradient" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity /> ChuniTrrracker
          </h2>
        </div>
        
        <div className="nav-links">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')} end>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Home size={18} /> Dashboard</span>
          </NavLink>
          <NavLink to="/leaderboard" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Trophy size={18} /> Leaderboard</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><BarChart2 size={18} /> Song Analytics</span>
          </NavLink>
          <NavLink to="/performance" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Activity size={18} /> Performance</span>
          </NavLink>
        </div>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              value={searchInput} 
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search Kamaitachi User"
              style={{ 
                padding: '0.5rem 1rem 0.5rem 2rem', 
                borderRadius: 'var(--radius-full)', 
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(0,0,0,0.3)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </form>
      </nav>
      
      <main className="container animate-fade-in">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/analytics" element={<SongAnalytics />} />
          <Route path="/performance" element={<PerformanceAnalysis />} />
        </Routes>
      </main>
    </UserContext.Provider>
  );
}

export default App;
