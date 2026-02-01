# Design Document: Reddit Room Design Game

## Overview

The Reddit Room Design Game is a Devvit-based application that allows Reddit users to create and share isometric room designs based on daily themes. The application provides an interactive canvas where players can customize room backgrounds and place furniture assets, with separate optimized interfaces for desktop and mobile platforms.

The system architecture follows a component-based approach with clear separation between the UI layer (React-based Devvit blocks), business logic layer (design state management, asset handling), and data persistence layer (Devvit Redis storage). The application integrates with Reddit's authentication and voting systems to provide a seamless community experience.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Devvit Application                       │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (Devvit Blocks)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Canvas     │  │    Asset     │  │  Navigation  │     │
│  │  Component   │  │   Library    │  │     Menu     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Design     │  │    Asset     │  │    Theme     │     │
│  │   Manager    │  │   Manager    │  │   Manager    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │  Submission  │  │  Leaderboard │                        │
│  │   Handler    │  │   Handler    │                        │
│  └──────────────┘  └──────────────┘                        │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (Devvit Redis)                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Designs    │  │    Votes     │  │    Themes    │     │
│  │   Storage    │  │   Storage    │  │   Storage    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  Reddit Integration Layer                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │    OAuth     │  │   Voting     │  │    Posts     │     │
│  │     Auth     │  │     API      │  │     API      │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

**UI Layer:**
- Canvas Component: Renders the isometric room view, handles asset placement visualization
- Asset Library: Displays available assets with search/filter capabilities
- Navigation Menu: Provides access to different views (gallery, leaderboard, my designs)

**Business Logic Layer:**
- Design Manager: Manages design state, asset positions, rotations, and background colors
- Asset Manager: Handles asset loading, categorization, and manipulation logic
- Theme Manager: Manages theme rotation, countdown timers, and theme-based filtering
- Submission Handler: Processes design submissions and retrieval
- Leaderboard Handler: Calculates rankings and manages vote aggregation

**Data Layer:**
- Designs Storage: Persists design configurations (assets, positions, colors)
- Votes Storage: Tracks votes per design
- Themes Storage: Stores theme schedule and metadata

**Reddit Integration:**
- OAuth Auth: Handles Reddit user authentication
- Voting API: Integrates with Reddit's voting system
- Posts API: Creates posts for submitted designs

## Components and Interfaces

### Design Manager

The Design Manager is the core component responsible for managing the state of a player's room design.

**State Structure:**
```typescript
interface Design {
  id: string;
  userId: string;
  username: string;
  themeId: string;
  backgroundColor: string;
  assets: PlacedAsset[];
  createdAt: number;
  updatedAt: number;
  submitted: boolean;
  voteCount: number;
}

interface PlacedAsset {
  assetId: string;
  x: number;
  y: number;
  rotation: number; // 0, 90, 180, 270
  zIndex: number;
}
```

**Key Operations:**
- `createDesign(userId: string, themeId: string): Design` - Initialize a new design
- `updateBackgroundColor(designId: string, color: string): void` - Update background color
- `placeAsset(designId: string, assetId: string, x: number, y: number): void` - Add asset to canvas
- `moveAsset(designId: string, assetIndex: number, x: number, y: number): void` - Update asset position
- `rotateAsset(designId: string, assetIndex: number): void` - Rotate asset by 90 degrees
- `removeAsset(designId: string, assetIndex: number): void` - Remove asset from canvas
- `adjustZIndex(designId: string, assetIndex: number, direction: 'up' | 'down'): void` - Change layering
- `saveDesign(design: Design): Promise<void>` - Persist design to storage
- `loadDesign(designId: string): Promise<Design>` - Retrieve design from storage

### Asset Manager

Manages the asset library and provides asset metadata.

**Asset Structure:**
```typescript
interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
}

enum AssetCategory {
  BOOKSHELF = 'bookshelf',
  CHAIR = 'chair',
  DECORATION = 'decoration',
  RUG = 'rug'
}
```

**Key Operations:**
- `loadAssets(): Promise<Asset[]>` - Load all assets from the assets folder
- `getAssetById(id: string): Asset | null` - Retrieve specific asset
- `getAssetsByCategory(category: AssetCategory): Asset[]` - Filter by category
- `searchAssets(query: string): Asset[]` - Search assets by name
- `sortAssets(assets: Asset[], sortBy: 'name' | 'category'): Asset[]` - Sort asset list

