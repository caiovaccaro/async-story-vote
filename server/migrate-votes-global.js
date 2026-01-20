import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting migration: Make votes global per story_id and member_id...');
    
    await client.query('BEGIN');
    
    // Step 1: Drop the old unique constraint
    console.log('Step 1: Dropping old unique constraint...');
    await client.query(`
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_session_id_story_id_member_id_key;
    `);
    
    // Step 2: Make session_id nullable
    console.log('Step 2: Making session_id nullable...');
    await client.query(`
      ALTER TABLE votes ALTER COLUMN session_id DROP NOT NULL;
    `);
    
    // Step 3: Add new unique constraint on (story_id, member_id)
    console.log('Step 3: Adding new unique constraint on (story_id, member_id)...');
    await client.query(`
      ALTER TABLE votes ADD CONSTRAINT votes_story_id_member_id_key UNIQUE (story_id, member_id);
    `);
    
    // Step 4: Drop the foreign key constraint (it will be recreated if needed)
    console.log('Step 4: Dropping old foreign key constraint...');
    await client.query(`
      ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_story_id_session_id_fkey;
    `);
    
    // Step 5: Add index for faster lookups
    console.log('Step 5: Adding index for faster lookups...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_story_id_member_id ON votes(story_id, member_id);
    `);
    
    await client.query('COMMIT');
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('Votes are now global per story_id and member_id.');
    console.log('All users can now see each other\'s votes, and votes persist across sessions.');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please add DATABASE_URL to your .env file');
  process.exit(1);
}

runMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });

