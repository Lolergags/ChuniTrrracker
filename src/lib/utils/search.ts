/**
 * Efficiently searches and ranks players by match quality.
 * Returns a maximum of limit results.
 * 1. Exact matches
 * 2. Prefix matches (starts with)
 * 3. Substring matches (includes)
 */
export function searchPlayers(playersList: string[], query: string, limit: number = 50): string[] {
  if (!query.trim()) return [];
  const lowerQuery = query.toLowerCase();
  
  const exactMatches: string[] = [];
  const startsWithMatches: string[] = [];
  const containsMatches: string[] = [];
  
  for (let i = 0; i < playersList.length; i++) {
    const lowerPlayer = playersList[i].toLowerCase();
    if (lowerPlayer === lowerQuery) {
      exactMatches.push(playersList[i]);
    } else if (lowerPlayer.startsWith(lowerQuery)) {
      startsWithMatches.push(playersList[i]);
    } else if (lowerPlayer.includes(lowerQuery)) {
      containsMatches.push(playersList[i]);
    }
  }
  
  return [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, limit);
}
