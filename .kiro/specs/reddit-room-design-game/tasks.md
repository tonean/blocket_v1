# Implementation Plan: Reddit Room Design Game

## Overview

This implementation plan breaks down the Reddit Room Design Game into discrete coding tasks. The approach follows a bottom-up strategy: building core data models and business logic first, then UI components, and finally integration. Each task builds incrementally on previous work, with property-based tests placed close to implementation to catch errors early.

## Tasks

- [x] 1. Set up Devvit project structure and dependencies
  - Initialize Devvit app with TypeScript configuration
  - Install fast-check for property-based testing
  - Set up testing framework (Jest or Vitest)
  - Create directory structure: `/src/components`, `/src/managers`, `/src/types`, `/src/storage`, `/src/tests`
  - Configure asset loading from `/assets` folder
  - _Requirements: All requirements depend on proper project setup_

- [ ] 2. Implement core data models and type definitions
  - [ ] 2.1 Create TypeScript interfaces for Design, PlacedAsset, Asset, Theme, LeaderboardEntry
    - Define all interfaces in `/src/types/models.ts`
    - Include validation helper functions for each type
    - _Requirements: 1.2, 3.3, 3.4, 3.5, 5.1, 8.3_
  
  - [ ] 2.2 Write property test for asset rotation cycles
    - **Property 5: Asset Rotation Cycles**
    - **Validates: Requirements 3.5, 12.2**
  
  - [ ] 2.3 Write unit tests for type validation functions
    - Test edge cases for coordinate bounds
    - Test rotation value validation
    - _Requirements: 12.1, 12.6_

- [ ] 3. Implement Asset Manager
  - [ ] 3.1 Create AssetManager class with asset loading from assets folder
    - Implement `loadAssets()` to scan and load all asset images
    - Parse filenames to determine categories (bookshelf, chair, decoration, rug)
    - Generate asset metadata (id, name, category, dimensions)
    - _Requirements: 2.1, 2.3_
  
  - [ ] 3.2 Write property test for asset categorization
    - **Property 2: Asset Categorization**
    - **Validates: Requirements 2.3**
  
  - [ ] 3.3 Implement asset search and filtering methods
    - Implement `searchAssets(query: string)` with case-insensitive matching
    - Implement `getAssetsByCategory(category: AssetCategory)`
    - Implement `sortAssets(assets, sortBy)` for name and category sorting
    - _Requirements: 16.1, 16.2, 16.3_
  
  - [ ] 3.4 Write property tests for asset search and filtering
    - **Property 25: Asset Search Filtering**
    - **Property 27: Category Filter Accuracy**
    - **Validates: Requirements 16.1, 16.3**
  
  - [ ] 3.5 Write property test for asset sorting
    - **Property 26: Asset Sorting Correctness**
    - **Validates: Requirements 16.2**

- [ ] 4. Implement Design Manager
  - [ ] 4.1 Create DesignManager class with CRUD operations
    - Implement `createDesign(userId, themeId)` to initialize new design
    - Implement `updateBackgroundColor(designId, color)` 
    - Implement `placeAsset(designId, assetId, x, y)` with boundary validation
    - Implement `moveAsset(designId, assetIndex, x, y)` with boundary enforcement
    - Implement `rotateAsset(designId, assetIndex)` with 90-degree increments
    - Implement `removeAsset(designId, assetIndex)`
    - Implement `adjustZIndex(designId, assetIndex, direction)`
    - _Requirements: 1.2, 3.3, 3.4, 3.5, 3.6, 12.1, 12.2, 12.4, 12.5_
  
  - [ ] 4.2 Write property test for background color application
    - **Property 1: Background Color Application**
    - **Validates: Requirements 1.2**
  
  - [ ] 4.3 Write property test for asset list modification invariant
    - **Property 3: Asset List Modification Invariant**
    - **Validates: Requirements 3.3, 3.6**
  
  - [ ] 4.4 Write property test for asset position updates
    - **Property 4: Asset Position Updates**
    - **Validates: Requirements 3.4**
  
  - [ ] 4.5 Write property test for canvas boundary enforcement
    - **Property 18: Canvas Boundary Enforcement**
    - **Validates: Requirements 12.1, 12.6**
  
  - [ ] 4.6 Write property tests for z-index management
    - **Property 19: Z-Index Layering**
    - **Property 20: Z-Index Adjustment**
    - **Validates: Requirements 12.4, 12.5**

