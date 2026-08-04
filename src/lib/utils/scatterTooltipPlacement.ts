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
    popW = 290,
    popH = 220
  } = params;

  const actualPopW = Math.min(popW, windowWidth - 20);

  // Flip LEFT if dot is on right half of chart canvas
  let leftPos = circleX + 18;
  if (selectedCoordsX > containerW / 2 || selectedCoordsX + actualPopW + 18 > containerW - 20) {
    leftPos = circleX - actualPopW - 18;
  }
  const clampedLeft = Math.min(Math.max(10, leftPos), Math.max(10, windowWidth - actualPopW - 10));

  // Flip UP if dot is in lower/middle half of graph (y > 150)
  let topPos = circleY - 10;
  if (selectedCoordsY > 150) {
    topPos = circleY - popH - 10;
  }
  const clampedTop = Math.max(10, topPos);

  return { clampedLeft, clampedTop };
}

export function formatScatterScore(score: number | null | undefined): number {
  if (score == null || isNaN(score)) return 0;
  return Math.min(1010000, Math.floor(score));
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
