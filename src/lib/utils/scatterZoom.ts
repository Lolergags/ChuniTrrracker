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
  return [minX, maxX];
}

export function clampDomainY(rawMinY: number, rawMaxY: number, defY: [number, number] = [0, 1010000]): [number, number] {
  let minY = Math.max(0, rawMinY);
  let maxY = Math.min(1010000, rawMaxY);

  const minAllowedSpan = 1000;
  if (maxY - minY < minAllowedSpan) {
    maxY = Math.min(1010000, minY + minAllowedSpan);
    if (maxY - minY < minAllowedSpan) {
      minY = Math.max(0, maxY - minAllowedSpan);
    }
  }

  const defSpan = defY[1] - defY[0];
  if (maxY - minY >= defSpan) {
    return [defY[0], defY[1]];
  }

  return [minY, maxY];
}

export function shouldResetZoomOut(
  curSpanX: number,
  curSpanY: number,
  defSpanX: number,
  defSpanY: number,
  zoomFactor: number
): boolean {
  const nextSpanX = curSpanX * zoomFactor;
  const nextSpanY = curSpanY * zoomFactor;
  const ratioX = nextSpanX / defSpanX;
  const ratioY = nextSpanY / defSpanY;
  return ratioX >= 0.95 || ratioY >= 0.95;
}
