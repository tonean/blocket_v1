import { Devvit, Context, useState, useAsync } from '@devvit/public-api';
import { Design, Asset, AssetCategory, Theme, LeaderboardEntry } from './types/models.js';
import { handleThemeRotation } from './schedulers/ThemeRotationScheduler.js';
import { StorageService } from './storage/StorageService.js';
import { AssetManager } from './managers/AssetManager.js';
import { DesignManager } from './managers/DesignManager.js';
import { ThemeManager } from './managers/ThemeManager.js';
import { SubmissionHandler } from './handlers/SubmissionHandler.js';
import { LeaderboardHandler } from './handlers/LeaderboardHandler.js';
import { VotingService, VoteType } from './services/VotingService.js';
import { AuthService } from './services/AuthService.js';
import { ResponsiveLayout } from './components/ResponsiveLayout.js';
import { NavigationMenu } from './components/NavigationMenu.js';
import { DesignGallery } from './components/DesignGallery.js';
import { Leaderboard } from './components/Leaderboard.js';
import { MyDesigns } from './components/MyDesigns.js';
import { ThemeDisplay } from './components/ThemeDisplay.js';
import { Header } from './components/Header.js';

// Configure Devvit
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

// Add scheduler job for daily theme rotation
Devvit.addSchedulerJob({
  name: 'theme_rotation',
  onRun: async (event, context) => {
    await handleThemeRotation(event, context);
  },
});

// Add a trigger to set up the initial scheduled job
Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (_, context) => {
    try {
      // Schedule the theme rotation job to run daily at midnight UTC
      await context.scheduler.runJob({
        name: 'theme_rotation',
        cron: '0 0 * * *', // Run at midnight UTC every day
      });
      console.log('Theme rotation scheduler initialized');

      // Initialize default theme
      const storage = new StorageService(context.redis);
      const themeManager = new ThemeManager(storage, context);
      await themeManager.initializeDefaultTheme();
      console.log('Default theme initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
    }
  },
});

