/**
 * NavigationMenu Component - Provides navigation between different views
 * Dark themed compact dropdown menu
 */

import { Devvit, useState } from '@devvit/public-api';

export interface MenuItem {
  id: string;
  label: string;
  route: string;
}

export interface NavigationMenuProps {
  currentRoute?: string;
  onNavigate: (route: string) => void;
  onClose?: () => void;
}

/**
 * NavigationMenu component with dark theme design - compact version
 */
export const NavigationMenu = (props: NavigationMenuProps): JSX.Element => {
  const { currentRoute = '/design', onNavigate, onClose } = props;

  // Define menu items - My Room, Gallery, Leaderboard (no emojis)
  const menuItems: MenuItem[] = [
    {
      id: 'myroom',
      label: 'My Room',
      route: '/design',
    },
    {
      id: 'gallery',
      label: 'Gallery',
      route: '/gallery',
    },
    {
      id: 'leaderboard',
      label: 'Leaderboard',
      route: '/leaderboard',
    },
  ];

  // Render a single menu item with dark theme
  const renderMenuItem = (item: MenuItem) => {
    const isActive = currentRoute === item.route;

    return (
      <vstack
        key={item.id}
        padding="small"
        cornerRadius="small"
        backgroundColor={isActive ? 'rgba(255,255,255,0.15)' : 'transparent'}
        onPress={() => onNavigate(item.route)}
      >
        <hstack gap="small" alignment="start middle">
          {/* Icon based on route */}
          <text size="small" color="#FFFFFF">
            {item.id === 'myroom' ? '⊞' : item.id === 'gallery' ? '▣' : '⚑'}
          </text>

          {/* Label */}
          <text
            size="small"
            weight={isActive ? 'bold' : 'regular'}
            color="#FFFFFF"
          >
            {item.label}
          </text>
        </hstack>
      </vstack>
    );
  };

  return (
    <vstack
      width="100%"
      gap="xsmall"
    >
      {/* Menu items */}
      {menuItems.map((item) => renderMenuItem(item))}
    </vstack>
  );
};
