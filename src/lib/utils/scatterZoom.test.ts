import { describe, it, expect } from 'vitest';
import { clampDomainX, clampDomainY, getSmartYTicks, panDomain } from './scatterZoom';

describe('scatterZoom utilities', () => {
  describe('clampDomainX', () => {
    const defX: [number, number] = [1.0, 15.5];

    it('should disallow negative or sub-1.0 lower bounds', () => {
      const [minX] = clampDomainX(-2.0, 5.0, defX);
      expect(minX).toBeGreaterThanOrEqual(1.0);
    });

    it('should reset to default domain if span exceeds default span', () => {
      const [minX, maxX] = clampDomainX(0.0, 20.0, defX);
      expect(minX).toBe(1.0);
      expect(maxX).toBe(15.5);
    });

    it('should clamp bounds to defX bounds', () => {
      const [minX, maxX] = clampDomainX(0.5, 5.0, defX);
      expect(minX).toBe(1.0);
      expect(maxX).toBe(5.0);
    });

    it('should allow zooming out smoothly from deep zoom states near right edge', () => {
      // Zoomed in near 15.0 - 15.4, zooming out rawMinX goes to 10.0 and rawMaxX goes to 17.0
      const [minX, maxX] = clampDomainX(10.0, 17.0, defX);
      expect(minX).toBe(10.0);
      expect(maxX).toBe(15.5);
    });
  });

  describe('clampDomainY', () => {
    const defY: [number, number] = [975000, 1010000];

    it('should disallow negative Y values', () => {
      const [minY] = clampDomainY(-500, 50000, defY);
      expect(minY).toBeGreaterThanOrEqual(975000);
    });

    it('should clamp max Y to 1,010,000', () => {
      const [, maxY] = clampDomainY(500000, 1200000, defY);
      expect(maxY).toBe(1010000);
    });

    it('should return default domain if span exceeds default span', () => {
      const [minY, maxY] = clampDomainY(900000, 1050000, defY);
      expect(minY).toBe(975000);
      expect(maxY).toBe(1010000);
    });
  });

  describe('getSmartYTicks', () => {
    it('should deduplicate standard ticks when unzoomed and defaultYMin is 990000', () => {
      const ticks = getSmartYTicks(990000, 1010000, 990000);
      expect(ticks).toEqual([990000, 1000000, 1005000, 1007500, 1009000, 1010000]);
      // Verify no duplicates
      expect(new Set(ticks).size).toBe(ticks.length);
    });

    it('should generate clean rounded ticks when zoomed in', () => {
      const ticks = getSmartYTicks(985420, 1002100, 975000);
      expect(ticks.length).toBeGreaterThan(0);
      expect(ticks.every(t => t % 500 === 0)).toBe(true);
      expect(new Set(ticks).size).toBe(ticks.length);
    });
  });

  describe('panDomain', () => {
    const defX: [number, number] = [1.0, 15.5];

    it('should preserve span when panning within bounds', () => {
      const [minX, maxX] = panDomain([3.0, 7.0], 2.0, defX, true);
      expect(minX).toBe(5.0);
      expect(maxX).toBe(9.0);
      expect(maxX - minX).toBeCloseTo(4.0);
    });

    it('should clamp delta when panning against lower boundary without altering span', () => {
      const [minX, maxX] = panDomain([3.0, 7.0], -10.0, defX, true);
      expect(minX).toBe(1.0);
      expect(maxX).toBe(5.0);
      expect(maxX - minX).toBeCloseTo(4.0);
    });

    it('should prevent panning or zooming when unzoomed at default boundary', () => {
      const [minX, maxX] = panDomain([1.0, 15.5], 5.0, defX, true);
      expect(minX).toBe(1.0);
      expect(maxX).toBe(15.5);
      expect(maxX - minX).toBeCloseTo(14.5);
    });
  });
});