- [ ] 5. Checkpoint - Ensure core logic tests pass
  - Run all tests for Asset Manager and Design Manager
  - Verify property tests run with 100+ iterations
  - Ask the user if questions arise

- [ ] 6. Implement storage layer with Devvit Redis
  - [ ] 6.1 Create StorageService class wrapping Devvit Redis operations
    - Implement `saveDesign(design: Design)` with Redis key `design:{designId}`
    - Implement `loadDesign(designId: string)` 
    - Implement `getUserDesigns(userId: string)` using key `user:{userId}:designs`
    - Implement `saveTheme(theme: Theme)` with key `theme:{themeId}`
    - Implement `getCurrentTheme()` using key `theme:current`
    - Implement error handling with try-catch and logging
    - _Requirements: 3.7, 13.2, 13.3, 13.4_
  
  - [ ] 6.2 Write property test for design state persistence round-trip
    - **Property 6: Design State Persistence Round-Trip**
    - **Validates: Requirements 3.7, 13.3**
  
  - [ ] 6.3 Write property test for submitted design persistence
    - **Property 21: Submitted Design Persistence**
    - **Validates: Requirements 13.4**
  
  - [ ] 6.4 Write unit tests for storage error handling
    - Test behavior when Redis operations fail
    - Test retry logic with exponential backoff
    - _Requirements: 13.5_

- [ ] 7. Implement Theme Manager
  - [ ] 7.1 Create ThemeManager class with theme rotation logic
    - Implement `getCurrentTheme()` to retrieve active theme
    - Implement `getTimeRemaining(theme)` to calculate countdown
    - Implement `initializeDefaultTheme()` to set up "School" theme
    - Implement `scheduleNextTheme(theme)` for theme rotation
    - Implement `getThemeById(id)` for theme retrieval
    - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_
  
  - [ ] 7.2 Write property test for theme countdown accuracy
    - **Property 16: Theme Countdown Accuracy**
    - **Validates: Requirements 8.3**
  
  - [ ] 7.3 Write property test for theme change preserves historical designs
    - **Property 17: Theme Change Preserves Historical Designs**
    - **Validates: Requirements 8.6**
  
  - [ ] 7.4 Write unit test for default theme initialization
    - Verify "School" theme is created correctly
    - _Requirements: 8.5_

- [ ] 8. Implement Submission Handler
  - [ ] 8.1 Create SubmissionHandler class with submission logic
    - Implement `submitDesign(design)` to save and mark as submitted
    - Implement `hasUserSubmitted(userId, themeId)` to check for duplicates
    - Implement `getSubmittedDesigns(themeId, limit, offset)` for pagination
    - Implement `getUserDesigns(userId)` to retrieve user's submissions
    - Implement `getDesignById(designId)` for single design retrieval
    - Associate designs with Reddit username via Devvit context
    - _Requirements: 5.1, 5.3, 5.4, 5.7, 7.4, 15.2_
  
  - [ ] 8.2 Write property test for design submission association
    - **Property 8: Design Submission Association**
    - **Validates: Requirements 5.1, 5.3**
  
  - [ ] 8.3 Write property test for submitted designs are retrievable
    - **Property 9: Submitted Designs Are Retrievable**
    - **Validates: Requirements 5.4**
  
  - [ ] 8.4 Write property test for duplicate submission prevention
    - **Property 11: Duplicate Submission Prevention**
    - **Validates: Requirements 5.7**
  
  - [ ] 8.5 Write property test for user design isolation
    - **Property 15: User Design Isolation**
    - **Validates: Requirements 7.4**

