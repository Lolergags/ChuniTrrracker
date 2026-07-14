export type LampType = 'FAILED' | 'CLEAR' | 'FC' | 'AJ' | 'AJC';

export interface KamaitachiScore {
  score: number;
  lamp: LampType;
  songId: string;
  chartType: string;
  level: string;
}

export interface BeerpsiSong {
  id: string;
  title: string;
  artist: string;
  image: string;
  charts: Record<string, {
    constant: number;
    level: string;
  }>;
}

export interface PlayerStats {
  totalOp: number;
  averageScore: number;
  ajcCount: number;
  ajCount: number;
  fcCount: number;
  clearCount: number;
}