### Theme Manager

Handles theme rotation and scheduling.

**Theme Structure:**
```typescript
interface Theme {
  id: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  active: boolean;
}
```

**Key Operations:**
- `getCurrentTheme(): Promise<Theme>` - Get active theme
- `getThemeById(id: string): Promise<Theme>` - Retrieve specific theme
- `scheduleNextTheme(theme: Theme): Promise<void>` - Schedule theme rotation
- `getTimeRemaining(theme: Theme): number` - Calculate countdown
- `notifyThemeChange(theme: Theme): Promise<void>` - Send Reddit notifications
- `initializeDefaultTheme(): Promise<Theme>` - Set up "School" theme for testing

### Submission Handler

Manages design submissions and retrieval.

**Key Operations:**
- `submitDesign(design: Design): Promise<string>` - Submit design and create Reddit post
- `getSubmittedDesigns(themeId: string, limit: number, offset: number): Promise<Design[]>` - Paginated retrieval
- `getUserDesigns(userId: string): Promise<Design[]>` - Get user's submissions
- `hasUserSubmitted(userId: string, themeId: string): Promise<boolean>` - Check for duplicate
- `getDesignById(designId: string): Promise<Design>` - Retrieve specific design

### Leaderboard Handler

Calculates and displays rankings.

**Key Operations:**
- `getTopDesigns(themeId: string, limit: number): Promise<Design[]>` - Get ranked designs
- `updateVoteCount(designId: string, delta: number): Promise<void>` - Update votes
- `getUserRank(userId: string, themeId: string): Promise<number>` - Get user's position
- `getLeaderboardByTheme(themeId: string): Promise<LeaderboardEntry[]>` - Full leaderboard

**Leaderboard Entry:**
```typescript
interface LeaderboardEntry {
  rank: number;
  design: Design;
  username: string;
  voteCount: number;
}
```

### Canvas Component

Renders the room view and handles user interactions.

**Props:**
```typescript
interface CanvasProps {
  design: Design;
  mode: 'edit' | 'preview';
  onAssetClick?: (assetIndex: number) => void;
  onAssetDrag?: (assetIndex: number, x: number, y: number) => void;
  onBackgroundClick?: (x: number, y: number) => void;
}
```

**Rendering Logic:**
- Display room_1.png as base layer
- Apply background color behind the room image
- Render placed assets in z-index order
- In edit mode: show selection indicators and drag handles
- In preview mode: show clean final design

### Asset Library Component

Displays the asset selection panel.

**Props:**
```typescript
interface AssetLibraryProps {
  assets: Asset[];
  selectedCategory?: AssetCategory;
  searchQuery?: string;
  onAssetSelect: (asset: Asset) => void;
  onCategoryFilter: (category: AssetCategory | null) => void;
  onSearch: (query: string) => void;
}
```

**Features:**
- Grid layout of asset thumbnails
- Category filter buttons
- Search bar
- Scroll container for large asset lists

### Navigation Menu Component

Provides navigation between different views.

**Menu Structure:**
```typescript
interface MenuItem {
  id: string;
  label: string;
  icon: string;
  route: string;
}

const menuItems: MenuItem[] = [
  { id: 'current', label: 'Current Design', icon: 'edit', route: '/design' },
  { id: 'gallery', label: 'View Other Rooms', icon: 'gallery', route: '/gallery' },
  { id: 'leaderboard', label: 'Leaderboard', icon: 'trophy', route: '/leaderboard' },
  { id: 'mydesigns', label: 'My Designs', icon: 'user', route: '/my-designs' }
];
```

## Data Models

### Storage Schema

**Redis Keys:**
- `design:{designId}` - Individual design data
- `user:{userId}:designs` - List of design IDs for a user
- `theme:{themeId}` - Theme metadata
- `theme:current` - Current active theme ID
- `leaderboard:{themeId}` - Sorted set of design IDs by vote count
- `votes:{designId}:{userId}` - User's vote on a design
- `submission:{userId}:{themeId}` - Tracks if user submitted for theme

