// Database type definitions
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          email: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      leagues: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          max_players: number;
          current_players: number;
          season: string;
          is_active: boolean;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          max_players?: number;
          current_players?: number;
          season: string;
          is_active?: boolean;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          max_players?: number;
          current_players?: number;
          season?: string;
          is_active?: boolean;
          created_by?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          user_id: string;
          league_id: string;
          team_name: string;
          budget_remaining: number;
          total_points: number;
          weekly_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          league_id: string;
          team_name: string;
          budget_remaining?: number;
          total_points?: number;
          weekly_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          league_id?: string;
          team_name?: string;
          budget_remaining?: number;
          total_points?: number;
          weekly_points?: number;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          name: string;
          position: 'GK' | 'DEF' | 'MID' | 'FWD';
          team: string;
          price: number;
          points: number;
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
          points?: number;
          is_available?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: 'GK' | 'DEF' | 'MID' | 'FWD';
          team?: string;
          price?: number;
          points?: number;
          is_available?: boolean;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}