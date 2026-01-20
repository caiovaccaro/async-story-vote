# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Create a .env file with your JIRA credentials (see JIRA Integration section)

# Step 5: Start both the backend server and frontend dev server
npm run dev:all

# Or run them separately in different terminals:
# Terminal 1: Backend server
npm run dev:server

# Terminal 2: Frontend dev server
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- React Query (TanStack Query)
- JIRA REST API

## JIRA Integration

This application integrates with JIRA to fetch tickets that need refinement. The app uses a backend proxy server to avoid CORS issues when calling the JIRA API.

### Setup

1. Create a `.env` file in the root directory
2. Add the following environment variables:

```env
VITE_JIRA_BASE_URL=https://your-domain.atlassian.net
VITE_JIRA_EMAIL=your-email@example.com
VITE_JIRA_API_TOKEN=your-api-token-here
VITE_JIRA_PROJECT_KEY=PROJ
VITE_JIRA_STATUS_NAME=Need Refinement
VITE_TEAM_MEMBERS=Alice,Bob,Charlie,Diana,Eve
```

**Note:** The backend server reads these same environment variables. The `VITE_` prefix is used for frontend variables, but the backend will read them without the prefix as well.

### Team Members Configuration

Configure your team members using the `VITE_TEAM_MEMBERS` environment variable:

- **Format**: Comma-separated list of names (no spaces around commas, or spaces will be trimmed)
- **Example**: `VITE_TEAM_MEMBERS=Alice,Bob,Charlie,Diana,Eve`
- **Fallback**: If not set, uses default demo members (Alex, Jordan, Sam, Casey, Morgan)

Each team member will be assigned a consistent ID based on their name, so the same name will always get the same ID across sessions.

### Getting a JIRA API Token

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a label (e.g., "Async Story Vote")
4. Copy the generated token and use it as `VITE_JIRA_API_TOKEN`

### Configuration Details

- **VITE_JIRA_BASE_URL**: Your JIRA instance URL (e.g., `https://company.atlassian.net`)
- **VITE_JIRA_EMAIL**: Your JIRA account email address
- **VITE_JIRA_API_TOKEN**: Your JIRA API token (see above)
- **VITE_JIRA_PROJECT_KEY**: (Optional) Filter tickets by project key. If not set, searches all projects
- **VITE_JIRA_STATUS_NAME**: (Optional) The status name to filter by. Defaults to "Need Refinement"
- **VITE_TEAM_MEMBERS**: (Optional) Comma-separated list of team member names (e.g., `Alice,Bob,Charlie,Diana`). If not set, uses default demo members (Alex, Jordan, Sam, Casey, Morgan)
- **VITE_TEAM_MEMBERS**: (Optional) Comma-separated list of team member names (e.g., `Alice,Bob,Charlie`). If not set, uses default demo members

### Running the Application

The application requires both a backend server (for JIRA API calls) and a frontend server:

**Option 1: Run both together (recommended)**
```bash
npm run dev:all
```

**Option 2: Run separately**
```bash
# Terminal 1: Backend server (runs on http://localhost:3001)
npm run dev:server

# Terminal 2: Frontend dev server (runs on http://localhost:8080)
npm run dev
```

The application will automatically:
- Fetch all tickets from JIRA via the backend proxy (avoids CORS issues)
- Display them in the refinement session
- Fall back to demo data if JIRA is not configured or if there's an error

### JIRA Query

The application uses the following JQL query to find tickets:
```
project = "PROJECT_KEY" AND status = "Need Refinement" AND backlog = true
```

If `VITE_JIRA_PROJECT_KEY` is not set, it searches across all projects.

## NeonDB Database Integration

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
   
   This will create all necessary tables. Alternatively, you can:
   - Use the NeonDB SQL editor to run `database/schema.sql`
   - Use `psql <your-connection-string> < database/schema.sql`

### NeonDB PostgreSQL Version

- **Default**: PostgreSQL 17 (for new projects)
- **Supported**: PostgreSQL 14, 15, 16, 17, and 18
- **Auto-updates**: Minor versions are updated automatically

The schema is compatible with all supported NeonDB PostgreSQL versions.

### Database Schema

The database stores:
- **Sessions**: Refinement session metadata
- **Stories**: Only ticket IDs (JIRA issue ID and ticket key) - no descriptions or titles
- **Members**: Display names only (no PII)
- **Votes**: Story point estimates and unclear flags
- **Session State**: Current story index and revealed status

**Important**: The database does NOT store:
- Task descriptions
- Task titles
- Acceptance criteria
- Any sensitive information
- PII (Personally Identifiable Information)

All story details are fetched from JIRA in real-time when needed.

### Features

- **Persistent Voting**: Votes are saved to the database and persist across page refreshes
- **Unclear Flags**: Team members can flag tasks as unclear
- **Session State**: Current position and revealed status are preserved
- **Multi-session Support**: Each refinement session has its own data

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