**Design Storage Format:**
```json
{
  "id": "design_abc123",
  "userId": "reddit_user_123",
  "username": "cooldesigner",
  "themeId": "theme_school_001",
  "backgroundColor": "#E8F4F8",
  "assets": [
    {
      "assetId": "desk_01",
      "x": 150,
      "y": 200,
      "rotation": 0,
      "zIndex": 1
    },
    {
      "assetId": "chair_02",
      "x": 180,
      "y": 220,
      "rotation": 90,
      "zIndex": 2
    }
  ],
  "createdAt": 1704067200000,
  "updatedAt": 1704070800000,
  "submitted": true,
  "voteCount": 42
}
```

**Theme Storage Format:**
```json
{
  "id": "theme_school_001",
  "name": "School",
  "description": "Design a classroom or study space",
  "startTime": 1704067200000,
  "endTime": 1704153600000,
  "active": true
}
```

### Asset Metadata

Assets are loaded from the assets folder with the following naming convention:
- `bookshelf_1.png`, `bookshelf_2.png`, `bookshelf_3.png`
- `chair_1.png`, `chair_2.png`, `chair_3.png`, `chair_4.png`, `chair_5.png`
- `clock.png`, `cup.png`, `desk.png`, `lamp.png`, `laptop.png`, `mouse.png`
- `rug_1.png`, `rug_2.png`, `rug_3.png`
- `trash.png`

Asset metadata is generated at build time by scanning the assets folder and extracting dimensions from image files.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property 1: Background Color Application

*For any* valid color value, when a player selects that color, the design's backgroundColor field should be updated to match the selected color.

**Validates: Requirements 1.2**

### Property 2: Asset Categorization

*For any* asset loaded from the assets folder, it should be assigned to exactly one valid category (bookshelf, chair, decoration, or rug) based on its filename.

**Validates: Requirements 2.3**

### Property 3: Asset List Modification Invariant

*For any* design with N assets, placing a new asset should result in N+1 assets, and removing an asset should result in N-1 assets, maintaining list integrity.

**Validates: Requirements 3.3, 3.6**

### Property 4: Asset Position Updates

*For any* placed asset and any valid canvas position (x, y), moving the asset should update its coordinates to exactly (x, y).

**Validates: Requirements 3.4**

### Property 5: Asset Rotation Cycles

*For any* placed asset, rotating it 4 times consecutively should return it to its original rotation value (0° → 90° → 180° → 270° → 0°).

**Validates: Requirements 3.5, 12.2**

### Property 6: Design State Persistence Round-Trip

*For any* design with placed assets, background color, and configurations, saving then loading the design should produce an equivalent design with all properties preserved.

**Validates: Requirements 3.7, 13.3**

### Property 7: Mode Switching Preserves Design State

*For any* design, switching from preview mode to edit mode and back to preview mode should preserve all placed assets, their positions, rotations, z-indices, and the background color.

**Validates: Requirements 4.3**

### Property 8: Design Submission Association

*For any* submitted design, it should be stored with the current theme ID and the submitting user's Reddit username.

**Validates: Requirements 5.1, 5.3**

### Property 9: Submitted Designs Are Retrievable

*For any* design that has been submitted, querying for designs by theme should include that design in the results.

**Validates: Requirements 5.4**

### Property 10: Design Display Contains Required Fields

*For any* submitted design, when rendered for viewing, the output should contain the creator's username and submission timestamp.

**Validates: Requirements 5.5**

### Property 11: Duplicate Submission Prevention

*For any* user and theme, if the user has already submitted a design for that theme, attempting to submit another design for the same theme should be rejected.

**Validates: Requirements 5.7**

### Property 12: Leaderboard Ranking Order

*For any* set of designs for a given theme, the leaderboard should return them sorted in descending order by vote count (highest votes first).

**Validates: Requirements 6.1**

### Property 13: Leaderboard Entry Completeness

*For any* leaderboard entry, it should contain the design creator's username, vote count, and rank position.

**Validates: Requirements 6.3**

### Property 14: Theme-Based Filtering

*For any* theme filter applied to the leaderboard or gallery, all returned designs should have a themeId matching the filter, and no designs from other themes should be included.

**Validates: Requirements 6.5**

### Property 15: User Design Isolation

*For any* user viewing "My Designs", the results should contain only designs created by that user, and should include all of that user's designs.

**Validates: Requirements 7.4**

### Property 16: Theme Countdown Accuracy

*For any* theme with defined start and end times, the countdown timer should accurately calculate the remaining time as (endTime - currentTime).

**Validates: Requirements 8.3**

