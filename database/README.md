# Database Setup

This directory contains the PostgreSQL schema for the Async Story Vote application.

## Overview

The database is designed to store minimal information for privacy and security:
- **No PII**: Only display names are stored (no emails, IDs, etc.)
- **No Intellectual Property**: Task descriptions, titles, and acceptance criteria are NOT stored
- **Only Metadata**: Ticket IDs, votes, and session state

All story details are fetched from JIRA in real-time when needed.

## NeonDB PostgreSQL Version

- **Default Version**: PostgreSQL 17 (for new projects created after January 10, 2025)
- **Supported Versions**: PostgreSQL 14, 15, 16, 17, and 18 (on select extensions)
- **Auto-updates**: Minor version upgrades are applied automatically after validation

This schema is compatible with all supported NeonDB PostgreSQL versions (14+).

## Setup Instructions

### Step 1: Create NeonDB Account

1. Go to https://neon.tech
2. Sign up for a free account
3. Create a new project
4. Note your connection string from the dashboard

### Step 2: Configure Environment Variables

Add to your `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**Important Notes:**
- **SSL is required**: Always include `?sslmode=require` in the connection string
- **Default database**: If not specified, uses `neondb`
- **Default schema**: All tables are created in the `public` schema
- **No superuser access**: NeonDB uses regular roles (not superuser)

### Step 3: Initialize Schema

Choose one of the following methods:

#### Option 1: Using npm script (Recommended)

```bash
npm run db:init
```

This will automatically read `database/schema.sql` and execute it against your database.

#### Option 2: Using psql

```bash
psql <your-connection-string> < database/schema.sql
```

#### Option 3: Using NeonDB SQL Editor

1. Open your NeonDB project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `database/schema.sql`
4. Execute the script

#### Option 4: Using a PostgreSQL Client

Use any PostgreSQL client (pgAdmin, DBeaver, TablePlus, etc.) to:
1. Connect to your NeonDB database
2. Open `database/schema.sql`
3. Execute the script

## Connection String Format

NeonDB connection strings typically look like:

```
postgresql://[user]:[password]@[hostname]/[dbname]?sslmode=require
```

Example:
```
postgresql://myuser:mypassword@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## NeonDB Configuration

### Supported Features

- ✅ Standard PostgreSQL features (UUID, triggers, functions)
- ✅ Extensions (via `CREATE EXTENSION`)
- ✅ Foreign keys and constraints
- ✅ Indexes and performance optimizations
- ✅ Transactions and ACID compliance
- ✅ Composite primary keys
- ✅ Auto-updating timestamps (via triggers)

### Limitations

- ❌ `TABLESPACE` option (not supported - file system access required)
- ❌ Superuser privileges (use `neon_superuser` role for platform-level operations)
- ❌ Some file system operations
- ❌ Direct file system access

## Schema Overview

### Tables

#### `sessions`
Stores refinement session metadata.

**Columns:**
- `id` (UUID, PRIMARY KEY): Unique session identifier
- `name` (TEXT): Session display name
- `created_at` (TIMESTAMP): When the session was created
- `updated_at` (TIMESTAMP): Last update time (auto-updated)

#### `stories`
Stores only ticket IDs - no descriptions or titles.

**Columns:**
- `id` (TEXT): JIRA issue ID (e.g., "10001")
- `session_id` (UUID, FOREIGN KEY): References `sessions(id)`
- `ticket_key` (TEXT): JIRA ticket key (e.g., "PROJ-123")
- `created_at` (TIMESTAMP): When the story was added
- `updated_at` (TIMESTAMP): Last update time (auto-updated)
- **Primary Key**: `(id, session_id)` - composite key

**Note**: This table does NOT store:
- Story descriptions
- Story titles
- Acceptance criteria
- Any other story content

#### `members`
Stores team member display names only - no PII.

**Columns:**
- `id` (UUID, PRIMARY KEY): Auto-generated UUID
- `session_id` (UUID, FOREIGN KEY): References `sessions(id)`
- `name` (TEXT): Display name (e.g., "Alice", "Bob")
- `created_at` (TIMESTAMP): When the member was added
- `updated_at` (TIMESTAMP): Last update time (auto-updated)
- **Unique Constraint**: `(session_id, name)` - prevents duplicate members

**Note**: This table does NOT store:
- Email addresses
- User IDs
- Any other PII

#### `votes`
Stores voting data and unclear flags.

**Columns:**
- `id` (UUID, PRIMARY KEY): Auto-generated UUID
- `session_id` (UUID, FOREIGN KEY): References `sessions(id)`
- `story_id` (TEXT): References `stories(id)`
- `member_id` (UUID, FOREIGN KEY): References `members(id)`
- `points` (TEXT): Story point estimate (e.g., "3", "5", "?")
- `is_unclear` (BOOLEAN): Whether the member flagged this story as unclear
- `created_at` (TIMESTAMP): When the vote was cast
- `updated_at` (TIMESTAMP): Last update time (auto-updated)
- **Unique Constraint**: `(session_id, story_id, member_id)` - one vote per member per story

**Note**: Votes can be updated (e.g., changing from "3" to "5" or toggling unclear flag).

