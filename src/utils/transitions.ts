/**
 * Transitions and Animation Utilities
 * Provides smooth transitions and visual feedback for UI interactions
 */

/**
 * Transition states for mode switching
 */
export type TransitionState = 'idle' | 'transitioning' | 'complete';

/**
 * Animation timing configurations
 */
export const ANIMATION_DURATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Visual feedback colors
 */
export const FEEDBACK_COLORS = {
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  neutral: '#6B7280',
} as const;

/**
 * Get transition background color based on state
 */
export function getTransitionBackground(state: TransitionState): string {
  switch (state) {
    case 'transitioning':
      return '#F3F4F6';
    case 'complete':
      return '#FFFFFF';
    default:
      return '#FFFFFF';
  }
}

/**
 * Get button appearance based on interaction state
 */
export function getButtonAppearance(
  isActive: boolean,
  isHovered: boolean = false
): 'primary' | 'secondary' | 'success' | 'destructive' {
  if (isActive) return 'primary';
  if (isHovered) return 'secondary';
  return 'secondary';
}

/**
 * Get visual feedback for save status
 */
export function getSaveStatusColor(status: 'idle' | 'saving' | 'saved' | 'error'): string {
  switch (status) {
    case 'saving':
      return FEEDBACK_COLORS.info;
    case 'saved':
      return FEEDBACK_COLORS.success;
    case 'error':
      return FEEDBACK_COLORS.error;
    default:
      return FEEDBACK_COLORS.neutral;
  }
}

/**
 * Get visual feedback icon for save status
 */
export function getSaveStatusIcon(status: 'idle' | 'saving' | 'saved' | 'error'): string {
  switch (status) {
    case 'saving':
      return '⏳';
    case 'saved':
      return '✓';
    case 'error':
      return '⚠️';
    default:
      return '💾';
  }
}

/**
 * Format time remaining for countdown display (detailed format)
 * Returns "Theme Ended" for zero or negative values
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) {
    return 'Theme Ended';
  }

  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const parts: string[] = [];
  
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours % 24}h`);
  }
  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes % 60}m`);
  }
  parts.push(`${seconds % 60}s`);

  return parts.join(' ');
}

/**
 * Format time remaining for countdown display (compact format)
 */
export function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Get urgency color for countdown based on time remaining
 */
export function getCountdownColor(milliseconds: number): string {
  const hours = milliseconds / (1000 * 60 * 60);
  
  if (hours < 1) {
    return FEEDBACK_COLORS.error; // Less than 1 hour - red
  } else if (hours < 6) {
    return FEEDBACK_COLORS.warning; // Less than 6 hours - yellow
  } else {
    return FEEDBACK_COLORS.info; // More than 6 hours - blue
  }
}
