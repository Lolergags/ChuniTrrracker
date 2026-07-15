export interface ChartFilterParams {
  server?: string; // 'JP', 'INT', 'OMNI'
  diff?: string; // 'ALL', 'MAS_ULT'
  version?: string; // 'ALL' or specific version string
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

export function getChartFilterConditions(params: ChartFilterParams, songsAlias = 'songs', chartsAlias = 'charts') {
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
  if (params.diff === 'MAS_ULT') {
    conditions.push(`${chartsAlias}.difficulty IN ('MAS', 'ULT')`);
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

  return { conditions, bindings };
}
