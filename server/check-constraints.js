import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

async function checkConstraints() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking database constraints...\n');
    
    // Check for old constraint
    const oldConstraint = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conname = 'votes_session_id_story_id_member_id_key' 
      AND conrelid = 'votes'::regclass;
    `);
    
    // Check for new constraint
    const newConstraint = await client.query(`
      SELECT conname, contype 
      FROM pg_constraint 
      WHERE conname = 'votes_story_id_member_id_key' 
      AND conrelid = 'votes'::regclass;
    `);
    
    // Check if session_id is nullable
    const columnInfo = await client.query(`
      SELECT column_name, is_nullable, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'votes' AND column_name = 'session_id';
    `);
    
    // Check for foreign key constraint
    const fkConstraint = await client.query(`
      SELECT conname 
      FROM pg_constraint 
      WHERE conname = 'votes_story_id_session_id_fkey' 
      AND conrelid = 'votes'::regclass;
    `);
    
    // Check for index
    const index = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'votes' 
      AND indexname = 'idx_votes_story_id_member_id';
    `);
    
    // Get vote count
    const voteCount = await client.query('SELECT COUNT(*) FROM votes');
    
    console.log('📊 Database Status:\n');
    console.log(`Total votes in database: ${voteCount.rows[0].count}\n`);
    
    console.log('🔐 Constraints:');
    if (oldConstraint.rows.length > 0) {
      console.log('  ❌ OLD constraint exists: votes_session_id_story_id_member_id_key');
      console.log('     → This needs to be removed');
    } else {
      console.log('  ✅ OLD constraint does NOT exist (good)');
    }
    
    if (newConstraint.rows.length > 0) {
      console.log('  ✅ NEW constraint exists: votes_story_id_member_id_key');
      console.log('     → Database is using global votes model');
    } else {
      console.log('  ❌ NEW constraint does NOT exist');
      console.log('     → Need to run migration: npm run db:migrate');
    }
    
    if (fkConstraint.rows.length > 0) {
      console.log('  ⚠️  Foreign key constraint exists: votes_story_id_session_id_fkey');
      console.log('     → This should be removed for global votes');
    } else {
      console.log('  ✅ Foreign key constraint does NOT exist (good)');
    }
    
    console.log('\n📋 Column Info:');
    if (columnInfo.rows.length > 0) {
      const col = columnInfo.rows[0];
      console.log(`  session_id: ${col.data_type}, nullable: ${col.is_nullable}`);
      if (col.is_nullable === 'YES') {
        console.log('  ✅ session_id is nullable (correct)');
      } else {
        console.log('  ❌ session_id is NOT nullable (needs migration)');
      }
    }
    
    console.log('\n📇 Indexes:');
    if (index.rows.length > 0) {
      console.log('  ✅ Index exists: idx_votes_story_id_member_id');
    } else {
      console.log('  ⚠️  Index does NOT exist: idx_votes_story_id_member_id');
      console.log('     → Will be created during migration');
    }
    
    console.log('\n📝 Summary:');
    const hasOldConstraint = oldConstraint.rows.length > 0;
    const hasNewConstraint = newConstraint.rows.length > 0;
    const isNullable = columnInfo.rows.length > 0 && columnInfo.rows[0].is_nullable === 'YES';
    
    if (hasNewConstraint && !hasOldConstraint && isNullable) {
      console.log('  ✅ Database is fully migrated and ready!');
      console.log('  ✅ Using global votes model (story_id, member_id)');
    } else {
      console.log('  ⚠️  Database needs migration');
      console.log('  → Run: npm run db:migrate');
    }
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error);
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

checkConstraints()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

