import { describe, it, expect } from 'vitest';
import { searchPlayers } from './search.js';

describe('searchPlayers', () => {
  const mockPlayers = [
    'alondar',
    'bob',
    'darkelitus',
    'darius',
    'xxdarxx',
    'Dar',
    'Zdar'
  ];

  it('prioritizes exact matches, then prefix, then substring', () => {
    const results = searchPlayers(mockPlayers, 'dar');
    
    // 1. Exact match: 'Dar'
    // 2. Prefix matches: 'darkelitus', 'darius'
    // 3. Substring matches: 'alondar', 'xxdarxx', 'Zdar'
    
    expect(results).toEqual([
      'Dar',
      'darkelitus',
      'darius',
      'alondar',
      'xxdarxx',
      'Zdar'
    ]);
  });

  it('limits the results to the specified amount', () => {
    const manyPlayers = Array.from({ length: 100 }, (_, i) => `player${i}`);
    const results = searchPlayers(manyPlayers, 'player', 50);
    expect(results.length).toBe(50);
  });

  it('returns empty array if query is empty', () => {
    const results = searchPlayers(mockPlayers, '   ');
    expect(results).toEqual([]);
  });

  it('is case insensitive', () => {
    const results = searchPlayers(mockPlayers, 'DAR');
    expect(results[0]).toBe('Dar');
    expect(results[1]).toBe('darkelitus');
  });
});
