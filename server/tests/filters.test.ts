import { describe, it, expect } from 'vitest';
import { getChartFilterConditions, CHRONOLOGICAL_VERSIONS } from '../utils/filters.js';

describe('getChartFilterConditions', () => {
  it('should default to JP active and exclude WE charts', () => {
    const { conditions, bindings } = getChartFilterConditions({});
    expect(conditions).toContain("charts.difficulty != 'WE'");
    expect(conditions).toContain("songs.is_jp_active = 1");
    expect(bindings).toEqual([]);
  });

  it('should filter by INT server', () => {
    const { conditions, bindings } = getChartFilterConditions({ server: 'INT' });
    expect(conditions).toContain("songs.is_intl_active = 1");
    expect(conditions).not.toContain("songs.is_jp_active = 1");
    expect(bindings).toEqual([]);
  });

  it('should filter by PL_OFFLINE server, exclude ULT charts, and cap version at PARADISE LOST', () => {
    const { conditions, bindings } = getChartFilterConditions({ server: 'PL_OFFLINE', version: 'LUMINOUS' });
    expect(conditions).toContain("songs.is_pl_offline_active = 1");
    expect(conditions).toContain("charts.difficulty != 'ULT'");
    expect(conditions).not.toContain("songs.is_jp_active = 1");
    expect(bindings).not.toContain('LUMINOUS');
    expect(bindings).toContain('PARADISE LOST');
  });

  it('should exclude AOMN_REMOVE song IDs for OMNI server', () => {
    const { conditions, bindings } = getChartFilterConditions({ server: 'OMNI' });
    expect(conditions.some(c => c.includes('songs.id NOT IN'))).toBe(true);
    expect(conditions).not.toContain("songs.is_jp_active = 1");
    expect(conditions).not.toContain("songs.is_intl_active = 1");
    expect(bindings).toEqual([]);
  });

  it('should filter by MAS_ULT difficulty', () => {
    const { conditions, bindings } = getChartFilterConditions({ diff: 'MAS_ULT' });
    expect(conditions).toContain("charts.difficulty IN (?, ?)");
    expect(bindings).toEqual(['MAS', 'ULT']);
  });

  it('should not filter difficulty if diff is ALL', () => {
    const { conditions, bindings } = getChartFilterConditions({ diff: 'ALL' });
    expect(conditions).not.toContain("charts.difficulty IN ('MAS', 'ULT')");
  });

  it('should apply cumulative version filtering', () => {
    // CHUNITHM PLUS is the second version
    const { conditions, bindings } = getChartFilterConditions({ version: 'CHUNITHM PLUS' });
    
    // Should include CHUNITHM and CHUNITHM PLUS
    expect(conditions).toContain("charts.version IN (?, ?)");
    expect(bindings).toEqual(['CHUNITHM', 'CHUNITHM PLUS']);
  });

  it('should not filter versions if ALL is passed', () => {
    const { conditions, bindings } = getChartFilterConditions({ version: 'ALL' });
    expect(conditions.some(c => c.includes('version IN'))).toBe(false);
    expect(bindings).toEqual([]);
  });

  it('should handle custom aliases', () => {
    const { conditions } = getChartFilterConditions({ server: 'JP' }, 's_alias', 'c_alias');
    expect(conditions).toContain("c_alias.difficulty != 'WE'");
    expect(conditions).toContain("s_alias.is_jp_active = 1");
  });

  it('should filter cumulative version using chart-level version alias', () => {
    const { conditions, bindings } = getChartFilterConditions({ version: 'AIR' }, 'songs', 'c');
    expect(conditions).toContain("c.version IN (?, ?, ?)");
    expect(bindings).toEqual(['CHUNITHM', 'CHUNITHM PLUS', 'AIR']);
  });

  it('should return 1 = 0 condition when selecting only ULT on PL_OFFLINE', () => {
    const { conditions } = getChartFilterConditions({ server: 'PL_OFFLINE', diff: ['ULT'] });
    expect(conditions).toContain("1 = 0");
  });
});
