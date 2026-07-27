export function clampDomainX(rawMinX: number, rawMaxX: number, defX: [number, number]): [number, number] {
  let minX = rawMinX;
  let maxX = rawMaxX;

  const minAllowedSpan = 0.2;
  if (maxX - minX < minAllowedSpan) {
    maxX = minX + minAllowedSpan;
  }

  const defSpan = defX[1] - defX[0];
  if (maxX - minX >= defSpan) {
    return [defX[0], defX[1]];
  }

  if (minX < defX[0]) {
    const diff = defX[0] - minX;
    minX = defX[0];
    maxX = Math.min(defX[1], maxX + diff);
  } else if (maxX > defX[1]) {
    const diff = maxX - defX[1];
    maxX = defX[1];
    minX = Math.max(defX[0], minX - diff);
  }

  minX = Math.max(1.0, minX);
  return [Number(minX.toFixed(1)), Number(maxX.toFixed(1))];
}

export function clampDomainY(rawMinY: number, rawMaxY: number, defY: [number, number] = [975000, 1010000]): [number, number] {
  let minY = rawMinY;
  let maxY = rawMaxY;

  const minAllowedSpan = 1000;
  if (maxY - minY < minAllowedSpan) {
    maxY = minY + minAllowedSpan;
  }

  const defSpan = defY[1] - defY[0];
  if (maxY - minY >= defSpan) {
    return [defY[0], defY[1]];
  }

  if (minY < defY[0]) {
    const diff = defY[0] - minY;
    minY = defY[0];
    maxY = Math.min(defY[1], maxY + diff);
  } else if (maxY > defY[1]) {
    const diff = maxY - defY[1];
    maxY = defY[1];
    minY = Math.max(defY[0], minY - diff);
  }

  minY = Math.max(0, minY);
  maxY = Math.min(1010000, maxY);
  return [Math.round(minY), Math.round(maxY)];
}
