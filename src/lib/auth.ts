import { mockAuth, type MockUser } from './mockAuth';

// Authentication helper functions using mock service
export const auth = {
  // Sign up with email and password
  signUp: async (email: string, password: string, username: string) => {
    try {
      const data = await mockAuth.signUp(email, password, username);
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    try {
      const data = await mockAuth.signIn(email, password);
      return data;
    } catch (error) {
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await mockAuth.signOut();
    } catch (error) {
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async (): Promise<MockUser | null> => {
    return await mockAuth.getCurrentUser();
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (user: MockUser | null) => void) => {
    return mockAuth.onAuthStateChange(callback);
  },

  // Reset password
  resetPassword: async (email: string) => {
    await mockAuth.resetPassword(email);
  },
};