- [ ] 9. Implement voting system
  - [ ] 9.1 Create VotingService class with vote management
    - Implement `castVote(userId, designId, voteType)` with validation
    - Implement `changeVote(userId, designId, newVoteType)` 
    - Implement `getUserVote(userId, designId)` to check existing votes
    - Implement `preventSelfVote(userId, designId)` validation
    - Update vote counts in Redis using atomic increment/decrement
    - Store votes with key `votes:{designId}:{userId}`
    - _Requirements: 14.2, 14.3, 14.4_
  
  - [ ] 9.2 Write property test for vote count updates
    - **Property 22: Vote Count Updates**
    - **Validates: Requirements 14.2**
  
  - [ ] 9.3 Write property test for self-vote prevention
    - **Property 23: Self-Vote Prevention**
    - **Validates: Requirements 14.3**
  
  - [ ] 9.4 Write property test for vote change handling
    - **Property 24: Vote Change Handling**
    - **Validates: Requirements 14.4**

- [ ] 10. Implement Leaderboard Handler
  - [ ] 10.1 Create LeaderboardHandler class with ranking logic
    - Implement `getTopDesigns(themeId, limit)` sorted by vote count descending
    - Implement `updateVoteCount(designId, delta)` to update leaderboard
    - Implement `getUserRank(userId, themeId)` to find user's position
    - Implement `getLeaderboardByTheme(themeId)` with full entries
    - Use Redis sorted sets with key `leaderboard:{themeId}` for efficient ranking
    - _Requirements: 6.1, 6.3, 6.5_
  
  - [ ] 10.2 Write property test for leaderboard ranking order
    - **Property 12: Leaderboard Ranking Order**
    - **Validates: Requirements 6.1**
  
  - [ ] 10.3 Write property test for leaderboard entry completeness
    - **Property 13: Leaderboard Entry Completeness**
    - **Validates: Requirements 6.3**
  
  - [ ] 10.4 Write property test for theme-based filtering
    - **Property 14: Theme-Based Filtering**
    - **Validates: Requirements 6.5**

- [ ] 11. Checkpoint - Ensure business logic tests pass
  - Run all tests for Theme Manager, Submission Handler, Voting Service, and Leaderboard Handler
  - Verify all property tests pass with 100+ iterations
  - Ask the user if questions arise

- [ ] 12. Implement Canvas Component (Devvit Blocks)
  - [ ] 12.1 Create Canvas component with room rendering
    - Use Devvit's `blocks` API to create canvas layout
    - Render room_1.png as base image with `image` block
    - Apply backgroundColor using `vstack` with background color
    - Render placed assets in z-index order using positioned `image` blocks
    - Implement edit mode layout (room shifted left, asset panel on right)
    - Implement preview mode layout (full-width room display)
    - Add visual selection indicators for selected assets in edit mode
    - _Requirements: 1.1, 1.2, 1.4, 3.1, 3.2, 4.1, 4.2_
  
  - [ ] 12.2 Write property test for mode switching preserves design state
    - **Property 7: Mode Switching Preserves Design State**
    - **Validates: Requirements 4.3**
  
  - [ ] 12.3 Write unit tests for canvas rendering
    - Test that canvas renders with correct background color
    - Test that assets are rendered in correct z-index order
    - _Requirements: 1.2, 12.4_

- [ ] 13. Implement Asset Library Component (Devvit Blocks)
  - [ ] 13.1 Create AssetLibrary component with asset grid
    - Use `vstack` and `hstack` to create grid layout of asset thumbnails
    - Implement category filter buttons using `button` blocks
    - Implement search bar using `textInput` block
    - Display asset thumbnails using `image` blocks
    - Handle asset selection with `onPress` handlers
    - Show "No assets found" message when search returns empty
    - _Requirements: 2.2, 2.4, 16.1, 16.2, 16.3, 16.5_
  
  - [ ] 13.2 Write unit tests for asset library filtering
    - Test that category filters work correctly
    - Test that search filters work correctly
    - Test empty state message display
    - _Requirements: 16.3, 16.5_

