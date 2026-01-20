-- NeonDB PostgreSQL Schema for Async Story Vote
-- This schema stores voting data and UI state without sensitive information
-- No PII, task descriptions, or titles are stored

-- Sessions table - stores refinement session metadata
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Stories table - stores only ticket IDs (not descriptions/titles)
CREATE TABLE IF NOT EXISTS stories (
    id VARCHAR(255) NOT NULL, -- JIRA issue ID
    ticket_id VARCHAR(100) NOT NULL, -- JIRA ticket key (e.g., "MAXX-123")
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, session_id),
    UNIQUE(session_id, ticket_id)
);

-- Members table - stores team member info (minimal, no PII)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- Display name only
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, name)
);

-- Votes table - stores voting data
CREATE TABLE IF NOT EXISTS votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    story_id VARCHAR(255) NOT NULL, -- JIRA issue ID (references stories.id, but can't use FK due to composite key)
    member_id UUID REFERENCES members(id) ON DELETE CASCADE,
    points VARCHAR(10) NOT NULL, -- Story points: '1', '2', '3', '5', '8', '13', '21', '?'
    is_unclear BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, story_id, member_id),
    -- Foreign key constraint using both story_id and session_id to match stories composite key
    FOREIGN KEY (story_id, session_id) REFERENCES stories(id, session_id) ON DELETE CASCADE
);

-- Session state table - stores UI state (current story index, revealed status)
CREATE TABLE IF NOT EXISTS session_state (
    session_id UUID PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
    current_story_index INTEGER DEFAULT 0,
    is_revealed BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_session_id ON stories(session_id);
CREATE INDEX IF NOT EXISTS idx_stories_ticket_id ON stories(ticket_id);
CREATE INDEX IF NOT EXISTS idx_members_session_id ON members(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_votes_story_id ON votes(story_id);
CREATE INDEX IF NOT EXISTS idx_votes_member_id ON votes(member_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_story ON votes(session_id, story_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_session_state_updated_at BEFORE UPDATE ON session_state
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