### Property 17: Theme Change Preserves Historical Designs

*For any* theme transition, all designs submitted under the previous theme should remain accessible and queryable by their theme ID.

**Validates: Requirements 8.6**

### Property 18: Canvas Boundary Enforcement

*For any* asset placement or movement operation, if the target position is outside the canvas boundaries, the operation should either be rejected or the position should be clamped to the nearest valid boundary point.

**Validates: Requirements 12.1, 12.6**

### Property 19: Z-Index Layering

*For any* two assets A and B on the canvas, if asset A has a higher z-index than asset B, then A should be rendered on top of B in the visual output.

**Validates: Requirements 12.4**

### Property 20: Z-Index Adjustment

*For any* asset, adjusting its z-index up should increase its z-index value, and adjusting down should decrease it, changing its layering relative to other assets.

**Validates: Requirements 12.5**

### Property 21: Submitted Design Persistence

*For any* design that has been submitted, it should be permanently stored and retrievable at any future time by its design ID.

**Validates: Requirements 13.4**

### Property 22: Vote Count Updates

*For any* design, when a user casts a vote (upvote or downvote), the design's vote count should be updated by +1 or -1 accordingly.

**Validates: Requirements 14.2**

### Property 23: Self-Vote Prevention

*For any* user attempting to vote on their own design, the vote operation should be rejected and the vote count should remain unchanged.

**Validates: Requirements 14.3**

### Property 24: Vote Change Handling

*For any* user who has already voted on a design, changing their vote from upvote to downvote (or vice versa) should update the vote count by ±2 to reflect the change.

**Validates: Requirements 14.4**

### Property 25: Asset Search Filtering

*For any* search query string, the filtered asset results should only include assets whose names contain the query string (case-insensitive), and all matching assets should be included.

**Validates: Requirements 16.1**

### Property 26: Asset Sorting Correctness

*For any* sort criterion (category, name, or recently used), the returned asset list should be correctly ordered according to that criterion.

**Validates: Requirements 16.2**

### Property 27: Category Filter Accuracy

*For any* category filter applied to the asset library, all returned assets should belong to that category, and all assets from that category should be included.

**Validates: Requirements 16.3**

## Error Handling

### Asset Loading Errors

**Scenario:** Asset files are missing or corrupted
- **Detection:** Check file existence and image validity during asset loading
- **Response:** Log error, skip invalid assets, display warning to user
- **Recovery:** Continue with available assets, provide fallback placeholder images

### Storage Errors

**Scenario:** Redis storage operations fail
- **Detection:** Catch exceptions from Devvit storage API calls
- **Response:** Display error message to user, log error details
- **Recovery:** Retry operation with exponential backoff, maintain in-memory state

### Authentication Errors

**Scenario:** Reddit OAuth fails or user is not authenticated
- **Detection:** Check authentication status before protected operations
- **Response:** Redirect to Reddit login flow
- **Recovery:** Retry operation after successful authentication

### Submission Errors

**Scenario:** Design submission fails due to network or storage issues
- **Detection:** Monitor submission API response
- **Response:** Display error message, preserve design in local state
- **Recovery:** Provide "Retry Submission" button, auto-retry with backoff

### Vote Conflicts

**Scenario:** Concurrent votes on the same design cause conflicts
- **Detection:** Use atomic increment/decrement operations in Redis
- **Response:** Ensure vote count consistency through atomic operations
- **Recovery:** No recovery needed - atomic operations prevent conflicts

### Theme Transition Errors

**Scenario:** Theme rotation fails or timing is incorrect
- **Detection:** Validate theme data before activation
- **Response:** Log error, maintain current theme until issue resolved
- **Recovery:** Manual theme activation by admin, automated retry

### Canvas Boundary Violations

**Scenario:** Asset placement outside valid canvas area
- **Detection:** Validate coordinates against canvas dimensions
- **Response:** Clamp coordinates to nearest valid position
- **Recovery:** Automatic - no user intervention needed

### Invalid Asset Operations

**Scenario:** Operations on non-existent assets (e.g., rotate deleted asset)
- **Detection:** Validate asset index before operations
- **Response:** Ignore operation, log warning
- **Recovery:** Automatic - maintain valid design state

## Testing Strategy

### Dual Testing Approach

The testing strategy employs both unit tests and property-based tests to ensure comprehensive coverage:

