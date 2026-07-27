import { describe, it, expect } from 'vitest';
import { clampDomainX, clampDomainY } from './scatterZoom';

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

    it('should shift right bound if left bound goes below defX[0]', () => {
      const [minX, maxX] = clampDomainX(0.5, 5.0, defX);
      expect(minX).toBe(1.0);
      expect(maxX).toBe(5.5);
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
});
