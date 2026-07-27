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
  'X-VERSE-X',
  'MATE'
];

export const AOMN_REMOVE_SONG_IDS = [
  0, 5, 9, 10, 12, 14, 17, 28, 34, 36, 39, 42, 43, 54, 55, 56, 57, 58, 60, 78, 84, 85, 86, 87, 109, 
  110, 111, 112, 116, 124, 125, 126, 129, 130, 154, 155, 176, 182, 184, 185, 206, 207, 209, 214, 215, 
  231, 235, 238, 243, 247, 255, 269, 296, 299, 308, 309, 311, 313, 315, 344, 345, 348, 349, 350, 351, 
  352, 353, 355, 356, 357, 358, 359, 360, 410, 419, 420, 422, 424, 454, 473, 495, 501, 509, 522, 523, 
  529, 530, 531, 537, 541, 542, 544, 545, 546, 579, 580, 581, 582, 591, 609, 610, 611, 612, 613, 620, 
  621, 622, 623, 624, 639, 640, 642, 644, 645, 646, 647, 648, 649, 650, 651, 652, 682, 724, 725, 726, 
  727, 728, 769, 770, 778, 794, 808
];

export function getChartFilterConditions(params: ChartFilterParams, songsAlias = 'songs', chartsAlias = 'charts', playersAlias?: string) {
  const conditions: string[] = [];
  const bindings: any[] = [];

  // Exclude World's End and Ghost charts by default
  conditions.push(`${chartsAlias}.difficulty != 'WE'`);
  conditions.push(`${chartsAlias}.song_id NOT IN (50, 81) AND ${chartsAlias}.id != 239116`);

  // Server Filter
  const server = (params.server || 'JP').toUpperCase();
  const isPlOffline = server === 'PL_OFFLINE' || server === 'PARADISE_LOST_OFFLINE' || server === 'PARADISE';

  if (server === 'JP') {
    conditions.push(`${songsAlias}.is_jp_active = 1`);
  } else if (server === 'INT' || server === 'INTL') {
    conditions.push(`${songsAlias}.is_intl_active = 1`);
  } else if (isPlOffline) {
    conditions.push(`${songsAlias}.is_pl_offline_active = 1`);
    conditions.push(`${chartsAlias}.difficulty != 'ULT'`);
  } else if (server === 'OMNI') {
    conditions.push(`${songsAlias}.id NOT IN (${AOMN_REMOVE_SONG_IDS.join(',')})`);
  }

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
    if (isPlOffline) {
      diffArray = diffArray.filter(d => d !== 'ULT');
    }
    if (diffArray.length > 0) {
      const placeholders = diffArray.map(() => '?').join(', ');
      conditions.push(`${chartsAlias}.difficulty IN (${placeholders})`);
      bindings.push(...diffArray);
    } else {
      conditions.push('1 = 0');
    }
  }

  // Version Filter (Cumulative)
  const plMaxIndex = CHRONOLOGICAL_VERSIONS.indexOf('PARADISE LOST');
  let targetIndex = params.version && params.version !== 'ALL' 
    ? CHRONOLOGICAL_VERSIONS.indexOf(params.version) 
    : (isPlOffline ? plMaxIndex : -1);

  if (isPlOffline && targetIndex !== -1 && targetIndex > plMaxIndex) {
    targetIndex = plMaxIndex;
  }

  if (targetIndex !== -1) {
    const allowedVersions = CHRONOLOGICAL_VERSIONS.slice(0, targetIndex + 1);
    const placeholders = allowedVersions.map(() => '?').join(', ');
    conditions.push(`${chartsAlias}.version IN (${placeholders})`);
    bindings.push(...allowedVersions);
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
