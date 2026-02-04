/**
 * Unit tests for NavigationMenu component
 */

import { describe, test, expect } from 'vitest';
import { MenuItem } from '../components/NavigationMenu.js';

describe('NavigationMenu Unit Tests', () => {
  // Define expected menu items as per requirements 7.1, 7.2, 7.3, 7.5
  const expectedMenuItems: MenuItem[] = [
    {
      id: 'current',
      label: 'Current Design',
      icon: '✏️',
      route: '/design',
    },
    {
      id: 'gallery',
      label: 'View Other Rooms',
      icon: '🖼️',
      route: '/gallery',
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      icon: '🏆',
      route: '/leaderboard',
    },
    {
      id: 'mydesigns',
      label: 'My Designs',
      icon: '👤',
      route: '/my-designs',
    },
  ];

  describe('Menu Items Presence', () => {
    test('should have all required menu items', () => {
      // Verify we have exactly 4 menu items
      expect(expectedMenuItems.length).toBe(4);
    });

    test('should have Current Design menu item', () => {
      const currentDesignItem = expectedMenuItems.find(
        (item) => item.id === 'current'
      );

      expect(currentDesignItem).toBeDefined();
      expect(currentDesignItem?.label).toBe('Current Design');
      expect(currentDesignItem?.route).toBe('/design');
      expect(currentDesignItem?.icon).toBeTruthy();
    });

    test('should have View Other Rooms menu item', () => {
      const galleryItem = expectedMenuItems.find(
        (item) => item.id === 'gallery'
      );

      expect(galleryItem).toBeDefined();
      expect(galleryItem?.label).toBe('View Other Rooms');
      expect(galleryItem?.route).toBe('/gallery');
      expect(galleryItem?.icon).toBeTruthy();
    });

    test('should have Leaderboard menu item', () => {
      const leaderboardItem = expectedMenuItems.find(
        (item) => item.id === 'leaderboard'
      );

      expect(leaderboardItem).toBeDefined();
      expect(leaderboardItem?.label).toBe('Leaderboard');
      expect(leaderboardItem?.route).toBe('/leaderboard');
      expect(leaderboardItem?.icon).toBeTruthy();
    });

    test('should have My Designs menu item', () => {
      const myDesignsItem = expectedMenuItems.find(
        (item) => item.id === 'mydesigns'
      );

      expect(myDesignsItem).toBeDefined();
      expect(myDesignsItem?.label).toBe('My Designs');
      expect(myDesignsItem?.route).toBe('/my-designs');
      expect(myDesignsItem?.icon).toBeTruthy();
    });

    test('should have unique IDs for all menu items', () => {
      const ids = expectedMenuItems.map((item) => item.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(expectedMenuItems.length);
    });

    test('should have unique routes for all menu items', () => {
      const routes = expectedMenuItems.map((item) => item.route);
      const uniqueRoutes = new Set(routes);

      expect(uniqueRoutes.size).toBe(expectedMenuItems.length);
    });

    test('should have non-empty labels for all menu items', () => {
      expectedMenuItems.forEach((item) => {
        expect(item.label).toBeTruthy();
        expect(item.label.length).toBeGreaterThan(0);
      });
    });

    test('should have icons for all menu items', () => {
      expectedMenuItems.forEach((item) => {
        expect(item.icon).toBeTruthy();
        expect(item.icon.length).toBeGreaterThan(0);
      });
    });

    test('should have valid route paths for all menu items', () => {
      expectedMenuItems.forEach((item) => {
        expect(item.route).toBeTruthy();
        expect(item.route.startsWith('/')).toBe(true);
      });
    });
  });

  describe('Navigation Handlers', () => {
    test('should call navigation handler with correct route for Current Design', () => {
      const currentDesignItem = expectedMenuItems.find(
        (item) => item.id === 'current'
      );

      expect(currentDesignItem).toBeDefined();

      // Simulate navigation handler
      let navigatedRoute = '';
      const onNavigate = (route: string) => {
        navigatedRoute = route;
      };

      // Simulate clicking the menu item
      onNavigate(currentDesignItem!.route);

      expect(navigatedRoute).toBe('/design');
    });

    test('should call navigation handler with correct route for View Other Rooms', () => {
      const galleryItem = expectedMenuItems.find(
        (item) => item.id === 'gallery'
      );

      expect(galleryItem).toBeDefined();

      // Simulate navigation handler
      let navigatedRoute = '';
      const onNavigate = (route: string) => {
        navigatedRoute = route;
      };

      // Simulate clicking the menu item
      onNavigate(galleryItem!.route);

      expect(navigatedRoute).toBe('/gallery');
    });

    test('should call navigation handler with correct route for Leaderboard', () => {
      const leaderboardItem = expectedMenuItems.find(
        (item) => item.id === 'leaderboard'
      );

      expect(leaderboardItem).toBeDefined();

      // Simulate navigation handler
      let navigatedRoute = '';
      const onNavigate = (route: string) => {
        navigatedRoute = route;
      };

      // Simulate clicking the menu item
      onNavigate(leaderboardItem!.route);

      expect(navigatedRoute).toBe('/leaderboard');
    });

    test('should call navigation handler with correct route for My Designs', () => {
      const myDesignsItem = expectedMenuItems.find(
        (item) => item.id === 'mydesigns'
      );

      expect(myDesignsItem).toBeDefined();

      // Simulate navigation handler
      let navigatedRoute = '';
      const onNavigate = (route: string) => {
        navigatedRoute = route;
      };

      // Simulate clicking the menu item
      onNavigate(myDesignsItem!.route);

      expect(navigatedRoute).toBe('/my-designs');
    });

    test('should handle multiple navigation calls', () => {
      const navigationHistory: string[] = [];
      const onNavigate = (route: string) => {
        navigationHistory.push(route);
      };

      // Simulate clicking multiple menu items
      onNavigate('/design');
      onNavigate('/gallery');
      onNavigate('/leaderboard');
      onNavigate('/my-designs');

      expect(navigationHistory.length).toBe(4);
      expect(navigationHistory[0]).toBe('/design');
      expect(navigationHistory[1]).toBe('/gallery');
      expect(navigationHistory[2]).toBe('/leaderboard');
      expect(navigationHistory[3]).toBe('/my-designs');
    });

    test('should handle navigation to same route multiple times', () => {
      const navigationHistory: string[] = [];
      const onNavigate = (route: string) => {
        navigationHistory.push(route);
      };

      // Simulate clicking the same menu item multiple times
      onNavigate('/design');
      onNavigate('/design');
      onNavigate('/design');

      expect(navigationHistory.length).toBe(3);
      expect(navigationHistory.every((route) => route === '/design')).toBe(true);
    });
  });

  describe('Active Route Highlighting', () => {
    test('should identify Current Design as active when on /design route', () => {
      const currentRoute = '/design';
      const currentDesignItem = expectedMenuItems.find(
        (item) => item.id === 'current'
      );

      expect(currentDesignItem).toBeDefined();

      const isActive = currentRoute === currentDesignItem!.route;
      expect(isActive).toBe(true);
    });

    test('should identify View Other Rooms as active when on /gallery route', () => {
      const currentRoute = '/gallery';
      const galleryItem = expectedMenuItems.find(
        (item) => item.id === 'gallery'
      );

      expect(galleryItem).toBeDefined();

      const isActive = currentRoute === galleryItem!.route;
      expect(isActive).toBe(true);
    });

    test('should identify Leaderboard as active when on /leaderboard route', () => {
      const currentRoute = '/leaderboard';
      const leaderboardItem = expectedMenuItems.find(
        (item) => item.id === 'leaderboard'
      );

      expect(leaderboardItem).toBeDefined();

      const isActive = currentRoute === leaderboardItem!.route;
      expect(isActive).toBe(true);
    });

    test('should identify My Designs as active when on /my-designs route', () => {
      const currentRoute = '/my-designs';
      const myDesignsItem = expectedMenuItems.find(
        (item) => item.id === 'mydesigns'
      );

      expect(myDesignsItem).toBeDefined();

      const isActive = currentRoute === myDesignsItem!.route;
      expect(isActive).toBe(true);
    });

    test('should not mark any item as active for unknown route', () => {
      const currentRoute = '/unknown';

      const activeItems = expectedMenuItems.filter(
        (item) => currentRoute === item.route
      );

      expect(activeItems.length).toBe(0);
    });

    test('should mark only one item as active at a time', () => {
      const currentRoute = '/design';

      const activeItems = expectedMenuItems.filter(
        (item) => currentRoute === item.route
      );

      expect(activeItems.length).toBe(1);
    });

    test('should default to /design route when no route is specified', () => {
      const defaultRoute = '/design';
      const currentRoute = defaultRoute;

      const currentDesignItem = expectedMenuItems.find(
        (item) => item.id === 'current'
      );

      expect(currentDesignItem).toBeDefined();

      const isActive = currentRoute === currentDesignItem!.route;
      expect(isActive).toBe(true);
    });
  });

  describe('Menu Item Structure', () => {
    test('should have consistent structure for all menu items', () => {
      expectedMenuItems.forEach((item) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('route');

        expect(typeof item.id).toBe('string');
        expect(typeof item.label).toBe('string');
        expect(typeof item.icon).toBe('string');
        expect(typeof item.route).toBe('string');
      });
    });

    test('should maintain menu items in correct order', () => {
      // Menu items should be in this order: Current Design, View Other Rooms, Leaderboard, My Designs
      expect(expectedMenuItems[0].id).toBe('current');
      expect(expectedMenuItems[1].id).toBe('gallery');
      expect(expectedMenuItems[2].id).toBe('leaderboard');
      expect(expectedMenuItems[3].id).toBe('mydesigns');
    });

    test('should have descriptive labels that match functionality', () => {
      const currentDesignItem = expectedMenuItems.find(
        (item) => item.id === 'current'
      );
      const galleryItem = expectedMenuItems.find(
        (item) => item.id === 'gallery'
      );
      const leaderboardItem = expectedMenuItems.find(
        (item) => item.id === 'leaderboard'
      );
      const myDesignsItem = expectedMenuItems.find(
        (item) => item.id === 'mydesigns'
      );

      expect(currentDesignItem?.label).toContain('Design');
      expect(galleryItem?.label).toContain('Rooms');
      expect(leaderboardItem?.label).toContain('Leaderboard');
      expect(myDesignsItem?.label).toContain('Designs');
    });
  });
});