- [ ] 14. Implement asset manipulation controls
  - [ ] 14.1 Add drag-and-drop functionality for desktop
    - Implement drag handlers for asset movement on canvas
    - Update asset positions in real-time during drag
    - Implement keyboard shortcut for rotation (R key)
    - Implement keyboard shortcut for deletion (Delete key)
    - _Requirements: 3.4, 3.5, 3.6, 9.2, 9.3_
  
  - [ ] 14.2 Add touch controls for mobile
    - Implement tap-to-place for asset placement
    - Implement drag gesture for asset movement
    - Add on-screen rotation button
    - Add on-screen delete button (trash can icon)
    - _Requirements: 10.2, 10.3, 10.4, 11.3_
  
  - [ ] 14.3 Write integration tests for asset manipulation
    - Test complete flow: place asset → move → rotate → delete
    - Test boundary enforcement during drag
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 12.1_

- [ ] 15. Implement color picker component
  - [ ] 15.1 Create ColorPicker component for background selection
    - Use Devvit's `textInput` or custom color selection UI
    - Display color preview
    - Validate hex color format
    - Update design background color on selection
    - Position below room image as specified
    - _Requirements: 1.2, 1.3_
  
  - [ ] 15.2 Write unit tests for color picker
    - Test valid hex color input
    - Test invalid color input handling
    - _Requirements: 1.2_

- [ ] 16. Implement Navigation Menu Component
  - [ ] 16.1 Create NavigationMenu component with menu items
    - Use `vstack` to create vertical menu layout
    - Add menu items: Current Design, View Other Rooms, Leaderboard, My Designs
    - Implement navigation handlers using Devvit's navigation API
    - Add icons for each menu item
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  
  - [ ] 16.2 Write unit tests for navigation menu
    - Test that all required menu items are present
    - Test navigation handlers
    - _Requirements: 7.2_

- [ ] 17. Implement design submission flow
  - [ ] 17.1 Create submission UI and confirmation
    - Add Submit button in preview mode
    - Implement submission handler that calls SubmissionHandler.submitDesign()
    - Display confirmation message with animation after successful submission
    - Handle submission errors with error messages
    - Prevent duplicate submissions by checking hasUserSubmitted()
    - _Requirements: 5.1, 5.2, 5.7, 11.4_
  
  - [ ] 17.2 Write integration tests for submission flow
    - Test complete submission flow from design to confirmation
    - Test duplicate submission prevention
    - Test error handling
    - _Requirements: 5.1, 5.2, 5.7_

- [ ] 18. Implement gallery view for viewing other designs
  - [ ] 18.1 Create DesignGallery component
    - Fetch submitted designs using SubmissionHandler.getSubmittedDesigns()
    - Display designs in grid layout with thumbnails
    - Show creator username and submission time for each design
    - Implement pagination for large result sets
    - Add voting controls (upvote/downvote buttons) for each design
    - Filter designs by current theme
    - _Requirements: 5.4, 5.5, 5.6, 7.3_
  
  - [ ] 18.2 Write property test for design display contains required fields
    - **Property 10: Design Display Contains Required Fields**
    - **Validates: Requirements 5.5**
  
  - [ ] 18.3 Write integration tests for gallery view
    - Test design loading and display
    - Test pagination
    - Test voting integration
    - _Requirements: 5.4, 5.5, 14.2_

- [ ] 19. Implement leaderboard view
  - [ ] 19.1 Create Leaderboard component
    - Fetch top designs using LeaderboardHandler.getTopDesigns()
    - Display designs with rank, username, vote count, and thumbnail
    - Implement theme filter dropdown
    - Update rankings in real-time as votes change
    - Highlight current user's design if in leaderboard
    - _Requirements: 6.1, 6.2, 6.3, 6.5_
  
  - [ ] 19.2 Write integration tests for leaderboard
    - Test leaderboard display with various vote counts
    - Test theme filtering
    - _Requirements: 6.1, 6.3, 6.5_

- [ ] 20. Implement "My Designs" view
  - [ ] 20.1 Create MyDesigns component
    - Fetch user's designs using SubmissionHandler.getUserDesigns()
    - Display designs in grid with thumbnails
    - Show theme, submission time, and vote count for each
    - Allow clicking to view full design
    - Show empty state if user has no designs
    - _Requirements: 7.4_
  
  - [ ] 20.2 Write integration tests for My Designs view
    - Test design loading for specific user
    - Test empty state display
    - _Requirements: 7.4_