**Unit Tests:**
- Specific examples demonstrating correct behavior
- Edge cases (empty designs, boundary conditions, single asset)
- Error conditions (invalid inputs, missing data)
- Integration points between components
- UI component rendering with specific props

**Property-Based Tests:**
- Universal properties that hold for all inputs
- Comprehensive input coverage through randomization
- Invariants that must be maintained across operations
- Round-trip properties for serialization/deserialization
- Relationship properties between components

### Property-Based Testing Configuration

**Library:** fast-check (for TypeScript/JavaScript in Devvit)

**Configuration:**
- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Tag format: `// Feature: reddit-room-design-game, Property N: [property text]`

**Example Property Test Structure:**
```typescript
import fc from 'fast-check';

// Feature: reddit-room-design-game, Property 5: Asset Rotation Cycles
test('rotating asset 4 times returns to original rotation', () => {
  fc.assert(
    fc.property(
      fc.record({
        assetId: fc.string(),
        x: fc.integer({ min: 0, max: 800 }),
        y: fc.integer({ min: 0, max: 600 }),
        rotation: fc.constantFrom(0, 90, 180, 270),
        zIndex: fc.integer({ min: 0, max: 100 })
      }),
      (asset) => {
        let currentRotation = asset.rotation;
        for (let i = 0; i < 4; i++) {
          currentRotation = rotateAsset(currentRotation);
        }
        return currentRotation === asset.rotation;
      }
    ),
    { numRuns: 100 }
  );
});
```

### Test Coverage Requirements

**Component Tests:**
- Design Manager: All CRUD operations, state management
- Asset Manager: Loading, categorization, search, filtering
- Theme Manager: Theme rotation, countdown calculations
- Submission Handler: Submit, retrieve, duplicate prevention
- Leaderboard Handler: Ranking, filtering, vote aggregation

**Integration Tests:**
- End-to-end design creation and submission flow
- Asset placement and manipulation workflow
- Voting and leaderboard update flow
- Theme transition and design archival

**Property Tests (Minimum):**
- All 27 correctness properties defined above
- Each property implemented as a separate test
- Each test runs minimum 100 iterations
- Tests use appropriate generators for random inputs

### Test Data Generators

**For Property-Based Tests:**
```typescript
// Asset generator
const assetGen = fc.record({
  assetId: fc.constantFrom('desk', 'chair_1', 'bookshelf_2', 'lamp'),
  x: fc.integer({ min: 0, max: 800 }),
  y: fc.integer({ min: 0, max: 600 }),
  rotation: fc.constantFrom(0, 90, 180, 270),
  zIndex: fc.integer({ min: 0, max: 100 })
});

// Design generator
const designGen = fc.record({
  id: fc.uuid(),
  userId: fc.string({ minLength: 5 }),
  username: fc.string({ minLength: 3 }),
  themeId: fc.uuid(),
  backgroundColor: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
  assets: fc.array(assetGen, { maxLength: 20 }),
  createdAt: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  submitted: fc.boolean(),
  voteCount: fc.integer({ min: 0, max: 1000 })
});

// Color generator
const colorGen = fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`);

// Theme generator
const themeGen = fc.record({
  id: fc.uuid(),
  name: fc.constantFrom('School', 'Office', 'Bedroom', 'Kitchen'),
  description: fc.string(),
  startTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  endTime: fc.integer({ min: 1704067200000, max: 1735689600000 }),
  active: fc.boolean()
});
```

### Testing Best Practices

1. **Property tests catch general bugs** - Use them to verify universal correctness
2. **Unit tests catch specific bugs** - Use them for concrete examples and edge cases
3. **Test early and often** - Run tests after each component implementation
4. **Maintain test independence** - Each test should be runnable in isolation
5. **Use meaningful test names** - Clearly describe what property or behavior is tested
6. **Keep tests fast** - Property tests should complete in seconds, not minutes
7. **Mock external dependencies** - Mock Reddit API calls and Devvit storage for unit tests
8. **Test error paths** - Ensure error handling works correctly
9. **Validate test data** - Ensure generators produce valid inputs
10. **Review failing tests** - When property tests fail, investigate the counterexample

### Continuous Integration

- Run all tests on every commit
- Fail builds if any test fails
- Track test coverage metrics
- Run property tests with increased iterations (1000+) in CI
- Generate test reports for review
