# Reddit Room Design Game

A Reddit-based room design game built on Devvit where players design themed rooms using an isometric view and asset library.

## Project Structure

```
reddit-room-design-game/
├── assets/                 # Asset images (furniture, decorations, room base)
│   ├── room_1.png         # Base room image
│   ├── bookshelf_*.png    # Bookshelf assets
│   ├── chair_*.png        # Chair assets
│   ├── rug_*.png          # Rug assets
│   └── ...                # Other decoration assets
├── src/
│   ├── components/        # Devvit UI components
│   ├── managers/          # Business logic managers
│   ├── types/             # TypeScript type definitions
│   ├── storage/           # Storage service implementations
│   ├── tests/             # Test files
│   ├── utils/             # Utility functions
│   └── main.tsx           # Main Devvit app entry point
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
├── vitest.config.ts       # Vitest test configuration
└── devvit.yaml            # Devvit app configuration
```

## Setup

### Prerequisites
- Node.js 20+
- npm
- Devvit CLI (`npm install -g devvit`)

### Installation

```bash
# Install dependencies
npm install

# Login to Devvit (if not already logged in)
devvit login
```

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type check
npm run type-check

# Start development server (playtest on r/blocket_test)
npm run dev

# Build and upload to Reddit
npm run build
```

## Testing

This project uses:
- **Vitest** for unit testing
- **fast-check** for property-based testing

Tests are located in `src/tests/` and co-located with source files using `.test.ts` suffix.

## Tech Stack

- **Devvit** - Reddit's developer platform
- **TypeScript** - Type-safe JavaScript
- **Vitest** - Fast unit test framework
- **fast-check** - Property-based testing library

## Subreddit

Development and testing: **r/blocket_test**

