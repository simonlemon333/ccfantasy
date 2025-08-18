'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '../../../components/Layout';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import PlayerBadge from '../../../components/PlayerBadge';
import { useAuth } from '../../../hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface Player {
  id: string;
  name: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  price: number;
  total_points: number;
  photo_url?: string;
  teams: {
    name: string;
    short_name: string;
    primary_color: string;
  };
}

interface SquadPlayer extends Player {
  is_starter: boolean;
  is_captain: boolean;
  is_vice_captain: boolean;
}

const FORMATIONS = [
  { name: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { name: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { name: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { name: '5-3-2', def: 5, mid: 3, fwd: 2 },
  { name: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { name: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { name: '5-4-1', def: 5, mid: 4, fwd: 1 }
];

export default function SquadPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [squad, setSquad] = useState<SquadPlayer[]>([]);
  const [formation, setFormation] = useState(FORMATIONS[0]);
  const [selectedPosition, setSelectedPosition] = useState<'GK' | 'DEF' | 'MID' | 'FWD' | null>(null);
  const [showPlayerSelector, setShowPlayerSelector] = useState(false);
  const [budget, setBudget] = useState(70.0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [serverLastSavedISO, setServerLastSavedISO] = useState<string | null>(null);
  const [defaultRoomId, setDefaultRoomId] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<string[] | null>(null);
  const [localDraftAvailable, setLocalDraftAvailable] = useState(false);
  const [localDraft, setLocalDraft] = useState<any | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const [filterTeam, setFilterTeam] = useState<string>('ALL');
  const [filterPosition, setFilterPosition] = useState<'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD'>('ALL');
  const [sortBy, setSortBy] = useState<'price' | 'total_points'>('total_points');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const loadLineupId = searchParams?.get('loadLineup');

  useEffect(() => {
    fetchPlayers();
    if (user) {
      loadUserLineup();
    } else {
      initializeSquad();
    }
  }, [user]);

  // On mount, check for a local draft and expose it if newer than server
  useEffect(() => {
    if (!user) return;
    const draft = loadLocalDraftFromStorage();
    if (draft) {
      setLocalDraft(draft);
      setLocalDraftAvailable(true);
    }
  }, [user]);

  const fetchPlayers = async () => {
    try {
      const response = await fetch('/api/players?limit=500');
      const result = await response.json();
      if (result.success) {
        setPlayers(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch players:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeSquad = () => {
  // Initialize empty squad (11 starters only)
  const emptySquad: SquadPlayer[] = [];
    setSquad(emptySquad);
  };

  const loadUserLineup = async () => {
    if (!user) return;
    // If a specific lineup id is requested via query param, load that one
    if (loadLineupId) {
      try {
        const resp = await fetch(`/api/lineups?lineupId=${encodeURIComponent(loadLineupId)}`);
        const res = await resp.json();
        if (res.success && res.data && res.data.length > 0) {
          const latestLineup = res.data[0];
          setDefaultRoomId(latestLineup.room_id || null);

          const squadPlayers: SquadPlayer[] = latestLineup.lineup_players.map((lp: any) => ({
            id: lp.players.id,
            name: lp.players.name,
            position: lp.players.position,
            price: lp.players.price,
            total_points: lp.players.total_points,
            photo_url: lp.players.photo_url,
            teams: {
              name: lp.players.teams.name,
              short_name: lp.players.teams.short_name,
              primary_color: lp.players.teams.primary_color || '#000000'
            },
            is_starter: lp.is_starter,
            is_captain: lp.is_captain,
            is_vice_captain: lp.is_vice_captain
          }));

          setSquad(squadPlayers);
          const formationName = latestLineup.formation || '4-4-2';
          const foundFormation = FORMATIONS.find(f => f.name === formationName);
          if (foundFormation) setFormation(foundFormation);
          setLastSaved(new Date(latestLineup.updated_at || latestLineup.created_at).toLocaleString());
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Failed to load lineup by id:', err);
      }
    }

    try {
      // First try to get user's default room or latest lineup from server
      const response = await fetch(`/api/lineups?userId=${user.id}`);
      const result = await response.json();
      
      if (result.success && result.data && result.data.length > 0) {
        const latestLineup = result.data[0]; // Latest lineup
        setDefaultRoomId(latestLineup.room_id);
        
        // Convert lineup players to squad format
        const squadPlayers: SquadPlayer[] = latestLineup.lineup_players.map((lp: any) => ({
          id: lp.players.id,
          name: lp.players.name,
          position: lp.players.position,
          price: lp.players.price,
          total_points: lp.players.total_points,
          photo_url: lp.players.photo_url,
          teams: {
            name: lp.players.teams.name,
            short_name: lp.players.teams.short_name,
            primary_color: lp.players.teams.primary_color || '#000000'
          },
          is_starter: lp.is_starter,
          is_captain: lp.is_captain,
          is_vice_captain: lp.is_vice_captain
        }));
        
        setSquad(squadPlayers);
        
        // Set formation if available
        const formationName = latestLineup.formation || '4-4-2';
        const foundFormation = FORMATIONS.find(f => f.name === formationName);
        if (foundFormation) {
          setFormation(foundFormation);
        }
        
        setLastSaved(new Date(latestLineup.updated_at || latestLineup.created_at).toLocaleString());
        } else {
          // No server lineup found, initialize empty or fallback handled later
          initializeSquad();
        }
    } catch (error) {
      console.error('Failed to load user lineup:', error);
      
      // Fallback to local draft
      const draftKey = `lineup_draft_${user.id}`;
      const draftData = localStorage.getItem(draftKey);
      if (draftData) {
        try {
          const draft = JSON.parse(draftData);
          const squadPlayers: SquadPlayer[] = draft.players;
          setSquad(squadPlayers);
          setLastSaved(new Date(draft.lastSaved).toLocaleString() + ' (草稿)');
        } catch (draftError) {
          initializeSquad();
        }
      } else {
        initializeSquad();
      }
    } finally {
      setLoading(false);
    }
  };

  const saveLineup = async () => {
    if (!user) {
      alert('请先登录后再保存阵容');
      return;
    }

    if (squad.length === 0) {
      alert('请先选择球员组成阵容');
      return;
    }

    // Validate starters and position counts before saving to server.
    const starters = squad.filter(p => p.is_starter);
    const startersCount = starters.length;

    // Required counts based on formation
    const requiredCounts: Record<string, number> = {
      GK: 1,
      DEF: formation.def,
      MID: formation.mid,
      FWD: formation.fwd
    };

    const actualCounts = {
      GK: starters.filter(p => p.position === 'GK').length,
      DEF: starters.filter(p => p.position === 'DEF').length,
      MID: starters.filter(p => p.position === 'MID').length,
      FWD: starters.filter(p => p.position === 'FWD').length
    };

    const errors: string[] = [];
    if (startersCount !== 11) errors.push(`首发人数必须为 11，目前为 ${startersCount}`);
    (['GK','DEF','MID','FWD'] as const).forEach((pos) => {
      const req = (requiredCounts as any)[pos];
      const got = (actualCounts as any)[pos];
      if (got !== req) errors.push(`${pos} 需要 ${req} 人，目前为 ${got}`);
    });

    // If there are validation errors, block saving and show inline errors
    if (errors.length > 0) {
      setSaveErrors(errors);
      return;
    }

    // Team limit: no more than 3 players from the same team across the whole squad
    const overTeams = Object.entries(stats.teamCounts).filter(([, cnt]) => cnt > 3);
    if (overTeams.length > 0) {
      const msgs = overTeams.map(([teamId, cnt]) => {
        const name = stats.teamIdToName?.[teamId] || teamId;
        return `${name} 当前有 ${cnt} 名球员（最多 3 人）`;
      });
      setSaveErrors(msgs);
      return;
    }

    // Enforce per-team maximum (3 players per team)
    const statsForSave = calculateTeamStats();
    const offendingTeams = Object.entries(statsForSave.teamCounts || {}).filter(([,c]) => (c || 0) > 3).map(([tid]) => statsForSave.teamIdToName?.[tid] || tid);
    if (offendingTeams.length > 0) {
      setSaveErrors([`每支球队最多允许 3 名球员，以下队伍超出：${offendingTeams.join(', ')}`]);
      return;
    }

    // We treat a save as a draft by default; roomId is optional for drafts. Backend will accept drafts without roomId.
    const roomIdToSubmit = defaultRoomId || null;

    setSaving(true);
    
    try {
      const captain = squad.find(p => p.is_captain);
      const viceCaptain = squad.find(p => p.is_vice_captain);
      
      const lineupData = {
        userId: user.id,
      roomId: roomIdToSubmit,
        gameweek: 1, // Default to gameweek 1 for now
        players: squad.map(player => ({
          id: player.id,
          position: player.position,
          team_id: player.teams ? 'team_id_placeholder' : null, // We need team_id from the API
          price: player.price,
          is_starter: player.is_starter,
          is_captain: player.is_captain,
          is_vice_captain: player.is_vice_captain
        })),
        formation: formation.name,
        captainId: captain?.id || null,
        viceCaptainId: viceCaptain?.id || null,
      isSubmitted: false // save as draft by default
      };

      // Get access token from client supabase session and include it in Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token || null;
      if (!accessToken) {
        setSaveErrors(['未检测到授权 token，请重新登录后重试']);
        setSaving(false);
        return;
      }

      const response = await fetch('/api/lineups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify(lineupData)
      });

      const result = await response.json();
      
      if (result.success) {
        setLastSaved(new Date().toLocaleString());
        setSaveErrors(null);
        alert('阵容保存成功！');
      } else {
        setSaveErrors([`保存失败: ${result.error}`]);
      }
    } catch (error) {
      console.error('Save lineup error:', error);
    setSaveErrors(['保存阵容时出错']);
    } finally {
      setSaving(false);
    }
  };

  // Local autosave (debounced) + beforeunload backup
  const localDraftKey = user ? `lineup_draft_${user.id}` : 'lineup_draft_anon';

  const saveLocalDraft = () => {
    if (!user) return;
    try {
      const draftLineup = {
        userId: user.id,
        players: squad.map(player => ({
          id: player.id,
          name: player.name,
          position: player.position,
          price: player.price,
          is_starter: player.is_starter,
          is_captain: player.is_captain,
          is_vice_captain: player.is_vice_captain,
          photo_url: player.photo_url,
          teams: player.teams,
          total_points: player.total_points
        })),
        formation: formation.name,
        lastSaved: new Date().toISOString(),
        budget
      };
      localStorage.setItem(localDraftKey, JSON.stringify(draftLineup));
      setLocalDraft(draftLineup);
      setLocalDraftAvailable(false);
    } catch (e) {
      console.error('Auto-save draft failed:', e);
    }
  };

  const scheduleSaveLocalDraft = () => {
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    saveTimeoutRef.current = window.setTimeout(() => {
      saveLocalDraft();
    }, 1500);
  };

  const loadLocalDraftFromStorage = () => {
    if (!user) return null;
    try {
      const data = localStorage.getItem(`lineup_draft_${user.id}`);
      if (!data) return null;
      return JSON.parse(data);
    } catch (err) {
      console.error('Failed to read local draft:', err);
      return null;
    }
  };

  const discardLocalDraft = () => {
    if (!user) return;
    try {
      localStorage.removeItem(`lineup_draft_${user.id}`);
      setLocalDraft(null);
      setLocalDraftAvailable(false);
    } catch (err) {
      console.error('Failed to discard local draft:', err);
    }
  };

  useEffect(() => {
    // Save on unload synchronously
    const handleBeforeUnload = () => {
      try {
        // synchronous localStorage write
        if (user) saveLocalDraft();
      } catch (e) {
        // ignore
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) window.clearTimeout(saveTimeoutRef.current);
    };
  }, [user, squad, formation, budget]);

  // Schedule local save when squad/formation/budget change
  useEffect(() => {
    if (!user) return;
    scheduleSaveLocalDraft();
  }, [squad, formation, budget, user]);

  const calculateTeamStats = () => {
    const totalCost = squad.reduce((sum, player) => sum + player.price, 0);
    const remainingBudget = budget - totalCost;
    const positionCounts = {
      GK: squad.filter(p => p.position === 'GK').length,
      DEF: squad.filter(p => p.position === 'DEF').length,
      MID: squad.filter(p => p.position === 'MID').length,
      FWD: squad.filter(p => p.position === 'FWD').length
    };
    // Count players per team id and build id->name map
    const teamCounts: Record<string, number> = {};
    const teamIdToName: Record<string, string> = {};
    for (const p of squad) {
      const tid = (p.teams && (p.teams.short_name || p.teams.name)) || 'UNKNOWN';
      teamCounts[tid] = (teamCounts[tid] || 0) + 1;
      if (p.teams && (p.teams.name || p.teams.short_name)) {
        teamIdToName[tid] = p.teams.name || p.teams.short_name || tid;
      }
    }
    
    return { totalCost, remainingBudget, positionCounts, teamCounts, teamIdToName };
  };

  const addPlayerToSquad = (player: Player) => {
    const stats = calculateTeamStats();

    // For 11-player mode, enforce starters and formation counts
    const maxPositions = { GK: 1, DEF: formation.def, MID: formation.mid, FWD: formation.fwd };
    const currentPosCount = stats.positionCounts[player.position];
    if (currentPosCount >= maxPositions[player.position]) {
      alert(`该位置已满员 (阵型限制：最多 ${maxPositions[player.position]} 人)`);
      return;
    }

    // Check budget
    if (stats.remainingBudget < player.price) {
      alert('预算不足');
      return;
    }

    // Check total squad size (11 starters)
    if (squad.length >= 11) {
      alert('球队已满员 (最多11人)');
      return;
    }

    const newPlayer: SquadPlayer = {
      ...player,
      is_starter: true,
      is_captain: false,
      is_vice_captain: false
    };

    setSquad(prev => [...prev, newPlayer]);
    setShowPlayerSelector(false);
  };

  const handleFormationChange = (name: string) => {
    const newFormation = FORMATIONS.find(f => f.name === name) || FORMATIONS[0];
    // Determine required counts for starters
    const req = { GK: 1, DEF: newFormation.def, MID: newFormation.mid, FWD: newFormation.fwd };

    // Keep players that still fit; remove excess players of any position if over the required count.
    // Strategy: preserve earlier selections, remove last-added players of the overfull positions.
    const startersOnly = squad.filter(p => p.is_starter);
    const benchOnly = squad.filter(p => !p.is_starter);

    // Build new starters by position preserving original order
    const newStarters: SquadPlayer[] = [];
    const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };

    for (const p of startersOnly) {
      if (counts[p.position] < (req as any)[p.position]) {
        newStarters.push(p);
        counts[p.position]++;
      } else {
        // overflow - push to bench (will be removed entirely if squad >11)
        benchOnly.push({ ...p, is_starter: false });
      }
    }

    // If newStarters < required total (shouldn't happen normally) we can try to promote bench
    const totalRequired = 1 + newFormation.def + newFormation.mid + newFormation.fwd;
    if (newStarters.length < totalRequired) {
      // try to promote cheapest bench players of needed positions
      for (const pos of ['GK','DEF','MID','FWD'] as const) {
        while ((counts as any)[pos] < (req as any)[pos]) {
          const candidateIndex = benchOnly.findIndex(b => b.position === pos);
          if (candidateIndex === -1) break;
          const cand = benchOnly.splice(candidateIndex,1)[0];
          cand.is_starter = true;
          newStarters.push(cand);
          (counts as any)[pos]++;
        }
      }
    }

    // Rebuild squad: starters first (exactly totalRequired), then bench limited to 0 (we want 11 total)
    const rebuilt = [...newStarters.slice(0, totalRequired)];
    // If rebuilt less than 11, try fill with cheapest remaining players from benchOnly
    if (rebuilt.length < 11) {
      const remaining = benchOnly.sort((a,b)=>a.price-b.price);
      for (const r of remaining) {
        if (rebuilt.length >= 11) break;
        rebuilt.push({ ...r, is_starter: false });
      }
    }

    setFormation(newFormation);
    setSquad(rebuilt);
  };

  const resetSquad = () => {
    if (!confirm('确定要重置阵容吗？这会移除所有已选择的球员。')) return;
    initializeSquad();
    setLastSaved(null);
  };

  const autofillSquad = () => {
    // Enhanced autofill: pick cheapest available players per position while respecting team limits (max 3 per team)
    const picks: SquadPlayer[] = [];
    const takenIds = new Set<string>();
    const teamCounts = new Map<string, number>(); // track players per team

    // Helper function to check if we can add a player from their team
    const canAddFromTeam = (player: any) => {
      const teamName = player.teams?.short_name || player.teams?.name || 'Unknown';
      const currentCount = teamCounts.get(teamName) || 0;
      return currentCount < 3;
    };

    // Helper function to add a player and update team count
    const addPlayer = (player: any, isStarter: boolean = true) => {
      const teamName = player.teams?.short_name || player.teams?.name || 'Unknown';
      const currentCount = teamCounts.get(teamName) || 0;
      teamCounts.set(teamName, currentCount + 1);
      takenIds.add(player.id);
      picks.push({ 
        ...player, 
        is_starter: isStarter, 
        is_captain: false, 
        is_vice_captain: false 
      });
    };

    // GK: need 1 (cheapest available that respects team limits)
    const gkCandidates = players
      .filter(p => p.position === 'GK' && !takenIds.has(p.id))
      .sort((a, b) => a.price - b.price);
    
    for (const gk of gkCandidates) {
      if (canAddFromTeam(gk)) {
        addPlayer(gk);
        break;
      }
    }

    const pickByPos = (pos: 'DEF'|'MID'|'FWD', count: number) => {
      const candidates = players
        .filter(p => p.position === pos && !takenIds.has(p.id))
        .sort((a, b) => a.price - b.price);
      
      let picked = 0;
      for (const candidate of candidates) {
        if (picked >= count) break;
        if (canAddFromTeam(candidate)) {
          addPlayer(candidate);
          picked++;
        }
      }
    };

    pickByPos('DEF', formation.def);
    pickByPos('MID', formation.mid);
    pickByPos('FWD', formation.fwd);

    // If picks < 11 because of missing players or team limits, fill with cheapest others
    if (picks.length < 11) {
      const others = players
        .filter(p => !takenIds.has(p.id))
        .sort((a, b) => a.price - b.price);
      
      for (const other of others) {
        if (picks.length >= 11) break;
        if (canAddFromTeam(other)) {
          addPlayer(other);
        }
      }
    }

    // Calculate total cost and ensure within budget; if over budget, replace expensive players
    let total = picks.reduce((s, p) => s + p.price, 0);
    if (total > budget) {
      // Sort picks by price (most expensive first) but keep team constraints
      const expensiveFirst = [...picks].sort((a, b) => b.price - a.price);
      
      for (let i = 0; i < expensiveFirst.length && total > budget; i++) {
        const expensivePlayer = expensiveFirst[i];
        const playerIndex = picks.findIndex(p => p.id === expensivePlayer.id);
        if (playerIndex === -1) continue;
        
        // Try to find a cheaper replacement from a different team or same team if allowed
        const replacements = players
          .filter(p => 
            p.position === expensivePlayer.position && 
            !takenIds.has(p.id) && 
            p.price < expensivePlayer.price
          )
          .sort((a, b) => a.price - b.price);
        
        for (const replacement of replacements) {
          // Remove the expensive player first to check team count
          const expensiveTeam = expensivePlayer.teams?.short_name || expensivePlayer.teams?.name || 'Unknown';
          teamCounts.set(expensiveTeam, (teamCounts.get(expensiveTeam) || 1) - 1);
          
          if (canAddFromTeam(replacement)) {
            // Replace the expensive player
            picks[playerIndex] = { 
              ...replacement, 
              is_starter: expensivePlayer.is_starter, 
              is_captain: false, 
              is_vice_captain: false 
            };
            takenIds.delete(expensivePlayer.id);
            takenIds.add(replacement.id);
            
            const replacementTeam = replacement.teams?.short_name || replacement.teams?.name || 'Unknown';
            teamCounts.set(replacementTeam, (teamCounts.get(replacementTeam) || 0) + 1);
            
            total = picks.reduce((s, p) => s + p.price, 0);
            break;
          } else {
            // Restore the expensive player's team count
            teamCounts.set(expensiveTeam, (teamCounts.get(expensiveTeam) || 0) + 1);
          }
        }
      }
    }

    // Ensure we don't exceed 11 players
    const finalSquad = picks.slice(0, 11);
    
    console.log('Autofill completed:', {
      totalPlayers: finalSquad.length,
      totalCost: finalSquad.reduce((s, p) => s + p.price, 0),
      teamCounts: Object.fromEntries(teamCounts.entries())
    });

    setSquad(finalSquad);
  };

  const removePlayerFromSquad = (playerId: string) => {
    setSquad(prev => prev.filter(p => p.id !== playerId));
  };

  const toggleStarter = (playerId: string) => {
    setSquad(prev => prev.map(player => {
      if (player.id === playerId) {
        return { ...player, is_starter: !player.is_starter };
      }
      return player;
    }));
  };

  const setCaptain = (playerId: string) => {
    console.log('setCaptain called with playerId:', playerId);
    setSquad(prev => {
      const updated = prev.map(player => ({
        ...player,
        // 只有被选中的球员成为队长
        is_captain: player.id === playerId,
        // 如果当前球员被设为队长，则不能是副队长
        is_vice_captain: player.id === playerId ? false : player.is_vice_captain
      }));
      console.log('Updated squad after setCaptain:', updated);
      return updated;
    });
  };

  const setViceCaptain = (playerId: string) => {
    console.log('setViceCaptain called with playerId:', playerId);
    setSquad(prev => {
      const updated = prev.map(player => ({
        ...player,
        // 如果当前球员被设为副队长，则不能是队长
        is_captain: player.id === playerId ? false : player.is_captain,
        // 只有被选中的球员成为副队长
        is_vice_captain: player.id === playerId
      }));
      console.log('Updated squad after setViceCaptain:', updated);
      return updated;
    });
  };

  const stats = calculateTeamStats();
  const starters = squad.filter(p => p.is_starter);
  const bench = squad.filter(p => !p.is_starter);

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'MID': return 'bg-green-100 text-green-800 border-green-300';
      case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (loading) {
    return (
      <Layout title="我的阵容">
        <div className="container mx-auto px-6 py-12 text-center">
          <div className="text-2xl">加载阵容数据中...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="我的阵容">
      <div className="container mx-auto px-6 py-12">
        
        {/* 球队统计 */}
        <Card className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-600">£{stats.remainingBudget.toFixed(1)}m</div>
              <div className="text-sm text-gray-500">剩余预算</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{squad.length}/11</div>
              <div className="text-sm text-gray-500">球员数量</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{starters.length}/11</div>
              <div className="text-sm text-gray-500">首发阵容</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{formation.name}</div>
              <div className="text-sm text-gray-500">阵型</div>
            </div>
          </div>
          {/* 每队球员计数（所有已选球员） */}
          <div className="mt-4">
            <div className="text-sm font-semibold mb-2">各队球员数量</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.teamCounts).map(([teamId, count]) => {
                const teamName = stats.teamIdToName?.[teamId] || teamId;
                const over = count > 3;
                return (
                  <div key={teamId} className={`px-3 py-1 rounded-full text-sm ${over ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-800'}`}>
                    {teamName}: {count}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Local draft restore banner */}
        {localDraftAvailable && localDraft && (
          <div className="mb-4 p-3 rounded bg-yellow-50 border-l-4 border-yellow-400">
            <div className="flex items-center justify-between">
              <div className="text-sm text-yellow-800">检测到本地草稿（{new Date(localDraft.lastSaved).toLocaleString()}）。你想恢复本地草稿还是丢弃？</div>
              <div className="flex space-x-2">
                <button onClick={() => {
                  try {
                    const draft = localDraft;
                    const squadPlayers: SquadPlayer[] = draft.players.map((p: any) => ({
                      id: p.id,
                      name: p.name,
                      position: p.position,
                      price: p.price,
                      total_points: p.total_points || 0,
                      photo_url: p.photo_url,
                      teams: p.teams,
                      is_starter: p.is_starter,
                      is_captain: p.is_captain,
                      is_vice_captain: p.is_vice_captain
                    }));
                    setSquad(squadPlayers);
                    const foundFormation = FORMATIONS.find(f => f.name === draft.formation);
                    if (foundFormation) setFormation(foundFormation);
                    setLocalDraftAvailable(false);
                    setLocalDraft(null);
                  } catch (err) { console.error('Restore failed', err); }
                }} className="px-3 py-1 bg-yellow-600 text-white rounded">恢复</button>
                <button onClick={() => { discardLocalDraft(); }} className="px-3 py-1 bg-white border rounded">丢弃</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* 足球场布局 */}
          <div className="lg:col-span-2">
            <Card>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">阵容布局</h3>
                <select 
                  value={formation.name} 
                  onChange={(e) => setFormation(FORMATIONS.find(f => f.name === e.target.value) || FORMATIONS[0])}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  {FORMATIONS.map(f => (
                    <option key={f.name} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>

              {saveErrors && saveErrors.length > 0 && (
                <div className="mt-4 p-3 bg-red-50 border border-red-100 text-sm text-red-800 rounded">
                  <div className="font-semibold mb-2">无法保存：</div>
                  <ul className="list-disc pl-5">
                    {saveErrors.map((e, idx) => (<li key={idx}>{e}</li>))}
                  </ul>
                </div>
              )}
              
              {/* 足球场 */}
              <div className="bg-gradient-to-t from-green-400 to-green-300 rounded-lg p-8 min-h-[600px] relative overflow-visible">
                {/* 场地标线 */}
                <div className="absolute inset-0 opacity-20">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-16 h-8 border-2 border-white"></div>
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-16 h-8 border-2 border-white"></div>
                  <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 border-2 border-white rounded-full"></div>
                </div>
                
                {/* 球员位置 */}
                <div className="relative h-full flex flex-col justify-evenly py-12 space-y-16">
                  
                  {/* 门将 */}
                  <div className="flex justify-center">
                    {starters.filter(p => p.position === 'GK').slice(0, 1).map(player => (
                      <div key={player.id} className="flex flex-col items-center">
                        <PlayerBadge player={player} onRemove={removePlayerFromSquad} onAssignCaptain={setCaptain} onAssignVice={setViceCaptain} />
                      </div>
                    ))}
                    {starters.filter(p => p.position === 'GK').length === 0 && (
                      <EmptySlot position="GK" onClick={() => { 
                        setSelectedPosition('GK'); 
                        setFilterTeam('ALL'); 
                        setFilterPosition('GK');
                        setSortBy('total_points'); 
                        setSortOrder('desc'); 
                        setShowPlayerSelector(true); 
                      }} />
                    )}
                  </div>
                  
                  {/* 后卫 */}
                  <div className="flex justify-center space-x-8">
                    {Array.from({ length: formation.def }, (_, i) => {
                      const player = starters.filter(p => p.position === 'DEF')[i];
                      return player ? (
                        <div key={player.id} className="flex flex-col items-center">
                          <PlayerBadge player={player} onRemove={removePlayerFromSquad} onAssignCaptain={setCaptain} onAssignVice={setViceCaptain} />
                        </div>
                      ) : (
                        <EmptySlot key={i} position="DEF" onClick={() => { 
                          setSelectedPosition('DEF'); 
                          setFilterTeam('ALL'); 
                          setFilterPosition('DEF');
                          setSortBy('total_points'); 
                          setSortOrder('desc'); 
                          setShowPlayerSelector(true); 
                        }} />
                      );
                    })}
                  </div>
                  
                  {/* 中场 */}
                  <div className="flex justify-center space-x-8">
                    {Array.from({ length: formation.mid }, (_, i) => {
                      const player = starters.filter(p => p.position === 'MID')[i];
                      return player ? (
                        <div key={player.id} className="flex flex-col items-center">
                          <PlayerBadge player={player} onRemove={removePlayerFromSquad} onAssignCaptain={setCaptain} onAssignVice={setViceCaptain} />
                        </div>
                      ) : (
                        <EmptySlot key={i} position="MID" onClick={() => { 
                          setSelectedPosition('MID'); 
                          setFilterTeam('ALL'); 
                          setFilterPosition('MID');
                          setSortBy('total_points'); 
                          setSortOrder('desc'); 
                          setShowPlayerSelector(true); 
                        }} />
                      );
                    })}
                  </div>
                  
                  {/* 前锋 */}
                  <div className="flex justify-center space-x-8">
                    {Array.from({ length: formation.fwd }, (_, i) => {
                      const player = starters.filter(p => p.position === 'FWD')[i];
                      return player ? (
                        <div key={player.id} className="flex flex-col items-center">
                          <PlayerBadge player={player} onRemove={removePlayerFromSquad} onAssignCaptain={setCaptain} onAssignVice={setViceCaptain} />
                        </div>
                      ) : (
                        <EmptySlot key={i} position="FWD" onClick={() => { 
                          setSelectedPosition('FWD'); 
                          setFilterTeam('ALL'); 
                          setFilterPosition('FWD');
                          setSortBy('total_points'); 
                          setSortOrder('desc'); 
                          setShowPlayerSelector(true); 
                        }} />
                      );
                    })}
                  </div>
                </div>
              </div>
            </Card>
          </div>
          
          {/* 替补席和控制面板 */}
          <div className="space-y-6">
            
            {/* 替补席 */}
            <Card>
              <h4 className="text-lg font-bold mb-4">替补席</h4>
              <div className="space-y-2">
                {bench.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-sm">{player.name.split(' ').pop()}</div>
                      <div className="text-xs text-gray-500">{player.teams.short_name}</div>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => toggleStarter(player.id)}
                        className="text-xs bg-blue-500 text-white px-2 py-1 rounded"
                      >
                        上场
                      </button>
                      <button 
                        onClick={() => removePlayerFromSquad(player.id)}
                        className="text-xs bg-red-500 text-white px-2 py-1 rounded"
                      >
                        移除
                      </button>
                    </div>
                  </div>
                ))}
                {bench.length === 0 && (
                  <div className="text-center text-gray-500 py-4">替补席为空</div>
                )}
              </div>
            </Card>
            
            {/* 位置需求 */}
            <Card>
              <h4 className="text-lg font-bold mb-4">位置需求</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>门将 (GK)</span>
                  <span className={stats.positionCounts.GK >= 1 ? 'text-green-600' : 'text-red-600'}>
                    {stats.positionCounts.GK}/1
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>后卫 (DEF)</span>
                  <span className={stats.positionCounts.DEF >= formation.def ? 'text-green-600' : 'text-red-600'}>
                    {stats.positionCounts.DEF}/{formation.def}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>中场 (MID)</span>
                  <span className={stats.positionCounts.MID >= formation.mid ? 'text-green-600' : 'text-red-600'}>
                    {stats.positionCounts.MID}/{formation.mid}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>前锋 (FWD)</span>
                  <span className={stats.positionCounts.FWD >= formation.fwd ? 'text-green-600' : 'text-red-600'}>
                    {stats.positionCounts.FWD}/{formation.fwd}
                  </span>
                </div>
              </div>
            </Card>

            {/* 快速操作 */}
            <Card>
              <h4 className="text-lg font-bold mb-4">快速操作</h4>
              <div className="space-y-3">
                <Button className="w-full" onClick={() => { 
                  setSelectedPosition(null); 
                  setFilterTeam('ALL'); 
                  setFilterPosition('ALL');
                  setSortBy('total_points'); 
                  setSortOrder('desc'); 
                  setShowPlayerSelector(true); 
                }}>
                  添加球员
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={saveLineup}
                  disabled={saving || !user}
                >
                  {saving ? '保存中...' : '保存阵容'}
                </Button>
                <Button variant="outline" className="w-full" onClick={autofillSquad}>
                  自动填充
                </Button>
                <Button variant="outline" className="w-full" onClick={resetSquad}>
                  重置阵容
                </Button>
                <div className="p-3 bg-gray-50 rounded text-sm">总预算: <span className="font-semibold">£{budget.toFixed(1)}m</span></div>
              </div>
              
              {lastSaved && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    上次保存: {lastSaved}
                  </div>
                </div>
              )}
              
              {!user && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-orange-600">
                    请登录后保存阵容草稿
                  </div>
                </div>
              )}
              
              {user && !defaultRoomId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-xs text-blue-600">
                    💡 当前保存为草稿，加入联赛后可正式提交
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* 球员选择器模态框 */}
        {showPlayerSelector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold">
                    选择球员 {selectedPosition ? `(${selectedPosition}位置)` : '(所有位置)'}
                  </h3>
                  <button 
                    onClick={() => setShowPlayerSelector(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                {/* 筛选和排序控件 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">位置筛选</label>
                      <select 
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value as 'ALL' | 'GK' | 'DEF' | 'MID' | 'FWD')}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="ALL">全部位置</option>
                        <option value="GK">门将 (GK)</option>
                        <option value="DEF">后卫 (DEF)</option>
                        <option value="MID">中场 (MID)</option>
                        <option value="FWD">前锋 (FWD)</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">球队筛选</label>
                      <select 
                        value={filterTeam}
                        onChange={(e) => setFilterTeam(e.target.value)}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="ALL">全部球队</option>
                        <option value="ARS">Arsenal</option>
                        <option value="AVL">Aston Villa</option>
                        <option value="BOU">Bournemouth</option>
                        <option value="BRE">Brentford</option>
                        <option value="BRI">Brighton</option>
                        <option value="CHE">Chelsea</option>
                        <option value="CRY">Crystal Palace</option>
                        <option value="EVE">Everton</option>
                        <option value="FUL">Fulham</option>
                        <option value="IPS">Ipswich</option>
                        <option value="LEI">Leicester</option>
                        <option value="LIV">Liverpool</option>
                        <option value="MCI">Man City</option>
                        <option value="MUN">Man United</option>
                        <option value="NEW">Newcastle</option>
                        <option value="NFO">Nottingham Forest</option>
                        <option value="SOU">Southampton</option>
                        <option value="TOT">Tottenham</option>
                        <option value="WHU">West Ham</option>
                        <option value="WOL">Wolves</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序方式</label>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'price' | 'total_points')}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                      >
                        <option value="total_points">总积分</option>
                        <option value="price">价格</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">排序顺序</label>
                      <button
                        onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
                      >
                        {sortOrder === 'desc' ? '从高到低 ↓' : '从低到高 ↑'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-4 text-center text-sm text-gray-600">
                    共 {players
                      .filter(player => selectedPosition ? player.position === selectedPosition : (filterPosition === 'ALL' ? true : player.position === filterPosition))
                      .filter(player => filterTeam === 'ALL' || player.teams.short_name === filterTeam)
                      .filter(player => !squad.find(s => s.id === player.id))
                      .length} 名可选球员
                </div>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players
                    .filter(player => selectedPosition ? player.position === selectedPosition : (filterPosition === 'ALL' ? true : player.position === filterPosition))
                    .filter(player => filterTeam === 'ALL' || player.teams.short_name === filterTeam)
                    .filter(player => !squad.find(s => s.id === player.id))
                    .sort((a, b) => {
                      const multiplier = sortOrder === 'desc' ? -1 : 1;
                      return (a[sortBy] - b[sortBy]) * multiplier;
                    })
                    .map(player => (
                      <div key={player.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="font-medium">{player.name.split(' ').pop()}</div>
                            <div className="text-sm text-gray-500">{player.teams.short_name}</div>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getPositionColor(player.position)}`}>
                            {player.position}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                          <div>
                            <span className="text-gray-500">积分:</span>
                            <span className="font-medium ml-1">{player.total_points}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">价格:</span>
                            <span className="font-bold text-blue-600 ml-1">£{player.price}m</span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          {player.photo_url && (
                            <img
                              src={player.photo_url}
                              alt={player.name}
                              className="w-8 h-8 rounded-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/players/default.svg';
                              }}
                            />
                          )}
                          <Button size="sm" onClick={() => addPlayerToSquad(player)} className="ml-auto">
                            添加
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

// 使用共享的 PlayerBadge 组件（位于 src/components/PlayerBadge.tsx）

// 空位置组件
function EmptySlot({ position, onClick }: { position: string, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center text-xs font-semibold cursor-pointer hover:bg-opacity-75 transition-colors ${getPositionColor(position)}`}
    >
      <div className="text-center">
        <div>+</div>
        <div>{position}</div>
      </div>
    </div>
  );
}

function getPositionColor(position: string) {
  switch (position) {
    case 'GK': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'DEF': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'MID': return 'bg-green-100 text-green-800 border-green-300';
    case 'FWD': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
}