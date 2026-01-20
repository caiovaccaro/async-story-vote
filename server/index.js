import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as db from './db.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit to handle large story payloads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Get JIRA credentials from environment
function getJiraCredentials() {
  const baseUrl = process.env.VITE_JIRA_BASE_URL;
  const email = process.env.VITE_JIRA_EMAIL;
  const apiToken = process.env.VITE_JIRA_API_TOKEN;
  const projectKey = process.env.VITE_JIRA_PROJECT_KEY;
  const statusName = process.env.VITE_JIRA_STATUS_NAME || 'Need Refinement';

  if (!baseUrl || !email || !apiToken) {
    throw new Error(
      'Missing JIRA credentials. Please set VITE_JIRA_BASE_URL, VITE_JIRA_EMAIL, and VITE_JIRA_API_TOKEN in your .env file'
    );
  }

  return { baseUrl, email, apiToken, projectKey, statusName };
}

// Create Basic Auth header
function createAuthHeader(email, apiToken) {
  const credentials = Buffer.from(`${email}:${apiToken}`).toString('base64');
  return `Basic ${credentials}`;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// JIRA tickets endpoint with pagination support
// Uses token-based pagination - need to fetch pages sequentially to get tokens
const jiraPageTokens = new Map(); // Cache page tokens: page number -> token

app.get('/api/jira/tickets', async (req, res) => {
  try {
    const { baseUrl, email, apiToken, projectKey, statusName } = getJiraCredentials();
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    // Build JQL query
    let jql = `status = "${statusName}"`;
    if (projectKey) {
      jql = `project = "${projectKey}" AND ${jql}`;
    }
    jql += ` ORDER BY Rank`;

    console.log(`Fetching JIRA tickets page ${page} (${pageSize} per page) with JQL:`, jql);

    // For the new /search/jql endpoint, we need to fetch pages sequentially to get tokens
    // If requesting page 1, fetch it directly
    // For subsequent pages, we need the token from the previous page
    let nextPageToken = null;
    let currentPageNum = 1;
    let allIssues = [];
    let total = 0;
    
    // Fetch pages sequentially until we reach the requested page
    while (currentPageNum <= page) {
      const params = new URLSearchParams({
        jql: jql,
        fields: 'summary,description,status,issuetype,created',
        expand: 'renderedFields',
        maxResults: pageSize.toString(),
      });

      // Use cached token if we have it, otherwise use the token from previous iteration
      const cachedToken = jiraPageTokens.get(currentPageNum);
      if (cachedToken) {
        params.append('nextPageToken', cachedToken);
      } else if (nextPageToken) {
        params.append('nextPageToken', nextPageToken);
      }
      
      const url = `${baseUrl}/rest/api/3/search/jql?${params.toString()}`;
      if (currentPageNum === 1 || currentPageNum === page) {
        console.log(`JIRA API URL (page ${currentPageNum}):`, url.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: createAuthHeader(email, apiToken),
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('JIRA API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: url,
          jql: jql,
          error: errorText,
        });
        return res.status(response.status).json({
          error: `JIRA API error: ${response.status} ${response.statusText}`,
          details: errorText,
        });
      }

      const data = await response.json();
      const pageIssues = data.values || data.issues || [];
      
      // Store token for this page
      if (data.nextPageToken) {
        jiraPageTokens.set(currentPageNum + 1, data.nextPageToken);
      }
      
      // Get total from first page
      if (currentPageNum === 1) {
        total = data.total || pageIssues.length;
      }
      
      // If this is the requested page, return it
      if (currentPageNum === page) {
        const hasMore = !!data.nextPageToken || (data.isLast === false);
        
        console.log(`JIRA API Response: page ${page}, ${pageIssues.length} issues, total: ${total}, hasMore: ${hasMore}`);
        
        return res.json({
          issues: pageIssues,
          total: total,
          page: page,
          pageSize: pageSize,
          hasMore: hasMore,
        });
      }
      
      // Move to next page
      nextPageToken = data.nextPageToken;
      currentPageNum++;
      
      // Safety check
      if (!nextPageToken && currentPageNum <= page) {
        console.warn(`No more pages available, but requested page ${page}`);
        return res.json({
          issues: [],
          total: total,
          page: page,
          pageSize: pageSize,
          hasMore: false,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching JIRA tickets:', error);
    res.status(500).json({
      error: 'Failed to fetch JIRA tickets',
      message: error.message,
    });
  }
});

// Test JIRA connection endpoint
app.get('/api/jira/test', async (req, res) => {
  try {
    const { baseUrl, email, apiToken } = getJiraCredentials();
    const url = `${baseUrl}/rest/api/3/myself`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: createAuthHeader(email, apiToken),
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      const userData = await response.json();
      res.json({ connected: true, user: userData });
    } else {
      res.status(response.status).json({
        connected: false,
        error: `Failed to connect: ${response.status} ${response.statusText}`,
      });
    }
  } catch (error) {
    console.error('JIRA connection test failed:', error);
    res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
});

// Database API endpoints

// Create or get session
app.post('/api/sessions', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Session name is required' });
    }
    const session = await db.createSession(name);
    res.json(session);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session by ID
app.get('/api/sessions/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await db.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save stories for a session
app.post('/api/sessions/:sessionId/stories', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { stories } = req.body;
    if (!stories || !Array.isArray(stories)) {
      return res.status(400).json({ error: 'Stories array is required' });
    }
    
    // Process all stories (db.upsertStories handles batching internally)
    await db.upsertStories(sessionId, stories);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving stories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get stories for a session
app.get('/api/sessions/:sessionId/stories', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const stories = await db.getStories(sessionId);
    res.json(stories);
  } catch (error) {
    console.error('Error getting stories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save members for a session
app.post('/api/sessions/:sessionId/members', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { members } = req.body;
    if (!members || !Array.isArray(members)) {
      return res.status(400).json({ error: 'Members array is required' });
    }
    // upsertMembers now returns members with database-generated UUIDs
    const savedMembers = await db.upsertMembers(sessionId, members);
    res.json({ success: true, members: savedMembers });
  } catch (error) {
    console.error('Error saving members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get members for a session
app.get('/api/sessions/:sessionId/members', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const members = await db.getMembers(sessionId);
    res.json(members);
  } catch (error) {
    console.error('Error getting members:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save a vote
app.post('/api/sessions/:sessionId/votes', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { storyId, memberId, points, isUnclear } = req.body;
    
    console.log('Received vote request:', { sessionId, storyId, memberId, points, isUnclear, body: req.body });
    
    if (!storyId || !memberId || points === undefined) {
      console.error('Missing required fields:', { storyId, memberId, points });
      return res.status(400).json({ error: 'storyId, memberId, and points are required' });
    }

    // Validate memberId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(memberId)) {
      // Try to find the member by name or look up the correct UUID
      console.warn(`Invalid memberId format: ${memberId}, attempting to find member by name or ID`);
      
      // Get all members for this session
      const members = await db.getMembers(sessionId);
      console.log('Available members:', members);
      
      // If memberId looks like a hash (short alphanumeric), try to find by matching pattern
      // or we need to get the member name from the request
      const memberName = req.body.memberName;
      if (memberName) {
        const dbMember = members.find(m => m.name === memberName);
        if (dbMember) {
          console.log(`Found member by name: ${memberName} -> ${dbMember.id}`);
          const vote = await db.saveVote(sessionId, storyId, dbMember.id, points, isUnclear || false);
          console.log('Vote saved successfully:', vote);
          return res.json(vote);
        } else {
          console.error(`Member not found by name: ${memberName}`, { availableMembers: members.map(m => m.name) });
        }
      }
      
      return res.status(400).json({ 
        error: 'Invalid memberId format. Expected UUID.',
        received: memberId,
        hint: 'Please provide memberName in the request body to look up the correct UUID'
      });
    }
    
    console.log('Saving vote with valid UUID:', { sessionId, storyId, memberId, points, isUnclear });
    const vote = await db.saveVote(sessionId, storyId, memberId, points, isUnclear || false);
    console.log('Vote saved successfully:', vote);
    res.json(vote);
  } catch (error) {
    console.error('Error saving vote:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get all votes for a session
app.get('/api/sessions/:sessionId/votes', async (req, res) => {
  try {
    const { sessionId } = req.params;
    console.log('Fetching votes for session:', sessionId);
    const votes = await db.getVotes(sessionId);
    console.log(`Retrieved ${votes.length} votes for session ${sessionId}`);
    res.json(votes);
  } catch (error) {
    console.error('Error getting votes:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message, details: error.stack });
  }
});

// Get votes for a specific story (global, not per session)
app.get('/api/stories/:storyId/votes', async (req, res) => {
  try {
    const { storyId } = req.params;
    const votes = await db.getStoryVotes(storyId);
    res.json(votes);
  } catch (error) {
    console.error('Error getting story votes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get votes for multiple stories (for efficiency)
app.post('/api/votes/bulk', async (req, res) => {
  try {
    const { storyIds } = req.body;
    if (!Array.isArray(storyIds)) {
      return res.status(400).json({ error: 'storyIds must be an array' });
    }
    const votes = await db.getVotesForStories(storyIds);
    res.json(votes);
  } catch (error) {
    console.error('Error getting bulk votes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get members who flagged a story as unclear
app.get('/api/sessions/:sessionId/stories/:storyId/unclear', async (req, res) => {
  try {
    const { sessionId, storyId } = req.params;
    const members = await db.getUnclearFlags(sessionId, storyId);
    res.json(members);
  } catch (error) {
    console.error('Error getting unclear flags:', error);
    res.status(500).json({ error: error.message });
  }
});

// Save session state
app.post('/api/sessions/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { currentStoryIndex, isRevealed } = req.body;
    
    await db.saveSessionState(
      sessionId,
      currentStoryIndex || 0,
      isRevealed || false
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving session state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get session state
app.get('/api/sessions/:sessionId/state', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const state = await db.getSessionState(sessionId);
    res.json(state);
  } catch (error) {
    console.error('Error getting session state:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 JIRA API proxy ready`);
  if (process.env.DATABASE_URL) {
    console.log(`💾 Database connection ready`);
  } else {
    console.log(`⚠️  DATABASE_URL not set - database features disabled`);
  }
});

