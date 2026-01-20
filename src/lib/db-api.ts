import { Story, TeamMember, Vote, RefinementSession } from "@/types/refinement";

const API_BASE_URL = import.meta.env.DEV ? '' : (import.meta.env.VITE_API_URL || '');

/**
 * Create a new session
 */
export async function createSession(name: string): Promise<{ id: string; name: string }> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) throw new Error('Failed to create session');
  return response.json();
}

/**
 * Save stories for a session (only ticket IDs, not descriptions)
 * Saves all stories in a single request (backend handles batching if needed)
 */
export async function saveStories(sessionId: string, stories: Story[]): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/stories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stories }),
  });
  if (!response.ok) throw new Error('Failed to save stories');
}

/**
 * Get stories for a session
 */
export async function getStories(sessionId: string): Promise<Array<{ id: string; ticketId: string }>> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/stories`);
  if (!response.ok) throw new Error('Failed to get stories');
  return response.json();
}

/**
 * Save members for a session
 * Returns members with database-generated UUIDs
 */
export async function saveMembers(sessionId: string, members: TeamMember[]): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ members }),
  });
  if (!response.ok) throw new Error('Failed to save members');
  const data = await response.json();
  return data.members || members; // Return members with DB UUIDs, or fallback to original
}

/**
 * Get members for a session
 */
export async function getMembers(sessionId: string): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/members`);
  if (!response.ok) throw new Error('Failed to get members');
  return response.json();
}

/**
 * Save a vote
 */
export async function saveVote(
  sessionId: string,
  storyId: string,
  memberId: string,
  points: string | number,
  isUnclear: boolean = false,
  memberName?: string
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/votes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ storyId, memberId, points, isUnclear, memberName }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to save vote' }));
    throw new Error(error.error || 'Failed to save vote');
  }
}

/**
 * Get all votes for a session
 */
export async function getVotes(sessionId: string): Promise<Vote[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/votes`);
  if (!response.ok) throw new Error('Failed to get votes');
  return response.json();
}

/**
 * Get votes for a specific story
 */
export async function getStoryVotes(sessionId: string, storyId: string): Promise<Vote[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/stories/${storyId}/votes`);
  if (!response.ok) throw new Error('Failed to get story votes');
  return response.json();
}

/**
 * Get members who flagged a story as unclear
 */
export async function getUnclearFlags(sessionId: string, storyId: string): Promise<TeamMember[]> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/stories/${storyId}/unclear`);
  if (!response.ok) throw new Error('Failed to get unclear flags');
  return response.json();
}

/**
 * Save session state
 */
export async function saveSessionState(
  sessionId: string,
  currentStoryIndex: number,
  isRevealed: boolean
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentStoryIndex, isRevealed }),
  });
  if (!response.ok) throw new Error('Failed to save session state');
}

/**
 * Get session state
 */
export async function getSessionState(sessionId: string): Promise<{
  currentStoryIndex: number;
  isRevealed: boolean;
}> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}/state`);
  if (!response.ok) throw new Error('Failed to get session state');
  return response.json();
}

