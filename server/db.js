import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool for NeonDB
// NeonDB requires SSL connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // NeonDB requires SSL - configure based on connection string
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
  // Connection pool settings optimized for NeonDB
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to NeonDB');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

/**
 * Create a new refinement session
 */
export async function createSession(name) {
  const result = await pool.query(
    'INSERT INTO sessions (name) VALUES ($1) RETURNING *',
    [name]
  );
  return result.rows[0];
}

/**
 * Get session by ID
 */
export async function getSession(sessionId) {
  const result = await pool.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
  return result.rows[0] || null;
}

/**
 * Upsert stories for a session (only store ticket IDs, not descriptions)
 * Processes in batches to avoid overwhelming the database
 */
export async function upsertStories(sessionId, stories) {
  const client = await pool.connect();
  const batchSize = 50; // Process 50 stories at a time
  
  try {
    await client.query('BEGIN');
    
    // Process in batches
    for (let i = 0; i < stories.length; i += batchSize) {
      const batch = stories.slice(i, i + batchSize);
      
      // Build parameterized query for this batch
      const values = batch.map((_, idx) => {
        const paramBase = idx * 3;
        return `($${paramBase + 1}, $${paramBase + 2}, $${paramBase + 3})`;
      }).join(', ');
      
      const params = batch.flatMap(story => [story.id, story.ticketId, sessionId]);
      
      await client.query(
        `INSERT INTO stories (id, ticket_id, session_id)
         VALUES ${values}
         ON CONFLICT (id, session_id) DO UPDATE SET ticket_id = EXCLUDED.ticket_id`,
        params
      );
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all stories for a session
 */
export async function getStories(sessionId) {
  const result = await pool.query(
    'SELECT id, ticket_id FROM stories WHERE session_id = $1 ORDER BY created_at',
    [sessionId]
  );
  return result.rows.map(row => ({
    id: row.id,
    ticketId: row.ticket_id,
  }));
}

/**
 * Upsert members for a session
 * Note: We let the database generate UUIDs, using name as the unique identifier
 * Returns the members with their database-generated UUIDs
 */
export async function upsertMembers(sessionId, members) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const resultMembers = [];
    
    for (const member of members) {
      // Try to insert, or get existing member
      const result = await client.query(
        `INSERT INTO members (session_id, name)
         VALUES ($1, $2)
         ON CONFLICT (session_id, name) DO UPDATE SET name = $2
         RETURNING id, name`,
        [sessionId, member.name]
      );
      
      if (result.rows.length > 0) {
        resultMembers.push({
          id: result.rows[0].id,
          name: result.rows[0].name,
        });
      } else {
        // If no row returned (shouldn't happen), query for it
        const existing = await client.query(
          'SELECT id, name FROM members WHERE session_id = $1 AND name = $2',
          [sessionId, member.name]
        );
        if (existing.rows.length > 0) {
          resultMembers.push({
            id: existing.rows[0].id,
            name: existing.rows[0].name,
          });
        }
      }
    }
    
    await client.query('COMMIT');
    return resultMembers;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all members for a session
 */
export async function getMembers(sessionId) {
  const result = await pool.query(
    'SELECT id, name FROM members WHERE session_id = $1 ORDER BY created_at',
    [sessionId]
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
  }));
}

/**
 * Save or update a vote
 */
export async function saveVote(sessionId, storyId, memberId, points, isUnclear = false) {
  const result = await pool.query(
    `INSERT INTO votes (session_id, story_id, member_id, points, is_unclear)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (session_id, story_id, member_id)
     DO UPDATE SET points = $4, is_unclear = $5, updated_at = CURRENT_TIMESTAMP
     RETURNING *`,
    [sessionId, storyId, memberId, String(points), isUnclear]
  );
  return result.rows[0];
}

/**
 * Get all votes for a session
 */
export async function getVotes(sessionId) {
  const result = await pool.query(
    `SELECT story_id, member_id, points, is_unclear
     FROM votes
     WHERE session_id = $1`,
    [sessionId]
  );
  return result.rows.map(row => ({
    storyId: row.story_id,
    memberId: row.member_id,
    points: row.points === '?' ? '?' : Number(row.points),
    isUnclear: row.is_unclear || false,
  }));
}

/**
 * Get votes for a specific story
 */
export async function getStoryVotes(sessionId, storyId) {
  const result = await pool.query(
    `SELECT member_id, points, is_unclear
     FROM votes
     WHERE session_id = $1 AND story_id = $2`,
    [sessionId, storyId]
  );
  return result.rows.map(row => ({
    memberId: row.member_id,
    points: row.points === '?' ? '?' : Number(row.points),
    isUnclear: row.is_unclear || false,
  }));
}

/**
 * Save session state (current story index, revealed status)
 */
export async function saveSessionState(sessionId, currentStoryIndex, isRevealed) {
  await pool.query(
    `INSERT INTO session_state (session_id, current_story_index, is_revealed)
     VALUES ($1, $2, $3)
     ON CONFLICT (session_id)
     DO UPDATE SET current_story_index = $2, is_revealed = $3, updated_at = CURRENT_TIMESTAMP`,
    [sessionId, currentStoryIndex, isRevealed]
  );
}

/**
 * Get session state
 */
export async function getSessionState(sessionId) {
  const result = await pool.query(
    'SELECT current_story_index, is_revealed FROM session_state WHERE session_id = $1',
    [sessionId]
  );
  if (result.rows.length === 0) {
    return { currentStoryIndex: 0, isRevealed: false };
  }
  return {
    currentStoryIndex: result.rows[0].current_story_index,
    isRevealed: result.rows[0].is_revealed,
  };
}

/**
 * Get members who flagged a story as unclear
 */
export async function getUnclearFlags(sessionId, storyId) {
  const result = await pool.query(
    `SELECT m.id, m.name
     FROM members m
     JOIN votes v ON m.id = v.member_id
     WHERE v.session_id = $1 AND v.story_id = $2 AND v.is_unclear = true`,
    [sessionId, storyId]
  );
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
  }));
}

export default pool;

