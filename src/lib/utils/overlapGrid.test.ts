import { describe, it, expect } from 'vitest';

export function computeScatterOverlaps<T extends { constant: number; score: number }>(items: T[]): (T & { overlapCount: number; overlappingItems: T[] })[] {
  const gridMap = new Map<string, T[]>();
  
  for (const item of items) {
    const key = `${Math.round(item.constant * 20)}_${Math.round(item.score / 2500)}`;
    let list = gridMap.get(key);
    if (!list) {
      list = [];
      gridMap.set(key, list);
    }
    list.push(item);
  }

  return items.map(item => {
    const key = `${Math.round(item.constant * 20)}_${Math.round(item.score / 2500)}`;
    const overlappingItems = gridMap.get(key) || [item];
    return {
      ...item,
      overlappingItems,
      overlapCount: overlappingItems.length
    };
  });
}

describe('Spatial Grid Overlap Detection (O(N))', () => {
  it('should cluster identical chart constant and score points together', () => {
    const data = [
      { id: 1, constant: 14.5, score: 1007500 },
      { id: 2, constant: 14.5, score: 1007500 },
      { id: 3, constant: 12.0, score: 980000 }
    ];

    const result = computeScatterOverlaps(data);
    
    expect(result[0].overlapCount).toBe(2);
    expect(result[1].overlapCount).toBe(2);
    expect(result[2].overlapCount).toBe(1);
    expect(result[0].overlappingItems.map(i => i.id)).toEqual([1, 2]);
  });

  it('should separate distant points into distinct buckets', () => {
    const data = [
      { id: 1, constant: 14.0, score: 1000000 },
      { id: 2, constant: 14.5, score: 1000000 },
      { id: 3, constant: 14.0, score: 975000 }
    ];

    const result = computeScatterOverlaps(data);
    expect(result[0].overlapCount).toBe(1);
    expect(result[1].overlapCount).toBe(1);
    expect(result[2].overlapCount).toBe(1);
  });

  it('should handle empty input array gracefully', () => {
    const result = computeScatterOverlaps([]);
    expect(result).toEqual([]);
  });

  it('should handle single point input', () => {
    const result = computeScatterOverlaps([{ id: 1, constant: 13.0, score: 990000 }]);
    expect(result[0].overlapCount).toBe(1);
    expect(result[0].overlappingItems).toHaveLength(1);
  });

  it('should complete in < 10ms for 1,000 scatter points (O(N) performance check)', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      constant: 1.0 + (i % 145) * 0.1,
      score: 975000 + (i % 35) * 1000
    }));

    const start = performance.now();
    const result = computeScatterOverlaps(items);
    const duration = performance.now() - start;

    expect(result).toHaveLength(1000);
    expect(duration).toBeLessThan(10); // Under 10ms
  });
});
