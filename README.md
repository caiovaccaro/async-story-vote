# Async Story Vote

A modern, async-first story point estimation tool for agile teams. Integrates with JIRA to fetch tickets and enables team members to vote on story points independently, with persistent storage and real-time collaboration features.

## Features

- **JIRA Integration**: Automatically fetches tickets from JIRA that need refinement
- **Async Voting**: Team members can vote independently without real-time coordination
- **Pagination**: Navigate through large backlogs with efficient pagination (50 tickets per page)
- **Unclear Flags**: Team members can flag tasks as unclear, with visibility in both voting and list views
- **Persistent Storage**: All votes and session state are saved to NeonDB (PostgreSQL)
- **Rich Text Rendering**: JIRA descriptions are rendered with proper HTML formatting
- **Clickable Ticket Links**: Ticket IDs link directly to JIRA tickets (opens in new tab)
- **Dual View Modes**: 
  - **Voting View**: Focus on one story at a time for voting
  - **List View**: See all stories with votes, averages, and unclear flags
- **Auto-scrolling**: Automatically scrolls to top when navigating stories, and to current story in list view
- **Task Metadata**: Displays issue type (Story, Bug, Task, etc.) and creation date
- **Session Persistence**: Current position, votes, and revealed status persist across page refreshes
- **Team Member Management**: Configure team members via environment variables

## Technologies

This project is built with:

- **Frontend**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **State Management**: React Query (TanStack Query) for server state
- **Backend**: Express.js (Node.js) for API proxying and database operations
- **Database**: NeonDB (PostgreSQL) for persistent storage
- **API Integration**: JIRA REST API v3

## Quick Start

### Prerequisites

