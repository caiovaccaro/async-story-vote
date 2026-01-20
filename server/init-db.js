import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create connection pool for NeonDB
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require') || process.env.DATABASE_URL?.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : false,
});

async function initDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Please add DATABASE_URL to your .env file');
    process.exit(1);
  }

  try {
    console.log('📖 Reading schema file...');
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('🔌 Connecting to database...');
    const client = await pool.connect();

    try {
      console.log('🚀 Executing schema...');
      await client.query(schema);
      console.log('✅ Database schema initialized successfully!');
      console.log('📊 Tables created: sessions, stories, members, votes, session_state');
    } finally {
      client.release();
    }

    await pool.end();
    console.log('✨ Done!');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    if (error.code === '42P01') {
      console.error('   This might mean the schema file is missing or the connection failed.');
    }
    process.exit(1);
  }
}

initDatabase();

