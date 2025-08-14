// Mock authentication service that mimics Supabase Auth API

import { mockStorage } from './mockStorage';

// Mock user type (matches Supabase User type)
export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    username?: string;
  };
  created_at: string;
  updated_at: string;
}

// Mock session type
interface MockSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: MockUser;
}

class MockAuthService {
  private currentUser: MockUser | null = null;
  private listeners: ((user: MockUser | null) => void)[] = [];

  constructor() {
    // Check for saved session on initialization
    this.loadSavedSession();
  }

  // Load saved session from storage
  private loadSavedSession() {
    const data = mockStorage.getData();
    if (data.auth.currentUser) {
      this.currentUser = data.auth.currentUser;
    }
  }

  // Save session to storage
  private saveSession(user: MockUser | null) {
    const data = mockStorage.getData();
    data.auth.currentUser = user;
    mockStorage.saveData(data);
    this.currentUser = user;
    
    // Notify all listeners
    this.listeners.forEach(listener => listener(user));
  }

  // Simulate sign up
  async signUp(email: string, password: string, username: string) {
    // Simulate network delay
    await this.delay(500);

    // Check if user already exists
    const users = mockStorage.getTable('users');
    const existingUser = users.find(u => u.email === email);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    // Create new user
    const newUser: MockUser = {
      id: mockStorage.generateId(),
      email,
      user_metadata: { username },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to users table
    users.push({
      id: newUser.id,
      username,
      email,
      avatar_url: null,
      created_at: newUser.created_at,
      updated_at: newUser.updated_at,
    });
    mockStorage.saveTable('users', users);

    // Create session
    this.saveSession(newUser);

    return {
      user: newUser,
      session: this.createSession(newUser)
    };
  }

  // Simulate sign in
  async signIn(email: string, password: string) {
    // Simulate network delay
    await this.delay(300);

    // Find user
    const users = mockStorage.getTable('users');
    const user = users.find(u => u.email === email);
    
    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Create mock user object
    const mockUser: MockUser = {
      id: user.id,
      email: user.email,
      user_metadata: { username: user.username },
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    // Create session
    this.saveSession(mockUser);

    return {
      user: mockUser,
      session: this.createSession(mockUser)
    };
  }

  // Sign out
  async signOut() {
    await this.delay(200);
    this.saveSession(null);
  }

  // Get current user
  async getCurrentUser(): Promise<MockUser | null> {
    await this.delay(100);
    return this.currentUser;
  }

  // Listen to auth changes
  onAuthStateChange(callback: (user: MockUser | null) => void) {
    this.listeners.push(callback);
    
    // Return subscription object that can be unsubscribed
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
              this.listeners.splice(index, 1);
            }
          }
        }
      }
    };
  }

  // Create mock session
  private createSession(user: MockUser): MockSession {
    return {
      access_token: 'mock_access_token_' + user.id,
      refresh_token: 'mock_refresh_token_' + user.id,
      expires_at: Date.now() + 3600000, // 1 hour
      user
    };
  }

  // Simulate network delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Reset password (mock)
  async resetPassword(email: string) {
    await this.delay(500);
    console.log(`[MOCK] Password reset email sent to: ${email}`);
  }
}

export const mockAuth = new MockAuthService();