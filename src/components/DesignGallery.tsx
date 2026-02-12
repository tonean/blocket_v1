/**
 * DesignGallery Component - Displays submitted designs in a dark themed grid layout
 * Matches the reference design with room thumbnails, usernames, likes, and stats
 */

import { Devvit } from '@devvit/public-api';
import { Design } from '../types/models.js';
import { VoteType } from '../services/VotingService.js';

export interface DesignGalleryProps {
  designs: Design[];
  currentUserId: string;
  currentThemeId: string;
  currentPage: number;
  totalPages: number;
  userVotes: Map<string, VoteType>;
  isAuthenticated: boolean;
  onDesignClick?: (design: Design) => void;
  onVote: (designId: string, voteType: VoteType) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
}

/**
 * Format vote count for display (e.g., 1.1k for 1100)
 */
function formatCount(count: number): string {
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'k';
  }
  return count.toString();
}

/**
 * DesignGallery component with dark theme grid layout
 */
export const DesignGallery = (props: DesignGalleryProps): JSX.Element => {
  const {
    designs,
    currentUserId,
    currentThemeId,
    currentPage,
    totalPages,
    userVotes,
    isAuthenticated,
    onDesignClick,
    onVote,
    onPageChange,
    onRefresh,
  } = props;

  /**
   * Render a single design card with dark theme styling
   */
  const renderDesignCard = (design: Design) => {
    const isOwnDesign = design.userId === currentUserId;
    const userVote = userVotes.get(design.id);
    const hasUpvoted = userVote === VoteType.UPVOTE;

    return (
      <vstack
        key={design.id}
        backgroundColor="#2A2A30"
        cornerRadius="medium"
        onPress={() => onDesignClick?.(design)}
        width="48%"
      >
        {/* Design thumbnail */}
        <vstack
          width="100%"
          height="120px"
          backgroundColor={design.backgroundColor || '#1E1E23'}
          cornerRadius="medium"
          alignment="center middle"
        >
          <image
            url="room_2.png"
            imageWidth={150}
            imageHeight={100}
            description={`Design by ${design.username}`}
          />
        </vstack>

        {/* Design info footer */}
        <vstack padding="small" gap="xsmall">
          {/* Username */}
          <text size="small" weight="bold" color="#FFFFFF">
            {design.username}
          </text>

          {/* Stats row - likes and views */}
          <hstack gap="medium" alignment="start middle">
            {/* Upvote button and count */}
            <hstack
              gap="xsmall"
              alignment="center middle"
              onPress={() => {
                if (!isOwnDesign && isAuthenticated) {
                  onVote(design.id, VoteType.UPVOTE);
                }
              }}
            >
              <text size="small" color={hasUpvoted ? '#FF6B6B' : '#888888'}>
                {hasUpvoted ? '♥' : '♡'}
              </text>
              <text size="xsmall" color="#888888">
                {formatCount(design.voteCount > 0 ? design.voteCount : 0)}
              </text>
            </hstack>

            {/* Views/engagement indicator */}
            <hstack gap="xsmall" alignment="center middle">
              <text size="small" color="#888888">📊</text>
              <text size="xsmall" color="#888888">
                {formatCount(design.assets?.length * 50 || 100)}
              </text>
            </hstack>
          </hstack>
        </vstack>
      </vstack>
    );
  };

  /**
   * Render pagination controls
   */
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <hstack gap="medium" alignment="center middle" padding="medium">
        <button
          appearance="secondary"
          size="small"
          disabled={currentPage === 1}
          onPress={() => onPageChange(currentPage - 1)}
        >
          ←
        </button>

        <text size="small" color="#FFFFFF">
          {currentPage} / {totalPages}
        </text>

        <button
          appearance="secondary"
          size="small"
          disabled={currentPage === totalPages}
          onPress={() => onPageChange(currentPage + 1)}
        >
          →
        </button>
      </hstack>
    );
  };

  /**
   * Render empty state when no designs are available
   */
  const renderEmptyState = () => (
    <vstack
      grow
      alignment="center middle"
      gap="medium"
      padding="xlarge"
    >
      <text size="xlarge" color="#FFFFFF">🎨</text>
      <text size="large" weight="bold" color="#FFFFFF">
        No Designs Yet
      </text>
      <text size="medium" color="#888888" alignment="center">
        Be the first to submit a design!
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
      backgroundColor="#1A1A1F"
      gap="small"
    >
      {/* Header */}
      <hstack
        padding="medium"
        alignment="space-between middle"
        backgroundColor="#1E1E23"
      >
        <text size="large" weight="bold" color="#FFFFFF">
          Gallery
        </text>
        <button
          appearance="secondary"
          size="small"
          onPress={onRefresh}
        >
          Refresh
        </button>
      </hstack>

      {/* Design grid or empty state */}
      {designs.length === 0 ? (
        renderEmptyState()
      ) : (
        <vstack grow gap="small" padding="small">
          {/* Grid layout - 2 columns using hstack rows */}
          {(() => {
            const rows: Design[][] = [];
            for (let i = 0; i < designs.length; i += 2) {
              rows.push(designs.slice(i, i + 2));
            }

            return rows.map((row, rowIndex) => (
              <hstack key={`row-${rowIndex}`} gap="small" alignment="start top">
                {row.map((design) => renderDesignCard(design))}
                {/* Add spacer if odd number of items */}
                {row.length === 1 && <vstack width="48%" />}
              </hstack>
            ));
          })()}
        </vstack>
      )}

      {/* Pagination */}
      {renderPagination()}
    </vstack>
  );
};
