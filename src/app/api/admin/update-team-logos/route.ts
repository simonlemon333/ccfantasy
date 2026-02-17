// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdminAuth } from '@/lib/requireAdminAuth';

// POST /api/admin/update-team-logos - Update team logos from free sources
export async function POST(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    console.log('Updating team logos from free sources...');

    // Premier League team logos from official/free sources
    const TEAM_LOGOS = {
      'ARS': 'https://logos-world.net/wp-content/uploads/2020/06/Arsenal-Logo.png',
      'AVL': 'https://logos-world.net/wp-content/uploads/2020/06/Aston-Villa-Logo.png',
      'BOU': 'https://logos-world.net/wp-content/uploads/2020/06/Bournemouth-Logo.png',
      'BRE': 'https://logos-world.net/wp-content/uploads/2021/05/Brentford-Logo.png',
      'BHA': 'https://logos-world.net/wp-content/uploads/2020/06/Brighton-Hove-Albion-Logo.png',
      'BUR': 'https://logos-world.net/wp-content/uploads/2020/06/Burnley-Logo.png',
      'CHE': 'https://logos-world.net/wp-content/uploads/2020/06/Chelsea-Logo.png',
      'CRY': 'https://logos-world.net/wp-content/uploads/2020/06/Crystal-Palace-Logo.png',
      'EVE': 'https://logos-world.net/wp-content/uploads/2020/06/Everton-Logo.png',
      'FUL': 'https://logos-world.net/wp-content/uploads/2020/06/Fulham-Logo.png',
      'IPS': 'https://logos-world.net/wp-content/uploads/2020/06/Ipswich-Town-Logo.png',
      'LEE': 'https://logos-world.net/wp-content/uploads/2020/06/Leeds-United-Logo.png',
      'LEI': 'https://logos-world.net/wp-content/uploads/2020/06/Leicester-City-Logo.png',
      'LIV': 'https://logos-world.net/wp-content/uploads/2020/06/Liverpool-Logo.png',
      'MCI': 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-City-Logo.png',
      'MUN': 'https://logos-world.net/wp-content/uploads/2020/06/Manchester-United-Logo.png',
      'NEW': 'https://logos-world.net/wp-content/uploads/2020/06/Newcastle-United-Logo.png',
      'NFO': 'https://logos-world.net/wp-content/uploads/2020/06/Nottingham-Forest-Logo.png',
      'SOU': 'https://logos-world.net/wp-content/uploads/2020/06/Southampton-Logo.png',
      'TOT': 'https://logos-world.net/wp-content/uploads/2020/06/Tottenham-Logo.png',
      'SUN': 'https://logos-world.net/wp-content/uploads/2020/06/Sunderland-Logo.png',
      'WHU': 'https://logos-world.net/wp-content/uploads/2020/06/West-Ham-United-Logo.png',
      'WOL': 'https://logos-world.net/wp-content/uploads/2020/06/Wolverhampton-Logo.png'
    };

    // Better approach: Use official Premier League resources or CDN
    const OFFICIAL_LOGOS = {
      'ARS': 'https://resources.premierleague.com/premierleague/badges/50/t3.png',
      'AVL': 'https://resources.premierleague.com/premierleague/badges/50/t7.png',
      'BOU': 'https://resources.premierleague.com/premierleague/badges/50/t91.png',
      'BRE': 'https://resources.premierleague.com/premierleague/badges/50/t94.png',
      'BHA': 'https://resources.premierleague.com/premierleague/badges/50/t36.png',
      'BUR': 'https://resources.premierleague.com/premierleague/badges/50/t90.png',
      'CHE': 'https://resources.premierleague.com/premierleague/badges/50/t8.png',
      'CRY': 'https://resources.premierleague.com/premierleague/badges/50/t31.png',
      'EVE': 'https://resources.premierleague.com/premierleague/badges/50/t11.png',
      'FUL': 'https://resources.premierleague.com/premierleague/badges/50/t54.png',
      'IPS': 'https://resources.premierleague.com/premierleague/badges/50/t40.png',
      'LEE': 'https://resources.premierleague.com/premierleague/badges/50/t2.png',
      'LEI': 'https://resources.premierleague.com/premierleague/badges/50/t13.png',
      'LIV': 'https://resources.premierleague.com/premierleague/badges/50/t14.png',
      'MCI': 'https://resources.premierleague.com/premierleague/badges/50/t43.png',
      'MUN': 'https://resources.premierleague.com/premierleague/badges/50/t1.png',
      'NEW': 'https://resources.premierleague.com/premierleague/badges/50/t4.png',
      'NFO': 'https://resources.premierleague.com/premierleague/badges/50/t17.png',
      'SOU': 'https://resources.premierleague.com/premierleague/badges/50/t20.png',
      'TOT': 'https://resources.premierleague.com/premierleague/badges/50/t6.png',
      'SUN': 'https://resources.premierleague.com/premierleague/badges/50/t56.png',
      'WHU': 'https://resources.premierleague.com/premierleague/badges/50/t21.png',
      'WOL': 'https://resources.premierleague.com/premierleague/badges/50/t39.png'
    };

    // Team colors (more accurate)
    const TEAM_COLORS = {
      'ARS': { primary: '#EF0107', secondary: '#023474' },
      'AVL': { primary: '#95BFE5', secondary: '#670E36' },
      'BOU': { primary: '#DA020E', secondary: '#000000' },
      'BRE': { primary: '#E30613', secondary: '#FDB913' },
      'BHA': { primary: '#0057B8', secondary: '#FFCD00' },
      'BUR': { primary: '#6C1D45', secondary: '#99D6EA' },
      'CHE': { primary: '#034694', secondary: '#FFFFFF' },
      'CRY': { primary: '#1B458F', secondary: '#A7A5A6' },
      'EVE': { primary: '#003399', secondary: '#FFFFFF' },
      'FUL': { primary: '#000000', secondary: '#FFFFFF' },
      'IPS': { primary: '#0080FF', secondary: '#FFFFFF' },
      'LEE': { primary: '#FFCD00', secondary: '#1D428A' },
      'LEI': { primary: '#003090', secondary: '#FDBE11' },
      'LIV': { primary: '#C8102E', secondary: '#F6EB61' },
      'MCI': { primary: '#6CABDD', secondary: '#1C2C5B' },
      'MUN': { primary: '#FFF200', secondary: '#DA020E' },
      'NEW': { primary: '#241F20', secondary: '#FFFFFF' },
      'NFO': { primary: '#DD0000', secondary: '#FFFFFF' },
      'SOU': { primary: '#D71920', secondary: '#FFC20E' },
      'TOT': { primary: '#132257', secondary: '#FFFFFF' },
      'SUN': { primary: '#EB172B', secondary: '#211E1F' },
      'WHU': { primary: '#7A263A', secondary: '#F3D459' },
      'WOL': { primary: '#FDB913', secondary: '#231F20' }
    };

    // Get all teams
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, short_name, logo_url, primary_color, secondary_color');

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    let updatedCount = 0;
    const errors = [];

    // Update each team
    for (const team of teams || []) {
      try {
        const shortName = team.short_name;
        const logoUrl = OFFICIAL_LOGOS[shortName];
        const colors = TEAM_COLORS[shortName];

        if (!logoUrl && !colors) {
          console.warn(`No logo/colors found for ${shortName}`);
          continue;
        }

        const updates: any = {};
        
        if (logoUrl && !team.logo_url) {
          updates.logo_url = logoUrl;
        }

        if (colors) {
          if (team.primary_color === '#000000' || !team.primary_color) {
            updates.primary_color = colors.primary;
          }
          if (team.secondary_color === '#FFFFFF' || !team.secondary_color) {
            updates.secondary_color = colors.secondary;
          }
        }

        if (Object.keys(updates).length > 0) {
          const { error: updateError } = await supabase
            .from('teams')
            .update(updates)
            .eq('id', team.id);

          if (updateError) {
            console.error(`Error updating team ${shortName}:`, updateError);
            errors.push(`Failed to update ${shortName}: ${updateError.message}`);
          } else {
            updatedCount++;
            console.log(`Updated ${shortName}: logo and colors`);
          }
        }

      } catch (error) {
        console.error(`Error processing team ${team.short_name}:`, error);
        errors.push(`Error processing ${team.short_name}: ${error.message}`);
      }
    }

    // Get updated teams sample
    const { data: updatedTeams } = await supabase
      .from('teams')
      .select('short_name, logo_url, primary_color, secondary_color')
      .not('logo_url', 'is', null)
      .limit(5);

    return NextResponse.json({
      success: true,
      data: {
        totalTeams: teams?.length || 0,
        updatedTeams: updatedCount,
        errors,
        sampleUpdated: updatedTeams?.map(t => ({
          team: t.short_name,
          hasLogo: !!t.logo_url,
          colors: `${t.primary_color} / ${t.secondary_color}`
        }))
      },
      message: `Updated logos and colors for ${updatedCount} teams`
    });

  } catch (error) {
    console.error('Team logos update error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update team logos'
    }, { status: 500 });
  }
}

// GET /api/admin/update-team-logos - Check team logo status
export async function GET(request: NextRequest) {
  const authResult = await requireAdminAuth(request);
  if (authResult.error) return authResult.error;

  try {
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name, short_name, logo_url, primary_color, secondary_color')
      .order('name');

    const stats = {
      total: teams?.length || 0,
      withLogos: teams?.filter(t => t.logo_url).length || 0,
      withoutLogos: teams?.filter(t => !t.logo_url).length || 0,
      withColors: teams?.filter(t => t.primary_color && t.primary_color !== '#000000').length || 0
    };

    return NextResponse.json({
      success: true,
      data: {
        stats,
        teamsNeedingLogos: teams?.filter(t => !t.logo_url).map(t => ({
          name: t.name,
          shortName: t.short_name,
          hasColors: t.primary_color !== '#000000'
        })) || []
      }
    });

  } catch (error) {
    console.error('Error checking team logos:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check team logos'
    }, { status: 500 });
  }
}