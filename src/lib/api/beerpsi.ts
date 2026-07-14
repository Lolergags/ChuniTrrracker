import { BeerpsiSong } from '../types';

export async function fetchBeerpsiSongs(): Promise<BeerpsiSong[]> {
  // MOCK DATA IMPLEMENTATION
  console.log('Fetching mock song list...');
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Base mock songs
  const baseSongs: BeerpsiSong[] = [
    {
      id: '1', title: 'Grievous Lady', artist: 'Team Grimoire vs Laur', image: '',
      charts: { 'EXP': { constant: 13.5, level: '13+' }, 'MAS': { constant: 14.9, level: '14+' } }
    },
    {
      id: '2', title: 'Trrricksters!!', artist: 's-don', image: '',
      charts: { 'MAS': { constant: 14.5, level: '14+' } }
    },
    {
      id: '3', title: 'World Vanquisher', artist: 'void (Mournfinale)', image: '',
      charts: { 'EXP': { constant: 13.0, level: '13' }, 'MAS': { constant: 14.6, level: '14+' } }
    },
    {
      id: '4', title: 'Oshama Scramble!', artist: 't+pazolite', image: '',
      charts: { 'MAS': { constant: 14.2, level: '14' }, 'ULT': { constant: 14.7, level: '14+' } }
    },
    {
      id: '5', title: 'Brain Power', artist: 'NOMA', image: '',
      charts: { 'MAS': { constant: 13.8, level: '13+' } }
    },
    {
      id: '6', title: 'Climax', artist: 'USAO', image: '',
      charts: { 'MAS': { constant: 14.8, level: '14+' } }
    },
    {
      id: '7', title: 'Aleph-0', artist: 'LeaF', image: '',
      charts: { 'MAS': { constant: 14.0, level: '14' }, 'ULT': { constant: 14.5, level: '14+' } }
    },
    {
      id: '8', title: 'DataErr0r', artist: 'Cosmograph', image: '',
      charts: { 'MAS': { constant: 13.9, level: '13+' } }
    },
    {
      id: '9', title: 'B.B.K.K.B.K.K.', artist: 'nora2r', image: '',
      charts: { 'EXP': { constant: 12.5, level: '12+' }, 'MAS': { constant: 13.7, level: '13+' } }
    }
  ];

  // Generate some random songs to match the random scores
  const extraSongs: BeerpsiSong[] = Array.from({ length: 40 }).map((_, i) => ({
    id: (10 + i).toString(),
    title: `Mock Song ${i + 1}`,
    artist: `Mock Artist`,
    image: '',
    charts: {
      'EXP': { constant: 12.0 + Math.random() * 2, level: '12+' },
      'MAS': { constant: 13.5 + Math.random() * 1.5, level: '14' },
      'ULT': { constant: 14.5 + Math.random() * 0.9, level: '14+' }
    }
  }));

  return [...baseSongs, ...extraSongs];
}