- Node.js 18+ and npm (or use [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- A JIRA account with API token access
- (Optional) A NeonDB account for persistent storage

### Installation

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>
cd async-story-vote

# Step 2: Install dependencies
npm install

# Step 3: Create a .env file (see Configuration section)
cp .env.example .env  # If you have an example file, or create manually

# Step 4: (Optional) Initialize database schema
npm run db:init

# Step 5: Start the application
npm run dev:all
```

The application will be available at:
- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3001

## Configuration

### Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# JIRA Configuration (Required)
VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_API_TOKEN=your-api-token-here
VITE_JIRA_PROJECT_KEY=PROJ                    # Optional: Filter by project
VITE_JIRA_STATUS_NAME=Need Refinement         # Optional: Defaults to "Need Refinement"

# Team Members (Optional)
VITE_TEAM_MEMBERS=Alice,Bob,Charlie,Diana,Eve

# Database Configuration (Optional, for persistence)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

**Note:** The backend server reads these same environment variables. The `VITE_` prefix is used for frontend variables, but the backend will read them without the prefix as well.

### Getting a JIRA API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "Async Story Vote")
4. Copy the generated token and use it as `VITE_JIRA_API_TOKEN`

### Team Members Configuration

Configure your team members using the `VITE_TEAM_MEMBERS` environment variable:

- **Format**: Comma-separated list of names (spaces around commas are trimmed)
- **Example**: `VITE_TEAM_MEMBERS=Alice,Bob,Charlie,Diana,Eve`
- **Fallback**: If not set, uses default demo members (Alex, Jordan, Sam, Casey, Morgan)

Each team member will be assigned a consistent ID based on their name, so the same name will always get the same ID across sessions.

## JIRA Integration

### How It Works

The application uses a backend Express.js server to proxy JIRA API requests, avoiding CORS issues. The frontend communicates with the backend, which then makes authenticated requests to JIRA.

### JIRA Query

The application uses the following JQL query to find tickets:

```
project = "PROJECT_KEY" AND status = "Need Refinement" ORDER BY Rank
```

- If `VITE_JIRA_PROJECT_KEY` is not set, it searches across all projects
- Tickets are ordered by Rank (JIRA's default ordering)
- Pagination is handled server-side (50 tickets per page)

### Pagination

- **Page Size**: 50 tickets per page (configurable in code)
- **Navigation**: Previous/Next buttons and page number buttons
- **Token-based**: Uses JIRA's token-based pagination for efficient navigation
- **Caching**: Pages are cached for 5 minutes to reduce API calls

### Ticket Display

- **Ticket ID**: Clickable link that opens the JIRA ticket in a new tab
- **Issue Type**: Displays the type (Story, Bug, Task, etc.)
- **Creation Date**: Shows when the ticket was created
- **Description**: Rendered as HTML with proper formatting (from JIRA's renderedFields)
- **Rich Formatting**: Supports JIRA's rich text formatting (bold, lists, links, etc.)

## Database Integration (NeonDB)

This application uses NeonDB (PostgreSQL) to persist voting data and session state. The database stores only minimal information - no sensitive data, task descriptions, or titles are stored.

### Setting Up NeonDB

1. **Create a NeonDB account** at https://neon.tech
2. **Create a new project** and database
3. **Get your connection string** from the NeonDB dashboard
4. **Add to your `.env` file**:
   ```env
   DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
5. **Initialize the database schema**:
   ```bash
   npm run db:init
   ```

6. **Run database migration** (if upgrading from an older version):
   ```bash
   npm run db:migrate
   ```
   This migrates votes to be global per user per story (not per session).

For more details, see [database/README.md](./database/README.md).

### What's Stored

The database stores:
- **Sessions**: Refinement session metadata (for UI state tracking)
- **Stories**: Only ticket IDs (JIRA issue ID and ticket key) - no descriptions or titles
- **Members**: Display names only (no PII)
- **Votes**: Story point estimates and unclear flags (global per user per story, not per session)
- **Session State**: Current story index and revealed status (per user session)

**Important**: The database does NOT store:
- Task descriptions
- Task titles
- Acceptance criteria
- Any sensitive information
- PII (Personally Identifiable Information)

All story details are fetched from JIRA in real-time when needed.

### Vote Persistence Model

Votes are stored globally per user per story:
- **One vote per user per story**: Each team member has one vote per JIRA story, regardless of session
- **Persistent across sessions**: Votes persist forever - they're not tied to a specific refinement session
- **Visible to all users**: All team members can see all votes for any story
- **Updatable**: Users can change their vote at any time - it updates their existing vote
- **Session-independent**: Votes are global, but session state (current position, revealed status) is per session

### Database Features

- **Global Persistent Voting**: Votes are saved globally per user per story and persist forever across all sessions
- **Cross-User Visibility**: All team members can see each other's votes in real-time
- **Vote Updates**: Users can change their vote at any time - it updates their existing vote for that story
- **Unclear Flags**: Team members can flag tasks as unclear (stored per member per story, globally)
- **Session State**: Current position and revealed status are preserved per user session
- **Batch Operations**: Stories are saved in batches of 50 for performance

## Usage

### Voting Workflow

1. **Select Team Member**: Choose your name from the dropdown at the top
2. **View Stories**: 
   - Use "Voting" mode to focus on one story at a time
   - Use "All Stories" mode to see all stories in a list
3. **Vote**: Click on a story point value (0, 1, 2, 3, 5, 8, 13, 21, or ?)
   - Your vote is saved immediately and visible to all team members
   - You can change your vote at any time - it will update your existing vote
4. **Flag as Unclear**: Click "Flag as Unclear" if the story needs clarification
   - The unclear flag is visible to all team members
5. **Navigate**: Use Previous/Next buttons or click on stories in the list view
6. **View All Votes**: See votes from all team members in real-time
   - Votes are global - you'll see votes from all users, even if they voted in a different session
7. **Reveal Votes**: Once all members have voted, reveal the votes to see the consensus

### View Modes

#### Voting View
- Focuses on one story at a time
- Shows full description with rich formatting
- Voting panel with story point options
- Navigation controls (Previous/Next/View All)
- Auto-scrolls to top when navigating between stories

#### List View
- Shows all stories in a paginated list
- Displays current average vote from all users (even if not all members have voted)
- Shows unclear flag count with icon (counts all users who flagged it)
- Displays issue type and creation date
- Clickable ticket IDs (opens JIRA in new tab)
- Shows votes from all team members globally
- Pagination controls at the bottom
- Auto-scrolls to current story when switching from voting view

### Unclear Flags

- Each team member can flag a story as unclear
- The flag count is displayed prominently in the list view (shows count from all users)
- Flags are stored globally per member per story (not per session)
- All users can see which stories have been flagged as unclear
- Useful for identifying stories that need clarification before voting

## Available Scripts

```bash
# Development
npm run dev              # Start frontend dev server only (port 8080)
npm run dev:server       # Start backend server only (port 3001)
npm run dev:all          # Start both frontend and backend (recommended)

# Database
npm run db:init          # Initialize database schema
npm run db:migrate       # Run database migration (for upgrading from older versions)

# Build
npm run build            # Build for production
npm run build:dev        # Build for development
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Run ESLint
```

## Project Structure

```
async-story-vote/
├── database/
│   ├── README.md        # Database documentation
│   └── schema.sql       # PostgreSQL schema
├── server/
│   ├── index.js         # Express backend server
│   ├── db.js            # Database operations
│   └── init-db.js       # Database initialization script
├── src/
│   ├── components/      # React components
│   │   ├── StoryDisplay.tsx      # Single story view
│   │   ├── StoryListView.tsx    # List of all stories
│   │   ├── VotingPanel.tsx      # Voting interface
│   │   └── ui/          # shadcn-ui components
│   ├── hooks/
│   │   └── useRefinementSession.ts  # Main session hook
│   ├── lib/
│   │   ├── jira.ts      # JIRA API client
│   │   ├── db-api.ts    # Database API client
│   │   └── team-members.ts  # Team member utilities
│   ├── pages/
│   │   └── Index.tsx    # Main page
│   └── types/
│       └── refinement.ts  # TypeScript types
├── .env                 # Environment variables (create this)
├── package.json
└── README.md
```

## Troubleshooting

### JIRA Issues Not Loading

- Check that all JIRA environment variables are set correctly
- Verify your API token is valid
- Check browser console and server logs for errors
- Ensure the backend server is running (`npm run dev:server`)

### Database Connection Errors

- Verify `DATABASE_URL` is set correctly in `.env`
- Ensure the database schema has been initialized (`npm run db:init`)
- Check that SSL mode is set to `require` in the connection string
- Verify your NeonDB project is active

### CORS Errors

- The backend server should handle CORS automatically
- If you see CORS errors, ensure the backend is running on port 3001
- Check that Vite proxy is configured correctly in `vite.config.ts`

### Pagination Issues

- Each page request fetches 50 tickets from JIRA
- If pagination seems stuck, check server logs for JIRA API errors
- The last page may not show correctly if total count is unknown - this is expected behavior

## Architecture

For detailed architectural documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), which includes:
- **Level 1: System Context Diagram** - Shows the system and its relationships with users and external systems
- **Level 2: Container Diagram** - Shows the high-level technical building blocks

### High-Level Architecture

- **Frontend**: React SPA with React Query for server state management
- **Backend**: Express.js server that proxies JIRA API and handles database operations
- **Database**: PostgreSQL (NeonDB) for persistence
- **State Management**: React hooks with React Query for async data fetching

### Key Design Decisions

- **No PII Storage**: Database only stores minimal data (ticket IDs, member names, votes)
- **Real-time Fetching**: Story details are always fetched from JIRA, never cached in DB
- **Token-based Pagination**: Uses JIRA's native pagination tokens for efficiency
- **Batch Operations**: Stories are saved in batches to handle large backlogs
- **Progressive Enhancement**: Works without database (demo mode) if DB is not configured

## Contributing

This is a Lovable project. You can:

- **Edit via Lovable**: Visit the project in Lovable and start prompting
- **Edit locally**: Clone, make changes, and push to the repository
- **Edit in GitHub**: Use GitHub's web editor
- **Use Codespaces**: Launch a Codespace from GitHub

## Deployment

### Via Lovable

Simply open the project in [Lovable](https://lovable.dev) and click on Share -> Publish.

### Custom Domain

To connect a custom domain:
1. Navigate to Project > Settings > Domains in Lovable
2. Click Connect Domain
3. Follow the setup instructions

Read more: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## License

This project is private and proprietary.
