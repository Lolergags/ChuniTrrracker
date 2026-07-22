# ChuniTrrracker

ChuniTrrracker is a statistics tracking and visualization website for the rhythm game **Chunithm**. Its primary focus is calculating and displaying "Overpower" (OP) metrics for players, sourcing data from Kamaitachi.

## Project Overview

The project aims to provide a more detailed view of player progress than what is currently available on standard trackers. It uses the OP calculation system introduced in *CHUNITHM LUMINOUS PLUS*.

### Key Goals
1.  **Data Integration:** Import player scores from [Kamaitachi](https://kamai.tachi.ac/) and song metadata from [beerpsi's song list](https://chunithm.beerpsi.cc/songs).
2.  **OP Calculations:** Implement the complex piecewise formulas for Overpower gain based on score ranges and chart constants.
3.  **Leaderboards:** Create a global leaderboard based on total OP and other non-standard statistics (e.g., average score).
4.  **Song Analytics:** Provide per-song statistics like AJC (All Justice Critical) counts and difficulty rankings independent of level constants.
5.  **Performance Analysis:** (Optional) Visualize player strengths and weaknesses (stamina, speed, tech) through data clustering and graphs.

## Technical Stack

*   **Logic Prototype:** Python (utilizing `polars` for high-performance data manipulation and `requests` for API interaction).
*   **Target Implementation:** TypeScript (Strict Mode).
*   **Data Sources:**
    *   Kamaitachi API (`https://kamai.tachi.ac/api/v1/...`)
    *   Chunithm Song List (`https://chunithm.beerpsi.cc/songs`)
*   **Deployment:** Docker (Unraid NAS).

## Project Structure

*   `README.md`: High-level project summary and goals.
*   `Reference/`: Contains research and logic prototypes.
    *   `Overpower.ipynb`: A comprehensive Jupyter notebook containing the core OP calculation logic, data fetching scripts, and aggregation examples using Polars.
*   `GEMINI.md` & `agents.md`: These files, providing instructional context for AI agents.

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
*   **Lamp Bonus:**
    *   FC (Full Combo): +500
    *   AJ (All Justice): +1000
    *   AJC (All Justice Critical): +1250
*   **Rounding:** For scores >= 975,000, the result is floored to the nearest 5. For scores < 975,000, it is floored to the nearest 50.

### Possession Plate Requirements
Players can earn a possession plate based on a combination of their OP% and their minimum score rank across **all** Master and Ultima charts for a given version. The requirements are calculated cumulatively (including all charts released up to that version):

| Possession Rank | Minimum OP% | Minimum Grade on ALL Master/Ultima |
| :--- | :--- | :--- |
| **Rainbow** | 99.5% | SSS (1,007,500+) |
| **Platinum** | 99.0% | SS (1,000,000+) |
| **Gold** | 97.5% | S+ (990,000+) |
| **Silver** | (None) | S (975,000+) |

## UI & UX Constraints

*   **React Conditional Rendering:** When conditionally rendering UI elements based on string values (e.g., `{searchInput && <Dropdown />}`), NEVER use the raw string variable. An empty string (`""`) evaluates as truthy enough to render an invisible text node in the DOM. In flex containers, this establishes a baseline and causes dramatic layout shifts/page jumps. Always use strict boolean evaluations: `{searchInput.trim().length > 0 && <Dropdown />}`.
*   **Dropdown Menus:** Avoid using the native HTML `<datalist>` element for search bars or autocompletes, as its dropdown positioning and styling are erratic across browsers. Always reuse or implement custom React dropdown components (like `PlayerAutocomplete`).
*   **Select Element Backgrounds:** When adding standard `<select>` dropdowns, ensure you use `var(--bg-secondary)` or `var(--bg-primary)` for the background color rather than undefined variables like `var(--bg-color)`. Failing to set a valid dark background causes the `<option>` elements to inherit a default white background on Windows browsers, leading to illegible white-on-white text.
*   **Password Manager Suppression:** General text inputs for system lookups (like usernames or Kamaitachi IDs) frequently trigger password managers like Bitwarden. Always suppress them by applying the following attributes to the `<input>`: `data-1p-ignore="true"`, `data-bwignore="true"`, `autoComplete="off"`, `autoCorrect="off"`, and `spellCheck="false"`.
*   **Dual Range Sliders:** Never attempt to build dual-range sliders by stacking two native `<input type="range">` elements and relying on `pointer-events: none` to pass clicks through to the lower slider. Cross-browser shadow DOM bugs (especially in Firefox) will trap the events and make the underlying thumb unclickable. Always implement dual sliders as custom React components utilizing a single parent container with `onPointerDown`/`onPointerMove` DOM handlers.

## Development Conventions

*   **TypeScript:** Use strict mode.
*   **Logic Porting:** When moving logic from the Python notebook to TypeScript, ensure parity with the `polars` aggregations and the piecewise OP formula.
*   **Testing:** 
    *   **Unit Tests:** Use `vitest` for all mathematical logic, utility functions, and backend queries. Place test files adjacent to the code they test or in dedicated backend directories (e.g., `server/queries.test.ts`).
    *   **Bug Regression:** Whenever an issue, logical flaw, or edge case is encountered and fixed (e.g., duplicate SQL records, negative UI bounds), **you must write an automated test case** to verify the fix and ensure the error does not repeat.
    *   **SQL & Backend Tests:** For database query logic, spin up an in-memory SQLite database (`new Database(':memory:')`), seed it with explicit edge-case data, and strictly verify the output.
*   **Git Commits:** The development environment requires the `--no-gpg-sign` flag for all `git commit` commands to bypass GPG signing timeout errors (e.g., `git commit --no-gpg-sign -m "..."`).

## Kamaitachi Integration Quirks & Edge Cases

*   **API Pathing:** Chunithm is a single-playtype game. Kamaitachi drops the playtype segment entirely from the route. Use `/games/chunithm/pbs/all` (do NOT include `/Single`).
*   **Rate Limiting & Safety:** Kamaitachi strictly enforces rate limits (~60 requests/minute). Any backend looping logic (e.g., scraping, bulk syncing) that triggers external Kamaitachi API requests **MUST** implement a minimum `1.5-second (1500ms) delay` between iterations to avoid 429 Too Many Requests errors and IP bans.
*   **Endpoint Selection:** Always use the `pbs/all` (Personal Bests) endpoint instead of `scores/all` to automatically retrieve the highest score and best lamp correctly merged by Kamaitachi.
*   **Player Rating Pathing:** The overall player rating is nested within the `gameStats` object under a specific `ratings` sub-object. When fetching `https://kamai.tachi.ac/api/v1/users/{id}/games/chunithm`, you must extract the rating via `body.gameStats.ratings.naiveRating`. Do not attempt to read `body.gameStats.rating`.
*   **Ghost Charts (Unmapped DB Entries):** Kamaitachi tracks legacy/phantom chart records (e.g., `chart.id` 95, 201, 239116) that do not map to any active in-game track. Whenever calculating global chart denominators (e.g., Possession plate requirements or completion percentages), you **MUST** apply a hardcoded blacklist (`(c.song_id NOT IN (50, 81) AND c.id != 239116)`) in the SQL query. Failing to do so inflates the denominator and makes 100% completion mathematically impossible for users.
*   **Data Normalization:** Kamaitachi identifies songs with string IDs (e.g. `S...`). You must map these to the local integer IDs (sourced from Beerpsi) by matching the `chart.data.inGameID` property found in the Kamaitachi chart object. DO NOT match by `title`, as Chunithm contains duplicate song names that will cause silent data loss.
*   **Global Filtering Paradigm:** Kamaitachi tracks all scores (Omnimix), including charts that have been deleted or are International-only. When importing scores in `sync.ts`, **import everything that exists in the local database**. Do NOT skip `is_jp_active = 0` charts. Instead, apply the `getChartFilterConditions()` utility from `server/utils/filters.ts` to all backend endpoints (`routes.ts`) to dynamically slice the charts and scores by Server (`JP`, `INT`, `OMNI`), Difficulty, and Version. This ensures mathematically perfect denominator/numerator matching for completion graphs.
*   **Version Filtering Modes:** When slicing player statistics globally, apply *cumulative* version filtering (i.e. "Time Machine" mode where `LUMINOUS` includes `SUN`, `NEW`, etc.). When filtering specific song lists (e.g. Song Analytics), use *strict* version matching to simulate in-game version folders.
*   **SQLite Constraints & Purging:** Be extremely careful about schema drift. SQLite's `CREATE TABLE IF NOT EXISTS` does not update existing constraints. If you modify constraints like `UNIQUE(player_id, chart_id)`, you must drop the table manually in prototyping environments. Additionally, when executing SQL `DELETE` or `SELECT` queries to purge records based on an external ID (e.g., `kamaitachi_id`), always include a fallback `OR` clause targeting a secondary immutable identifier (e.g., `username`). Legacy records or manual imports may have `NULL` values for external IDs, causing strict `WHERE external_id = ?` queries to silently fail and leave "ghost" records in the database.
*   **Frontend NULL Handling:** If a user has exactly 0 scores (e.g. they imported an empty profile), `SUM()` in SQL aggregations evaluates to `NULL`. Always implement fallback logic (`|| 0`) on backend responses and frontend numerical properties (like `.toFixed(2)`) to prevent fatal React render crashes.
*   **Scatter Plot Deduplication:** When plotting player scores across the entire track list, ensure the backend endpoint returns `songId`. Use `reduce` (within a `useMemo` hook) on the frontend to deduplicate charts per song, ensuring only the chart yielding the maximum OP is plotted. Also apply limits and dynamic domains (`Math.max()`) to keep axes from flattening out due to low-scoring attempts.
*   **Recharts Stacked Bars:** Recharts renders the first `<Bar>` element at the bottom of the visual stack. When building progression charts (e.g. Fail -> Clear -> AJC), define the lowest achievements first in the JSX. If a specific legend order is required, use a custom `<Legend payload={...}>` rather than reordering the bars.
*   **Recharts Stack Transparency:** When using `stackOffset="expand"`, do not use `fill="transparent"` for empty/unplayed padding bars. It creates an optical illusion of 100% completion against dark backgrounds. Use a faint color like `rgba(255,255,255,0.05)` instead.
*   **Recharts BarChart Domains:** When using a `<BarChart>` to plot percentage data (e.g., OP Yield 0-100%), NEVER use dynamic domains like `domain={['auto', 'auto']}` on the `<YAxis>`. `BarChart` rectangles require a strict baseline of `0` to render visually. Always explicitly define the domain (e.g., `domain={[0, 100]}`).

## Frontend & Backend State Conventions

*   **React Polling & Closures:** When implementing background polling (e.g., `setInterval` inside `useEffect`), NEVER use `useState` for initialization flags or trackers that must be read inside the loop. The state will get trapped in a stale closure, leading to infinite loops or overridden inputs. Always use `useRef` (e.g., `isInitialized.current`) to bypass the closure and maintain accurate mutable state across polling ticks.
*   **Configuration Persistence:** Do not rely on in-memory Node.js variables for configuration settings (like cron schedules, scraper bounds, or UI toggles). Always persist these settings to the SQLite `config` table (`db.prepare('INSERT INTO config ...')`) to ensure they survive server restarts, hot-reloads, and deployments.

## Build and Run

As the project is currently in the research/prototype phase:
1.  **Python Notebook:** Requires `polars`, `requests`, and `ipython`.
2.  **Website:** TODO (Add initialization commands once the TS project is scaffolded).
