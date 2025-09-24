import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/players - Get players with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const team = searchParams.get('team');
    const position = searchParams.get('position');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'total_points';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query - now using team short_name directly
    let query = supabase
      .from('players')
      .select('*')
      .eq('is_available', true)
      .not('team', 'is', null);

    // Apply filters
    if (team) {
      query = query.eq('team', team.toUpperCase());
    }

    if (position) {
      query = query.eq('position', position.toUpperCase());
    }

    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        query = query.gte('price', min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query = query.lte('price', max);
      }
    }

    if (search) {
      query = query.ilike('name', `%${search}%`);
    }

    // Apply sorting
    const validSortFields = [
      'name', 'price', 'total_points', 'form', 'goals', 'assists', 
      'selected_by_percent', 'clean_sheets'
    ];
    
    if (validSortFields.includes(sortBy)) {
      query = query.order(sortBy, { 
        ascending: sortOrder === 'asc' 
      });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: players, error, count } = await query;

    if (error) throw error;

    // Get total count for pagination with same filters
    let countQuery = supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
      .not('team', 'is', null);

    // Apply same filters for count
    if (team) {
      countQuery = countQuery.eq('team', team.toUpperCase());
    }
    if (position) {
      countQuery = countQuery.eq('position', position.toUpperCase());
    }
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        countQuery = countQuery.gte('price', min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        countQuery = countQuery.lte('price', max);
      }
    }
    if (search) {
      countQuery = countQuery.ilike('name', `%${search}%`);
    }

    const { count: totalCount } = await countQuery;

    return NextResponse.json({
      success: true,
      data: players,
      pagination: {
        total: totalCount || 0,
        limit,
        offset,
        hasMore: (totalCount || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch players'
    }, { status: 500 });
  }
}

// POST /api/players - Create new player (admin only)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      position, 
      teamId, 
      price, 
      isAdmin = false 
    } = body;

    // Check admin permission
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin permission required'
      }, { status: 403 });
    }

    // Validation
    if (!name || !position || !teamId || !price) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, position, teamId, price'
      }, { status: 400 });
    }

    const validPositions = ['GK', 'DEF', 'MID', 'FWD'];
    if (!validPositions.includes(position.toUpperCase())) {
      return NextResponse.json({
        success: false,
        error: 'Invalid position. Must be GK, DEF, MID, or FWD'
      }, { status: 400 });
    }

    if (price < 4.0 || price > 15.0) {
      return NextResponse.json({
        success: false,
        error: 'Price must be between 4.0 and 15.0'
      }, { status: 400 });
    }

    // Check if team exists
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({
        success: false,
        error: 'Invalid team ID'
      }, { status: 400 });
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from('players')
      .insert({
        name: name.trim(),
        position: position.toUpperCase(),
        team_id: teamId,
        price: parseFloat(price.toFixed(1))
      })
      .select(`
        *,
        teams(id, name, short_name, logo_url)
      `)
      .single();

    if (playerError) throw playerError;

    return NextResponse.json({
      success: true,
      data: player,
      message: 'Player created successfully'
    });

  } catch (error) {
    console.error('Error creating player:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create player'
    }, { status: 500 });
  }
}