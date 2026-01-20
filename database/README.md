# Database Setup

This directory contains the PostgreSQL schema for the Async Story Vote application.

## NeonDB PostgreSQL Version

- **Default Version**: PostgreSQL 17 (for new projects created after January 10, 2025)
- **Supported Versions**: PostgreSQL 14, 15, 16, 17, and 18 (on select extensions)
- **Auto-updates**: Minor version upgrades are applied automatically after validation

This schema is compatible with all supported NeonDB PostgreSQL versions (14+).

## Setup Instructions

1. **Create a NeonDB account** at https://neon.tech
2. **Create a new project** and database
   - Default database name: `neondb` (or specify your own)
   - Default schema: `public`
3. **Get your connection string** from the NeonDB dashboard
4. **Add to your `.env` file**:
   ```env
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
5. **Initialize the database schema**:

### Option 1: Using npm script (Recommended)
```bash
npm run db:init
```

This will automatically read the schema file and execute it against your database.

### Option 2: Using psql
```bash
psql <your-connection-string> < database/schema.sql
```

### Option 3: Using NeonDB SQL Editor
1. Open your NeonDB project dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `schema.sql`
4. Execute the script

### Option 4: Using a PostgreSQL client
Use any PostgreSQL client (pgAdmin, DBeaver, etc.) to connect and run the schema.

## Environment Variable

Add to your `.env` file:
```env
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### Connection String Format

NeonDB connection strings typically look like:
```
postgresql://[user]:[password]@[hostname]/[dbname]?sslmode=require
```

**Important Notes:**
- **SSL is required**: Always include `?sslmode=require` in the connection string
- **Default database**: If not specified, uses `neondb`
- **Default schema**: All tables are created in the `public` schema
- **No superuser access**: NeonDB uses regular roles (not superuser)

## NeonDB Configuration

### Supported Features
- ✅ Standard PostgreSQL features (UUID, triggers, functions)
- ✅ Extensions (via `CREATE EXTENSION`)
- ✅ Foreign keys and constraints
- ✅ Indexes and performance optimizations
- ✅ Transactions and ACID compliance

### Limitations
- ❌ `TABLESPACE` option (not supported - file system access required)
- ❌ Superuser privileges (use `neon_superuser` role for platform-level operations)
- ❌ Some file system operations

## Schema Overview

- **sessions**: Stores refinement session metadata
- **stories**: Stores only ticket IDs (no descriptions/titles)
- **members**: Stores team member display names (no PII)
- **votes**: Stores voting data and unclear flags
- **session_state**: Stores UI state (current story index, revealed status)

## Security

The database does NOT store:
- Task descriptions
- Task titles
- Acceptance criteria
- Sensitive information
- PII (Personally Identifiable Information)

All story details are fetched from JIRA in real-time.

