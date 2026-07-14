export type LampType = 'FAILED' | 'CLEAR' | 'FC' | 'AJ' | 'AJC';

// What the server API returns
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
