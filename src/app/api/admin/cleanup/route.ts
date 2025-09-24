// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST /api/admin/cleanup - Clean up old/duplicate data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    console.log(`Starting cleanup action: ${action}`);
    
    const results = {
      action,
      deleted: 0,
      kept: 0,
      errors: []
    };

    switch (action) {
      case 'cleanup_old_players':
        // Remove players that seem to be from old seasons or test data
        // Keep only players that were updated recently or have reasonable stats
        
        console.log('Analyzing player data...');
        
        // Get all players to analyze
        const { data: allPlayers } = await supabase
          .from('players')
          .select('id, name, total_points, updated_at, created_at, price');

        if (!allPlayers) {
          throw new Error('Failed to fetch players for analysis');
        }

        console.log(`Found ${allPlayers.length} total players`);

        // Identify old/test data criteria:
        // 1. Players with very low prices (< 4.0) that seem like test data
        // 2. Players with unrealistic stats
        // 3. Players not updated in the last 30 days
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

        const playersToDelete = allPlayers.filter(player => {
          const updatedAt = new Date(player.updated_at || player.created_at);
          const isOld = updatedAt < oneMonthAgo;
          const hasLowPrice = player.price < 4.0;
          const hasZeroPoints = player.total_points === 0;
          
          // Delete if: old AND (very cheap OR zero points)
          return isOld && (hasLowPrice || hasZeroPoints);
        });

        console.log(`Identified ${playersToDelete.length} players for deletion`);

        // Delete old players in batches
        const BATCH_SIZE = 50;
        for (let i = 0; i < playersToDelete.length; i += BATCH_SIZE) {
          const batch = playersToDelete.slice(i, i + BATCH_SIZE);
          const idsToDelete = batch.map(p => p.id);
          
          const { error: deleteError } = await supabase
            .from('players')
            .delete()
            .in('id', idsToDelete);
          
          if (deleteError) {
            console.error('Error deleting batch:', deleteError);
            results.errors.push(`Batch delete failed: ${deleteError.message}`);
          } else {
            results.deleted += batch.length;
          }
        }

        results.kept = allPlayers.length - results.deleted;
        break;

      case 'cleanup_duplicate_players':
        // Remove duplicate players (same name + team)
        console.log('Finding duplicate players...');
        
        // Get all players grouped by name and team to find duplicates
        const { data: allPlayersForDupes } = await supabase
          .from('players')
          .select('id, name, team_id, updated_at, created_at')
          .order('name');
          
        if (!allPlayersForDupes) {
          throw new Error('Failed to fetch players for duplicate analysis');
        }
        
        // Group players by name + team combination
        const playerGroups = new Map();
        
        for (const player of allPlayersForDupes) {
          const key = `${player.name}-${player.team_id}`;
          if (!playerGroups.has(key)) {
            playerGroups.set(key, []);
          }
          playerGroups.get(key).push(player);
        }
        
        // Find groups with duplicates and remove older ones
        for (const [key, players] of playerGroups) {
          if (players.length > 1) {
            console.log(`Found ${players.length} duplicates for: ${players[0].name}`);
            
            // Sort by updated_at (most recent first), fallback to created_at
            players.sort((a, b) => {
              const aDate = new Date(a.updated_at || a.created_at);
              const bDate = new Date(b.updated_at || b.created_at);
              return bDate.getTime() - aDate.getTime();
            });
            
            // Keep the first (most recent), delete the rest
            const toDelete = players.slice(1);
            const idsToDelete = toDelete.map(p => p.id);
            
            console.log(`Keeping newest ${players[0].name}, deleting ${toDelete.length} older versions`);
            
            const { error: deleteError } = await supabase
              .from('players')
              .delete()
              .in('id', idsToDelete);
            
            if (deleteError) {
              console.error(`Error deleting duplicates for ${players[0].name}:`, deleteError);
              results.errors.push(`Failed to delete duplicates for ${players[0].name}: ${deleteError.message}`);
            } else {
              results.deleted += toDelete.length;
              results.kept += 1;
            }
          } else {
            results.kept += 1;
          }
        }
        break;

      case 'cleanup_old_fixtures':
        // Remove fixtures from old seasons
        const { error: fixtureDeleteError } = await supabase
          .from('fixtures')
          .delete()
          .lt('created_at', oneMonthAgo.toISOString());
        
        if (fixtureDeleteError) {
          results.errors.push(`Fixture cleanup failed: ${fixtureDeleteError.message}`);
        }
        break;

      default:
        throw new Error(`Unknown cleanup action: ${action}`);
    }

    return NextResponse.json({
      success: true,
      data: results,
      message: `Cleanup completed: ${results.deleted} deleted, ${results.kept} kept`
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cleanup data'
    }, { status: 500 });
  }
}