import { LampType } from '../types';

/**
 * Calculates the Overpower (OP) for a given score, chart constant, and lamp status.
 * Formula is based on the CHUNITHM LUMINOUS PLUS piecewise system.
 */
export function calculateOp(score: number, constant: number, lamp: LampType): number {
  if (score < 500000) return 0; // Below minimum threshold

  let baseOp = 0;
  
  if (score >= 1007500) {
    baseOp = (constant * 10000 + 20000 + (score - 1007500) * 3) / 2;
  } else if (score >= 1005000) {
    baseOp = (constant * 10000 + 15000 + (score - 1005000) * 2) / 2;
  } else if (score >= 1000000) {
    baseOp = (constant * 10000 + 10000 + (score - 1000000)) / 2;
  } else if (score >= 975000) {
    baseOp = (constant * 10000 + (score - 975000) * 0.4) / 2;
  } else if (score >= 900000) {
    baseOp = (constant * 10000 - 50000 + (score - 900000) * (2/3)) / 2;
  } else if (score >= 800000) {
    baseOp = ((constant * 10000 - 50000) / 2 + (score - 800000) * ((constant * 10000 - 50000) / 2) / 100000) / 2;
  } else if (score >= 500000) {
    baseOp = (((constant * 10000 - 50000) / 2) * (score - 500000) / 300000) / 2;
  }

  // Apply Lamp Bonus
  let lampBonus = 0;
  if (lamp === 'FC') lampBonus = 500;
  if (lamp === 'AJ') lampBonus = 1000;
  if (lamp === 'AJC') lampBonus = 1250;
  
  const totalOp = baseOp + lampBonus;

  // Rounding:
  // For scores >= 975,000, floored to nearest 5
  // For scores < 975,000, floored to nearest 50
  if (score >= 975000) {
    return Math.floor(totalOp / 5) * 5;
  } else {
    return Math.floor(totalOp / 50) * 50;
  }
}
