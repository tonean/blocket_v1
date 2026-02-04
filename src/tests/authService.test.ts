/**
 * Unit tests for AuthService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService, AuthenticatedUser } from '../services/AuthService.js';
import { Context } from '@devvit/public-api';

describe('AuthService', () => {
  let mockContext: Context;
  let authService: AuthService;

  beforeEach(() => {
    // Create a mock context with reddit API
    mockContext = {
      reddit: {
        getCurrentUser: vi.fn(),
      },
    } as unknown as Context;

    authService = new AuthService(mockContext);
  });

  describe('getCurrentUser', () => {
    it('should return authenticated user when user is logged in', async () => {
      // Mock authenticated user
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.getCurrentUser();

      expect(result).toEqual({
        id: 'user_123',
        username: 'testuser',
      });
    });

    it('should return null when user is not logged in', async () => {
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when username is missing', async () => {
      const mockUser = {
        id: 'user_123',
        username: null,
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockContext.reddit.getCurrentUser).mockRejectedValue(
        new Error('API error')
      );

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should return false when user is not authenticated', async () => {
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const result = await authService.isAuthenticated();

      expect(result).toBe(false);
    });
  });

  describe('requireAuth', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.requireAuth();

      expect(result).toEqual({
        id: 'user_123',
        username: 'testuser',
      });
    });

    it('should throw error when not authenticated', async () => {
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      await expect(authService.requireAuth()).rejects.toThrow(
        'Authentication required. Please log in to Reddit.'
      );
    });
  });

  describe('isOwner', () => {
    it('should return true when current user owns the resource', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.isOwner('user_123');

      expect(result).toBe(true);
    });

    it('should return false when current user does not own the resource', async () => {
      const mockUser = {
        id: 'user_123',
        username: 'testuser',
      };

      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(mockUser as any);

      const result = await authService.isOwner('user_456');

      expect(result).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      vi.mocked(mockContext.reddit.getCurrentUser).mockResolvedValue(null as any);

      const result = await authService.isOwner('user_123');

      expect(result).toBe(false);
    });
  });
});
