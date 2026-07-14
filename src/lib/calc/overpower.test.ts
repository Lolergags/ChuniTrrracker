import { describe, it, expect } from 'vitest';
import { calculateOp } from './overpower';

describe('calculateOp', () => {
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

  it('applies lamp bonuses correctly', () => {
    // Score 1,007,500, Const 14.0 -> Base OP 80000
    expect(calculateOp(1007500, 14.0, 'FC')).toBe(80500);
    expect(calculateOp(1007500, 14.0, 'AJ')).toBe(81000);
    expect(calculateOp(1007500, 14.0, 'AJC')).toBe(81250);
  });
});
