import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function wipeVotes() {
  const client = await pool.connect();
  
  try {
    console.log('⚠️  WARNING: This will delete ALL votes from the database!');
    console.log('');
    
    // Get current vote count
    const countResult = await client.query('SELECT COUNT(*) FROM votes');
    const voteCount = parseInt(countResult.rows[0].count, 10);
    
    console.log(`Current votes in database: ${voteCount}`);
    console.log('');
    
    if (voteCount === 0) {
      console.log('✅ No votes to delete. Database is already empty.');
      rl.close();
      await pool.end();
      process.exit(0);
    }
    
    // Ask for confirmation
    const answer = await askQuestion('Are you sure you want to delete all votes? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
      console.log('❌ Operation cancelled.');
      rl.close();
      await pool.end();
      process.exit(0);
    }
    
    console.log('');
    console.log('🔄 Deleting all votes...');
    
    await client.query('BEGIN');
    
    // Delete all votes
    const deleteResult = await client.query('DELETE FROM votes');
    const deletedCount = deleteResult.rowCount;
    
    await client.query('COMMIT');
    
    console.log(`✅ Successfully deleted ${deletedCount} votes from the database.`);
    console.log('');
    console.log('The database is now clean. You can start voting fresh!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error wiping votes:', error);
    throw error;
  } finally {
    client.release();
    rl.close();
    await pool.end();
  }
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please add DATABASE_URL to your .env file');
  process.exit(1);
}

wipeVotes()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

