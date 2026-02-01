import { Devvit, Context } from '@devvit/public-api';

// Configure Devvit
Devvit.configure({
  redditAPI: true,
  redis: true,
  media: true,
});

// Add a simple post type for testing
Devvit.addCustomPostType({
  name: 'Room Design Game',
  description: 'Create and share room designs',
  height: 'tall',
  render: (context: Context) => {
    return (
      <vstack height="100%" width="100%" alignment="center middle">
        <text size="xlarge">Reddit Room Design Game</text>
        <text size="medium">Coming soon...</text>
      </vstack>
    );
  },
});

export default Devvit;
