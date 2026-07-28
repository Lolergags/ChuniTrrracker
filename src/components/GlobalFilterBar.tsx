import { useRef } from 'react';
import { useGlobal } from '../lib/context/useGlobal.js';
import { DualSlider } from './DualSlider.js';
import { ALL_VERSIONS } from '../lib/constants.js';

export function GlobalFilterBar({ showRating = false }: { showRating?: boolean }) {
  const { filters, setFilters } = useGlobal();
  const previousVersionRef = useRef<string | null>(null);

  const PL_OFFLINE_INDEX = ALL_VERSIONS.indexOf('PARADISE LOST');
  const availableVersions = filters.server === 'PL_OFFLINE'
    ? ALL_VERSIONS.slice(PL_OFFLINE_INDEX)
    : ALL_VERSIONS;

  const handleServerChange = (newServer: string) => {
    if (newServer === 'PL_OFFLINE') {
      const plIndex = ALL_VERSIONS.indexOf('PARADISE LOST');
      const plVersions = ALL_VERSIONS.slice(plIndex);
      const isCurrentVersionValid = (plVersions as readonly string[]).includes(filters.version);
      if (!isCurrentVersionValid) {
        previousVersionRef.current = filters.version;
      }
      setFilters({
        ...filters,
        server: newServer,
        version: isCurrentVersionValid ? filters.version : 'PARADISE LOST'
      });
    } else {
      const restoredVersion = previousVersionRef.current;
      previousVersionRef.current = null;
      setFilters({
        ...filters,
        server: newServer,
        version: (restoredVersion && filters.server === 'PL_OFFLINE') ? restoredVersion : filters.version
      });
    }
  };

  const toggleDiff = (diff: string) => {
    const current = Array.isArray(filters.diff) ? filters.diff : ['BAS', 'ADV', 'EXP', 'MAS', 'ULT'];
    if (current.includes(diff)) {
      if (current.length === 1) return; // Prevent unselecting all
      setFilters({ ...filters, diff: current.filter(d => d !== diff) });
    } else {
      setFilters({ ...filters, diff: [...current, diff] });
    }
  };

  const currentDiffs = Array.isArray(filters.diff) ? filters.diff : ['BAS', 'ADV', 'EXP', 'MAS', 'ULT'];

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <select 
        value={filters.server}
        onChange={(e) => handleServerChange(e.target.value)}
        style={selectStyle}
      >
        <option value="JP">Standard (JP Active)</option>
        <option value="INT">International</option>
        <option value="PL_OFFLINE">Paradise Lost (Offline)</option>
        <option value="OMNI">Omnimix (All Charts)</option>
      </select>

      <select 
        value={filters.version}
        onChange={(e) => setFilters({ ...filters, version: e.target.value })}
        style={selectStyle}
      >
        {availableVersions.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['BAS', 'ADV', 'EXP', 'MAS', 'ULT'].map(diff => (
          <button
            key={diff}
            onClick={() => toggleDiff(diff)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: 'var(--radius-full)',
              background: currentDiffs.includes(diff) ? 'var(--accent-primary)' : 'rgba(0,0,0,0.3)',
              color: '#fff',
              border: currentDiffs.includes(diff) ? '1px solid var(--accent-primary)' : '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
              fontFamily: 'inherit'
            }}
          >
            {diff}
          </button>
        ))}
      </div>
      
      {showRating && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: '0.5rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Rating:</span>
          <DualSlider 
            min={0} 
            max={22.0} 
            step={0.01} 
            value={[Number(filters.ratingMin || 0), Number(filters.ratingMax || 22.0)]} 
            onChange={([min, max]) => setFilters({ ...filters, ratingMin: min.toString(), ratingMax: max.toString() })} 
            formatLabel={(v) => v.toFixed(2)}
          />
        </div>
      )}
    </div>
  );
}

const selectStyle = {
  padding: '0.5rem',
  borderRadius: 'var(--radius-md)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: '1px solid rgba(255,255,255,0.1)',
  fontFamily: 'inherit'
};