#### `session_state`
Stores UI state for persistence across page refreshes.

**Columns:**
- `session_id` (UUID, PRIMARY KEY, FOREIGN KEY): References `sessions(id)`
- `current_story_index` (INTEGER): Current position in the story list (0-based)
- `is_revealed` (BOOLEAN): Whether votes are currently revealed
- `updated_at` (TIMESTAMP): Last update time (auto-updated)

### Indexes

The schema includes indexes for performance:
- `idx_stories_session_id`: On `stories(session_id)` for fast story lookups
- `idx_votes_session_story`: On `votes(session_id, story_id)` for vote aggregation
- `idx_votes_member`: On `votes(member_id)` for member vote lookups
- `idx_members_session`: On `members(session_id, name)` for member lookups

### Triggers

Auto-updating `updated_at` timestamps:
- `update_sessions_updated_at`: Updates `sessions.updated_at` on row changes
- `update_stories_updated_at`: Updates `stories.updated_at` on row changes
- `update_members_updated_at`: Updates `members.updated_at` on row changes
- `update_votes_updated_at`: Updates `votes.updated_at` on row changes
- `update_session_state_updated_at`: Updates `session_state.updated_at` on row changes

## Security & Privacy

### What IS Stored

✅ **Safe to Store:**
- Ticket IDs (public information)
- Display names (non-sensitive)
- Story point votes (aggregated data)
- Unclear flags (boolean)
- Session metadata (non-sensitive)
- UI state (current position, revealed status)

### What is NOT Stored

❌ **Never Stored:**
- Task descriptions
- Task titles
- Acceptance criteria
- Email addresses
- User IDs
- Any PII (Personally Identifiable Information)
- Any intellectual property
- Any sensitive business information

### Data Flow

1. **Story Fetching**: Stories are fetched from JIRA API in real-time
2. **Metadata Storage**: Only ticket IDs are stored in the database
3. **Vote Storage**: Votes and flags are stored per member per story
4. **Display**: When displaying stories, descriptions are fetched from JIRA (not from DB)

This ensures that:
- No sensitive data is persisted
- Story content is always up-to-date (fetched from JIRA)
- Database can be shared without privacy concerns
- Compliance with data protection regulations

## Database Operations

### Batch Operations

The application uses batch operations for performance:

- **Story Insertion**: Stories are inserted in batches of 50 using `INSERT ... ON CONFLICT`
- **Member Upsert**: Members are upserted in batches
- **Vote Updates**: Votes are updated individually (real-time)

### Connection Pooling

The application uses `pg` connection pooling:
- **Max connections**: 20 (configurable)
- **Idle timeout**: 10 seconds
- **Connection timeout**: 5 seconds
- **SSL**: Required (configured automatically for NeonDB)

## Troubleshooting

### Connection Errors

**Error**: `Connection refused` or `ECONNREFUSED`
- **Solution**: Verify your `DATABASE_URL` is correct
- **Check**: Ensure NeonDB project is active (not paused)

**Error**: `SSL connection required`
- **Solution**: Add `?sslmode=require` to your connection string
- **Check**: Ensure SSL is enabled in your NeonDB project

**Error**: `password authentication failed`
- **Solution**: Regenerate your connection string from NeonDB dashboard
- **Check**: Ensure you're using the correct credentials

### Schema Errors

**Error**: `relation "sessions" does not exist`
- **Solution**: Run `npm run db:init` to create the schema
- **Check**: Ensure you're connected to the correct database

**Error**: `there is no unique constraint matching given keys`
- **Solution**: This usually means the schema is outdated - re-run `npm run db:init`
- **Note**: The schema uses composite foreign keys - ensure all tables are created correctly

### Performance Issues

**Slow Queries**:
- Check that indexes are created (they should be created automatically)
- Verify connection pooling is working
- Consider increasing pool size if needed

**Connection Pool Exhausted**:
- Increase `max` connections in `server/db.js`
- Check for connection leaks (unclosed connections)
- Monitor NeonDB connection limits

## Maintenance

### Backup

NeonDB provides automatic backups. You can also:

1. **Export Schema**: 
   ```bash
   pg_dump <connection-string> --schema-only > schema_backup.sql
   ```

2. **Export Data**:
   ```bash
   pg_dump <connection-string> --data-only > data_backup.sql
   ```

### Migration

To update the schema:

1. Create a new migration file (e.g., `migrations/001_add_column.sql`)
2. Run it against your database:
   ```bash
   psql <connection-string> < migrations/001_add_column.sql
   ```
3. Update `database/schema.sql` to reflect the new schema

### Monitoring

Monitor your database:
- **NeonDB Dashboard**: View connection count, query performance, storage usage
- **Application Logs**: Check `server/index.js` logs for database errors
- **Connection Pool**: Monitor pool size and wait times

## Support

For NeonDB-specific issues:
- **Documentation**: https://neon.tech/docs
- **Support**: https://neon.tech/support
- **Status**: https://status.neon.tech

For application-specific database issues:
- Check application logs
- Review this documentation
- Verify schema matches `database/schema.sql`
