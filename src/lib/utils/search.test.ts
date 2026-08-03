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
    'Zdar',
    '[TEST]Player',
    'Player 123',
    'Special_User'
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

  it('handles special characters and brackets safely without breaking', () => {
    const results = searchPlayers(mockPlayers, '[TEST]');
    expect(results).toEqual(['[TEST]Player']);
  });

  it('matches player names containing numbers and spaces', () => {
    const results = searchPlayers(mockPlayers, 'Player 123');
    expect(results).toEqual(['Player 123']);
  });

  it('matches player names with underscores', () => {
    const results = searchPlayers(mockPlayers, 'Special_User');
    expect(results).toEqual(['Special_User']);
  });

  it('handles single character search query correctly', () => {
    const results = searchPlayers(mockPlayers, 'z', 10);
    expect(results).toEqual(['Zdar']);
  });
});
