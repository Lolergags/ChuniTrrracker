export type LampType = 'FAILED' | 'CLEAR' | 'FC' | 'AJ' | 'AJC';

// What the server API returns
export interface ApiPlayer {
  username: string;
  totalOp: number;
  opPercent: number;
  possession: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ChartLeaderboardResponse extends PaginatedResponse<{ username: string, score: number, lamp: LampType, op: number, timeAchieved: number }> {
  gradeDistribution: { name: string; count: number }[];
  normalDistribution: { bucket: string; count: number }[];
}

export interface ApiPlayerStats {
  username: string;
  totalOp: number;
  totalPossibleOp: number;
  opPercent: number;
  averageScore: number;
  ajcCount: number;
  ajCount: number;
  fcCount: number;
  clearCount: number;
  scoreCount: number;
  lastSynced: number;
  levelStats: { level: string; AJC: number; AJ: number; FC: number; CLEAR: number; FAILED: number; UNPLAYED: number }[];
}

export interface ApiProcessedScore {
  songTitle: string;
  artist: string;
  difficulty: string;
  constant: number;
  level: string;
  score: number;
  lamp: LampType;
  op: number;
  timeAchieved: number;
}

export interface ApiSong {
  id: number;
  title: string;
  artist: string;
  genre: string;
  charts: Array<{
    difficulty: string;
    constant: number;
    level: string;
    noteCount: number;
  }>;
}

export interface ApiHeatmapData {
  constant: number;
  grade: string;
  count: number;
}

export interface ApiChartMeta {
  song_id: number;
  difficulty: string;
  constant: number;
  title: string;
  playCount: number;
  avgScore: number;
}

export interface ApiLampDistribution {
  constant: number;
  ajc: number;
  aj: number;
  fc: number;
  clear: number;
  failed: number;
  total: number;
}

export interface ApiOpYield {
  constant: number;
  avgOp: number;
  count: number;
}

export interface ApiPlayerOpDistribution {
  username: string;
  totalOp: number;
}
