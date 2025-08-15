// Lineup validation functions for Fantasy Football

interface PlayerSelection {
  id: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  team_id: string;
  price: number;
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface LineupConstraints {
  maxBudget: number;
  maxPlayersPerTeam: number;
  requiredPositions: {
    GK: { min: number; max: number };
    DEF: { min: number; max: number };
    MID: { min: number; max: number };
    FWD: { min: number; max: number };
  };
  totalPlayers: number;
  startingXI: number;
}

// Default Premier League fantasy constraints
export const DEFAULT_CONSTRAINTS: LineupConstraints = {
  maxBudget: 70.0,
  maxPlayersPerTeam: 3,
  requiredPositions: {
    // For the 11-player (no bench) mode: GK must be 1, other positions limited by formation rules
    GK: { min: 1, max: 1 },
    DEF: { min: 3, max: 5 },
    MID: { min: 2, max: 5 },
    FWD: { min: 1, max: 3 }
  },
  totalPlayers: 11,
  startingXI: 11
};

export function validateLineup(
  players: PlayerSelection[],
  constraints: LineupConstraints = DEFAULT_CONSTRAINTS
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check total number of players
  if (players.length !== constraints.totalPlayers) {
    errors.push(`Must select exactly ${constraints.totalPlayers} players. Currently have ${players.length}.`);
  }

  // 2. Check starting XI count
  const starters = players.filter(p => p.is_starter);
  if (starters.length !== constraints.startingXI) {
    errors.push(`Must have exactly ${constraints.startingXI} starting players. Currently have ${starters.length}.`);
  }

  // 3. Check budget constraint
  const totalCost = players.reduce((sum, player) => sum + player.price, 0);
  if (totalCost > constraints.maxBudget) {
    errors.push(`Total cost (£${totalCost.toFixed(1)}m) exceeds budget limit of £${constraints.maxBudget}m.`);
  }

  // 4. Check position requirements
  const positionCounts = players.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  Object.entries(constraints.requiredPositions).forEach(([position, requirement]) => {
    const count = positionCounts[position] || 0;
    if (count < requirement.min) {
      errors.push(`Need at least ${requirement.min} ${position} players. Currently have ${count}.`);
    }
    if (count > requirement.max) {
      errors.push(`Can have at most ${requirement.max} ${position} players. Currently have ${count}.`);
    }
  });

  // 5. Check starting XI positions (must be valid formation)
  const starterPositions = starters.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  // Starting XI must have: 1 GK, 3-5 DEF, 2-5 MID, 1-3 FWD
  const startingConstraints = {
    GK: { min: 1, max: 1 },
    DEF: { min: 3, max: 5 },
    MID: { min: 2, max: 5 },
    FWD: { min: 1, max: 3 }
  };

  Object.entries(startingConstraints).forEach(([position, requirement]) => {
    const count = starterPositions[position] || 0;
    if (count < requirement.min) {
      errors.push(`Starting XI needs at least ${requirement.min} ${position}. Currently have ${count}.`);
    }
    if (count > requirement.max) {
      errors.push(`Starting XI can have at most ${requirement.max} ${position}. Currently have ${count}.`);
    }
  });

  // 6. Check team constraints (max 3 players from same team)
  const teamCounts = players.reduce((counts, player) => {
    counts[player.team_id] = (counts[player.team_id] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  Object.entries(teamCounts).forEach(([teamId, count]) => {
    if (count > constraints.maxPlayersPerTeam) {
      errors.push(`Cannot have more than ${constraints.maxPlayersPerTeam} players from the same team. Team ${teamId} has ${count} players.`);
    }
  });

  // 7. Check captain and vice-captain
  const captains = players.filter(p => p.is_captain);
  const viceCaptains = players.filter(p => p.is_vice_captain);

  if (captains.length > 1) {
    errors.push('Can only have one captain.');
  }
  if (viceCaptains.length > 1) {
    errors.push('Can only have one vice-captain.');
  }
  if (captains.length === 1 && !captains[0].is_starter) {
    errors.push('Captain must be in starting XI.');
  }
  if (viceCaptains.length === 1 && !viceCaptains[0].is_starter) {
    errors.push('Vice-captain must be in starting XI.');
  }
  if (captains.length === 1 && viceCaptains.length === 1 && captains[0].id === viceCaptains[0].id) {
    errors.push('Captain and vice-captain must be different players.');
  }

  // 8. Warnings for suboptimal choices
  if (totalCost < constraints.maxBudget - 5.0) {
    warnings.push(`You have £${(constraints.maxBudget - totalCost).toFixed(1)}m remaining. Consider upgrading players.`);
  }

  if (captains.length === 0) {
    warnings.push('You should select a captain for double points.');
  }

  if (viceCaptains.length === 0) {
    warnings.push('You should select a vice-captain as backup.');
  }

  // Check for duplicate players
  const playerIds = players.map(p => p.id);
  const uniqueIds = new Set(playerIds);
  if (playerIds.length !== uniqueIds.size) {
    errors.push('Cannot select the same player multiple times.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateFormation(starters: PlayerSelection[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (starters.length !== 11) {
    errors.push('Starting XI must have exactly 11 players.');
    return { isValid: false, errors, warnings };
  }

  const positions = starters.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const { GK = 0, DEF = 0, MID = 0, FWD = 0 } = positions;

  // Must have exactly 1 goalkeeper
  if (GK !== 1) {
    errors.push(`Must have exactly 1 goalkeeper in starting XI. Currently have ${GK}.`);
  }

  // Must have 3-5 defenders
  if (DEF < 3 || DEF > 5) {
    errors.push(`Must have 3-5 defenders in starting XI. Currently have ${DEF}.`);
  }

  // Must have 2-5 midfielders  
  if (MID < 2 || MID > 5) {
    errors.push(`Must have 2-5 midfielders in starting XI. Currently have ${MID}.`);
  }

  // Must have 1-3 forwards
  if (FWD < 1 || FWD > 3) {
    errors.push(`Must have 1-3 forwards in starting XI. Currently have ${FWD}.`);
  }

  // Formation validation - common formations
  const formation = `${DEF}-${MID}-${FWD}`;
  const validFormations = [
    '3-4-3', '3-5-2', '4-3-3', '4-4-2', '4-5-1', '5-3-2', '5-4-1'
  ];

  if (errors.length === 0 && !validFormations.includes(formation)) {
    warnings.push(`Formation ${formation} is unusual. Consider a more balanced setup.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function calculateLineupCost(players: PlayerSelection[]): number {
  return players.reduce((total, player) => total + player.price, 0);
}

export function getFormationString(starters: PlayerSelection[]): string {
  const positions = starters.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const { DEF = 0, MID = 0, FWD = 0 } = positions;
  return `${DEF}-${MID}-${FWD}`;
}

export function suggestFormationFixes(starters: PlayerSelection[]): string[] {
  const suggestions: string[] = [];
  const positions = starters.reduce((counts, player) => {
    counts[player.position] = (counts[player.position] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  const { GK = 0, DEF = 0, MID = 0, FWD = 0 } = positions;

  if (GK !== 1) {
    suggestions.push(GK > 1 ? 'Move extra goalkeepers to bench' : 'Add a goalkeeper to starting XI');
  }

  if (DEF < 3) {
    suggestions.push(`Add ${3 - DEF} more defender(s) to starting XI`);
  } else if (DEF > 5) {
    suggestions.push(`Move ${DEF - 5} defender(s) to bench`);
  }

  if (MID < 2) {
    suggestions.push(`Add ${2 - MID} more midfielder(s) to starting XI`);
  } else if (MID > 5) {
    suggestions.push(`Move ${MID - 5} midfielder(s) to bench`);
  }

  if (FWD < 1) {
    suggestions.push('Add at least 1 forward to starting XI');
  } else if (FWD > 3) {
    suggestions.push(`Move ${FWD - 3} forward(s) to bench`);
  }

  return suggestions;
}