// Fantasy Premier League scoring rules
export const SCORING_RULES = {
  // Playing time points
  PLAYING: {
    APPEARANCE: 1, // Playing at least 1 minute
    MORE_THAN_60_MIN: 2, // Playing 60+ minutes
  },

  // Goalkeeper specific
  GOALKEEPER: {
    GOAL_CONCEDED: -1, // Per 2 goals conceded
    CLEAN_SHEET: 4,
    PENALTY_SAVE: 5,
    SAVE: 0.33, // Per 3 saves = 1 point
  },

  // Defender specific  
  DEFENDER: {
    GOAL: 6,
    ASSIST: 3,
    CLEAN_SHEET: 4,
  },

  // Midfielder specific
  MIDFIELDER: {
    GOAL: 5,
    ASSIST: 3,
    CLEAN_SHEET: 1,
  },

  // Forward specific
  FORWARD: {
    GOAL: 4,
    ASSIST: 3,
  },

  // Universal penalties
  PENALTIES: {
    YELLOW_CARD: -1,
    RED_CARD: -3,
    PENALTY_MISS: -2,
    OWN_GOAL: -2,
  },

  // Bonus points (awarded by BPS system)
  BONUS: {
    FIRST: 3,
    SECOND: 2, 
    THIRD: 1,
  },

  // Captain multipliers
  MULTIPLIERS: {
    CAPTAIN: 2,
    VICE_CAPTAIN: 1, // Only if captain doesn't play
    TRIPLE_CAPTAIN: 3, // Special chip
  }
};

// Event type to points mapping function
export function getEventPoints(
  eventType: string, 
  position: 'GK' | 'DEF' | 'MID' | 'FWD',
  eventData?: any
): number {
  switch (eventType) {
    case 'goal':
      switch (position) {
        case 'GK': 
        case 'DEF': return SCORING_RULES.DEFENDER.GOAL;
        case 'MID': return SCORING_RULES.MIDFIELDER.GOAL;
        case 'FWD': return SCORING_RULES.FORWARD.GOAL;
      }
      break;

    case 'assist':
      return SCORING_RULES.DEFENDER.ASSIST; // Same for all positions

    case 'clean_sheet':
      switch (position) {
        case 'GK': 
        case 'DEF': return SCORING_RULES.DEFENDER.CLEAN_SHEET;
        case 'MID': return SCORING_RULES.MIDFIELDER.CLEAN_SHEET;
        case 'FWD': return 0;
      }
      break;

    case 'yellow_card':
      return SCORING_RULES.PENALTIES.YELLOW_CARD;

    case 'red_card':
      return SCORING_RULES.PENALTIES.RED_CARD;

    case 'penalty_miss':
      return SCORING_RULES.PENALTIES.PENALTY_MISS;

    case 'own_goal':
      return SCORING_RULES.PENALTIES.OWN_GOAL;

    case 'penalty_save':
      return position === 'GK' ? SCORING_RULES.GOALKEEPER.PENALTY_SAVE : 0;

    case 'save':
      // Every 3 saves = 1 point for GK
      return position === 'GK' ? SCORING_RULES.GOALKEEPER.SAVE : 0;

    case 'bonus':
      // Bonus points from BPS system
      return eventData?.bonusPoints || 0;

    case 'appearance':
      return SCORING_RULES.PLAYING.APPEARANCE;

    case 'minutes_60':
      return SCORING_RULES.PLAYING.MORE_THAN_60_MIN;

    case 'goals_conceded':
      // GK/DEF lose 1 point per 2 goals conceded
      if (position === 'GK' || position === 'DEF') {
        const goalsConceded = eventData?.goalsConceded || 0;
        return Math.floor(goalsConceded / 2) * SCORING_RULES.GOALKEEPER.GOAL_CONCEDED;
      }
      return 0;

    default:
      return 0;
  }

  return 0;
}

// Calculate total points for a player in a gameweek
export function calculatePlayerGameweekPoints(
  playerEvents: any[],
  position: 'GK' | 'DEF' | 'MID' | 'FWD',
  minutesPlayed: number = 0
): number {
  let totalPoints = 0;

  // Base playing time points
  if (minutesPlayed > 0) {
    totalPoints += SCORING_RULES.PLAYING.APPEARANCE;
    if (minutesPlayed >= 60) {
      totalPoints += SCORING_RULES.PLAYING.MORE_THAN_60_MIN - SCORING_RULES.PLAYING.APPEARANCE;
    }
  }

  // Add points from events
  for (const event of playerEvents) {
    totalPoints += getEventPoints(event.event_type, position, event);
  }

  return totalPoints;
}