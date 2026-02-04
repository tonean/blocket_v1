/**
 * AuthService - Handles Reddit authentication and user context
 */

import { Context } from '@devvit/public-api';

export interface AuthenticatedUser {
  id: string;
  username: string;
}

export class AuthService {
  private context: Context;

  constructor(context: Context) {
    this.context = context;
  }

  /**
   * Get the currently authenticated user
   * @returns AuthenticatedUser if logged in, null otherwise
   */
  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    try {
      const user = await this.context.reddit.getCurrentUser();
      
      if (!user || !user.username) {
        return null;
      }

      return {
        id: user.id,
        username: user.username,
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if a user is authenticated
   * @returns true if user is logged in, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  /**
   * Require authentication - throws error if not authenticated
   * @returns AuthenticatedUser
   * @throws Error if user is not authenticated
   */
  async requireAuth(): Promise<AuthenticatedUser> {
    const user = await this.getCurrentUser();
    
    if (!user) {
      throw new Error('Authentication required. Please log in to Reddit.');
    }

    return user;
  }

  /**
   * Check if the current user owns a resource
   * @param resourceUserId - The user ID of the resource owner
   * @returns true if current user owns the resource, false otherwise
   */
  async isOwner(resourceUserId: string): Promise<boolean> {
    const user = await this.getCurrentUser();
    
    if (!user) {
      return false;
    }

    return user.id === resourceUserId;
  }
}
