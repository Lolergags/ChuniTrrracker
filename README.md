# ChuniTrrracker

ChuniTrrracker is a local statistics tracking and visualization web application for the rhythm game **Chunithm**. It sources score data from Kamaitachi and tracklist metadata from Beerpsi to calculate and display complex "Overpower" (OP) metrics that aren't natively supported by standard trackers.

## Features

- **Kamaitachi Integration**: Automatically imports your Personal Best (PB) scores and lamps from Kamaitachi via API key.
- **Overpower (OP) Calculation**: Accurately reproduces the exact piecewise mathematical formulas for Overpower gain used in *CHUNITHM LUMINOUS PLUS*, factoring in your exact score, lamp bonuses, and the chart constant.
- **Global OP Leaderboard**: Compare your total accumulated Overpower against all other registered profiles in the local database.
- **Detailed Player Profiles**: View statistics including your OP percentage, average score, and lamp distributions (AJC, AJ, FC, CLEAR) broken down by difficulty level.

## Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Backend**: Node.js, Express, TypeScript (run via `tsx`)
- **Database**: `better-sqlite3` (Local SQLite database)
- **Testing**: `vitest`
- **Styling**: Vanilla CSS with a responsive, modern dark-mode UI.

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Lolergags/ChuniTrrracker.git
   cd ChuniTrrracker
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Running the App

To start both the Vite development server (frontend) and the Express API (backend) simultaneously, run:

```bash
npm run dev:all
```

The frontend will be available at `http://localhost:5173` and the backend API at `http://localhost:3001`.

*Note: On the first run, the server will automatically download the complete Chunithm tracklist from Beerpsi and initialize the local SQLite database (`data/chunitrrracker.db`).*

## How to Import Scores

1. Obtain your **Kamaitachi API Key** from your profile settings on Kamaitachi.
2. Open the ChuniTrrracker web app and navigate to the **Import** tab.
3. Check the "I have an API Key" box, enter your Kamaitachi username and your API Key, then click **Sync & Login**.
4. The backend will parse your scores, map the IDs, calculate your Overpower, and populate the database.
5. You can now view your stats on the **Leaderboard** and **Profile** pages!

## Project Structure

- `src/` - React frontend code (Components, Pages, App routing).
- `server/` - Node.js backend (Express routes, SQLite database setup, API syncing logic, Vitest suites).
- `data/` - Auto-generated directory where the SQLite database is stored.
- `reference/` - Prototype python scripts and research notebooks.

## Contributing / Development

If you are developing or contributing to the project, please refer to the `GEMINI.md` file for strict schema guidelines, Kamaitachi API quirks, and automated testing requirements.
