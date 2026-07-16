import React, { useState, useDeferredValue, useMemo, useContext } from 'react';
import { GlobalContext } from '../lib/context/GlobalContext.js';

interface PlayerAutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function PlayerAutocomplete({ value, onChange, placeholder, className, style }: PlayerAutocompleteProps) {
  const { playersList } = useContext(GlobalContext);
  const [showDropdown, setShowDropdown] = useState(false);
  const deferredValue = useDeferredValue(value);

  const searchResults = useMemo(() => {
    if (!deferredValue.trim()) return [];
    const lowerQuery = deferredValue.toLowerCase();
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
  }, [playersList, deferredValue]);

  return (
    <div style={{ position: 'relative', flex: 1 }}>
      <input 
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
        placeholder={placeholder}
        className={className}
        style={{ ...style, width: '100%' }}
        data-1p-ignore="true"
        data-bwignore="true"
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {showDropdown && deferredValue.trim().length > 0 && (
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
                onClick={() => {
                  onChange(player);
                  setShowDropdown(false);
                }}
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
  );
}
