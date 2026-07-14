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
*   **Deployment:** Docker (Unraid NAS) or GitHub Pages.

## Project Structure

*   `README.md`: High-level project summary and goals.
*   `Reference/`: Contains research and logic prototypes.
    *   `Overpower.ipynb`: A comprehensive Jupyter notebook containing the core OP calculation logic, data fetching scripts, and aggregation examples using Polars.
*   `GEMINI.md`: This file, providing instructional context for AI agents.

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

## Development Conventions

*   **TypeScript:** Use strict mode.
*   **Logic Porting:** When moving logic from the Python notebook to TypeScript, ensure parity with the `polars` aggregations and the piecewise OP formula.
*   **Testing:** 
    *   **Unit Tests:** Use `vitest` for all mathematical logic, utility functions, and backend queries. Place test files adjacent to the code they test or in dedicated backend directories (e.g., `server/queries.test.ts`).
    *   **Bug Regression:** Whenever an issue, logical flaw, or edge case is encountered and fixed (e.g., duplicate SQL records, negative UI bounds), **you must write an automated test case** to verify the fix and ensure the error does not repeat.
    *   **SQL & Backend Tests:** For database query logic, spin up an in-memory SQLite database (`new Database(':memory:')`), seed it with explicit edge-case data, and strictly verify the output.

## Build and Run

As the project is currently in the research/prototype phase:
1.  **Python Notebook:** Requires `polars`, `requests`, and `ipython`.
2.  **Website:** TODO (Add initialization commands once the TS project is scaffolded).
