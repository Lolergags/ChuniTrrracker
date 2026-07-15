import { useState } from 'react';
import { api } from '../lib/api/client.js';

export function ImportDataForm() {
  const [input, setInput] = useState('');
  const [isApiKey, setIsApiKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleAction = async () => {
    if (!input.trim()) {
      setError(isApiKey ? 'API Key is required' : 'Username is required');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      await api.importPlayer(input.trim(), isApiKey ? input.trim() : undefined);
      
      // Force a full page reload so GlobalContext re-fetches the player list
      window.location.href = '/leaderboard';
      return;
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', textAlign: 'center' }}>
      <h2 className="text-gradient" style={{ marginBottom: '1rem' }}>
        {isApiKey ? "Login / Sync Private Data" : "Import Public Profile"}
      </h2>
      
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
        {isApiKey 
          ? "Enter your Kamaitachi API Key to securely sync your scores, even if your profile is private." 
          : "Enter a public Kamaitachi username to add their scores to the global leaderboard."}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <input 
          type={isApiKey ? "password" : "text"}
          placeholder={isApiKey ? "Kamaitachi API Key" : "Kamaitachi Username"} 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(0,0,0,0.3)',
            color: 'var(--text-primary)',
            outline: 'none',
            width: '100%'
          }}
        />
        
        {error && <div style={{ color: 'var(--rank-failed)', fontSize: '0.9rem', textAlign: 'left' }}>{error}</div>}
        
        <button 
          onClick={handleAction} 
          disabled={loading}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'var(--accent-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--radius-md)',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Syncing..." : (isApiKey ? "Sync & Login" : "Import")}
        </button>
        
        <button 
          onClick={() => {
            setIsApiKey(!isApiKey);
            setInput('');
            setError('');
          }} 
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            textDecoration: 'underline',
            cursor: 'pointer',
            fontSize: '0.85rem',
            marginTop: '0.5rem'
          }}
        >
          {isApiKey ? "Switch to Public Import (Username)" : "Use API Key instead (Private Profile)"}
        </button>
      </div>
    </div>
  );
}
