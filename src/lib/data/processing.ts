import { KamaitachiScore, BeerpsiSong, PlayerStats } from '../types';
import { calculateOp } from '../calc/overpower';

export interface ProcessedScore extends KamaitachiScore {
  songTitle: string;
  constant: number;
  level: string;
  op: number;
}

export function processPlayerData(
  scores: KamaitachiScore[], 
  songs: BeerpsiSong[]
): { stats: PlayerStats; processedScores: ProcessedScore[] } {
  
  // 1. Create a fast lookup map for songs
  const songMap = new Map<string, BeerpsiSong>();
  songs.forEach(song => songMap.set(song.id, song));

  // 2. Join and process scores
  const processedScores: ProcessedScore[] = [];

  scores.forEach(score => {
    const song = songMap.get(score.songId);
    if (!song) return; // Song not found in Beerpsi DB

    const chartData = song.charts[score.chartType];
    if (!chartData || chartData.constant == null) return; // Chart not found or no constant

    const op = calculateOp(score.score, chartData.constant, score.lamp);

    processedScores.push({
      score: score.score,
      lamp: score.lamp,
      songId: score.songId,
      chartType: score.chartType,
      songTitle: song.title,
      constant: chartData.constant,
      level: chartData.level,
      op,
    });
  });

  // Sort by OP descending to find best plays
  processedScores.sort((a, b) => b.op - a.op);

  // Calculate global stats
  let scoreSum = 0;
  let ajcCount = 0;
  let ajCount = 0;
  let fcCount = 0;
  let clearCount = 0;

  // Group by songId to find Max OP per song
  const maxOpPerSong = new Map<string, number>();

  processedScores.forEach(s => {
    scoreSum += s.score;
    if (s.lamp === 'AJC') ajcCount++;
    if (s.lamp === 'AJ') ajCount++;
    if (s.lamp === 'FC') fcCount++;
    if (s.lamp === 'CLEAR') clearCount++;

    const currentMax = maxOpPerSong.get(s.songId) || 0;
    if (s.op > currentMax) {
      maxOpPerSong.set(s.songId, s.op);
    }
  });

  const averageScore = processedScores.length > 0 ? Math.round(scoreSum / processedScores.length) : 0;

  // Sum max OP
  let totalRawOp = 0;
  maxOpPerSong.forEach((maxOp) => {
    totalRawOp += maxOp;
  });

  const finalTotalOp = totalRawOp / 10000;

  return {
    stats: {
      totalOp: Number(finalTotalOp.toFixed(2)),
      averageScore,
      ajcCount,
      ajCount,
      fcCount,
      clearCount
    },
    processedScores
  };
}
