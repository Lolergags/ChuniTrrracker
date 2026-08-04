export const POPOVER_WIDTH = 290;
export const POPOVER_HEIGHT = 220;
export const POPOVER_GAP_X = 18;
export const POPOVER_GAP_Y = 10;
export const VERTICAL_FLIP_Y = 150;
export const PORTAL_Z_INDEX = 10000;
export const MAX_DISPLAY_SCORE = 1010000;
export const OVERLAP_PAGE_SIZE = 10;

export interface PopoverPlacementParams {
  circleX: number;
  circleY: number;
  selectedCoordsX: number;
  selectedCoordsY: number;
  containerW: number;
  windowWidth: number;
  popW?: number;
  popH?: number;
}

export interface PopoverPlacementResult {
  clampedLeft: number;
  clampedTop: number;
}

export function calculatePopoverPlacement(params: PopoverPlacementParams): PopoverPlacementResult {
  const {
    circleX,
    circleY,
    selectedCoordsX,
    selectedCoordsY,
    containerW,
    windowWidth,
    popW = POPOVER_WIDTH,
    popH = POPOVER_HEIGHT
  } = params;

  const actualPopW = Math.min(popW, windowWidth - 20);

  // Flip LEFT if dot is on right half of chart canvas
  let leftPos = circleX + POPOVER_GAP_X;
  if (selectedCoordsX > containerW / 2 || selectedCoordsX + actualPopW + POPOVER_GAP_X > containerW - 20) {
    leftPos = circleX - actualPopW - POPOVER_GAP_X;
  }
  const clampedLeft = Math.min(Math.max(10, leftPos), Math.max(10, windowWidth - actualPopW - 10));

  // Flip UP if dot is in lower/middle half of graph (y > 150)
  let topPos = circleY - POPOVER_GAP_Y;
  if (selectedCoordsY > VERTICAL_FLIP_Y) {
    topPos = circleY - popH - POPOVER_GAP_Y;
  }
  const clampedTop = Math.max(10, topPos);

  return { clampedLeft, clampedTop };
}

export function formatScatterScore(score: number | null | undefined): number {
  if (score == null || isNaN(score)) return 0;
  return Math.min(MAX_DISPLAY_SCORE, Math.floor(score));
}

export function isSameChart(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.chartId && b.chartId && a.chartId === b.chartId) return true;
  if (a.id && b.id && a.id === b.id) return true;

  const aSongId = a.songId ?? a.song_id;
  const bSongId = b.songId ?? b.song_id;
  if (aSongId && bSongId && aSongId === bSongId) {
    if (!a.difficulty || !b.difficulty || a.difficulty === b.difficulty) {
      return true;
    }
  }

  const aTitle = a.title ?? a.name;
  const bTitle = b.title ?? b.name;
  if (aTitle && bTitle && aTitle === bTitle) {
    if (a.constant != null && b.constant != null && Math.abs(a.constant - b.constant) < 0.01) {
      const aScore = a.score ?? a.avgScore;
      const bScore = b.score ?? b.avgScore;
      if (aScore != null && bScore != null) {
        if (Math.abs(aScore - bScore) < 1) return true;
      } else {
        return true;
      }
    }
  }

  return false;
}

export function orderClusterForSelection<T>(cluster: T[], selectedItem: T, getItemId: (item: T) => string): T[] {
  if (!cluster || cluster.length === 0) return [];
  const targetId = getItemId(selectedItem);
  const foundIndex = cluster.findIndex(item => getItemId(item) === targetId);
  if (foundIndex <= 0) return [...cluster];

  const result = [...cluster];
  const [target] = result.splice(foundIndex, 1);
  result.unshift(target);
  return result;
}
