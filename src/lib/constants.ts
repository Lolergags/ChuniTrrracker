// Unified Chunithm version list in reverse chronological order
export const ALL_VERSIONS = [
  'MATE',
  'X-VERSE-X',
  'X-VERSE',
  'VERSE',
  'LUMINOUS PLUS',
  'LUMINOUS',
  'SUN PLUS',
  'SUN',
  'NEW PLUS',
  'NEW',
  'PARADISE LOST',
  'PARADISE',
  'CRYSTAL PLUS',
  'CRYSTAL',
  'AMAZON PLUS',
  'AMAZON',
  'STAR PLUS',
  'STAR',
  'AIR PLUS',
  'AIR',
  'CHUNITHM PLUS',
  'CHUNITHM'
] as const;

export type ChunithmVersion = typeof ALL_VERSIONS[number];
