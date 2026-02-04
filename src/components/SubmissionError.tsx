/**
 * SubmissionError - Displays error message when submission fails
 */

import { Devvit } from '@devvit/public-api';

export interface SubmissionErrorProps {
  errorMessage: string;
  onRetry: () => void;
  onCancel: () => void;
  showLoginPrompt?: boolean;
}

/**
 * SubmissionError component
 */
export const SubmissionError = (props: SubmissionErrorProps): JSX.Element => {
  const { errorMessage, onRetry, onCancel, showLoginPrompt = false } = props;

  return (
    <vstack
      width="100%"
      height="100%"
      alignment="center middle"
      backgroundColor="rgba(0, 0, 0, 0.8)"
      padding="large"
    >
      <vstack
        backgroundColor="#FFFFFF"
        cornerRadius="large"
        padding="large"
        gap="medium"
        alignment="center middle"
        minWidth="300px"
      >
        {/* Error icon or login icon */}
        <vstack
          backgroundColor={showLoginPrompt ? "#3B82F6" : "#EF4444"}
          cornerRadius="full"
          padding="medium"
          alignment="center middle"
        >
          <text size="xxlarge" color="#FFFFFF">
            {showLoginPrompt ? "🔒" : "✕"}
          </text>
        </vstack>

        {/* Error message */}
        <text size="xlarge" weight="bold" color="#111827">
          {showLoginPrompt ? "Authentication Required" : "Submission Failed"}
        </text>

        <text size="medium" color="#6B7280" alignment="center middle">
          {errorMessage}
        </text>

        {showLoginPrompt && (
          <text size="small" color="#9CA3AF" alignment="center middle">
            Please log in to your Reddit account to submit designs and vote on other players' creations.
          </text>
        )}

        {/* Action buttons */}
        <hstack gap="medium">
          <button
            appearance="secondary"
            size="medium"
            onPress={onCancel}
          >
            {showLoginPrompt ? "Back" : "Cancel"}
          </button>
          <button
            appearance="primary"
            size="medium"
            onPress={onRetry}
          >
            {showLoginPrompt ? "OK" : "Retry"}
          </button>
        </hstack>
      </vstack>
    </vstack>
  );
};