// Main app custom post type
Devvit.addCustomPostType({
  name: 'Room Design Game',
  description: 'Create and share room designs',
  height: 'tall',
  render: (context: Context) => {
    // Initialize services and managers
    const storage = new StorageService(context.redis);
    const authService = new AuthService(context);
    const assetManager = new AssetManager(context);
    const designManager = new DesignManager();
    const themeManager = new ThemeManager(storage, context);
    const submissionHandler = new SubmissionHandler(storage, authService);
    const leaderboardHandler = new LeaderboardHandler(storage);
    const votingService = new VotingService(context.redis, authService);

    // Load assets
    const assets = assetManager.loadAssets();

    // State management
    const [currentRoute, setCurrentRoute] = useState('/design');
    const [mode, setMode] = useState<'edit' | 'preview'>('preview');
    const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Load current user
    const { data: currentUser } = useAsync(async () => {
      try {
        return await authService.getCurrentUser();
      } catch (err) {
        console.error('Failed to load current user:', err);
        return null;
      }
    });

    // Load current theme
    const { data: currentTheme, loading: themeLoading } = useAsync(async () => {
      try {
        const theme = await themeManager.getCurrentTheme();
        if (!theme) {
          // Initialize default theme if none exists
          return await themeManager.initializeDefaultTheme();
        }
        return theme;
      } catch (err) {
        console.error('Failed to load current theme:', err);
        setError('Failed to load theme');
        return null;
      }
    });

    // Load or create current design
    const { data: currentDesign, loading: designLoading } = useAsync(async () => {
      if (!currentUser || !currentTheme) return null;

      try {
        // Check if user has an active design for current theme
        const userDesigns = await submissionHandler.getUserDesigns(currentUser.id);
        const activeDesign = userDesigns.find(d => d.themeId === currentTheme.id && !d.submitted);

        if (activeDesign) {
          return activeDesign;
        }

        // Create new design
        return designManager.createDesign(currentUser.id, currentTheme.id, currentUser.username);
      } catch (err) {
        console.error('Failed to load/create design:', err);
        setError('Failed to load design');
        return null;
      }
    }, { depends: [currentUser, currentTheme] });

    // Navigation handlers
    const handleNavigate = (route: string) => {
      setCurrentRoute(route);
      setError(null);
    };

    const handleDesignUpdate = async (updatedDesign: Design) => {
      try {
        await storage.saveDesign(updatedDesign);
      } catch (err) {
        console.error('Failed to save design:', err);
        setError('Failed to save design');
      }
    };

    const handleSubmit = async () => {
      if (!currentDesign || !currentUser) return;

      try {
        setIsLoading(true);
        await submissionHandler.submitDesign(currentDesign);
        setCurrentRoute('/gallery');
      } catch (err) {
        console.error('Failed to submit design:', err);
        setError('Failed to submit design');
      } finally {
        setIsLoading(false);
      }
    };

    const handleVote = async (designId: string, voteType: VoteType) => {
      if (!currentUser) return;

      try {
        const existingVote = await votingService.getUserVote(currentUser.id, designId);

        if (existingVote) {
          if (existingVote.voteType === voteType) {
            await votingService.removeVote(currentUser.id, designId);
          } else {
            await votingService.changeVote(currentUser.id, designId, voteType);
          }
        } else {
          await votingService.castVote(currentUser.id, designId, voteType);
        }
      } catch (err) {
        console.error('Failed to vote:', err);
        setError('Failed to vote');
      }
    };

    // Loading state
    if (themeLoading || designLoading || !currentTheme) {
      return (
        <vstack width="100%" height="100%" alignment="center middle" gap="medium">
          <text size="xlarge">🎨</text>
          <text size="large" weight="bold">Loading Room Design Game...</text>
        </vstack>
      );
    }

    // Error boundary
    if (error) {
      return (
        <vstack width="100%" height="100%" alignment="center middle" gap="medium" padding="large">
          <text size="xlarge">⚠️</text>
          <text size="large" weight="bold" color="#EF4444">Error</text>
          <text size="medium" color="#6B7280" alignment="center">{error}</text>
          <button appearance="primary" onPress={() => setError(null)}>
            Try Again
          </button>
        </vstack>
      );
    }

    // Render current route
    const renderRoute = () => {
      switch (currentRoute) {
        case '/design':
          if (!currentDesign) {
            return (
              <vstack width="100%" height="100%" alignment="center middle" gap="medium">
                <text size="large">Please log in to create a design</text>
              </vstack>
            );
          }

          return (
            <vstack width="100%" height="100%" gap="none">
              <ThemeDisplay theme={currentTheme} />
              <ResponsiveLayout
                design={currentDesign}
                mode={mode}
                context={context}
                assets={assets}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onDesignUpdate={handleDesignUpdate}
                onAssetSelect={(asset) => {
                  if (currentDesign) {
                    designManager.placeAsset(currentDesign.id, asset.id, 200, 200);
                    handleDesignUpdate(currentDesign);
                  }
                }}
                onCategoryFilter={setSelectedCategory}
                onSearch={setSearchQuery}
                onSubmit={handleSubmit}
                isSubmitted={currentDesign.submitted}
              />
            </vstack>
          );

        case '/gallery':
          return (
            <GalleryView
              currentUser={currentUser}
              currentTheme={currentTheme}
              submissionHandler={submissionHandler}
              votingService={votingService}
              onVote={handleVote}
            />
          );

        case '/leaderboard':
          return (
            <LeaderboardView
              currentUser={currentUser}
              currentTheme={currentTheme}
              leaderboardHandler={leaderboardHandler}
              themeManager={themeManager}
            />
          );

        case '/my-designs':
          return (
            <MyDesignsView
              currentUser={currentUser}
              submissionHandler={submissionHandler}
            />
          );

        default:
          return (
            <vstack width="100%" height="100%" alignment="center middle">
              <text size="large">Page not found</text>
            </vstack>
          );
      }
    };

    return (
      <zstack width="100%" height="100%">
        {/* Main content with header */}
        <vstack width="100%" height="100%" backgroundColor="#f1e1d6" gap="none">
          {/* Header with hamburger menu and Preview/Edit toggle */}
          <Header
            username={currentUser?.username || 'Guest'}
            mode={mode}
            onModeChange={setMode}
            onMenuToggle={() => setIsMenuOpen(!isMenuOpen)}
          />

          {/* Main content area */}
          <vstack grow width="100%">
            {renderRoute()}
          </vstack>
        </vstack>

        {/* Overlay navigation menu (shown when hamburger clicked) */}
        {isMenuOpen && (
          <vstack width="100%" height="100%" onPress={() => setIsMenuOpen(false)}>
            {/* Spacer for header height */}
            <spacer size="small" />
            <hstack width="100%" padding="xsmall">
              {/* Menu dropdown - dark themed, smaller */}
              <vstack
                width="180px"
                backgroundColor="#1E1E23"
                cornerRadius="medium"
                padding="xsmall"
              >
                <NavigationMenu
                  currentRoute={currentRoute}
                  onNavigate={(route) => {
                    handleNavigate(route);
                    setIsMenuOpen(false);
                  }}
                  onClose={() => setIsMenuOpen(false)}
                />
              </vstack>
              <spacer grow />
            </hstack>
            <spacer grow />
          </vstack>
        )}
      </zstack>
    );
  },
});

