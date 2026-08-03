---
name: op-math-verifier
description: Verification skill for testing Overpower calculation formulas, Possession plate requirements, and OP% denominator math.
---

# Overpower (OP) & Possession Math Verifier

Use this skill when modifying score processing logic, OP formulas, or Possession plate algorithms.

## Verification Checklist

### 1. Piecewise OP Formula Thresholds
Run `npx vitest run src/lib/calc/overpower.test.ts` and verify calculations against the *CHUNITHM LUMINOUS PLUS* piecewise function:
* **1,007,500+**: `(const * 10000 + 20000 + (score - 1007500) * 3) / 2`
* **1,005,000 - 1,007,499**: `(const * 10000 + 15000 + (score - 1005000) * 2) / 2`
* **1,000,000 - 1,004,999**: `(const * 10000 + 10000 + (score - 1000000)) / 2`
* **975,000 - 999,999**: `(const * 10000 + (score - 975000) * 0.4) / 2`
* **900,000 - 974,999**: `(const * 10000 - 50000 + (score - 900000) * (2/3)) / 2`
* **800,000 - 899,999**: `((const * 10000 - 50000)/2 + (score - 800000) * ((const * 10000 - 50000)/2) / 100000) / 2`
* **500,000 - 799,999**: `(((const * 10000 - 50000)/2) * (score - 500000) / 300000) / 2`

**Lamp Bonuses**:
* Full Combo (FC): +500
* All Justice (AJ): +1000
* All Justice Critical (AJC): +1250

**Rounding Rules**:
* Score $\ge 975,000$: floor to nearest 5.
* Score $< 975,000$: floor to nearest 50.

### 2. OP% Ratio Formula
* Overpower percentage **MUST** be computed as a raw total ratio: `SUM(player_song_ops) / SUM(max_song_ops) * 100`.
* Never use a per-song normalized average.

### 3. Per-Chart Versioning (`chart.version` vs `song.version`)
* Possession plate checks and max OP denominators (`totalSongOp`) **MUST** filter by `charts.version` (or `chart.version || song.version`), NOT `songs.version`.
* Verify that ULTIMA charts debut in their specific added version.
