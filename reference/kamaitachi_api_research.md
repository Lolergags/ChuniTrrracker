# Kamaitachi API v1 (Tachi) - Research Document

## Overview
Kamaitachi is powered by the **Tachi** backend, a modular and modern rhythm game score tracker. Tachi provides a public JSON-based REST API that enables developers to query users, scores, game configurations, and more. 

- **Kamaitachi Base URL:** `https://kamai.tachi.ac/api/v1`
- **Bokutachi Base URL:** `https://boku.tachi.ac/api/v1` (For BMS/PMS/USC etc.)
- **Rate Limit:** 500 requests per minute. It is very generous, but automated scrapers hitting >100 req/min consistently should contact `zk@tachi.ac`.
- **License:** The Tachi-Server is licensed under AGPLv3.

## URL Parameters & Routing
A notable feature of the API is the flexibility of its route parameters:
- **`:userID` Param:** Whenever an endpoint requests a `:userID`, you can provide:
  - The integer ID of the user (e.g., `1`).
  - The username of the user, which is **case-insensitive** (e.g., `zkldi` or `ZkLDi`).
  - The special string `"me"` if you are making an authenticated request with an API token.
- **`:game` and `:playtype` Params:** Many routes are scoped to a specific game and playtype (referred to as a `GamePT` in the Tachi codebase). For Chunithm, this is typically `chunithm` for the game and `Single` for the playtype.

## Key Endpoints

### 1. User Information
- **`GET /api/v1/users`**
  - Lists up to 100 users, ordered by `lastSeen`.
  - Supports `?online=true` to filter for online users.
  - Supports `?search=...` to filter by username.
- **`GET /api/v1/users/:userID`**
  - Returns a detailed user document including their `id`, `username`, `about`, `joinDate`, `socialMedia`, and `badges`.

### 2. User Game/Playtype (GamePT) & Scores
These endpoints are crucial for **ChuniTrrracker**, as they retrieve the bulk score data for OP calculations.
- **`GET /api/v1/users/:userID/games/:game/:playtype/scores/all`**
  - Used to fetch a dump of all scores for a user in a specific game and playtype. 
  - *Example used in ChuniTrrracker:* `GET /api/v1/users/Lolergags/games/chunithm/Single/scores/all`
  - **Note on 404s:** If a user exists but has never imported or played the specified game/playtype, this endpoint may return a `404 Not Found`.
- The response from the `scores/all` endpoint contains:
  - `scores`: An array of score documents (including `timeAchieved`, `scoreData.score`, `scoreData.noteLamp`, `scoreData.judgements`, etc.).
  - `charts`: An array of chart documents referenced by the scores.
  - `songs`: An array of song documents referenced by the scores.

### 3. Individual Scores
- **`GET /api/v1/scores/:scoreID`**
  - Retrieves a specific score by its unique ID.
  - Supports `?getRelated=true` to append the associated `song` and `chart` documents into the response body.

## Deeper Investigation: Sessions, Leaderboards, & Authentication

### A. Authentication & API Tokens
Certain endpoints on Tachi (such as modifying user data or viewing private profiles) require permissions.
1. **API Key (Bearer Auth):** Make requests with the HTTP header `Authorization: Bearer <API_KEY>`. 
   - A user's API tokens can be managed via `GET /api/v1/users/:userID/api-tokens` (this endpoint itself requires Self-Key auth).
2. **Self-Key (Cookie Auth):** For users logged into the web interface natively, the `Kamaitachi_SESSION` or `Bokutachi_SESSION` cookie is passed automatically. This bypasses the need for token management and acts natively as the user.

### B. Sessions
Tachi groups consecutive scores into time-boxed "Sessions" to analyze individual arcade trips or concentrated play blocks.
- **`GET /api/v1/sessions/:sessionID`**
  - Returns a `session` document, plus relational arrays for `scores`, `songs`, `charts`, and `user`.
  - Useful for visualizing an aggregate breakdown (e.g., OP gained, average score, hit/miss ratios) strictly for a specific play session rather than all-time stats.

### C. Leaderboards & Rivals (UGPT Data)
Game-specific rankings and rival tracking metrics are fetched at the User Game/Playtype (UGPT) level.
- **`GET /api/v1/users/:userID/games/:game/:playtype`** (e.g., `.../games/chunithm/Single`)
  - Returns `gameStats` containing ratings and class (e.g. Chunithm belt/dan) information.
  - Returns `rankingData`, detailing the user's leaderboard position for metrics like OP (`ktRating`) and how many active players are currently on that specific leaderboard (`outOf`).
- **Personal Bests (PBs):** While `scores/all` returns *every score ever submitted*, you can query personal bests directly using `GET /api/v1/users/:userID/games/:game/:playtype/pbs` to easily pull their top performances on specific songs, or `pbs/best` for their top 100 plays.

## Integration Notes for ChuniTrrracker
- **Data Structure:** When parsing scores, you must join `scores` with `charts` via `chartID`, and `charts` with `songs` via `songID`. This relational structure is standard across the Tachi API to reduce payload sizes.
- **Timestamps:** Rely on `score["timeAchieved"]`. If a user imported from an official server that doesn't provide exact play times, it will fall back to `score["timeAdded"]`.
- **Note Lamps:** The API maps Chunithm clear states to standard string constants: `"NONE"`, `"FULL COMBO"`, `"ALL JUSTICE"`, and `"ALL JUSTICE CRITICAL"`.

## Reference Resources
- **GitHub Repository:** [zkldi/Tachi](https://github.com/zkldi/Tachi)
- **Official Documentation Source:** Located under `docs/src/api/` in the Tachi GitHub repository.
