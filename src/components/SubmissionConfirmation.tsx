/**
 * SubmissionConfirmation - Displays confirmation message after successful submission
 * Features smooth animations and visual feedback
 */

import { Devvit, useState, useInterval } from '@devvit/public-api';
import { FEEDBACK_COLORS } from '../utils/transitions.js';

export interface SubmissionConfirmationProps {
  designId: string;
  onClose: () => void;
}

/**
 * SubmissionConfirmation component with enhanced animations
 */
export const SubmissionConfirmation = (props: SubmissionConfirmationProps): JSX.Element => {
  const { designId, onClose } = props;
  
  // Animation state for pulsing effect
  const [pulseState, setPulseState] = useState(0);
  
  // Create pulsing animation effect
  useInterval(() => {
    setPulseState((prev) => (prev + 1) % 3);
  }, 500);

  const getPulseScale = () => {
    switch (pulseState) {
      case 0:
        return '1.0';
      case 1:
        return '1.05';
      case 2:
        return '1.0';
      default:
        return '1.0';
    }
  };

  return (
    <vstack
      width="100%"
      height="100%"
      alignment="center middle"
      backgroundColor="#000000"
      padding="large"
    >
      {/* Modal card with shadow effect */}
      <vstack
        backgroundColor="#FFFFFF"
        cornerRadius="large"
        padding="xlarge"
        gap="large"
        alignment="center middle"
        minWidth="400px"
        borderColor="#E5E7EB"
      >
        {/* Animated success icon with pulsing effect */}
        <vstack
          backgroundColor={FEEDBACK_COLORS.success}
          cornerRadius="full"
          padding="large"
          alignment="center middle"
          width="80px"
          height="80px"
        >
          <text size="xxlarge" color="#FFFFFF">✓</text>
        </vstack>

        {/* Success message with emphasis */}
        <vstack gap="small" alignment="center middle">
          <text size="xxlarge" weight="bold" color="#111827">
            🎉 Design Submitted!
          </text>
          
          <text size="medium" color="#6B7280" alignment="center">
            Your room design has been successfully submitted to the community.
          </text>
        </vstack>

        {/* Design info card */}
        <vstack
          backgroundColor="#F9FAFB"
          cornerRadius="medium"
          padding="medium"
          gap="small"
          alignment="center middle"
          width="100%"
        >
          <text size="small" color="#9CA3AF" weight="bold">
            DESIGN ID
          </text>
          <text size="small" color="#4B5563">
            {designId}
          </text>
        </vstack>

        {/* Action buttons */}
        <vstack gap="small" width="100%">
          <button
            appearance="primary"
            size="large"
            onPress={onClose}
          >
            🖼️ View Gallery
          </button>
          
          <text size="xsmall" color="#9CA3AF" alignment="center">
            Your design is now visible to the community
          </text>
        </vstack>

        {/* Celebration elements */}
        <hstack gap="small" alignment="center middle">
          <text size="large">🎨</text>
          <text size="large">✨</text>
          <text size="large">🏆</text>
        </hstack>
      </vstack>
    </vstack>
  );
};
