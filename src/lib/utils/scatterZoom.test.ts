import { describe, it, expect } from 'vitest';
import { clampDomainX, clampDomainY, shouldResetZoomOut } from './scatterZoom';

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
    it('should disallow negative Y values', () => {
      const [minY] = clampDomainY(-500, 50000);
      expect(minY).toBe(0);
    });

    it('should clamp max Y to 1,010,000', () => {
      const [, maxY] = clampDomainY(500000, 1200000);
      expect(maxY).toBe(1010000);
    });
  });

  describe('shouldResetZoomOut', () => {
    it('should return true when ratioX reaches 95% of defSpanX', () => {
      const reset = shouldResetZoomOut(13.8, 200000, 14.5, 1010000, 1.15);
      expect(reset).toBe(true);
    });

    it('should return false when both spans are well within defSpans', () => {
      const reset = shouldResetZoomOut(5.0, 200000, 14.5, 1010000, 1.15);
      expect(reset).toBe(false);
    });
  });
});
