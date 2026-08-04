import { describe, it, expect } from 'vitest';
import { calculateOp } from './overpower';

describe('calculateOp', () => {
  it('returns 0 for scores below 500,000 threshold', () => {
    expect(calculateOp(499999, 14.0, 'CLEAR')).toBe(0);
    expect(calculateOp(0, 14.0, 'CLEAR')).toBe(0);
  });

  it('calculates OP correctly for scores >= 1007500', () => {
    // Score 1,007,500, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 20000 + (1007500 - 1007500) * 3) / 2 = 160000 / 2 = 80000
    // >= 975000, so floored to nearest 5 -> 80000
    expect(calculateOp(1007500, 14.0, 'CLEAR')).toBe(80000);
    
    // Score 1,009,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 20000 + 1500 * 3) / 2 = 164500 / 2 = 82250 -> 82250
    expect(calculateOp(1009000, 14.0, 'CLEAR')).toBe(82250);
  });

  it('calculates OP correctly for scores between 1005000 and 1007499', () => {
    // Score 1,005,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 15000 + 0) / 2 = 155000 / 2 = 77500
    expect(calculateOp(1005000, 14.0, 'CLEAR')).toBe(77500);

    // Score 1,006,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 15000 + 1000 * 2) / 2 = 157000 / 2 = 78500
    expect(calculateOp(1006000, 14.0, 'CLEAR')).toBe(78500);
  });

  it('calculates OP correctly for scores between 1000000 and 1004999', () => {
    // Score 1,000,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 10000 + 0) / 2 = 150000 / 2 = 75000
    expect(calculateOp(1000000, 14.0, 'CLEAR')).toBe(75000);

    // Score 1,002,500, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 10000 + 2500) / 2 = 152500 / 2 = 76250
    expect(calculateOp(1002500, 14.0, 'CLEAR')).toBe(76250);
  });

  it('calculates OP correctly for scores between 975000 and 999999', () => {
    // Score 975,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 + 0) / 2 = 140000 / 2 = 70000
    expect(calculateOp(975000, 14.0, 'CLEAR')).toBe(70000);
  });

  it('calculates OP correctly for scores between 900000 and 974999', () => {
    // Score 900,000, Const 14.0, CLEAR
    // OP = (14.0 * 10000 - 50000 + 0) / 2 = 90000 / 2 = 45000
    // < 975000, so floored to nearest 50 -> 45000
    expect(calculateOp(900000, 14.0, 'CLEAR')).toBe(45000);
  });

  it('calculates OP correctly for scores between 800000 and 899999', () => {
    // Score 850,000, Const 14.0
    // base = ((14.0 * 10000 - 50000)/2 + 50000 * ((14.0 * 10000 - 50000)/2)/100000) / 2
    // base = (45000 + 50000 * 45000 / 100000) / 2 = (45000 + 22500) / 2 = 33750
    // < 975000 -> floored to nearest 50 -> 33750
    expect(calculateOp(850000, 14.0, 'CLEAR')).toBe(33750);
  });

  it('calculates OP correctly for scores between 500000 and 799999', () => {
    // Score 500,000 -> minimum non-zero OP score -> 0
    expect(calculateOp(500000, 14.0, 'CLEAR')).toBe(0);

    // Score 650,000, Const 14.0
    // base = ((14*10000 - 50000)/2 * 150000 / 300000) / 2 = (45000 * 0.5) / 2 = 11250
    // < 975000 -> floored to nearest 50 -> 11250
    expect(calculateOp(650000, 14.0, 'CLEAR')).toBe(11250);
  });

  it('floors base OP to nearest 5 for scores >= 975000 and nearest 50 for scores < 975000', () => {
    // Score 975,003 -> Base OP without rounding = (100000 + 3 * 0.4) / 2 = 50000.6
    // Floored base = 50000 -> Nearest 5 -> 50000
    expect(calculateOp(975003, 10.0, 'CLEAR')).toBe(50000);

    // Score 900,035 -> Base OP = (100000 - 50000 + 35 * 2/3) / 2 = 25011.666
    // Floored base = 25011 -> Nearest 50 -> 25000
    expect(calculateOp(900035, 10.0, 'CLEAR')).toBe(25000);
  });

  it('handles minimum and maximum constant bounds (1.0 to 15.4)', () => {
    // Const 1.0, Score 1007500 -> (10000 + 20000)/2 = 15000
    expect(calculateOp(1007500, 1.0, 'CLEAR')).toBe(15000);

    // Const 15.4, Score 1007500 -> (154000 + 20000)/2 = 87000
    expect(calculateOp(1007500, 15.4, 'CLEAR')).toBe(87000);
  });

  it('applies lamp bonuses correctly', () => {
    // Score 1,007,500, Const 14.0 -> Base OP 80000
    expect(calculateOp(1007500, 14.0, 'FC')).toBe(80500);
    expect(calculateOp(1007500, 14.0, 'AJ')).toBe(81000);
    expect(calculateOp(1007500, 14.0, 'AJC')).toBe(81250);
  });
});
