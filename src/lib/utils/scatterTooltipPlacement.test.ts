import { describe, it, expect } from 'vitest';
import {
  calculatePopoverPlacement,
  formatScatterScore,
  isSameChart,
  orderClusterForSelection
} from './scatterTooltipPlacement.js';

describe('scatterTooltipPlacement utilities', () => {
  describe('calculatePopoverPlacement', () => {
    it('flips LEFT when selected dot is on the right half of the chart container', () => {
      const result = calculatePopoverPlacement({
        circleX: 800,
        circleY: 100,
        selectedCoordsX: 600, // right half of 1000px container
        selectedCoordsY: 100,
        containerW: 1000,
        windowWidth: 1920,
        popW: 290,
        popH: 220
      });

      // Expected leftPos = 800 - 290 - 18 = 492
      expect(result.clampedLeft).toBe(492);
    });

    it('positions RIGHT when selected dot is on the left half of the chart container', () => {
      const result = calculatePopoverPlacement({
        circleX: 300,
        circleY: 100,
        selectedCoordsX: 200, // left half of 1000px container
        selectedCoordsY: 100,
        containerW: 1000,
        windowWidth: 1920,
        popW: 290,
        popH: 220
      });

      // Expected leftPos = 300 + 18 = 318
      expect(result.clampedLeft).toBe(318);
    });

    it('flips UP when selected dot Y is in lower/middle half (y > 150)', () => {
      const result = calculatePopoverPlacement({
        circleX: 300,
        circleY: 400,
        selectedCoordsX: 200,
        selectedCoordsY: 200, // > 150
        containerW: 1000,
        windowWidth: 1920,
        popW: 290,
        popH: 220
      });

      // Expected topPos = 400 - 220 - 10 = 170
      expect(result.clampedTop).toBe(170);
    });

    it('positions DOWN when selected dot Y is near top of graph (y <= 150)', () => {
      const result = calculatePopoverPlacement({
        circleX: 300,
        circleY: 80,
        selectedCoordsX: 200,
        selectedCoordsY: 80, // <= 150
        containerW: 1000,
        windowWidth: 1920,
        popW: 290,
        popH: 220
      });

      // Expected topPos = 80 - 10 = 70
      expect(result.clampedTop).toBe(70);
    });
  });

  describe('formatScatterScore', () => {
    it('floors non-integer scores to whole numbers', () => {
      expect(formatScatterScore(1007499.85)).toBe(1007499);
      expect(formatScatterScore(995000.2)).toBe(995000);
    });

    it('caps scores strictly at 1,010,000 max', () => {
      expect(formatScatterScore(1015000)).toBe(1010000);
      expect(formatScatterScore(1010000)).toBe(1010000);
      expect(formatScatterScore(1009000)).toBe(1009000);
    });

    it('handles null, undefined, or NaN safely', () => {
      expect(formatScatterScore(null)).toBe(0);
      expect(formatScatterScore(undefined)).toBe(0);
      expect(formatScatterScore(NaN)).toBe(0);
    });
  });

  describe('isSameChart', () => {
    it('returns true when chartId or id match', () => {
      expect(isSameChart({ chartId: 10 }, { chartId: 10 })).toBe(true);
      expect(isSameChart({ id: 'c1' }, { id: 'c1' })).toBe(true);
    });

    it('returns true when songId and difficulty match', () => {
      expect(isSameChart({ songId: 1, difficulty: 'MAS' }, { songId: 1, difficulty: 'MAS' })).toBe(true);
    });

    it('returns false when songId matches but difficulty is different', () => {
      expect(isSameChart({ songId: 1, difficulty: 'MAS' }, { songId: 1, difficulty: 'ULT' })).toBe(false);
    });

    it('returns true when title, constant, and score match', () => {
      expect(isSameChart(
        { title: 'Track A', constant: 14.5, score: 1007500 },
        { title: 'Track A', constant: 14.5001, score: 1007500.2 }
      )).toBe(true);
    });

    it('returns false for null or non-matching charts', () => {
      expect(isSameChart(null, { chartId: 1 })).toBe(false);
      expect(isSameChart({ title: 'A' }, { title: 'B' })).toBe(false);
    });
  });

  describe('orderClusterForSelection', () => {
    const cluster = [
      { id: 'song_1', title: 'Song One' },
      { id: 'song_2', title: 'Song Two' },
      { id: 'song_3', title: 'Song Three' }
    ];

    it('moves clicked item to index 0 when selected', () => {
      const ordered = orderClusterForSelection(cluster, { id: 'song_3', title: 'Song Three' }, item => item.id);
      expect(ordered[0].id).toBe('song_3');
      expect(ordered.map(x => x.id)).toEqual(['song_3', 'song_1', 'song_2']);
    });

    it('leaves array unchanged if clicked item is already at index 0', () => {
      const ordered = orderClusterForSelection(cluster, { id: 'song_1', title: 'Song One' }, item => item.id);
      expect(ordered.map(x => x.id)).toEqual(['song_1', 'song_2', 'song_3']);
    });
  });
});
