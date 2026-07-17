import { useGlobal } from '../lib/context/useGlobal.js';

export function GlobalFilterBar() {
  const { filters, setFilters } = useGlobal();

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
        onChange={(e) => setFilters({ ...filters, server: e.target.value })}
        style={selectStyle}
      >
        <option value="JP">Standard (JP Active)</option>
        <option value="INT">International</option>
        <option value="OMNI">Omnimix (All Charts)</option>
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

      <select 
        value={filters.version}
        onChange={(e) => setFilters({ ...filters, version: e.target.value })}
        style={selectStyle}
      >
        <option value="X-VERSE-X">X-VERSE-X</option>
        <option value="X-VERSE">X-VERSE</option>
        <option value="VERSE">VERSE</option>
        <option value="LUMINOUS PLUS">LUMINOUS PLUS</option>
        <option value="LUMINOUS">LUMINOUS</option>
        <option value="SUN PLUS">SUN PLUS</option>
        <option value="SUN">SUN</option>
        <option value="NEW PLUS">NEW PLUS</option>
        <option value="NEW">NEW</option>
        <option value="PARADISE LOST">PARADISE LOST</option>
        <option value="PARADISE">PARADISE</option>
        <option value="CRYSTAL PLUS">CRYSTAL PLUS</option>
        <option value="CRYSTAL">CRYSTAL</option>
        <option value="AMAZON PLUS">AMAZON PLUS</option>
        <option value="AMAZON">AMAZON</option>
        <option value="STAR PLUS">STAR PLUS</option>
        <option value="STAR">STAR</option>
        <option value="AIR PLUS">AIR PLUS</option>
        <option value="AIR">AIR</option>
        <option value="CHUNITHM PLUS">CHUNITHM PLUS</option>
        <option value="CHUNITHM">CHUNITHM</option>
      </select>
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