// Gallery View Component
function GalleryView(props: {
  currentUser: any;
  currentTheme: Theme;
  submissionHandler: SubmissionHandler;
  votingService: VotingService;
  onVote: (designId: string, voteType: VoteType) => void;
}): JSX.Element {
  const { currentUser, currentTheme, submissionHandler, votingService, onVote } = props;
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const pageSize = 10;

  const { data: designs, loading } = useAsync(async () => {
    try {
      const offset = (currentPage - 1) * pageSize;
      return await submissionHandler.getSubmittedDesigns(currentTheme.id, pageSize, offset);
    } catch (err) {
      console.error('Failed to load designs:', err);
      return [];
    }
  }, { depends: [currentPage, refreshKey] });

  const { data: userVotes } = useAsync(async () => {
    if (!currentUser || !designs) return new Map();

    const votes = new Map<string, VoteType>();
    for (const design of designs) {
      const vote = await votingService.getUserVote(currentUser.id, design.id);
      if (vote) {
        votes.set(design.id, vote.voteType);
      }
    }
    return votes;
  }, { depends: [designs, currentUser] });

  if (loading) {
    return (
      <vstack width="100%" height="100%" alignment="center middle">
        <text size="large">Loading designs...</text>
      </vstack>
    );
  }

  return (
    <DesignGallery
      designs={designs || []}
      currentUserId={currentUser?.id || ''}
      currentThemeId={currentTheme.id}
      currentPage={currentPage}
      totalPages={Math.ceil((designs?.length || 0) / pageSize)}
      userVotes={userVotes || new Map()}
      isAuthenticated={!!currentUser}
      onVote={onVote}
      onPageChange={setCurrentPage}
      onRefresh={() => setRefreshKey(k => k + 1)}
    />
  );
}

// Leaderboard View Component
function LeaderboardView(props: {
  currentUser: any;
  currentTheme: Theme;
  leaderboardHandler: LeaderboardHandler;
  themeManager: ThemeManager;
}): JSX.Element {
  const { currentUser, currentTheme, leaderboardHandler, themeManager } = props;
  const [selectedThemeId, setSelectedThemeId] = useState(currentTheme.id);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: entries, loading } = useAsync(async () => {
    try {
      return await leaderboardHandler.getLeaderboardByTheme(selectedThemeId);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      return [];
    }
  }, { depends: [selectedThemeId, refreshKey] });

  if (loading) {
    return (
      <vstack width="100%" height="100%" alignment="center middle">
        <text size="large">Loading leaderboard...</text>
      </vstack>
    );
  }

  return (
    <Leaderboard
      entries={entries || []}
      currentUserId={currentUser?.id || ''}
      currentTheme={currentTheme}
      availableThemes={[currentTheme]}
      selectedThemeId={selectedThemeId}
      onThemeChange={setSelectedThemeId}
      onRefresh={() => setRefreshKey(k => k + 1)}
    />
  );
}

// My Designs View Component
function MyDesignsView(props: {
  currentUser: any;
  submissionHandler: SubmissionHandler;
}): JSX.Element {
  const { currentUser, submissionHandler } = props;
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: designs, loading } = useAsync(async () => {
    if (!currentUser) return [];

    try {
      return await submissionHandler.getUserDesigns(currentUser.id);
    } catch (err) {
      console.error('Failed to load user designs:', err);
      return [];
    }
  }, { depends: [currentUser, refreshKey] });

  if (loading) {
    return (
      <vstack width="100%" height="100%" alignment="center middle">
        <text size="large">Loading your designs...</text>
      </vstack>
    );
  }

  if (!currentUser) {
    return (
      <vstack width="100%" height="100%" alignment="center middle" gap="medium">
        <text size="large">Please log in to view your designs</text>
      </vstack>
    );
  }

  return (
    <MyDesigns
      designs={designs || []}
      currentUserId={currentUser.id}
      onRefresh={() => setRefreshKey(k => k + 1)}
    />
  );
}

export default Devvit;
