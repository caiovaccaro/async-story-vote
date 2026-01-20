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
    
    // Step 1: Drop the old unique constraint if it exists
    console.log('Step 1: Dropping old unique constraint...');
    const oldConstraintExists = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'votes_session_id_story_id_member_id_key' 
      AND conrelid = 'votes'::regclass;
    `);
    
    if (oldConstraintExists.rows.length > 0) {
      await client.query(`
        ALTER TABLE votes DROP CONSTRAINT votes_session_id_story_id_member_id_key;
      `);
      console.log('  ✅ Old constraint dropped');
    } else {
      console.log('  ℹ️  Old constraint does not exist, skipping');
    }
    
    // Step 2: Make session_id nullable (check if it's already nullable)
    console.log('Step 2: Making session_id nullable...');
    const columnInfo = await client.query(`
      SELECT is_nullable FROM information_schema.columns 
      WHERE table_name = 'votes' AND column_name = 'session_id';
    `);
    
    if (columnInfo.rows.length > 0 && columnInfo.rows[0].is_nullable === 'NO') {
      await client.query(`
        ALTER TABLE votes ALTER COLUMN session_id DROP NOT NULL;
      `);
      console.log('  ✅ session_id is now nullable');
    } else {
      console.log('  ℹ️  session_id is already nullable, skipping');
    }
    
    // Step 3: Add new unique constraint on (story_id, member_id) if it doesn't exist
    console.log('Step 3: Adding new unique constraint on (story_id, member_id)...');
    const constraintExists = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'votes_story_id_member_id_key' 
      AND conrelid = 'votes'::regclass;
    `);
    
    if (constraintExists.rows.length === 0) {
      await client.query(`
        ALTER TABLE votes ADD CONSTRAINT votes_story_id_member_id_key UNIQUE (story_id, member_id);
      `);
      console.log('  ✅ Constraint added');
    } else {
      console.log('  ℹ️  Constraint already exists, skipping');
    }
    
    // Step 4: Drop the old foreign key constraint if it exists
    console.log('Step 4: Dropping old foreign key constraint...');
    const fkExists = await client.query(`
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'votes_story_id_session_id_fkey' 
      AND conrelid = 'votes'::regclass;
    `);
    
    if (fkExists.rows.length > 0) {
      await client.query(`
        ALTER TABLE votes DROP CONSTRAINT votes_story_id_session_id_fkey;
      `);
      console.log('  ✅ Foreign key constraint dropped');
    } else {
      console.log('  ℹ️  Foreign key constraint does not exist, skipping');
    }
    
    // Step 5: Add index for faster lookups (idempotent)
    console.log('Step 5: Adding index for faster lookups...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_votes_story_id_member_id ON votes(story_id, member_id);
    `);
    console.log('  ✅ Index created or already exists');
    
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

