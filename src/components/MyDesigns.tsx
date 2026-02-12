/**
 * MyDesigns Component - Displays user's submitted designs
 * Shows all designs created by the current user with theme, submission time, and vote count
 */

import { Devvit } from '@devvit/public-api';
import { Design } from '../types/models.js';

export interface MyDesignsProps {
  designs: Design[];
  currentUserId: string;
  onDesignClick?: (design: Design) => void;
  onRefresh: () => void;
}

/**
 * Format timestamp to readable date string
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Get theme display name from theme ID
 */
function getThemeDisplayName(themeId: string): string {
  // Extract theme name from ID (e.g., "theme_school_001" -> "School")
  const parts = themeId.split('_');
  if (parts.length >= 2) {
    const themeName = parts[1];
    return themeName.charAt(0).toUpperCase() + themeName.slice(1);
  }
  return themeId;
}

/**
 * MyDesigns component that displays user's submitted designs
 */
export const MyDesigns = (props: MyDesignsProps): JSX.Element => {
  const {
    designs,
    currentUserId,
    onDesignClick,
    onRefresh,
  } = props;

  /**
   * Render a single design card with thumbnail and metadata
   */
  const renderDesignCard = (design: Design) => {
    return (
      <vstack
        key={design.id}
        backgroundColor="#FFFFFF"
        cornerRadius="medium"
        padding="medium"
        gap="small"
        borderColor="#E5E7EB"
        onPress={() => onDesignClick?.(design)}
      >
        {/* Design thumbnail */}
        <vstack
          width="100%"
          height="200px"
          backgroundColor={design.backgroundColor}
          cornerRadius="small"
          alignment="center middle"
        >
          <image
            url="room_2.png"
            imageWidth={250}
            imageHeight={187}
            description={`Your design for ${getThemeDisplayName(design.themeId)}`}
          />
          {design.assets.length > 0 && (
            <text size="xsmall" color="#6B7280">
              {design.assets.length} asset{design.assets.length !== 1 ? 's' : ''}
            </text>
          )}
        </vstack>

        {/* Theme name */}
        <hstack gap="small" alignment="start middle">
          <text size="small" color="#6B7280">
            Theme:
          </text>
          <text size="medium" weight="bold">
            {getThemeDisplayName(design.themeId)}
          </text>
        </hstack>

        {/* Submission time */}
        <hstack gap="small" alignment="start middle">
          <text size="small" color="#6B7280">
            Submitted:
          </text>
          <text size="small">
            {formatTimestamp(design.createdAt)}
          </text>
        </hstack>

        {/* Vote count */}
        <hstack gap="small" alignment="start middle">
          <text size="small" color="#6B7280">
            Votes:
          </text>
          <text
            size="medium"
            weight="bold"
            color={design.voteCount > 0 ? '#10B981' : design.voteCount < 0 ? '#EF4444' : '#6B7280'}
          >
            {design.voteCount > 0 ? '+' : ''}{design.voteCount}
          </text>
        </hstack>

        {/* Submission status badge */}
        {design.submitted && (
          <vstack
            backgroundColor="#D1FAE5"
            padding="small"
            cornerRadius="small"
            alignment="center middle"
          >
            <text size="xsmall" color="#059669" weight="bold">
              ✓ Submitted
            </text>
          </vstack>
        )}
      </vstack>
    );
  };

  /**
   * Render empty state when user has no designs
   */
  const renderEmptyState = () => (
    <vstack
      grow
      alignment="center middle"
      gap="medium"
      padding="xlarge"
    >
      <text size="xxlarge">🎨</text>
      <text size="large" weight="bold">
        No Designs Yet
      </text>
      <text size="medium" color="#6B7280" alignment="center">
        You haven't created any designs yet. Start designing to see your creations here!
      </text>
      <button
        appearance="primary"
        onPress={onRefresh}
      >
        Refresh
      </button>
    </vstack>
  );

  /**
   * Main render
   */
  return (
    <vstack
      width="100%"
      height="100%"
      backgroundColor="#F9FAFB"
      gap="medium"
    >
      {/* Header */}
      <vstack
        backgroundColor="#FFFFFF"
        padding="medium"
        gap="small"
        borderColor="#E5E7EB"
      >
        <hstack alignment="space-between middle">
          <vstack gap="small">
            <text size="xlarge" weight="bold">
              My Designs
            </text>
            <text size="small" color="#6B7280">
              View all your submitted room designs
            </text>
          </vstack>
          <button
            appearance="secondary"
            size="small"
            onPress={onRefresh}
          >
            🔄 Refresh
          </button>
        </hstack>

        {/* Design count */}
        <text size="small" color="#6B7280">
          {designs.length} design{designs.length !== 1 ? 's' : ''}
        </text>
      </vstack>

      {/* Design grid or empty state */}
      {designs.length === 0 ? (
        renderEmptyState()
      ) : (
        <vstack grow gap="medium" padding="medium">
          {/* Grid layout - 2 columns */}
          {(() => {
            const rows: Design[][] = [];
            for (let i = 0; i < designs.length; i += 2) {
              rows.push(designs.slice(i, i + 2));
            }

            return rows.map((row, rowIndex) => (
              <hstack key={`row-${rowIndex}`} gap="medium" alignment="start top">
                {row.map((design) => renderDesignCard(design))}
              </hstack>
            ));
          })()}
        </vstack>
      )}
    </vstack>
  );
};