- [ ] 21. Implement theme display and countdown
  - [ ] 21.1 Create ThemeDisplay component
    - Fetch current theme using ThemeManager.getCurrentTheme()
    - Display theme name and description prominently
    - Implement countdown timer using ThemeManager.getTimeRemaining()
    - Update countdown every second
    - Position at top of canvas as specified
    - _Requirements: 1.5, 8.1, 8.3_
  
  - [ ] 21.2 Write unit tests for theme display
    - Test countdown calculation
    - Test theme information display
    - _Requirements: 8.3_

- [ ] 22. Implement Reddit authentication integration
  - [ ] 22.1 Add authentication checks and login flow
    - Use Devvit's context to get authenticated user
    - Check authentication before protected operations (submit, vote)
    - Display login prompt for unauthenticated users
    - Associate designs with Reddit username from context
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  
  - [ ] 22.2 Write unit tests for authentication
    - Test authentication check logic
    - Test unauthenticated user handling
    - _Requirements: 15.4_

- [ ] 23. Implement responsive layout for desktop and mobile
  - [ ] 23.1 Create responsive layout logic
    - Detect device type using Devvit's context or viewport size
    - Apply desktop layout: grid-based, side-by-side panels
    - Apply mobile layout: stacked, touch-optimized
    - Optimize asset library for mobile scrolling
    - Ensure consistent styling across platforms
    - _Requirements: 9.1, 9.2, 9.4, 9.5, 10.1, 10.5, 10.6, 11.6_
  
  - [ ] 23.2 Write integration tests for responsive layout
    - Test desktop layout rendering
    - Test mobile layout rendering
    - _Requirements: 9.1, 10.1_

- [ ] 24. Implement auto-save functionality
  - [ ] 24.1 Add auto-save for design changes
    - Implement debounced auto-save (save after 2 seconds of inactivity)
    - Save design state after each modification (place, move, rotate, delete, color change)
    - Display save status indicator (saving/saved)
    - Handle save errors gracefully
    - _Requirements: 13.1_
  
  - [ ] 24.2 Write integration tests for auto-save
    - Test that changes trigger auto-save
    - Test debouncing behavior
    - _Requirements: 13.1_

- [ ] 25. Implement theme rotation scheduler
  - [ ] 25.1 Create theme rotation background job
    - Use Devvit's scheduler to run daily theme rotation
    - Implement ThemeManager.scheduleNextTheme() to activate next theme
    - Archive designs from previous theme
    - Send Reddit notifications to users about new theme
    - _Requirements: 8.2, 8.4, 8.6_
  
  - [ ] 25.2 Write unit tests for theme rotation
    - Test theme activation logic
    - Test design archival
    - _Requirements: 8.2, 8.6_

- [ ] 26. Final integration and polish
  - [ ] 26.1 Wire all components together in main app
    - Create main Devvit app entry point
    - Set up routing between views (canvas, gallery, leaderboard, my designs)
    - Initialize all managers and services
    - Set up error boundaries for graceful error handling
    - Add loading states for async operations
    - _Requirements: All requirements_
  
  - [ ] 26.2 Add visual polish and transitions
    - Implement smooth transitions between edit and preview modes
    - Add animations for submission confirmation
    - Add visual feedback for all interactive elements
    - Ensure trash can icon is visible and well-positioned
    - Apply modern, clean visual design aesthetic
    - _Requirements: 4.4, 11.1, 11.2, 11.3, 11.4, 11.5_
  
  - [ ] 26.3 Write end-to-end integration tests
    - Test complete user flow: create design → place assets → submit → view in gallery → vote
    - Test theme rotation and design archival
    - Test leaderboard updates after voting
    - _Requirements: Multiple requirements across all features_

- [ ] 27. Final checkpoint - Run full test suite
  - Run all unit tests, property tests, and integration tests
  - Verify all 27 correctness properties pass with 100+ iterations
  - Fix any failing tests
  - Ensure test coverage is comprehensive
  - Ask the user if questions arise

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation
- The implementation follows a bottom-up approach: data models → business logic → UI → integration
