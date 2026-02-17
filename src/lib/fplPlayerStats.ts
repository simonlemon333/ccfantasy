/**
 * Fetch per-gameweek player stats from FPL element-summary endpoint.
 * Used by settlement to get real minutes played, goals, assists, etc.
 */

interface FPLGameweekStat {
  round: number; // gameweek
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  own_goals: number;
  penalties_missed: number;
  penalties_saved: number;
  total_points: number;
}

interface FPLElementSummary {
  history: FPLGameweekStat[];
}

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchElementSummary(fplId: number): Promise<FPLElementSummary> {
  const response = await fetch(`${FPL_BASE_URL}/element-summary/${fplId}/`);
  if (!response.ok) {
    throw new Error(`FPL element-summary error for ${fplId}: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch gameweek stats for a batch of players.
 * Rate-limited: 5 concurrent requests, 200ms pause between batches.
 */
export async function fetchPlayerGameweekStats(
  fplIds: number[],
  gameweek: number
): Promise<Map<number, FPLGameweekStat>> {
  const result = new Map<number, FPLGameweekStat>();
  const BATCH_SIZE = 5;
  const DELAY_MS = 200;

  for (let i = 0; i < fplIds.length; i += BATCH_SIZE) {
    const batch = fplIds.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (fplId) => {
      try {
        const summary = await fetchElementSummary(fplId);
        const gwStat = summary.history.find((h) => h.round === gameweek);
        if (gwStat) {
          result.set(fplId, gwStat);
        }
      } catch (err) {
        console.error(`Failed to fetch stats for FPL ID ${fplId}:`, err);
      }
    });

    await Promise.all(promises);

    // Pause between batches to avoid rate limits
    if (i + BATCH_SIZE < fplIds.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  return result;
}

export type { FPLGameweekStat };
