export interface ChartFilterParams {
  server?: string; // 'JP', 'INT', 'OMNI'
  diff?: string | string[]; // e.g. 'MAS,ULT' or ['MAS', 'ULT']
  version?: string; // specific version string
  ratingMin?: string;
  ratingMax?: string;
}

export const CHRONOLOGICAL_VERSIONS = [
  'CHUNITHM',
  'CHUNITHM PLUS',
  'AIR',
  'AIR PLUS',
  'STAR',
  'STAR PLUS',
  'AMAZON',
  'AMAZON PLUS',
  'CRYSTAL',
  'CRYSTAL PLUS',
  'PARADISE',
  'PARADISE LOST',
  'NEW',
  'NEW PLUS',
  'SUN',
  'SUN PLUS',
  'LUMINOUS',
  'LUMINOUS PLUS',
  'VERSE',
  'X-VERSE',
  'X-VERSE-X'
];

export function getChartFilterConditions(params: ChartFilterParams, songsAlias = 'songs', chartsAlias = 'charts', playersAlias?: string) {
  const conditions: string[] = [];
  const bindings: any[] = [];

  // Exclude World's End charts by default
  conditions.push(`${chartsAlias}.difficulty != 'WE'`);

  // Server Filter
  const server = params.server || 'JP';
  if (server === 'JP') {
    conditions.push(`${songsAlias}.is_jp_active = 1`);
  } else if (server === 'INT') {
    conditions.push(`${songsAlias}.is_intl_active = 1`);
  }
  // If 'OMNI', we apply no active filter, including all legacy/deleted charts.

  // Difficulty Filter
  if (params.diff && params.diff !== 'ALL') {
    let diffArray: string[] = [];
    if (typeof params.diff === 'string') {
      if (params.diff === 'MAS_ULT') diffArray = ['MAS', 'ULT'];
      else diffArray = params.diff.split(',');
    } else if (Array.isArray(params.diff)) {
      diffArray = params.diff;
    }
    
    diffArray = diffArray.filter(d => d !== 'WE');
    if (diffArray.length > 0) {
      const placeholders = diffArray.map(() => '?').join(', ');
      conditions.push(`${chartsAlias}.difficulty IN (${placeholders})`);
      bindings.push(...diffArray);
    }
  }

  // Version Filter (Cumulative)
  if (params.version && params.version !== 'ALL') {
    const targetIndex = CHRONOLOGICAL_VERSIONS.indexOf(params.version);
    if (targetIndex !== -1) {
      const allowedVersions = CHRONOLOGICAL_VERSIONS.slice(0, targetIndex + 1);
      const placeholders = allowedVersions.map(() => '?').join(', ');
      conditions.push(`${songsAlias}.version IN (${placeholders})`);
      bindings.push(...allowedVersions);
    }
  }

  // Player Rating Filter
  if (playersAlias) {
    if (params.ratingMin) {
      conditions.push(`${playersAlias}.kamaitachi_rating >= ?`);
      bindings.push(parseFloat(params.ratingMin));
    }
    if (params.ratingMax) {
      conditions.push(`${playersAlias}.kamaitachi_rating <= ?`);
      bindings.push(parseFloat(params.ratingMax));
    }
  }

  return { conditions, bindings };
}
