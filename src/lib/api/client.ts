import type { ApiPlayerStats, ApiProcessedScore, ApiSong } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = {
  importPlayer: async (username: string) => {
    const res = await fetch(`${API_BASE}/players/import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to import player');
    }
    return res.json();
  },

  getPlayers: async () => {
    const res = await fetch(`${API_BASE}/players`);
    return res.json();
  },

  getPlayer: async (username: string): Promise<ApiPlayerStats> => {
    const res = await fetch(`${API_BASE}/players/${username}`);
    if (!res.ok) throw new Error('Player not found');
    return res.json();
  },

  getPlayerScores: async (username: string, limit = 500): Promise<ApiProcessedScore[]> => {
    const res = await fetch(`${API_BASE}/players/${username}/scores?limit=${limit}`);
    return res.json();
  },

  getLeaderboard: async (page = 1, limit = 50): Promise<import('../types/index.js').PaginatedResponse<import('../types/index.js').ApiPlayer>> => {
    const res = await fetch(`${API_BASE}/leaderboard?page=${page}&limit=${limit}`);
    return res.json();
  },

  getSongs: async (): Promise<ApiSong[]> => {
    const res = await fetch(`${API_BASE}/songs`);
    return res.json();
  },

  getChartLeaderboard: async (songId: number, difficulty: string, page = 1, limit = 50): Promise<import('../types/index.js').ChartLeaderboardResponse> => {
    const res = await fetch(`${API_BASE}/songs/${songId}/charts/${difficulty}/leaderboard?page=${page}&limit=${limit}`);
    return res.json();
  }
};
