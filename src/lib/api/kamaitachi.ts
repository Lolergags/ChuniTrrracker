import { KamaitachiScore, LampType } from '../types';

export async function fetchKamaitachiScores(username: string): Promise<KamaitachiScore[]> {
  // MOCK DATA IMPLEMENTATION
  console.log(`Fetching mock data for ${username}...`);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  return [
    { score: 1009500, lamp: 'AJC', songId: '1', chartType: 'MAS', level: '' },
    { score: 1008200, lamp: 'AJ', songId: '2', chartType: 'MAS', level: '' },
    { score: 1005000, lamp: 'FC', songId: '3', chartType: 'EXP', level: '' },
    { score: 1001000, lamp: 'CLEAR', songId: '4', chartType: 'MAS', level: '' },
    { score: 990000, lamp: 'CLEAR', songId: '5', chartType: 'MAS', level: '' },
    { score: 1007500, lamp: 'AJ', songId: '1', chartType: 'EXP', level: '' },
    { score: 1009900, lamp: 'AJC', songId: '6', chartType: 'MAS', level: '' },
    { score: 980000, lamp: 'FAILED', songId: '7', chartType: 'ULT', level: '' },
    { score: 1003000, lamp: 'FC', songId: '8', chartType: 'MAS', level: '' },
    { score: 1006500, lamp: 'AJ', songId: '9', chartType: 'EXP', level: '' },
    // Add more variance for performance graphs
    ...Array.from({ length: 40 }).map((_, i) => ({
      score: 950000 + Math.floor(Math.random() * 60000),
      lamp: ['FAILED', 'CLEAR', 'FC', 'AJ', 'AJC'][Math.floor(Math.random() * 5)] as LampType,
      songId: (10 + i).toString(),
      chartType: ['EXP', 'MAS', 'ULT'][Math.floor(Math.random() * 3)],
      level: ''
    }))
  ];
}
