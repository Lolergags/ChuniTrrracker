import { useQuery } from '@tanstack/react-query';
import { fetchKamaitachiScores } from '../api/kamaitachi';
import { fetchBeerpsiSongs } from '../api/beerpsi';
import { processPlayerData } from '../data/processing';

export function usePlayerData(username: string) {
  return useQuery({
    queryKey: ['playerData', username],
    queryFn: async () => {
      // Fetch concurrently
      const [scores, songs] = await Promise.all([
        fetchKamaitachiScores(username),
        fetchBeerpsiSongs()
      ]);

      return processPlayerData(scores, songs);
    },
    // Only run if username is provided
    enabled: !!username,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}
