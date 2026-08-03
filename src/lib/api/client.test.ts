import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { api } from './client.js';

describe('Frontend API Client (src/lib/api/client.ts)', () => {
  const originalFetch = global.fetch;

  // Mock localStorage for Node vitest environment
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();

  beforeEach(() => {
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    localStorage.clear();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('getPlayers: should fetch /api/players endpoint', async () => {
    const mockData = [{ id: 1, username: 'Alice' }];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData
    });

    const result = await api.getPlayers();
    expect(global.fetch).toHaveBeenCalledWith('/api/players');
    expect(result).toEqual(mockData);
  });

  it('getPlayer: should format server, diff, version filter query parameters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ username: 'Alice', stats: {} })
    });

    await api.getPlayer('Alice', { server: 'INT', diff: 'MAS', version: 'AIR' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/players/Alice?server=INT&diff=MAS&version=AIR'
    );
  });

  it('getPlayer: should throw error when server returns non-ok status', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404
    });

    await expect(api.getPlayer('UnknownPlayer')).rejects.toThrow('Player not found');
  });

  it('getPlayerScores: should format limit and filter parameters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => []
    });

    await api.getPlayerScores('Alice', 100, { server: 'JP', diff: 'MAS_ULT' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/players/Alice/scores?limit=100&server=JP&diff=MAS_ULT'
    );
  });

  it('getLeaderboard: should format pagination and version parameters', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ players: [], total: 0 })
    });

    await api.getLeaderboard(2, 25, 'jp', 'PARADISE LOST');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/leaderboard?page=2&limit=25&server=jp&version=PARADISE%20LOST'
    );
  });

  it('startScraper: should include admin token from localStorage in Authorization header', async () => {
    localStorage.setItem('adminKey', 'secret_admin_key_123');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    await api.startScraper(1, 100);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/scraper/start',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'secret_admin_key_123'
        },
        body: JSON.stringify({ startId: 1, endId: 100 })
      })
    );
  });

  it('restoreDatabase: should construct FormData payload without manual Content-Type header', async () => {
    localStorage.setItem('adminKey', 'auth_token');

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    });

    const mockFile = new File(['dummy_content'], 'backup.sqlite', { type: 'application/octet-stream' });
    await api.restoreDatabase(mockFile);

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/restore',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Authorization': 'auth_token' }
      })
    );
  });
});
