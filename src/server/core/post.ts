import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appDisplayName: 'Room Design Game',
      backgroundUri: 'default-splash.png',
      buttonLabel: 'Start Designing',
      entryUri: 'game.html',
      appIconUri: 'default-icon.png',
    },
    postData: {
      themeId: 'default',
      createdAt: new Date().toISOString(),
    },
    subredditName: subredditName,
    title: 'Room Design Game - Create Your Space!',
  });
};
