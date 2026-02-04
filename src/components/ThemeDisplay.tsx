/**
 * ThemeDisplay Component - Displays current theme with countdown timer
 * Positioned at the top of the canvas with enhanced visual feedback
 */

import { Devvit, useState, useInterval } from '@devvit/public-api';
import { Theme } from '../types/models.js';
import { formatTimeRemaining, getCountdownColor, formatCountdown } from '../utils/transitions.js';

// Re-export formatCountdown for testing
export { formatCountdown } from '../utils/transitions.js';

export interface ThemeDisplayProps {
  theme: Theme | null;
  timeRemaining?: number; // in milliseconds
}

/**
 * ThemeDisplay component that shows current theme and countdown with visual polish
 */
export const ThemeDisplay = (props: ThemeDisplayProps): JSX.Element => {
  const { theme, timeRemaining = 0 } = props;
  
  // Animation state for pulsing effect when time is running out
  const [pulseState, setPulseState] = useState(0);
  
  // Create pulsing animation when less than 1 hour remains
  const isUrgent = timeRemaining < 3600000; // Less than 1 hour
  
  useInterval(() => {
    if (isUrgent && timeRemaining > 0) {
      setPulseState((prev) => (prev + 1) % 2);
    }
  }, 500);

  // If no theme is available, show a placeholder
  if (!theme) {
    return (
      <vstack
        width="100%"
        backgroundColor="#F3F4F6"
        padding="medium"
        alignment="center middle"
        cornerRadius="medium"
        borderColor="#E5E7EB"
      >
        <text size="medium" color="#6B7280">
          🎨 No active theme
        </text>
      </vstack>
    );
  }

  const countdownText = formatTimeRemaining(timeRemaining);
  const isExpired = timeRemaining <= 0;
  const countdownColor = getCountdownColor(timeRemaining);

  // Get background color based on urgency
  const getBackgroundColor = (): string => {
    if (isExpired) return '#FEE2E2';
    if (isUrgent) return pulseState === 0 ? '#FEF3C7' : '#FDE68A';
    return '#EFF6FF';
  };

  // Get border color based on urgency
  const getBorderColor = (): string => {
    if (isExpired) return '#FCA5A5';
    if (isUrgent) return '#FCD34D';
    return '#BFDBFE';
  };

  return (
    <vstack
      width="100%"
      backgroundColor={getBackgroundColor()}
      padding="large"
      gap="medium"
      alignment="center middle"
      cornerRadius="medium"
      borderColor={getBorderColor()}
    >
      {/* Theme header with icon */}
      <hstack gap="small" alignment="center middle">
        <text size="xxlarge">🎨</text>
        <vstack gap="xsmall" alignment="center middle">
          <text 
            size="xxlarge" 
            weight="bold" 
            color={isExpired ? '#991B1B' : '#1E40AF'}
          >
            {theme.name}
          </text>
          
          {/* Theme description */}
          <text 
            size="medium" 
            color={isExpired ? '#7F1D1D' : '#3B82F6'}
            alignment="center"
          >
            {theme.description}
          </text>
        </vstack>
      </hstack>

      {/* Countdown timer with enhanced visual feedback */}
      <vstack
        backgroundColor={isExpired ? '#FCA5A5' : isUrgent ? '#FDE68A' : '#DBEAFE'}
        padding="medium"
        cornerRadius="medium"
        gap="xsmall"
        alignment="center middle"
        minWidth="250px"
        borderColor={isExpired ? '#F87171' : isUrgent ? '#FBBF24' : '#93C5FD'}
      >
        <hstack gap="small" alignment="center middle">
          <text 
            size="medium" 
            weight="bold" 
            color={isExpired ? '#7F1D1D' : isUrgent ? '#92400E' : '#1E40AF'}
          >
            {isExpired ? '⏰' : isUrgent ? '⚠️' : '⏱️'}
          </text>
          <text 
            size="small" 
            weight="bold" 
            color={isExpired ? '#7F1D1D' : isUrgent ? '#92400E' : '#1E40AF'}
          >
            {isExpired ? 'Theme Ended' : 'Time Remaining'}
          </text>
        </hstack>
        
        {!isExpired && (
          <text 
            size="xxlarge" 
            weight="bold" 
            color={countdownColor}
          >
            {countdownText}
          </text>
        )}
        
        {isExpired && (
          <text 
            size="small" 
            color="#991B1B"
            alignment="center"
          >
            This theme has ended. Check back for the next theme!
          </text>
        )}
        
        {isUrgent && !isExpired && (
          <text 
            size="xsmall" 
            color="#92400E"
            weight="bold"
            alignment="center"
          >
            ⚡ Hurry! Time is running out!
          </text>
        )}
      </vstack>
    </vstack>
  );
};
