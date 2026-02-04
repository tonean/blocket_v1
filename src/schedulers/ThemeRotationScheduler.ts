/**
 * ThemeRotationScheduler - Handles daily theme rotation using Devvit's scheduler
 */

import { Context, ScheduledJobEvent } from '@devvit/public-api';
import { ThemeManager } from '../managers/ThemeManager.js';
import { StorageService } from '../storage/StorageService.js';
import { Theme } from '../types/models.js';

/**
 * Job handler for daily theme rotation
 * This function is called by Devvit's scheduler
 */
export async function handleThemeRotation(event: ScheduledJobEvent, context: Context): Promise<void> {
  try {
    console.log('Theme rotation job started');

    // Initialize storage and theme manager
    const storage = new StorageService(context.redis);
    const themeManager = new ThemeManager(storage, context);

    // Get current theme
    const currentTheme = await themeManager.getCurrentTheme();
    
    if (!currentTheme) {
      console.log('No current theme found, initializing default theme');
      await themeManager.initializeDefaultTheme();
      return;
    }

    // Check if current theme has expired
    const now = Date.now();
    if (now < currentTheme.endTime) {
      console.log(`Current theme ${currentTheme.name} is still active`);
      return;
    }

    // Generate next theme
    const nextTheme = await generateNextTheme(currentTheme);
    
    // Activate the next theme (this also archives the previous theme)
    await themeManager.scheduleNextTheme(nextTheme);

    console.log(`Theme rotation complete: ${currentTheme.name} -> ${nextTheme.name}`);
  } catch (error) {
    console.error('Theme rotation job failed:', error);
    throw error;
  }
}

/**
 * Generate the next theme based on a predefined rotation
 */
async function generateNextTheme(currentTheme: Theme): Promise<Theme> {
  const themeRotation = [
    { name: 'School', description: 'Design a classroom or study space' },
    { name: 'Office', description: 'Create a professional workspace' },
    { name: 'Bedroom', description: 'Design a cozy sleeping area' },
    { name: 'Kitchen', description: 'Build a functional cooking space' },
    { name: 'Living Room', description: 'Create a comfortable gathering space' },
    { name: 'Library', description: 'Design a quiet reading room' },
  ];

  // Find current theme in rotation
  const currentIndex = themeRotation.findIndex(t => t.name === currentTheme.name);
  const nextIndex = (currentIndex + 1) % themeRotation.length;
  const nextThemeData = themeRotation[nextIndex];

  // Create new theme with 24-hour duration
  const now = Date.now();
  const oneDayInMs = 24 * 60 * 60 * 1000;

  const nextTheme: Theme = {
    id: `theme_${nextThemeData.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
    name: nextThemeData.name,
    description: nextThemeData.description,
    startTime: now,
    endTime: now + oneDayInMs,
    active: false, // Will be set to true by scheduleNextTheme
  };

  return nextTheme;
}

/**
 * Schedule the theme rotation job to run daily
 * This should be called during app initialization
 */
export function setupThemeRotationScheduler(): void {
  // Note: In a real Devvit app, this would use Devvit.addSchedulerJob
  // The actual scheduler setup happens in main.tsx using Devvit.addSchedulerJob
  console.log('Theme rotation scheduler configured');
}
