import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/fixtures/[id]/events - Get events for a specific fixture
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fixtureId } = await params;

    console.log('GET /api/fixtures/[id]/events:', { fixtureId });

    const { data: events, error } = await supabase
      .from('player_events')
      .select(`
        id,
        event_type,
        minute,
        points,
        players(
          name,
          teams(name, short_name)
        )
      `)
      .eq('fixture_id', fixtureId)
      .order('minute', { ascending: true });

    if (error) {
      console.error('Error fetching fixture events:', error);
      throw error;
    }

    // Transform the data for the frontend
    const transformedEvents = events?.map(event => ({
      id: event.id,
      player_name: (event as any).players?.name || 'Unknown Player',
      team_name: (event as any).players?.teams?.short_name || 'Unknown Team',
      event_type: event.event_type,
      minute: event.minute,
      points: event.points
    })) || [];

    return NextResponse.json({
      success: true,
      data: transformedEvents
    });

  } catch (error) {
    console.error('Error in fixture events API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch fixture events'
    }, { status: 500 });
  }
}

// POST /api/fixtures/[id]/events - Add events to a fixture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fixtureId } = await params;
    const body = await request.json();
    const { events } = body;

    if (!events || !Array.isArray(events)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid events data'
      }, { status: 400 });
    }

    console.log('POST /api/fixtures/[id]/events:', { fixtureId, eventsCount: events.length });

    // Add fixture_id to each event
    const eventsWithFixture = events.map(event => ({
      ...event,
      fixture_id: fixtureId
    }));

    const { data, error } = await supabase
      .from('player_events')
      .insert(eventsWithFixture)
      .select();

    if (error) {
      console.error('Error creating fixture events:', error);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Successfully added ${events.length} events to fixture`
    });

  } catch (error) {
    console.error('Error creating fixture events:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create fixture events'
    }, { status: 500 });
  }
}