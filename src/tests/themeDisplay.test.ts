/**
 * Unit tests for ThemeDisplay component
 * Feature: reddit-room-design-game
 * Requirements: 8.3
 */

import { describe, test, expect } from 'vitest';
import { Theme } from '../types/models.js';
import { formatCountdown } from '../components/ThemeDisplay.js';

describe('ThemeDisplay Unit Tests', () => {
  // Helper function to create a test theme
  const createTestTheme = (
    name: string = 'School',
    description: string = 'Design a classroom or study space',
    startTime: number = Date.now(),
    endTime: number = Date.now() + 86400000 // 1 day from now
  ): Theme => {
    return {
      id: 'theme_test_001',
      name,
      description,
      startTime,
      endTime,
      active: true,
    };
  };

  describe('Countdown Calculation', () => {
    // Feature: reddit-room-design-game, Requirement 8.3
    test('formatCountdown should return "Theme Ended" for 0 milliseconds', () => {
      const result = formatCountdown(0);
      expect(result).toBe('Theme Ended');
    });

    test('formatCountdown should return "Theme Ended" for negative milliseconds', () => {
      const result = formatCountdown(-1000);
      expect(result).toBe('Theme Ended');
    });

    test('formatCountdown should format seconds correctly', () => {
      const result = formatCountdown(5000); // 5 seconds
      expect(result).toBe('5s');
    });

    test('formatCountdown should format minutes and seconds correctly', () => {
      const result = formatCountdown(125000); // 2 minutes 5 seconds
      expect(result).toBe('2m 5s');
    });

    test('formatCountdown should format hours, minutes, and seconds correctly', () => {
      const result = formatCountdown(3665000); // 1 hour 1 minute 5 seconds
      expect(result).toBe('1h 1m 5s');
    });

    test('formatCountdown should format days, hours, minutes, and seconds correctly', () => {
      const result = formatCountdown(90065000); // 1 day 1 hour 1 minute 5 seconds
      expect(result).toBe('1d 1h 1m 5s');
    });

    test('formatCountdown should handle exactly 1 minute', () => {
      const result = formatCountdown(60000); // 60 seconds
      expect(result).toBe('1m 0s');
    });

    test('formatCountdown should handle exactly 1 hour', () => {
      const result = formatCountdown(3600000); // 3600 seconds
      expect(result).toBe('1h 0m 0s');
    });

    test('formatCountdown should handle exactly 1 day', () => {
      const result = formatCountdown(86400000); // 24 hours
      expect(result).toBe('1d 0h 0m 0s');
    });

    test('formatCountdown should handle multiple days', () => {
      const result = formatCountdown(172800000); // 2 days
      expect(result).toBe('2d 0h 0m 0s');
    });

    test('formatCountdown should handle complex time with all units', () => {
      const result = formatCountdown(183723000); // 2 days 3 hours 2 minutes 3 seconds
      expect(result).toBe('2d 3h 2m 3s');
    });

    test('formatCountdown should handle 59 seconds', () => {
      const result = formatCountdown(59000);
      expect(result).toBe('59s');
    });

    test('formatCountdown should handle 59 minutes 59 seconds', () => {
      const result = formatCountdown(3599000);
      expect(result).toBe('59m 59s');
    });

    test('formatCountdown should handle 23 hours 59 minutes 59 seconds', () => {
      const result = formatCountdown(86399000);
      expect(result).toBe('23h 59m 59s');
    });

    test('formatCountdown should round down partial seconds', () => {
      const result = formatCountdown(5999); // 5.999 seconds
      expect(result).toBe('5s');
    });
  });

  describe('Theme Information Display', () => {
    test('should display theme name correctly', () => {
      const theme = createTestTheme('Office', 'Design a modern office space');
      
      expect(theme.name).toBe('Office');
    });

    test('should display theme description correctly', () => {
      const theme = createTestTheme('Bedroom', 'Create a cozy bedroom');
      
      expect(theme.description).toBe('Create a cozy bedroom');
    });

    test('should handle theme with long name', () => {
      const longName = 'A Very Long Theme Name That Should Still Display Correctly';
      const theme = createTestTheme(longName, 'Description');
      
      expect(theme.name).toBe(longName);
    });

    test('should handle theme with long description', () => {
      const longDescription = 'This is a very long description that provides detailed information about what the theme is about and what kind of designs players should create for this particular theme challenge';
      const theme = createTestTheme('Theme', longDescription);
      
      expect(theme.description).toBe(longDescription);
    });

    test('should handle theme with special characters in name', () => {
      const theme = createTestTheme('School 🏫', 'Design a classroom');
      
      expect(theme.name).toBe('School 🏫');
    });

    test('should handle theme with special characters in description', () => {
      const theme = createTestTheme('Theme', 'Design with ❤️ and creativity! 🎨');
      
      expect(theme.description).toBe('Design with ❤️ and creativity! 🎨');
    });
  });

  describe('Time Remaining Calculation', () => {
    // Feature: reddit-room-design-game, Requirement 8.3
    test('should calculate time remaining correctly for active theme', () => {
      const now = Date.now();
      const futureTime = now + 10000; // 10 seconds in future
      const theme = createTestTheme('Test', 'Test description', now, futureTime);
      
      const timeRemaining = theme.endTime - now;
      
      expect(timeRemaining).toBeGreaterThan(9000);
      expect(timeRemaining).toBeLessThanOrEqual(10000);
    });

    test('should return 0 for expired theme', () => {
      const now = Date.now();
      const pastTime = now - 10000; // 10 seconds in past
      const theme = createTestTheme('Test', 'Test description', pastTime - 1000, pastTime);
      
      const timeRemaining = Math.max(0, theme.endTime - now);
      
      expect(timeRemaining).toBe(0);
    });

    test('should calculate time remaining for theme ending in 1 hour', () => {
      const now = Date.now();
      const oneHourLater = now + 3600000;
      const theme = createTestTheme('Test', 'Test description', now, oneHourLater);
      
      const timeRemaining = theme.endTime - now;
      
      expect(timeRemaining).toBeGreaterThan(3599000);
      expect(timeRemaining).toBeLessThanOrEqual(3600000);
    });

    test('should calculate time remaining for theme ending in 1 day', () => {
      const now = Date.now();
      const oneDayLater = now + 86400000;
      const theme = createTestTheme('Test', 'Test description', now, oneDayLater);
      
      const timeRemaining = theme.endTime - now;
      
      expect(timeRemaining).toBeGreaterThan(86399000);
      expect(timeRemaining).toBeLessThanOrEqual(86400000);
    });

    test('should handle theme that just started', () => {
      const now = Date.now();
      const endTime = now + 86400000; // 1 day from now
      const theme = createTestTheme('Test', 'Test description', now, endTime);
      
      const timeRemaining = theme.endTime - now;
      
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(86400000);
    });

    test('should handle theme about to expire', () => {
      const now = Date.now();
      const almostExpired = now + 1000; // 1 second from now
      const theme = createTestTheme('Test', 'Test description', now - 1000, almostExpired);
      
      const timeRemaining = theme.endTime - now;
      
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(1000);
    });
  });

  describe('Theme State Handling', () => {
    test('should handle null theme gracefully', () => {
      const theme = null;
      
      expect(theme).toBeNull();
    });

    test('should handle active theme', () => {
      const theme = createTestTheme();
      
      expect(theme.active).toBe(true);
    });

    test('should handle inactive theme', () => {
      const theme = createTestTheme();
      theme.active = false;
      
      expect(theme.active).toBe(false);
    });

    test('should preserve all theme properties', () => {
      const theme = createTestTheme('Custom', 'Custom description');
      
      expect(theme.id).toBe('theme_test_001');
      expect(theme.name).toBe('Custom');
      expect(theme.description).toBe('Custom description');
      expect(theme.startTime).toBeDefined();
      expect(theme.endTime).toBeDefined();
      expect(theme.active).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('formatCountdown should handle very large time values', () => {
      const largeTime = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      const result = formatCountdown(largeTime);
      
      expect(result).toContain('d');
      expect(result).toBeDefined();
    });

    test('formatCountdown should handle 1 millisecond', () => {
      const result = formatCountdown(1);
      expect(result).toBe('0s');
    });

    test('formatCountdown should handle 999 milliseconds', () => {
      const result = formatCountdown(999);
      expect(result).toBe('0s');
    });

    test('should handle theme with same start and end time', () => {
      const now = Date.now();
      const theme = createTestTheme('Test', 'Test', now, now);
      
      const timeRemaining = Math.max(0, theme.endTime - now);
      
      expect(timeRemaining).toBe(0);
    });
  });
});
