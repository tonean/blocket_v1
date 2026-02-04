/**
 * Mock AuthService for testing
 */

import { AuthService, AuthenticatedUser } from '../../services/AuthService.js';

export class MockAuthService {
  private mockUser: AuthenticatedUser | null;

  constructor(mockUser: AuthenticatedUser | null = { id: 'test_user', username: 'testuser' }) {
    this.mockUser = mockUser;
  }

  async getCurrentUser(): Promise<AuthenticatedUser | null> {
    return this.mockUser;
  }

  async isAuthenticated(): Promise<boolean> {
    return this.mockUser !== null;
  }

  async requireAuth(): Promise<AuthenticatedUser> {
    if (!this.mockUser) {
      throw new Error('Authentication required. Please log in to Reddit.');
    }
    return this.mockUser;
  }

  async isOwner(resourceUserId: string): Promise<boolean> {
    if (!this.mockUser) {
      return false;
    }
    return this.mockUser.id === resourceUserId;
  }

  setMockUser(user: AuthenticatedUser | null) {
    this.mockUser = user;
  }
}
