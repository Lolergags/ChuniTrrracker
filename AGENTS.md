# ChuniTrrracker - Agent Instructions & Project Context

ChuniTrrracker is a statistics tracking and visualization website for the rhythm game **Chunithm**. Its primary focus is calculating and displaying "Overpower" (OP) metrics for players, sourcing data from Kamaitachi.

## Project Overview

The project aims to provide a more detailed view of player progress than what is currently available on standard trackers. It uses the OP calculation system introduced in *CHUNITHM LUMINOUS PLUS*.

### Key Goals
1. **Data Integration:** Import player scores from [Kamaitachi](https://kamai.tachi.ac/) and song metadata from [beerpsi's song list](https://chunithm.beerpsi.cc/songs).
2. **OP Calculations:** Implement the complex piecewise formulas for Overpower gain based on score ranges and chart constants.
3. **Leaderboards:** Create a global leaderboard based on total OP and other non-standard statistics (e.g., average score).
4. **Song Analytics:** Provide per-song statistics like AJC (All Justice Critical) counts and difficulty rankings independent of level constants.
5. **Performance Analysis:** Visualize player strengths and weaknesses (stamina, speed, tech) through data clustering and graphs.

## Technical Stack

* **Logic Prototype:** Python (utilizing `polars` for high-performance data manipulation and `requests` for API interaction).
* **Target Implementation:** TypeScript (Strict Mode).
* **Data Sources:**
  * Kamaitachi API (`https://kamai.tachi.ac/api/v1/...`)
  * Chunithm Song List (`https://chunithm.beerpsi.cc/songs`)
* **Deployment:** Docker (Unraid NAS).

## Project Structure

* `README.md`: High-level project summary and goals.
* `Reference/`: Contains research and logic prototypes.
  * `Overpower.ipynb`: A comprehensive Jupyter notebook containing the core OP calculation logic, data fetching scripts, and aggregation examples using Polars.
* `AGENTS.md`: Authoritative instruction context for AI agents.

## OP Calculation Logic (from `Overpower.ipynb`)

The OP calculation is a piecewise function based on the user's score relative to the chart's constant (`const`):

| Score Range | OP Formula Base |
| :--- | :--- |
| 1,007,500+ | `(const * 10000 + 20000 + (score - 1007500) * 3) / 2` |
| 1,005,000 - 1,007,499 | `(const * 10000 + 15000 + (score - 1005000) * 2) / 2` |
| 1,000,000 - 1,004,999 | `(const * 10000 + 10000 + (score - 1000000)) / 2` |
| 975,000 - 999,999 | `(const * 10000 + (score - 975000) * 0.4) / 2` |
| 900,000 - 974,999 | `(const * 10000 - 50000 + (score - 900000) * (2/3)) / 2` |
| 800,000 - 899,999 | `((const * 10000 - 50000)/2 + (score - 800000) * ((const * 10000 - 50000)/2) / 100000) / 2` |
| 500,000 - 799,999 | `(((const * 10000 - 50000)/2) * (score - 500000) / 300000) / 2` |

**Additional Components:**
* **Lamp Bonus:**
  * FC (Full Combo): +500
  * AJ (All Justice): +1000
  * AJC (All Justice Critical): +1250
* **Rounding:** For scores >= 975,000, the result is floored to the nearest 5. For scores < 975,000, it is floored to the nearest 50.

### Possession Plate Requirements
Players can earn a possession plate based on a combination of their OP% and their minimum score rank across **all** Master and Ultima charts for a given version. The requirements are calculated cumulatively (including all charts released up to that version):

| Possession Rank | Minimum OP% | Minimum Grade on ALL Master/Ultima |
| :--- | :--- | :--- |
| **Rainbow** | 99.5% | SSS (1,007,500+) |
| **Platinum** | 99.0% | SS (1,000,000+) |
| **Gold** | 97.5% | S+ (990,000+) |
| **Silver** | (None) | S (975,000+) |

## UI & UX Constraints

* **React Conditional Rendering:** When conditionally rendering UI elements based on string values (e.g., `{searchInput && <Dropdown />}`), NEVER use the raw string variable. An empty string (`""`) evaluates as truthy enough to render an invisible text node in the DOM. In flex containers, this establishes a baseline and causes dramatic layout shifts/page jumps. Always use strict boolean evaluations: `{searchInput.trim().length > 0 && <Dropdown />}`.
* **Dropdown Menus:** Avoid using the native HTML `<datalist>` element for search bars or autocompletes, as its dropdown positioning and styling are erratic across browsers. Always reuse or implement custom React dropdown components (like `PlayerAutocomplete`).
* **Select Element Backgrounds:** When adding standard `<select>` dropdowns, ensure you use `var(--bg-secondary)` or `var(--bg-primary)` for the background color rather than undefined variables like `var(--bg-color)`. Failing to set a valid dark background causes the `<option>` elements to inherit a default white background on Windows browsers, leading to illegible white-on-white text.
* **Password Manager Suppression:** General text inputs for system lookups (like usernames or Kamaitachi IDs) frequently trigger password managers like Bitwarden. Always suppress them by applying the following attributes to the `<input>`: `data-1p-ignore="true"`, `data-bwignore="true"`, `autoComplete="off"`, `autoCorrect="off"`, and `spellCheck="false"`.
* **Dual Range Sliders:** Never attempt to build dual-range sliders by stacking two native `<input type="range">` elements and relying on `pointer-events: none` to pass clicks through to the lower slider. Cross-browser shadow DOM bugs (especially in Firefox) will trap the events and make the underlying thumb unclickable. Always implement dual sliders as custom React components utilizing a single parent container with `onPointerDown`/`onPointerMove` DOM handlers.
* **Scatter Plot Asymmetric SVG Axis Clipping:** Applying CSS `clip-path: inset(...)` directly to SVG `<g>` elements inside responsive `<svg>` containers evaluates `inset()` coordinates relative to the `<svg>` root viewbox (including axis tick margins), which distorts or fails to clip points at the axis lines. Always use an explicit SVG `<clipPath id="custom-scatter-clip">` inside `<defs>` with `<rect x="105" y="-500" width="10000" height="875" />` and point `.recharts-scatter` to `clip-path: url(#custom-scatter-clip) !important`. This strictly clips scatter circles at $x=105$ (Y-axis line) and $y=375$ (X-axis line) so dots never bleed onto axis tick numbers, while allowing top ($y < 20$) and right points to render into margin space without visual clipping.
* **Scatter Plot Zooming, Viewport Sliders & Ticks:** 
    * **Independent Smooth Axis Clamping:** When zooming out, evaluate X and Y boundaries independently (`newMinX <= defX[0] && newMaxX >= defX[1]` -> `setZoomX(null)`). Never forcibly snap both axes back to null simultaneously based on a premature percentage threshold (`0.95`), as this causes abrupt visual jumping when one axis is unzoomed while the other is still zoomed in. Allow each axis to smoothly expand tick-by-tick up to its own default boundary.
    * **Domain Clamping Bounds:** Always enforce strict lower bounds ($X_{min} \ge 1.0$, $Y_{min} \ge 0$) and upper bounds ($Y_{max} \le 1,010,000$) to prevent negative axis ticks or viewport collapse.
    * **Direct Edge Handle Dragging Unzoomed:** Viewport slider edge handles must evaluate hit-testing (`Math.abs(clickPos - edgePx) <= 14`) independently of `isZoomed` state to allow direct edge handle resizing starting from 100% unzoomed states.
    * **Inline Input Popovers & Container Blur Scoping:** When constructing multi-field popover editors (such as Min/Max slider badges), NEVER place `onBlur` on individual `<input>` elements. Wrap the popover in a container and evaluate `if (!e.currentTarget.contains(e.relatedTarget))` so switching focus between input fields does not prematurely close the editor. Always render range editors as floating absolute popovers (`position: absolute; z-index: 100`) to guarantee zero layout shift on surrounding chart tracks.
    * **Input Boundary Auto-Correction & Sanitization:** Never silently drop invalid range inputs (e.g. `min >= max`). Use `sanitizeRangeInputs(...)` to automatically adjust boundaries by `minStep` (`0.1` for level, `1000` for score), invoke `onZoomChange([clampedMin, clampedMax])`, and update local input state so the viewport ALWAYS updates smoothly without mobile scroll jumps.
    * **X-Axis Ticks & Clean Labels:** Omit redundant text label attributes (`label={{ value: 'Chart Constant', ... }}`) from `<XAxis>` to maximize vertical plotting area and keep ticks visually clean.
    * **Fixed Container Dimensions:** Wrap scatter charts in explicit fixed-height containers (e.g. `height: 420px`) with fixed margins `{ top: 20, right: 30, bottom: 40, left: 25 }` to prevent dynamic DOM reflow layout jitter when hovering dots or toggling zoom states.
* **Mobile Touch Panning & Dynamic Scroll Modes:**
    * **Touch Propagation & `touchAction`:** Apply `onTouchStart={(e) => e.stopPropagation()}` and `onPointerDown={(e) => e.stopPropagation()}` to popover input containers. Omit `autoFocus` on mobile popover inputs. Never use `touchAction: 'pan-y'` on graph containers if horizontal panning is desired; use `touchAction: 'pan-x pan-y'`.
    * **Dynamic DOM Scroll vs Domain Pan Switching:** Inspect `elem.scrollWidth > elem.clientWidth + 5`. If true (DOM scrollbar active), 1-finger horizontal touch swipes scroll `elem.scrollLeft`. If false (full graph viewable on screen), 1-finger touch dragging updates coordinate zoom domains (`scatterZoomX`/`scatterZoomY`) to drag slider bars directly.
* **Text Selection Suppression During Drag Gestures:** When users click and drag across interactive charts for panning, surrounding axis tick numbers and text labels become highlighted by default browser text selection. Always apply CSS text selection suppression: `.scrollable-content-wrapper, .recharts-wrapper, .recharts-cartesian-axis-tick-value { user-select: none !important; -webkit-user-select: none !important; }`.
* **Scatter Plot Persistent Selection Popover & React Portal Overlay:**
    * **Mouse-Move Persistence via Portal:** Never rely on Recharts native `<Tooltip active={true}>` for persistent dot selection. Recharts internal `<Scatter>` component dispatches `isTooltipActive = false` on mouse move, hiding native tooltips. Render pinned selection cards via React `createPortal(..., document.body)` (`position: fixed`, `z-index: 10000`) driven by `CustomSelectedScatterDot` coordinate callbacks (`onUpdateCoords({ x: cx, y: cy })`).
    * **Graph Scrollbar Suppression:** Keep chart container overflow clean (`overflow-y: hidden`). Because the popover is mounted into `document.body` via `createPortal`, it floats above all UI elements without causing vertical scrollbars on the graph container.
    * **Horizontal Quadrant Placement:** Evaluate $X$ relative to chart canvas width (`containerW`). If `selectedCoords.x > containerW / 2` (or `x + popW + 18 > containerW - 20`), flip **LEFT** (`circleX - popW - 18`); otherwise place **RIGHT** (`circleX + 18`).
    * **Vertical Quadrant Placement:** If `selectedCoords.y > 150`, flip **UP** (`circleY - popH - 10`) to match Recharts' native hover position for dots in the middle/lower half of the Y-axis.
    * **Score Display Normalization:** Scores rendered in scatter tooltips, overview bars, and overlap lists must be floored integer values capped at `1,010,000` (`Math.min(1010000, Math.floor(score))`).
    * **Cluster Sorting & Arrow Key Cycling:** On initial dot selection click, place the clicked chart at index 0 of the cluster list so it appears at the top of Page 1. Keep cluster ordering stable when cycling with arrow keys.

## Development Conventions

* **TypeScript:** Use strict mode.
* **Logic Porting:** When moving logic from the Python notebook to TypeScript, ensure parity with the `polars` aggregations and the piecewise OP formula.
* **Testing:** 
    * **Unit Tests:** Use `vitest` for all mathematical logic, utility functions, and backend queries. Place test files adjacent to the code they test or in dedicated backend directories (e.g., `server/queries.test.ts`).
    * **Bug Regression:** Whenever an issue, logical flaw, or edge case is encountered and fixed (e.g., duplicate SQL records, negative UI bounds), **you must write an automated test case** to verify the fix and ensure the error does not repeat.
    * **SQL & Backend Tests:** For database query logic, spin up an in-memory SQLite database (`new Database(':memory:')`), seed it with explicit edge-case data, and strictly verify the output.
* **Git Commits & Prefixes:** The development environment requires the `--no-gpg-sign` flag for all `git commit` commands to bypass GPG signing timeout errors (e.g., `git commit --no-gpg-sign -m "..."`). Standardize commit message prefixes: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `workflow:`, or `chore:`.
* **Branch Naming Conventions:** When creating new branches for development, use structured category prefixes: `feat/<name>`, `fix/<name>`, `refactor/<name>`, `workflow/<name>`, or `docs/<name>`.
* **Pull Request Merges & Branch Isolation:** When completing commits on a feature branch, ALWAYS push the commits to the corresponding feature branch on GitHub (`git push origin <branch-name>`) so remote tracking and deployment managers reflect the update. However, NEVER perform a direct local `git merge` into `main`, and NEVER automatically create a Pull Request (`gh pr create`) or merge into `main` after completing work on a feature branch. Approving an audit, design proposal, or implementation plan does NOT grant permission to open a Pull Request. The user MUST send an EXPLICIT, separate request specifically asking to open a Pull Request (e.g. "make a pull request and push to main"). Feature branch changes MUST remain strictly isolated on their feature branch until that explicit directive is given.
* **GitHub Ruleset & Branch Protection (`Protect Main Branch`):** The repository enforces active GitHub Ruleset `Protect Main Branch` (ID: 20353275) on `refs/heads/main`. Direct branch deletion and non-fast-forward force-pushes are blocked. Required status check `test` (`npm run test:all`) MUST pass before any Pull Request can be merged.
* **Docker Container Restart Exit Code 100:** When implementing in-app software updates or restart managers under Docker's `--restart=on-failure` policy, calling `process.exit(0)` is treated as an intentional clean shutdown and will leave the container permanently stopped. Always exit with exit code 100 (`process.exit(100)`) to signal an unclean exit that triggers Unraid / Docker container supervisors to immediately restart the container.

## Kamaitachi Integration Quirks & Edge Cases

* **API Pathing:** Chunithm is a single-playtype game. Kamaitachi drops the playtype segment entirely from the route. Use `/games/chunithm/pbs/all` (do NOT include `/Single`).
* **Rate Limiting & Safety:** Kamaitachi strictly enforces rate limits (~60 requests/minute). Any backend looping logic (e.g., scraping, bulk syncing) that triggers external Kamaitachi API requests **MUST** implement a minimum `1.5-second (1500ms) delay` between iterations to avoid 429 Too Many Requests errors and IP bans.
* **Endpoint Selection:** Always use the `pbs/all` (Personal Bests) endpoint instead of `scores/all` to automatically retrieve the highest score and best lamp correctly merged by Kamaitachi.
* **Player Rating Pathing:** The overall player rating is nested within the `gameStats` object under a specific `ratings` sub-object. When fetching `https://kamai.tachi.ac/api/v1/users/{id}/games/chunithm`, you must extract the rating via `body.gameStats.ratings.naiveRating`. Do not attempt to read `body.gameStats.rating`.
* **Ghost Charts (Unmapped DB Entries):** Kamaitachi tracks legacy/phantom chart records (e.g., `chart.id` 95, 201, 239116) that do not map to any active in-game track. Whenever calculating global chart denominators (e.g., Possession plate requirements or completion percentages), you **MUST** apply a hardcoded blacklist (`(c.song_id NOT IN (50, 81) AND c.id != 239116)`) in the SQL query. Failing to do so inflates the denominator and makes 100% completion mathematically impossible for users.
* **Data Normalization:** Kamaitachi identifies songs with string IDs (e.g. `S...`). You must map these to the local integer IDs (sourced from Beerpsi) by matching the `chart.data.inGameID` property found in the Kamaitachi chart object. DO NOT match by `title`, as Chunithm contains duplicate song names that will cause silent data loss.
* **Global Filtering Paradigm:** Kamaitachi tracks all scores (Omnimix), including charts that have been deleted or are International-only. When importing scores in `sync.ts`, **import everything that exists in the local database**. Do NOT skip `is_jp_active = 0` charts. Instead, apply the `getChartFilterConditions()` utility from `server/utils/filters.ts` to all backend endpoints (`routes.ts`) to dynamically slice the charts and scores by Server (`JP`, `INT`, `PL_OFFLINE`, `OMNI`), Difficulty, and Version. This ensures mathematically perfect denominator/numerator matching for completion graphs.
* **4th Offline Server List (`PL_OFFLINE`):** ChuniTrrracker supports 4 server list options: `JP` (Standard), `INT` (International), `PL_OFFLINE` (Paradise Lost Offline), and `OMNI` (Omnimix - All). The Paradise Lost Offline songlist is fetched from `https://raw.githubusercontent.com/Lolergags/Paradise_Lost_Offline_Songlist/main/paradiselost_offline_songs.json`. Song availability is tracked in the `songs` table via `is_pl_offline_active INTEGER NOT NULL DEFAULT 0`. Because ULTIMA charts did not exist in *PARADISE LOST* and the cab is frozen at *PARADISE LOST*, queries for `PL_OFFLINE` MUST always exclude ULTIMA charts (`charts.difficulty != 'ULT'`) and cap cumulative version filtering at `PARADISE LOST` (so selecting versions above `PARADISE LOST` does not inflate song or chart counts).
* **Version Filtering Modes:** When slicing player statistics globally, apply *cumulative* version filtering (i.e. "Time Machine" mode where `LUMINOUS` includes `SUN`, `NEW`, etc.). When filtering specific song lists (e.g. Song Analytics), use *strict* version matching to simulate in-game version folders.
* **Per-Chart Versioning (`chart.version` vs `song.version`):** Chunithm songs frequently receive ULTIMA (`ULT`) charts added in game versions released long after the song's initial debut (e.g. a `CHUNITHM` song receiving an ULTIMA chart in `SUN` or `X-VERSE-X`). Per `Overpower.ipynb` (line 171), each chart's added version MUST be defined as `chart.version || song.version` and stored in `charts.version`. All cumulative version filtering ("Time Machine" mode), Possession plate calculations, and max OP denominators (`totalSongOp`) MUST filter by `charts.version IN (...)` (or `c.version`), NOT `songs.version`. Filtering by `songs.version` incorrectly includes future ULTIMA charts in past version denominators, inflating chart counts (`masUlt`) and max OP, which breaks possession badges for all versions after `AIR`.
* **Version Ordering:** The chronological version order is: `CHUNITHM → CHUNITHM PLUS → AIR → AIR PLUS → STAR → STAR PLUS → AMAZON → AMAZON PLUS → CRYSTAL → CRYSTAL PLUS → PARADISE → PARADISE LOST → NEW → NEW PLUS → SUN → SUN PLUS → LUMINOUS → LUMINOUS PLUS → VERSE → X-VERSE → X-VERSE-X → MATE`. This order must be kept in sync across `server/utils/filters.ts` (`CHRONOLOGICAL_VERSIONS`), the local `VERSION_ORDER` in `server/routes.ts` (leaderboard route), and the `<select>` dropdown in `src/components/GlobalFilterBar.tsx`. When new versions are added, update **all three** locations.
* **OP% Formula:** Overpower percentage MUST be calculated as a **raw total ratio**: `SUM(player_song_ops) / SUM(max_song_ops) * 100`. Do NOT use a per-song normalized average (`SUM(player_op / max_op) / song_count * 100`). The raw ratio matches the in-game calculation and the reference Python notebook (`int(op / max_op * 10000) / 100`). This applies to the leaderboard display, player dashboard, OP distribution, and possession checks.
* **Player Identification & Username Mutability:** Player usernames are dynamic display values that can be changed by users. NEVER treat usernames as static or immutable identifiers in SQL `WHERE` / `JOIN` clauses or score aggregation logic. Always resolve the immutable `player.id` (or `kamaitachi_id`) integer primary key first (e.g., `SELECT id FROM players WHERE username = ? OR kamaitachi_id = ?`) and execute all database queries, score joins, and attempt aggregations strictly using `s.player_id = player.id`.
* **SQLite Constraints & Purging:** Be extremely careful about schema drift. SQLite's `CREATE TABLE IF NOT EXISTS` does not update existing constraints. If you modify constraints like `UNIQUE(player_id, chart_id)`, you must drop the table manually in prototyping environments. Additionally, when executing SQL `DELETE` or `SELECT` queries to purge records based on an external ID (e.g., `kamaitachi_id`), always include a fallback `OR` clause targeting a secondary immutable identifier (e.g., `username`). Legacy records or manual imports may have `NULL` values for external IDs, causing strict `WHERE external_id = ?` queries to silently fail and leave "ghost" records in the database.
* **Frontend NULL Handling:** If a user has exactly 0 scores (e.g. they imported an empty profile), `SUM()` in SQL aggregations evaluates to `NULL`. Always implement fallback logic (`|| 0`) on backend responses and frontend numerical properties (like `.toFixed(2)`) to prevent fatal React render crashes.
* **Scatter Plot Deduplication:** When plotting player scores across the entire track list, ensure the backend endpoint returns `songId`. Use `reduce` (within a `useMemo` hook) on the frontend to deduplicate charts per song, ensuring only the chart yielding the maximum OP is plotted. Also apply limits and dynamic domains (`Math.max()`) to keep axes from flattening out due to low-scoring attempts.
* **Recharts Stacked Bars:** Recharts renders the first `<Bar>` element at the bottom of the visual stack. When building progression charts (e.g. Fail -> Clear -> AJC), define the lowest achievements first in the JSX. If a specific legend order is required, use a custom `<Legend payload={...}>` rather than reordering the bars.
* **Recharts Stack Transparency:** When using `stackOffset="expand"`, do not use `fill="transparent"` for empty/unplayed padding bars. It creates an optical illusion of 100% completion against dark backgrounds. Use a faint color like `rgba(255,255,255,0.05)` instead.
* **Recharts BarChart Domains:** When using a `<BarChart>` to plot percentage data (e.g., OP Yield 0-100%), NEVER use dynamic domains like `domain={['auto', 'auto']}` on the `<YAxis>`. `BarChart` rectangles require a strict baseline of `0` to render visually. Always explicitly define the domain (e.g., `domain={[0, 100]}`).

## Frontend & Backend State Conventions

* **React Polling & Closures:** When implementing background polling (e.g., `setInterval` inside `useEffect`), NEVER use `useState` for initialization flags or trackers that must be read inside the loop. The state will get trapped in a stale closure, leading to infinite loops or overridden inputs. Always use `useRef` (e.g., `isInitialized.current`) to bypass the closure and maintain accurate mutable state across polling ticks.
* **Refactored Pan Dragging with Window Listeners & useRef:** Implementing click-and-drag panning using React `useState` trapped inside DOM event listeners leads to stale closures where domain bounds fail to update during drag movements. Always maintain current zoom domains and pan states in `useRef` (`scatterZoomXRef`, `scatterZoomYRef`, `defaultXRef`, `defaultYRef`), attach `mousedown` / `touchstart` listeners to chart container, and attach `mousemove` / `mouseup` / `touchmove` / `touchend` listeners directly to `window`. Calculate deltas dynamically relative to container bounding client rect (`getBoundingClientRect()`) and invoke `e.preventDefault()` to prevent mobile page scroll hijacking during graph panning.
* **Configuration Persistence:** Do not rely on in-memory Node.js variables for configuration settings (like cron schedules, scraper bounds, or UI toggles). Always persist these settings to the SQLite `config` table (`db.prepare('INSERT INTO config ...')`) to ensure they survive server restarts, hot-reloads, and deployments.

## Backend Performance & Optimization Conventions

* **Proactive Database Indexing (Covering Indexes):** When creating tables or querying across foreign key relationships (e.g. `scores JOIN charts JOIN songs`), always create composite covering indexes (e.g. `idx_scores_player_chart_op` on `scores(player_id, chart_id, op, score)`, `idx_charts_ver_diff_song` on `charts(version, difficulty, song_id, id)`, and `idx_scores_chart_player` on `scores(chart_id, player_id)`) so SQLite can execute **Index-Only Scans** without reading main table pages.
* **Eliminate N+1 Queries & Unscoped Subqueries:** Never execute SQL queries inside a JavaScript `.map()`, `.forEach()`, or loop construct for items returned by a parent query (e.g., querying possession badges for 50 top players one by one). Avoid full-table un-indexed `LEFT JOIN (SELECT chart_id, COUNT(*) FROM scores GROUP BY chart_id)` subqueries inside per-player score queries; replace them with correlated index lookups `(SELECT COUNT(*) FROM scores s2 WHERE s2.chart_id = c.id)` or batch queries.
* **Response Caching & Invalidation Patterns:** Endpoints that compute heavy aggregations across scores (e.g. Global Leaderboard, Global Performance Analytics, Song Chart Leaderboards, Player Dashboard) MUST cache calculated JSON responses in memory (`server/utils/cache.ts`) keyed by query parameters (`req.query`). All cache entries MUST be automatically invalidated (`clearAllCaches()`) whenever player scores are imported or updated in `sync.ts`.

## Build and Run

1. **Website Development**: Run `npm run dev:all` to launch Vite frontend and Express backend concurrently.
2. **Verification & Testing**: Run `npm run test:all` before any commit to execute type checking, oxlint, and vitest unit test suites.
