// Database schema types for CCFantasy
// Generated from Supabase schema

export interface Database {
  public: {
    Tables: {
      // Users table - handles authentication and profile
      users: {
        Row: {
          id: string;
          email: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };

      // Rooms table - fantasy football leagues/rooms
      rooms: {
        Row: {
          id: string;
          room_code: string; // 6-digit shareable code
          name: string;
          description: string | null;
          created_by: string; // user_id of room owner
          max_players: number;
          current_players: number;
          season: string; // e.g., "2024-25"
          gameweek: number; // current active gameweek
          is_active: boolean;
          is_public: boolean;
          budget_limit: number; // default 100.0
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_code?: string;
          name: string;
          description?: string | null;
          created_by: string;
          max_players?: number;
          current_players?: number;
          season?: string;
          gameweek?: number;
          is_active?: boolean;
          is_public?: boolean;
          budget_limit?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          max_players?: number;
          current_players?: number;
          gameweek?: number;
          is_active?: boolean;
          is_public?: boolean;
          budget_limit?: number;
          updated_at?: string;
        };
      };

      // Room memberships - which users are in which rooms
      room_members: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          joined_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id: string;
          joined_at?: string;
          is_active?: boolean;
        };
        Update: {
          is_active?: boolean;
        };
      };

      // Premier League teams
      teams: {
        Row: {
          id: number;                    // FPL team ID (1-20)
          name: string;
          short_name: string;            // e.g., "ARS", "MCI"
          code: number | null;           // FPL team code
          logo_url: string | null;
          primary_color: string | null;
          secondary_color: string | null;
          created_at: string;
        };
        Insert: {
          id: number;                    // Required FPL team ID
          name: string;
          short_name: string;
          code?: number | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
          created_at?: string;
        };
        Update: {
          name?: string;
          short_name?: string;
          code?: number | null;
          logo_url?: string | null;
          primary_color?: string | null;
          secondary_color?: string | null;
        };
      };

      // Premier League players
      players: {
        Row: {
          id: string;
          name: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          team: string;                  // Team short name (e.g., "ARS", "MCI")
          price: number; // in millions, e.g., 12.5
          total_points: number;
          form: number; // average points last 5 games
          selected_by_percent: number; // how many managers have selected
          goals: number;
          assists: number;
          clean_sheets: number;
          yellow_cards: number;
          red_cards: number;
          saves: number;
          bonus_points: number;
          photo_url: string | null;      // Player photo URL
          is_available: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          team: string;
          price: number;
          total_points?: number;
          form?: number;
          selected_by_percent?: number;
          goals?: number;
          assists?: number;
          clean_sheets?: number;
          yellow_cards?: number;
          red_cards?: number;
          saves?: number;
          bonus_points?: number;
          photo_url?: string | null;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          position?: 'GK' | 'DEF' | 'MID' | 'FWD';
          team?: string;
          price?: number;
          total_points?: number;
          form?: number;
          selected_by_percent?: number;
          goals?: number;
          assists?: number;
          clean_sheets?: number;
          yellow_cards?: number;
          red_cards?: number;
          saves?: number;
          bonus_points?: number;
          photo_url?: string | null;
          is_available?: boolean;
          updated_at?: string;
        };
      };

      // User lineups for each gameweek
      lineups: {
        Row: {
          id: string;
          user_id: string;
          room_id: string;
          gameweek: number;
          formation: string; // e.g., "4-4-2", "3-5-2"
          captain_id: string | null; // player_id
          vice_captain_id: string | null; // player_id
          total_cost: number;
          total_points: number;
          gameweek_points: number;
          is_submitted: boolean;
          submitted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          room_id: string;
          gameweek: number;
          formation?: string;
          captain_id?: string | null;
          vice_captain_id?: string | null;
          total_cost?: number;
          total_points?: number;
          gameweek_points?: number;
          is_submitted?: boolean;
          submitted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          formation?: string;
          captain_id?: string | null;
          vice_captain_id?: string | null;
          total_cost?: number;
          total_points?: number;
          gameweek_points?: number;
          is_submitted?: boolean;
          submitted_at?: string | null;
          updated_at?: string;
        };
      };

      // Individual player selections in lineups
      lineup_players: {
        Row: {
          id: string;
          lineup_id: string;
          player_id: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          is_starter: boolean; // true for starting XI, false for bench
          is_captain: boolean;
          is_vice_captain: boolean;
          multiplier: number; // 1x, 2x (captain), 3x (triple captain)
          points_scored: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lineup_id: string;
          player_id: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          is_starter?: boolean;
          is_captain?: boolean;
          is_vice_captain?: boolean;
          multiplier?: number;
          points_scored?: number;
          created_at?: string;
        };
        Update: {
          is_starter?: boolean;
          is_captain?: boolean;
          is_vice_captain?: boolean;
          multiplier?: number;
          points_scored?: number;
        };
      };

      // Premier League fixtures
      fixtures: {
        Row: {
          id: number;                    // FPL fixture ID
          gameweek: number;
          home_team: string;             // Team short name (e.g., "ARS", "MCI")
          away_team: string;             // Team short name (e.g., "CHE", "LIV")
          kickoff_time: string;
          home_score: number | null;
          away_score: number | null;
          finished: boolean;
          minutes_played: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: number;                    // Required FPL fixture ID
          gameweek: number;
          home_team: string;
          away_team: string;
          kickoff_time: string;
          home_score?: number | null;
          away_score?: number | null;
          finished?: boolean;
          minutes_played?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          kickoff_time?: string;
          home_score?: number | null;
          away_score?: number | null;
          finished?: boolean;
          minutes_played?: number;
          updated_at?: string;
        };
      };

      // Player events during matches (goals, assists, cards, etc.)
      player_events: {
        Row: {
          id: string;
          fixture_id: number;            // References fixtures.id (FPL fixture ID)
          player_id: string;
          event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'clean_sheet' | 'save' | 'penalty_miss' | 'own_goal' | 'bonus';
          minute: number | null;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          fixture_id: number;
          player_id: string;
          event_type: 'goal' | 'assist' | 'yellow_card' | 'red_card' | 'clean_sheet' | 'save' | 'penalty_miss' | 'own_goal' | 'bonus';
          minute?: number | null;
          points: number;
          created_at?: string;
        };
        Update: {
          minute?: number | null;
          points?: number;
        };
      };
    };
    Views: {
      // View for easy leaderboard queries
      leaderboard_view: {
        Row: {
          user_id: string;
          username: string;
          room_id: string;
          gameweek: number;
          total_points: number;
          gameweek_points: number;
          rank: number;
        };
      };
    };
    Functions: {
      // Custom database functions
      calculate_gameweek_points: {
        Args: { lineup_id: string; gameweek: number };
        Returns: number;
      };
      get_room_leaderboard: {
        Args: { room_id: string; gameweek?: number };
        Returns: Array<{
          user_id: string;
          username: string;
          total_points: number;
          gameweek_points: number;
          rank: number;
        }>;
      };
    };
  };
}