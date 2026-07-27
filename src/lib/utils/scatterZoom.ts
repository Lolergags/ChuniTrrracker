export function clampDomainX(rawMinX: number, rawMaxX: number, defX: [number, number]): [number, number] {
  let minX = rawMinX;
  let maxX = rawMaxX;

  const minAllowedSpan = 0.2;
  if (maxX - minX < minAllowedSpan) {
    const mid = (minX + maxX) / 2;
    minX = mid - minAllowedSpan / 2;
    maxX = mid + minAllowedSpan / 2;
  }

  const defSpan = defX[1] - defX[0];
  if (maxX - minX >= defSpan || (minX <= defX[0] && maxX >= defX[1])) {
    return [defX[0], defX[1]];
  }

  minX = Math.max(defX[0], minX);
  maxX = Math.min(defX[1], maxX);

  return [Number(minX.toFixed(1)), Number(maxX.toFixed(1))];
}

export function clampDomainY(rawMinY: number, rawMaxY: number, defY: [number, number] = [975000, 1010000]): [number, number] {
  let minY = rawMinY;
  let maxY = rawMaxY;

  const minAllowedSpan = 1000;
  if (maxY - minY < minAllowedSpan) {
    const mid = (minY + maxY) / 2;
    minY = mid - minAllowedSpan / 2;
    maxY = mid + minAllowedSpan / 2;
  }

  const defSpan = defY[1] - defY[0];
  if (maxY - minY >= defSpan || (minY <= defY[0] && maxY >= defY[1])) {
    return [defY[0], defY[1]];
  }

  minY = Math.max(defY[0], minY);
  maxY = Math.min(defY[1], maxY);

  return [Math.round(minY), Math.round(maxY)];
}
