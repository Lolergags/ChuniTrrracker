import type { ApiPlayerStats, ApiProcessedScore, ApiSong } from '../types/index.js';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': localStorage.getItem('adminKey') || ''
});

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

  getPlayer: async (username: string, filters?: any): Promise<ApiPlayerStats> => {
    let url = `${API_BASE}/players/${username}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error('Player not found');
    return res.json();
  },

  getPlayerScores: async (username: string, limit = 500, filters?: any): Promise<ApiProcessedScore[]> => {
    let url = `${API_BASE}/players/${username}/scores?limit=${limit}`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `&${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  getLeaderboard: async (page = 1, limit = 50, server = 'jp', version = 'all'): Promise<import('../types/index.js').PaginatedResponse<import('../types/index.js').ApiPlayer>> => {
    const res = await fetch(`${API_BASE}/leaderboard?page=${page}&limit=${limit}&server=${server}&version=${encodeURIComponent(version)}`);
    return res.json();
  },

  getSongs: async (): Promise<ApiSong[]> => {
    const res = await fetch(`${API_BASE}/songs`);
    return res.json();
  },

  getChartLeaderboard: async (songId: number, difficulty: string, page = 1, limit = 10): Promise<import('../types/index.js').ChartLeaderboardResponse> => {
    const res = await fetch(`${API_BASE}/songs/${songId}/charts/${difficulty}/leaderboard?page=${page}&limit=${limit}`);
    return res.json();
  },

  getHeatmap: async (filters?: any): Promise<import('../types/index.js').ApiHeatmapData[]> => {
    let url = `${API_BASE}/performance/heatmap`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  getChartMeta: async (filters?: any): Promise<import('../types/index.js').ApiChartMeta[]> => {
    let url = `${API_BASE}/performance/meta`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  getLampDistribution: async (filters?: any): Promise<import('../types/index.js').ApiLampDistribution[]> => {
    let url = `${API_BASE}/performance/lamps`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  getOpYield: async (filters?: any): Promise<import('../types/index.js').ApiOpYield[]> => {
    let url = `${API_BASE}/performance/op`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  getPlayerOpDistribution: async (filters?: any): Promise<import('../types/index.js').ApiPlayerOpDistribution[]> => {
    let url = `${API_BASE}/performance/players`;
    if (filters) {
      const params = new URLSearchParams();
      if (filters.server) params.append('server', filters.server);
      if (filters.diff) params.append('diff', filters.diff);
      if (filters.version) params.append('version', filters.version);
      const q = params.toString();
      if (q) url += `?${q}`;
    }
    const res = await fetch(url);
    return res.json();
  },

  startScraper: async (startId: number, endId: number) => {
    const res = await fetch(`${API_BASE}/scraper/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ startId, endId }),
    });
    if (!res.ok) throw new Error('Failed to start scraper');
    return res.json();
  },

  stopScraper: async () => {
    const res = await fetch(`${API_BASE}/scraper/stop`, { 
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to stop scraper');
    return res.json();
  },

  getScraperStatus: async () => {
    const res = await fetch(`${API_BASE}/scraper/status`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  getSchedulerStatus: async () => {
    const res = await fetch(`${API_BASE}/admin/scheduler`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to fetch scheduler status');
    return res.json();
  },

  startScheduler: async (syncCron?: string, scrapeCron?: string, scrapeStartId?: number, scrapeEndId?: number) => {
    const res = await fetch(`${API_BASE}/admin/scheduler/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ syncCron, scrapeCron, scrapeStartId, scrapeEndId })
    });
    if (!res.ok) throw new Error('Failed to start scheduler');
    return res.json();
  },

  stopScheduler: async () => {
    const res = await fetch(`${API_BASE}/admin/scheduler/stop`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to stop scheduler');
    return res.json();
  },

  verifyAdmin: async (key: string) => {
    const res = await fetch(`${API_BASE}/admin/verify`, {
      headers: { 'Authorization': key }
    });
    if (!res.ok) throw new Error('Invalid API Key');
    return res.json();
  },

  deletePlayer: async (username: string) => {
    const res = await fetch(`${API_BASE}/admin/players/${encodeURIComponent(username)}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to delete player');
    }
    return res.json();
  },

  syncAllPlayers: async () => {
    const res = await fetch(`${API_BASE}/admin/sync-all`, {
      method: 'POST',
      headers: getAuthHeaders()
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to trigger full sync');
    }
    return res.json();
  },

  getSyncAllStatus: async () => {
    const res = await fetch(`${API_BASE}/admin/sync-all/status`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  downloadBackup: () => {
    const key = localStorage.getItem('adminKey') || '';
    // Fetch API to handle the download response
    return fetch(`${API_BASE}/admin/backup`, {
      headers: { 'Authorization': key }
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download backup');
      return res.blob();
    }).then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chunitrrracker_backup.sqlite';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  },

  getBlacklist: async () => {
    const res = await fetch(`${API_BASE}/admin/blacklist`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  addToBlacklist: async (identifier: string) => {
    const res = await fetch(`${API_BASE}/admin/blacklist`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to add to blacklist');
    }
    return res.json();
  },

  removeFromBlacklist: async (id: number) => {
    const res = await fetch(`${API_BASE}/admin/blacklist/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to remove from blacklist');
    return res.json();
  },

  restoreDatabase: async (file: File) => {
    const formData = new FormData();
    formData.append('database', file);

    // Cannot use standard JSON getAuthHeaders because this is multipart/form-data
    // So we just set Authorization and omit Content-Type (fetch handles boundary)
    const token = localStorage.getItem('chunitrrracker_admin_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/admin/restore`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to restore database');
    }
    return res.json();
  }
};
