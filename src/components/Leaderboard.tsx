/**
 * Leaderboard Component - Displays top designs ranked by vote count
 * Shows rank, username, vote count, and thumbnail for each design
 * Supports theme filtering and highlights current user's design
 */

import { Devvit } from '@devvit/public-api';
import { LeaderboardEntry, Theme } from '../types/models.js';

export interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentUserId: string;
  currentTheme: Theme;
  availableThemes: Theme[];
  selectedThemeId: string;
  onThemeChange: (themeId: string) => void;
  onRefresh: () => void;
  onDesignClick?: (designId: string) => void;
}

/**
 * Format vote count with + prefix for positive numbers
 */
function formatVoteCount(count: number): string {
  if (count > 0) return `+${count}`;
  return count.toString();
}

/**
 * Get medal emoji for top 3 positions
 */
function getMedalEmoji(rank: number): string {
  switch (rank) {
    case 1:
      return '🥇';
    case 2:
      return '🥈';
    case 3:
      return '🥉';
    default:
      return '';
  }
}

/**
 * Leaderboard component that displays ranked designs
 */
export const Leaderboard = (props: LeaderboardProps): JSX.Element => {
  const {
    entries,
    currentUserId,
    currentTheme,
    availableThemes,
    selectedThemeId,
    onThemeChange,
    onRefresh,
    onDesignClick,
  } = props;

  /**
   * Render theme filter dropdown
   */
  const renderThemeFilter = () => {
    return (
      <vstack gap="small" padding="medium" backgroundColor="#FFFFFF" cornerRadius="medium">
        <text size="medium" weight="bold">
          Filter by Theme
        </text>
        <hstack gap="small" alignment="start middle">
          {availableThemes.map((theme) => {
            const isSelected = theme.id === selectedThemeId;
            return (
              <button
                key={theme.id}
                appearance={isSelected ? 'primary' : 'secondary'}
                size="small"
                onPress={() => onThemeChange(theme.id)}
              >
                {theme.name}
              </button>
            );
          })}
        </hstack>
      </vstack>
    );
  };

  /**
   * Render a single leaderboard entry
   */
  const renderEntry = (entry: LeaderboardEntry) => {
    const isCurrentUser = entry.design.userId === currentUserId;
    const medal = getMedalEmoji(entry.rank);
    const rankColor = entry.rank <= 3 ? '#F59E0B' : '#6B7280';

    return (
      <vstack
        key={entry.design.id}
        backgroundColor={isCurrentUser ? '#EFF6FF' : '#FFFFFF'}
        borderColor={isCurrentUser ? '#3B82F6' : '#E5E7EB'}
        cornerRadius="medium"
        padding="medium"
        gap="small"
        onPress={() => onDesignClick?.(entry.design.id)}
      >
        <hstack gap="medium" alignment="space-between middle">
          {/* Rank and medal */}
          <hstack gap="small" alignment="start middle">
            <vstack
              width="48px"
              height="48px"
              backgroundColor={entry.rank <= 3 ? '#FEF3C7' : '#F3F4F6'}
              cornerRadius="small"
              alignment="center middle"
            >
              {medal ? (
                <text size="xxlarge">{medal}</text>
              ) : (
                <text size="xlarge" weight="bold" color={rankColor}>
                  #{entry.rank}
                </text>
              )}
            </vstack>

            {/* Design thumbnail */}
            <vstack
              width="120px"
              height="90px"
              backgroundColor={entry.design.backgroundColor}
              cornerRadius="small"
              alignment="center middle"
            >
              <image
                url="room_2.png"
                imageWidth={100}
                imageHeight={75}
                description={`Design by ${entry.username}`}
              />
            </vstack>

            {/* User info and stats */}
            <vstack gap="small" grow>
              <hstack gap="small" alignment="start middle">
                <text size="large" weight="bold">
                  u/{entry.username}
                </text>
                {isCurrentUser && (
                  <vstack
                    backgroundColor="#3B82F6"
                    padding="xsmall"
                    cornerRadius="small"
                  >
                    <text size="xsmall" color="#FFFFFF" weight="bold">
                      YOU
                    </text>
                  </vstack>
                )}
              </hstack>

              <hstack gap="medium" alignment="start middle">
                <hstack gap="xsmall" alignment="start middle">
                  <text size="small" color="#6B7280">
                    Assets:
                  </text>
                  <text size="small" weight="bold">
                    {entry.design.assets.length}
                  </text>
                </hstack>

                <hstack gap="xsmall" alignment="start middle">
                  <text size="small" color="#6B7280">
                    Theme:
                  </text>
                  <text size="small" weight="bold">
                    {currentTheme.name}
                  </text>
                </hstack>
              </hstack>
            </vstack>

            {/* Vote count */}
            <vstack
              alignment="center middle"
              padding="medium"
              backgroundColor={entry.voteCount > 0 ? '#D1FAE5' : entry.voteCount < 0 ? '#FEE2E2' : '#F3F4F6'}
              cornerRadius="medium"
            >
              <text
                size="xxlarge"
                weight="bold"
                color={entry.voteCount > 0 ? '#10B981' : entry.voteCount < 0 ? '#EF4444' : '#6B7280'}
              >
                {formatVoteCount(entry.voteCount)}
              </text>
              <text size="xsmall" color="#6B7280">
                votes
              </text>
            </vstack>
          </hstack>
        </hstack>
      </vstack>
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => (
    <vstack
      grow
      alignment="center middle"
      gap="medium"
      padding="xlarge"
    >
      <text size="xxlarge">🏆</text>
      <text size="large" weight="bold">
        No Designs Yet
      </text>
      <text size="medium" color="#6B7280" alignment="center">
        Be the first to submit a design and claim the top spot!
      </text>
      <button
        appearance="primary"
        onPress={onRefresh}
      >
        Refresh Leaderboard
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
            <hstack gap="small" alignment="start middle">
              <text size="xxlarge">🏆</text>
              <text size="xlarge" weight="bold">
                Leaderboard
              </text>
            </hstack>
            <text size="small" color="#6B7280">
              Top designs ranked by community votes
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

        {/* Current theme info */}
        <vstack
          backgroundColor="#F0F9FF"
          padding="small"
          cornerRadius="small"
          gap="xsmall"
        >
          <text size="small" weight="bold" color="#0369A1">
            Current Theme: {currentTheme.name}
          </text>
          <text size="xsmall" color="#0C4A6E">
            {currentTheme.description}
          </text>
        </vstack>

        {/* Entry count */}
        <text size="small" color="#6B7280">
          {entries.length} design{entries.length !== 1 ? 's' : ''} ranked
        </text>
      </vstack>

      {/* Theme filter */}
      {availableThemes.length > 1 && renderThemeFilter()}

      {/* Leaderboard entries or empty state */}
      {entries.length === 0 ? (
        renderEmptyState()
      ) : (
        <vstack grow gap="small" padding="medium">
          {entries.map((entry) => renderEntry(entry))}
        </vstack>
      )}
    </vstack>
  );
};
