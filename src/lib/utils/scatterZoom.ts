export function clampDomainX(rawMinX: number, rawMaxX: number, defX: [number, number]): [number, number] {
  let minX = rawMinX;
  let maxX = rawMaxX;

  const minAllowedSpan = 0.02;
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

  return [Number(minX.toFixed(2)), Number(maxX.toFixed(2))];
}

export function clampDomainY(rawMinY: number, rawMaxY: number, defY: [number, number] = [975000, 1010000]): [number, number] {
  let minY = rawMinY;
  let maxY = rawMaxY;

  const minAllowedSpan = 500;
  if (maxY - minY < minAllowedSpan) {
    const mid = (minY + maxY) / 2;
    minY = mid - minAllowedSpan / 2;
    maxY = mid + minAllowedSpan / 2;
  }

  const defSpan = defY[1] - defY[0];
  if (maxY - minY >= defSpan || (minY <= defY[0] && maxY >= defY[1])) {
    return [defY[0], defY[1]];
  }

  if (minY < defY[0]) {
    const span = maxY - minY;
    minY = defY[0];
    maxY = Math.min(defY[1], minY + span);
  }
  if (maxY > defY[1]) {
    const span = maxY - minY;
    maxY = defY[1];
    minY = Math.max(defY[0], maxY - span);
  }

  return [Math.round(minY), Math.round(maxY)];
}

export function panDomain(
  startDomain: [number, number],
  rawDelta: number,
  defDomain: [number, number],
  isFloat = false
): [number, number] {
  const minAllowedDelta = defDomain[0] - startDomain[0];
  const maxAllowedDelta = defDomain[1] - startDomain[1];
  const clampedDelta = Math.max(minAllowedDelta, Math.min(maxAllowedDelta, rawDelta));

  let minVal = startDomain[0] + clampedDelta;
  let maxVal = startDomain[1] + clampedDelta;

  if (isFloat) {
    minVal = Number(minVal.toFixed(2));
    maxVal = Number(maxVal.toFixed(2));
  } else {
    minVal = Math.round(minVal);
    maxVal = Math.round(maxVal);
  }

  return [minVal, maxVal];
}

export function getSmartYTicks(yMin: number, yMax: number, defaultYMin: number = 975000): number[] {
  if (yMin <= defaultYMin && yMax >= 1010000) {
    const rawTicks = [
      defaultYMin,
      990000,
      1000000,
      1005000,
      1007500,
      1009000,
      1010000
    ].filter(t => t >= defaultYMin && t <= 1010000);
    return Array.from(new Set(rawTicks));
  }

  const span = yMax - yMin;
  if (span <= 0) return [Math.round(yMin)];

  const roughStep = span / 5;
  const steps = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000];
  let step = steps[steps.length - 1];
  for (let i = 0; i < steps.length; i++) {
    if (steps[i] >= roughStep) {
      step = steps[i];
      break;
    }
  }

  const startTick = Math.ceil(yMin / step) * step;
  const ticks: number[] = [];

  for (let t = startTick; t <= yMax; t += step) {
    ticks.push(t);
  }

  return Array.from(new Set(ticks));
}
