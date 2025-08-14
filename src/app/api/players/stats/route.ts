import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/players/stats - Get player statistics and filters
export async function GET(request: NextRequest) {
  try {
    // Get position counts
    const { data: positionStats, error: positionError } = await supabase
      .from('players')
      .select('position')
      .eq('is_available', true);

    if (positionError) throw positionError;

    const positionCounts = positionStats.reduce((acc, player) => {
      acc[player.position] = (acc[player.position] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get team counts
    const { data: teamStats, error: teamError } = await supabase
      .from('players')
      .select(`
        teams(short_name, name)
      `)
      .eq('is_available', true);

    if (teamError) throw teamError;

    const teamCounts = teamStats.reduce((acc, player) => {
      if (player.teams) {
        const team = player.teams as any;
        acc[team.short_name] = {
          name: team.name,
          count: (acc[team.short_name]?.count || 0) + 1
        };
      }
      return acc;
    }, {} as Record<string, { name: string; count: number }>);

    // Get price ranges
    const { data: priceStats, error: priceError } = await supabase
      .from('players')
      .select('price')
      .eq('is_available', true)
      .order('price', { ascending: true });

    if (priceError) throw priceError;

    const prices = priceStats.map(p => p.price);
    const priceRanges = {
      min: Math.min(...prices),
      max: Math.max(...prices),
      ranges: [
        { label: 'Budget (4.0-6.0)', min: 4.0, max: 6.0, count: prices.filter(p => p >= 4.0 && p <= 6.0).length },
        { label: 'Mid (6.1-9.0)', min: 6.1, max: 9.0, count: prices.filter(p => p >= 6.1 && p <= 9.0).length },
        { label: 'Premium (9.1-12.0)', min: 9.1, max: 12.0, count: prices.filter(p => p >= 9.1 && p <= 12.0).length },
        { label: 'Elite (12.1+)', min: 12.1, max: 15.0, count: prices.filter(p => p >= 12.1).length }
      ]
    };

    // Get top performers
    const { data: topScorers, error: scorersError } = await supabase
      .from('players')
      .select(`
        id, name, total_points, position,
        teams(short_name, name)
      `)
      .eq('is_available', true)
      .order('total_points', { ascending: false })
      .limit(10);

    if (scorersError) throw scorersError;

    const { data: topAssists, error: assistsError } = await supabase
      .from('players')
      .select(`
        id, name, assists, position,
        teams(short_name, name)
      `)
      .eq('is_available', true)
      .order('assists', { ascending: false })
      .limit(10);

    if (assistsError) throw assistsError;

    const { data: topGoals, error: goalsError } = await supabase
      .from('players')
      .select(`
        id, name, goals, position,
        teams(short_name, name)
      `)
      .eq('is_available', true)
      .order('goals', { ascending: false })
      .limit(10);

    if (goalsError) throw goalsError;

    return NextResponse.json({
      success: true,
      data: {
        positions: positionCounts,
        teams: teamCounts,
        priceRanges,
        topPerformers: {
          points: topScorers,
          goals: topGoals,
          assists: topAssists
        },
        totalPlayers: positionStats.length
      }
    });

  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch player statistics'
    }, { status: 500 });
  }
}