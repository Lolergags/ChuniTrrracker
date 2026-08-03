---
name: sqlite-audit
description: Auditor for SQLite query execution plans, index coverage, engine PRAGMA tuning, math optimizations on large datasets, and high-density graph rendering performance.
---

# SQLite Performance & Dataset Visualization Auditor

Use this skill when modifying database schemas/queries, performing aggregate math functions over large score datasets, configuring SQLite engine parameters (`server/db.ts`), adding endpoints in `server/routes.ts`, or optimizing high-density Recharts graphs (`Dashboard.tsx`, `GlobalStats.tsx`).

---

## 1. SQLite Engine & PRAGMA Tuning

Verify that SQLite connection startup in `server/db.ts` executes optimized PRAGMA flags to maximize I/O throughput and memory efficiency:

```typescript
// Optimized PRAGMA settings for high-concurrency read/write operations
db.pragma('journal_mode = WAL');       // Write-Ahead Logging for non-blocking concurrent reads
db.pragma('synchronous = NORMAL');     // Reduces disk sync latency during batch writes in WAL mode
db.pragma('temp_store = MEMORY');      // Stores temp B-Trees and sort tables in RAM instead of disk
db.pragma('cache_size = -64000');      // 64MB dedicated RAM page cache
db.pragma('mmap_size = 268435456');    // 256MB OS Memory-Mapped I/O for zero-copy file access
```

---

## 2. Execution Plan & Indexing Audit

### Covering Index Verification
Verify that all heavy joins (`scores JOIN charts JOIN songs`) utilize composite covering indexes so SQLite executes **Index-Only Scans** without reading main table pages:
* `idx_scores_player_chart_op` on `scores(player_id, chart_id, op, score)`
* `idx_charts_ver_diff_song` on `charts(version, difficulty, song_id, id)`
* `idx_scores_chart_player` on `scores(chart_id, player_id)`
* `idx_charts_version` on `charts(version)`

### EXPLAIN QUERY PLAN Audit
Execute `EXPLAIN QUERY PLAN` on aggregate SQL queries to verify index usage:
```sql
EXPLAIN QUERY PLAN
SELECT s.chart_id, COUNT(*) as playCount
FROM scores s
WHERE s.player_id = ? AND s.chart_id IN (...)
GROUP BY s.chart_id;
```
* **Pass Criteria**: Output displays `USING COVERING INDEX` or `SEARCH TABLE USING INDEX`.
* **Fail Criteria**: Output displays `SCAN TABLE` or `USE TEMP B-TREE FOR GROUP BY`.

### N+1 Subquery Elimination
* **Never** execute SQL queries inside JavaScript loops (`.map()`, `.forEach()`).
* Replace full-table un-indexed `LEFT JOIN (SELECT chart_id, COUNT(*) FROM scores GROUP BY chart_id)` with correlated index lookups `(SELECT COUNT(*) FROM scores s2 WHERE s2.chart_id = c.id)` or batched `IN (...)` queries.

---

## 3. High-Performance SQL Math & Aggregation Patterns

When executing heavy aggregate math (`SUM(op)`, `AVG(score)`, `ROUND()`, `CAST()`) across tens of thousands of score rows:

### Conditional Aggregates (`FILTER (WHERE ...)`)
Use SQLite 3.30+ `FILTER (WHERE ...)` syntax to compute multiple lamp counts in a single query pass instead of verbose `CASE WHEN` constructs or multiple `SELECT` calls:
```sql
SELECT 
  COUNT(*) FILTER (WHERE s.lamp = 'AJC') as ajcCount,
  COUNT(*) FILTER (WHERE s.lamp = 'AJ') as ajCount,
  COUNT(*) FILTER (WHERE s.lamp = 'FC') as fcCount,
  COUNT(*) FILTER (WHERE s.lamp = 'CLEAR') as clearCount
FROM scores s
WHERE s.player_id = ?;
```

### Pre-Aggregated Grouping Subqueries
Aggregate raw scores before joining metadata tables to reduce intermediate row counts:
```sql
-- Fast: Group and MAX(op) on indexed columns first, then join metadata
JOIN (
  SELECT s.player_id, c.song_id, MAX(s.op) as max_op
  FROM scores s
  JOIN charts c ON s.chart_id = c.id
  WHERE ...
  GROUP BY s.player_id, c.song_id
) max_scores ON p.id = max_scores.player_id
```

### Transaction Batching for Writes
Wrap bulk score syncs or multi-row imports inside explicit `db.transaction(() => { ... })()` wrappers. Batching 10,000 score writes inside a single transaction reduces disk write operations from 10,000 auto-commits to 1 atomic commit (<20ms).

### In-Memory Response Caching & Invalidation
* All endpoints running math aggregations (`/leaderboards`, `/performance/chart-meta`, `/performance/op-distribution`, `/players/:username/scores`) **MUST** utilize in-memory response caching (`server/utils/cache.ts`).
* Cache keys must normalize query parameters (`normalizeQueryCacheKey(...)`).
* All cache entries MUST be automatically invalidated via `clearAllCaches()` immediately when new scores are imported.

---

## 4. High-Density Graph & Scatter Plot Visuals

When rendering thousands of data points on frontend charts (`Dashboard.tsx`, `GlobalStats.tsx`):

### Viewbox Spatial Culling (Off-Screen Filtering)
Pre-filter scatter plot data arrays against current zoom domains (`scatterZoomX`, `scatterZoomY`) before passing them to `<Scatter>`:
```typescript
const visibleScatterData = useMemo(() => {
  if (!scatterZoomX && !scatterZoomY) return mappedScatterScores;
  return mappedScatterScores.filter(d => {
    const inX = !scatterZoomX || (d.constant >= scatterZoomX[0] && d.constant <= scatterZoomX[1]);
    const inY = !scatterZoomY || (d.score >= scatterZoomY[0] && d.score <= scatterZoomY[1]);
    return inX && inY;
  });
}, [mappedScatterScores, scatterZoomX, scatterZoomY]);
```
This ensures Recharts only constructs SVG DOM nodes for points currently visible inside the viewbox frame.

### $O(N)$ Grid Proximity Hash for Overlap Detection
Avoid $O(N^2)$ pairwise comparisons when detecting stacked scatter plot dots. Group points into spatial grid buckets ($\text{bucketX} = \lfloor \text{constant} / 0.05 \rfloor$, $\text{bucketY} = \lfloor \text{score} / 2500 \rfloor$) to compute visual overlaps in $O(N)$ time.

### Frontend Song Deduplication
In high-density scatter plots, deduplicate charts per song (`reduce` inside `useMemo`) so that only the chart yielding maximum OP is plotted on the DOM tree.

### Recharts SVG Animation Disabling
Always set `isAnimationActive={false}` on `<Scatter>` and `<BarChart>` elements to prevent SVG animation layout thrashing during graph renders or viewport zooms.

### React.memo Component Memoization
Wrap custom SVG shape renderers (`CustomScatterDot`) in `React.memo(...)` with strict primitive prop checks (`cx`, `cy`, `isSelected`, `isHovered`). This avoids re-rendering thousands of inactive scatter SVG nodes when panning, zooming, or hovering single dots.

### Deferred Search & Viewport Filtering
Use React `useDeferredValue` on text search inputs and memoized filter bounds (`scatterZoomX`, `scatterZoomY`) to keep graph pan/zoom input response instant without blocking main thread frame rates.
