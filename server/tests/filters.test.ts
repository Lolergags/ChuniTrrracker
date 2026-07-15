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

  it('should not apply active filters for OMNI server', () => {
    const { conditions, bindings } = getChartFilterConditions({ server: 'OMNI' });
    expect(conditions).not.toContain("songs.is_jp_active = 1");
    expect(conditions).not.toContain("songs.is_intl_active = 1");
    expect(bindings).toEqual([]);
  });

  it('should filter by MAS_ULT difficulty', () => {
    const { conditions, bindings } = getChartFilterConditions({ diff: 'MAS_ULT' });
    expect(conditions).toContain("charts.difficulty IN ('MAS', 'ULT')");
    expect(bindings).toEqual([]);
  });

  it('should not filter difficulty if diff is ALL', () => {
    const { conditions, bindings } = getChartFilterConditions({ diff: 'ALL' });
    expect(conditions).not.toContain("charts.difficulty IN ('MAS', 'ULT')");
  });

  it('should apply cumulative version filtering', () => {
    // CHUNITHM PLUS is the second version
    const { conditions, bindings } = getChartFilterConditions({ version: 'CHUNITHM PLUS' });
    
    // Should include CHUNITHM and CHUNITHM PLUS
    expect(conditions).toContain("songs.version IN (?, ?)");
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
});
