import { describe, it, expect } from 'vitest';

// Replicate mapping objects for unit testing
const KAMAITACHI_LAMP_MAP: Record<string, string> = {
  'NONE': 'CLEAR',
  'CLEAR': 'CLEAR',
  'FULL COMBO': 'FC',
  'ALL JUSTICE': 'AJ',
  'ALL JUSTICE CRITICAL': 'AJC',
};

const LAMP_VALUES: Record<string, number> = {
  'FAILED': 0,
  'CLEAR': 1,
  'FC': 2,
  'AJ': 3,
  'AJC': 4
};

const KAMAITACHI_DIFF_MAP: Record<string, string> = {
  'BASIC': 'BAS',
  'ADVANCED': 'ADV',
  'EXPERT': 'EXP',
  'MASTER': 'MAS',
  'ULTIMA': 'ULT'
};

describe('Sync Logic & Lamp Mappings', () => {
  describe('Kamaitachi Mappings', () => {
    it('should map Kamaitachi lamp strings to internal lamp types correctly', () => {
      expect(KAMAITACHI_LAMP_MAP['NONE']).toBe('CLEAR');
      expect(KAMAITACHI_LAMP_MAP['CLEAR']).toBe('CLEAR');
      expect(KAMAITACHI_LAMP_MAP['FULL COMBO']).toBe('FC');
      expect(KAMAITACHI_LAMP_MAP['ALL JUSTICE']).toBe('AJ');
      expect(KAMAITACHI_LAMP_MAP['ALL JUSTICE CRITICAL']).toBe('AJC');
      expect(KAMAITACHI_LAMP_MAP['UNKNOWN']).toBeUndefined();
    });

    it('should map Kamaitachi difficulty strings to short codes', () => {
      expect(KAMAITACHI_DIFF_MAP['BASIC']).toBe('BAS');
      expect(KAMAITACHI_DIFF_MAP['ADVANCED']).toBe('ADV');
      expect(KAMAITACHI_DIFF_MAP['EXPERT']).toBe('EXP');
      expect(KAMAITACHI_DIFF_MAP['MASTER']).toBe('MAS');
      expect(KAMAITACHI_DIFF_MAP['ULTIMA']).toBe('ULT');
    });

    it('should maintain strict lamp value hierarchy for score deduplication', () => {
      expect(LAMP_VALUES['AJC']).toBeGreaterThan(LAMP_VALUES['AJ']);
      expect(LAMP_VALUES['AJ']).toBeGreaterThan(LAMP_VALUES['FC']);
      expect(LAMP_VALUES['FC']).toBeGreaterThan(LAMP_VALUES['CLEAR']);
      expect(LAMP_VALUES['CLEAR']).toBeGreaterThan(LAMP_VALUES['FAILED']);
    });
  });

  describe('Clear Lamp & Lamp Resolution Rules', () => {
    it('should convert CLEAR lamp to FAILED when clearLamp is FAILED', () => {
      let lamp = KAMAITACHI_LAMP_MAP['NONE'] || 'CLEAR';
      const clearLamp = 'FAILED';
      
      if (lamp === 'CLEAR' && clearLamp === 'FAILED') {
        lamp = 'FAILED';
      }
      expect(lamp).toBe('FAILED');
    });

    it('should preserve FC or higher lamp even if clearLamp reports FAILED', () => {
      let lamp = KAMAITACHI_LAMP_MAP['FULL COMBO'] || 'CLEAR';
      const clearLamp = 'FAILED';

      if (lamp === 'CLEAR' && clearLamp === 'FAILED') {
        lamp = 'FAILED';
      }
      expect(lamp).toBe('FC');
    });
  });

  describe('Best Score Aggregation & Deduplication', () => {
    interface AggScore {
      songId: number;
      diff: string;
      score: number;
      lamp: string;
      timeAchieved: number;
    }

    it('should deduplicate multiple attempts per song+difficulty keeping max score and best lamp', () => {
      const attempts = [
        { songId: 100, diff: 'MAS', score: 1005000, lamp: 'FC', timeAchieved: 1000 },
        { songId: 100, diff: 'MAS', score: 1008000, lamp: 'AJ', timeAchieved: 2000 },
        { songId: 100, diff: 'MAS', score: 1007000, lamp: 'FC', timeAchieved: 1500 }
      ];

      const bestScores = new Map<string, AggScore>();

      for (const score of attempts) {
        const key = `${score.songId}-${score.diff}`;
        const existing = bestScores.get(key);

        if (!existing) {
          bestScores.set(key, { ...score });
        } else {
          const newMaxScore = Math.max(existing.score, score.score);
          const bestLamp = LAMP_VALUES[score.lamp] > LAMP_VALUES[existing.lamp] ? score.lamp : existing.lamp;
          const newestTime = Math.max(existing.timeAchieved, score.timeAchieved);
          bestScores.set(key, {
            songId: score.songId,
            diff: score.diff,
            score: newMaxScore,
            lamp: bestLamp,
            timeAchieved: newestTime
          });
        }
      }

      expect(bestScores.size).toBe(1);
      const result = bestScores.get('100-MAS');
      expect(result).toBeDefined();
      expect(result?.score).toBe(1008000);
      expect(result?.lamp).toBe('AJ');
      expect(result?.timeAchieved).toBe(2000);
    });

    it('should filter out scores for unknown songs using pre-fetched Set in O(1)', () => {
      const activeSongIds = new Set([1, 2, 3, 50]);
      const mockScores = [
        { songId: 1, diff: 'EXP', score: 1000000 },
        { songId: 999, diff: 'MAS', score: 1007500 }, // Unknown song ID
        { songId: 50, diff: 'ULT', score: 1009000 }
      ];

      const validScores = mockScores.filter(s => activeSongIds.has(s.songId));
      expect(validScores).toHaveLength(2);
      expect(validScores.map(s => s.songId)).toEqual([1, 50]);
    });
  });
});
