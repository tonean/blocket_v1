/**
 * SaveStatusIndicator - Displays the current auto-save status with smooth transitions
 */

import { Devvit, useState, useInterval } from '@devvit/public-api';
import { SaveStatus } from '../utils/AutoSaveManager.js';
import { getSaveStatusColor, getSaveStatusIcon } from '../utils/transitions.js';

export interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaveTime?: number;
  error?: string;
}

/**
 * Component that displays the current save status with visual feedback
 */
export const SaveStatusIndicator = (props: SaveStatusIndicatorProps): JSX.Element => {
  const { status, lastSaveTime, error } = props;
  
  // Animation state for pulsing effect when saving
  const [pulseState, setPulseState] = useState(0);
  
  // Create pulsing animation for saving state
  useInterval(() => {
    if (status === 'saving') {
      setPulseState((prev) => (prev + 1) % 2);
    }
  }, 500);

  // Format the last save time
  const formatLastSaveTime = (timestamp: number): string => {
    if (!timestamp) return '';
    
    const now = Date.now();
    const diffSeconds = Math.floor((now - timestamp) / 1000);
    
    if (diffSeconds < 5) return 'just now';
    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours}h ago`;
  };

  // Get background color based on status
  const getBackgroundColor = (): string => {
    switch (status) {
      case 'saving':
        return pulseState === 0 ? '#FEF3C7' : '#FDE68A';
      case 'saved':
        return '#D1FAE5';
      case 'error':
        return '#FEE2E2';
      default:
        return '#F3F4F6';
    }
  };

  // Get text color based on status
  const getTextColor = (): string => {
    switch (status) {
      case 'saving':
        return '#92400E';
      case 'saved':
        return '#065F46';
      case 'error':
        return '#991B1B';
      default:
        return '#6B7280';
    }
  };

  // Get status message
  const getStatusMessage = (): string => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return 'Save Failed';
      default:
        return 'Auto-save enabled';
    }
  };

  return (
    <hstack
      backgroundColor={getBackgroundColor()}
      padding="small"
      cornerRadius="medium"
      gap="small"
      alignment="middle"
      borderColor={status === 'error' ? '#FCA5A5' : 'transparent'}
    >
      <text size="small" color={getTextColor()} weight="bold">
        {getSaveStatusIcon(status)} {getStatusMessage()}
      </text>
      
      {status === 'saved' && lastSaveTime && lastSaveTime > 0 && (
        <text size="xsmall" color="#059669">
          {formatLastSaveTime(lastSaveTime)}
        </text>
      )}
      
      {status === 'error' && error && (
        <text size="xsmall" color="#DC2626">
          {error}
        </text>
      )}
    </hstack>
  );
};
