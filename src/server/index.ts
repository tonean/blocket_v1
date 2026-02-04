import express from 'express';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post.js';

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

const router = express.Router();

// Initialize game state
router.get('/api/init', async (_req, res): Promise<void> => {
  const { postId } = context;

  if (!postId) {
    res.status(400).json({ status: 'error', message: 'postId is required' });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();

    // Default theme
    const defaultTheme = {
      id: 'default',
      name: 'Cozy Home Office',
      description: 'Create a comfortable and productive workspace',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // Get current theme with safe JSON parsing
    let theme = defaultTheme;
    try {
      const themeData = await redis.get(`theme:current`);
      if (themeData && themeData.startsWith('{')) {
        theme = JSON.parse(themeData);
      }
    } catch (parseError) {
      console.warn('Failed to parse theme data, using default:', parseError);
    }

    res.json({
      type: 'init',
      postId,
      username: username ?? 'anonymous',
      theme
    });
  } catch (error) {
    console.error(`API Init Error:`, error);
    res.status(500).json({ status: 'error', message: 'Failed to initialize' });
  }
});

// Save design
router.post('/api/design/save', async (req, res): Promise<void> => {
  const { postId } = context;
  const { design } = req.body;

  if (!postId || !design) {
    res.status(400).json({ status: 'error', message: 'Missing required fields' });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    const designKey = `design:${username}:${design.themeId}`;
    await redis.set(designKey, JSON.stringify(design));

    res.json({ status: 'success', design });
  } catch (error) {
    console.error('Save design error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to save design' });
  }
});

// Submit design
router.post('/api/design/submit', async (req, res): Promise<void> => {
  const { postId } = context;
  const { designId } = req.body;

  if (!postId || !designId) {
    res.status(400).json({ status: 'error', message: 'Missing required fields' });
    return;
  }

  try {
    const username = await reddit.getCurrentUsername();
    if (!username) {
      res.status(401).json({ status: 'error', message: 'Not authenticated' });
      return;
    }

    // Mark design as submitted
    const designKey = `design:${username}:${designId}`;
    const designData = await redis.get(designKey);

    if (!designData) {
      res.status(404).json({ status: 'error', message: 'Design not found' });
      return;
    }

    const design = JSON.parse(designData);
    design.submitted = true;
    design.submittedAt = new Date().toISOString();

    await redis.set(designKey, JSON.stringify(design));

    // Add to submissions list for this specific post (using JSON array since sAdd is not available)
    const { postId } = context;
    const submissionsKey = `submissions:${postId}:${design.themeId}`;
    const existingSubmissions = await redis.get(submissionsKey);
    let submissionsList: string[] = [];
    try {
      submissionsList = existingSubmissions ? JSON.parse(existingSubmissions) : [];
    } catch {
      submissionsList = [];
    }
    if (!submissionsList.includes(designKey)) {
      submissionsList.push(designKey);
      await redis.set(submissionsKey, JSON.stringify(submissionsList));
    }

    res.json({ status: 'success', design });
  } catch (error) {
    console.error('Submit design error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to submit design' });
  }
});

// Get gallery designs
router.get('/api/gallery', async (req, res): Promise<void> => {
  const { themeId } = req.query;

  if (!themeId) {
    res.status(400).json({ status: 'error', message: 'themeId is required' });
    return;
  }

  try {
    // Get submissions list for this specific post (using JSON array since sMembers is not available)
    const { postId } = context;
    const submissionsData = await redis.get(`submissions:${postId}:${themeId}`);
    let submissionKeys: string[] = [];
    try {
      submissionKeys = submissionsData ? JSON.parse(submissionsData) : [];
    } catch {
      submissionKeys = [];
    }

    const designs = [];

    for (const key of submissionKeys) {
      const designData = await redis.get(key);
      if (designData) {
        designs.push(JSON.parse(designData));
      }
    }

    res.json({ status: 'success', designs });
  } catch (error) {
    console.error('Get gallery error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to load gallery' });
  }
});

// Vote on a design
router.post('/api/design/vote', async (req, res): Promise<void> => {
  try {
    const username = await reddit.getCurrentUsername();
    const { designId, vote } = req.body;

    if (!designId) {
      res.status(400).json({ status: 'error', message: 'designId is required' });
      return;
    }

    // Get user's votes
    const userVotesKey = `votes:${username}`;
    const userVotesData = await redis.get(userVotesKey);
    let userVotes: string[] = [];
    try {
      userVotes = userVotesData ? JSON.parse(userVotesData) : [];
    } catch {
      userVotes = [];
    }

    // Find the design to update its vote count
    // We need to search through all designs to find the one with this id
    const themeId = 'default'; // Use default theme for now
    const submissionsData = await redis.get(`submissions:${themeId}`);
    let submissionKeys: string[] = [];
    try {
      submissionKeys = submissionsData ? JSON.parse(submissionsData) : [];
    } catch {
      submissionKeys = [];
    }

    // Find and update the design
    for (const key of submissionKeys) {
      const designData = await redis.get(key);
      if (designData) {
        const design = JSON.parse(designData);
        if (design.id === designId) {
          // Update vote count
          const currentVotes = design.voteCount || 0;
          if (vote && !userVotes.includes(designId)) {
            // Add vote
            design.voteCount = currentVotes + 1;
            userVotes.push(designId);
          } else if (!vote && userVotes.includes(designId)) {
            // Remove vote
            design.voteCount = Math.max(0, currentVotes - 1);
            userVotes = userVotes.filter(id => id !== designId);
          }

          // Save updated design
          await redis.set(key, JSON.stringify(design));
          break;
        }
      }
    }

    // Save user's votes
    await redis.set(userVotesKey, JSON.stringify(userVotes));

    res.json({ status: 'success' });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to vote' });
  }
});

// Post creation endpoints
router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({ status: 'error', message: 'Failed to create post' });
  }
});

// Manual post creation endpoint for testing
router.get('/api/create-test-post', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();
    res.redirect(`https://reddit.com/r/${context.subredditName}/comments/${post.id}`);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(500).json({ status: 'error', message: 'Failed to create post', error: String(error) });
  }
});

app.use(router);

const port = getServerPort();
const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
