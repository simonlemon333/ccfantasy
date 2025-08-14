// Mock storage service using localStorage
// This simulates a real database with persistence

interface StorageData {
  users: any[];
  leagues: any[];
  teams: any[];
  players: any[];
  auth: {
    currentUser: any | null;
    sessions: any[];
  };
}

class MockStorage {
  private readonly STORAGE_KEY = 'ccfantasy_data';

  // Initialize with default data
  private defaultData: StorageData = {
    users: [
      {
        id: '1',
        username: 'admin',
        email: 'admin@ccfantasy.com',
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    leagues: [
      {
        id: '1',
        name: '朋友联赛',
        description: '和朋友一起玩的联赛',
        max_players: 10,
        current_players: 1,
        season: '2024-25',
        is_active: true,
        created_by: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    teams: [
      {
        id: '1',
        user_id: '1',
        league_id: '1',
        team_name: 'Simon FC',
        budget_remaining: 100.0,
        total_points: 0,
        weekly_points: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ],
    players: [
      // Premier League sample players
      { id: '1', name: 'Harry Kane', position: 'FWD', team: 'Bayern Munich', price: 11.0, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '2', name: 'Kevin De Bruyne', position: 'MID', team: 'Manchester City', price: 12.5, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '3', name: 'Virgil van Dijk', position: 'DEF', team: 'Liverpool', price: 6.0, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '4', name: 'Alisson', position: 'GK', team: 'Liverpool', price: 5.5, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '5', name: 'Erling Haaland', position: 'FWD', team: 'Manchester City', price: 14.0, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '6', name: 'Bruno Fernandes', position: 'MID', team: 'Manchester United', price: 8.5, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '7', name: 'Reece James', position: 'DEF', team: 'Chelsea', price: 6.0, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { id: '8', name: 'Son Heung-min', position: 'FWD', team: 'Tottenham', price: 9.5, points: 0, is_available: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    ],
    auth: {
      currentUser: null,
      sessions: []
    }
  };

  // Get data from localStorage or return default
  getData(): StorageData {
    if (typeof window === 'undefined') return this.defaultData;
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with default data
    this.saveData(this.defaultData);
    return this.defaultData;
  }

  // Save data to localStorage
  saveData(data: StorageData): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  // Get specific table data
  getTable(tableName: keyof Omit<StorageData, 'auth'>): any[] {
    return this.getData()[tableName];
  }

  // Save specific table data
  saveTable(tableName: keyof Omit<StorageData, 'auth'>, data: any[]): void {
    const allData = this.getData();
    allData[tableName] = data;
    this.saveData(allData);
  }

  // Generate unique ID
  generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Clear all data (useful for testing)
  clear(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.STORAGE_KEY);
  }
}

export const mockStorage = new MockStorage();