import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Story, TeamMember, Vote, StoryPoint, RefinementSession } from "@/types/refinement";
import { fetchJiraTickets } from "@/lib/jira";
import * as dbApi from "@/lib/db-api";
import { getTeamMembersFromEnv } from "@/lib/team-members";

// Demo data (fallback)
const DEMO_STORIES: Story[] = [
  {
    id: "1",
    ticketId: "PROJ-123",
    title: "Implement user authentication with OAuth providers",
    description: "As a user, I want to be able to sign in using my Google or GitHub account so that I don't have to remember another password.",
    acceptanceCriteria: [
      "User can sign in with Google",
      "User can sign in with GitHub",
      "Session persists across browser refreshes",
      "Logout clears all session data",
    ],
  },
  {
    id: "2",
    ticketId: "PROJ-124",
    title: "Add real-time notifications for team updates",
    description: "Users should receive instant notifications when team members comment on or update shared tickets.",
    acceptanceCriteria: [
      "Notifications appear within 2 seconds",
      "User can mark notifications as read",
      "Notification badge shows unread count",
    ],
  },
  {
    id: "3",
    ticketId: "PROJ-125",
    title: "Create export functionality for sprint reports",
    description: "Product owners need to export sprint velocity and burndown data to share with stakeholders.",
    acceptanceCriteria: [
      "Export to PDF format",
      "Export to CSV format",
      "Include velocity chart",
      "Include burndown chart",
    ],
  },
];

export function useRefinementSession() {
  // Get team members from environment variable
  const teamMembers = getTeamMembersFromEnv();
  
  // Pagination state for JIRA stories
  const [jiraPage, setJiraPage] = useState(1);
  const pageSize = 50;
  
  // Fetch stories from JIRA with pagination
  const {
    data: jiraData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["jira-tickets", jiraPage],
    queryFn: () => fetchJiraTickets(jiraPage, pageSize),
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Use JIRA stories if available, otherwise fallback to demo data (only if not loading)
  // Memoize to prevent infinite loops
  const stories = useMemo(() => {
    if (isLoading) return []; // Don't show demo data while loading
    if (jiraData?.stories && jiraData.stories.length > 0) return jiraData.stories;
    return DEMO_STORIES;
  }, [isLoading, jiraData]);

  const [session, setSession] = useState<RefinementSession>({
    id: "refinement-session",
    name: "Sprint Refinement",
    stories: [], // Start with empty array, will be populated when stories load
    members: teamMembers,
    votes: [],
    currentStoryIndex: 0,
    isRevealed: false,
  });

  // Update session stories when they change (but not while loading)
  // Use refs to track previous values and only update when actually changed
  const prevStoriesRef = useRef<Story[]>([]);
  const prevIsLoadingRef = useRef(isLoading);
  const prevJiraDataRef = useRef(jiraData);
  
  useEffect(() => {
    // Check if anything actually changed
    const storiesChanged = prevStoriesRef.current.length !== stories.length || 
      prevStoriesRef.current.some((s, i) => s.id !== stories[i]?.id);
    const isLoadingChanged = prevIsLoadingRef.current !== isLoading;
    const jiraDataChanged = prevJiraDataRef.current !== jiraData;
    
    // Only update if something actually changed
    if (!isLoadingChanged && !storiesChanged && !jiraDataChanged) {
      return;
    }
    
    if (isLoading) {
      // Clear stories while loading
      setSession((prev) => {
        if (prev.stories.length === 0) return prev; // Already empty
        return {
          ...prev,
          stories: [],
        };
      });
    } else if (stories.length > 0) {
      // Update with loaded stories
      setSession((prev) => {
        // Check if stories are the same
        if (prev.stories.length === stories.length && 
            prev.stories.every((s, i) => s.id === stories[i]?.id)) {
          return prev; // No change
        }
        return {
          ...prev,
          stories,
          currentStoryIndex: Math.min(prev.currentStoryIndex, stories.length - 1),
        };
      });
    } else if (!isLoading && !jiraData && error) {
      // JIRA failed, use demo stories
      setSession((prev) => {
        if (prev.stories.length === DEMO_STORIES.length && 
            prev.stories.every((s, i) => s.id === DEMO_STORIES[i]?.id)) {
          return prev; // Already using demo stories
        }
        return {
          ...prev,
          stories: DEMO_STORIES,
        };
      });
    }
    
    // Update refs
    prevStoriesRef.current = stories;
    prevIsLoadingRef.current = isLoading;
    prevJiraDataRef.current = jiraData;
  }, [isLoading, stories, jiraData, error]);

  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);
  const [isDbEnabled, setIsDbEnabled] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const isInitializingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Persistent session ID key for localStorage
  const SESSION_STORAGE_KEY = 'async-story-vote-session-id';

  // Initialize session and load from database
  // Only run after JIRA loading is complete (either loaded or errored)
  useEffect(() => {
    // Wait for JIRA to finish loading (success or error)
    // Only initialize once per session
    if (isLoading || isInitializingRef.current || hasInitializedRef.current) return;

    isInitializingRef.current = true;
    setIsInitializing(true);

    const initializeSession = async () => {
      try {
        // Initialize session ID if not already done - check localStorage first for persistence
        if (!sessionIdRef.current) {
          try {
            // First, check if we have a stored session ID
            const storedSessionId = localStorage.getItem(SESSION_STORAGE_KEY);
            
            if (storedSessionId) {
              console.log("Found stored session ID, checking if it exists:", storedSessionId);
              try {
                // Try to get the existing session
                const existingSession = await dbApi.getSession(storedSessionId);
                if (existingSession) {
                  sessionIdRef.current = existingSession.id;
                  setSession((prev) => ({ ...prev, id: existingSession.id }));
                  setIsDbEnabled(true);
                  console.log("✅ Using existing session:", existingSession.id);
                } else {
                  // Session doesn't exist, create a new one
                  console.log("Stored session not found, creating new session...");
                  const sessionData = await dbApi.createSession("Sprint Refinement");
                  sessionIdRef.current = sessionData.id;
                  localStorage.setItem(SESSION_STORAGE_KEY, sessionData.id);
                  setSession((prev) => ({ ...prev, id: sessionData.id }));
                  setIsDbEnabled(true);
                  console.log("✅ New session created:", sessionData.id);
                }
              } catch (getSessionError) {
                // If getting session fails, try creating a new one
                console.warn("Failed to get existing session, creating new one:", getSessionError);
                const sessionData = await dbApi.createSession("Sprint Refinement");
                sessionIdRef.current = sessionData.id;
                localStorage.setItem(SESSION_STORAGE_KEY, sessionData.id);
                setSession((prev) => ({ ...prev, id: sessionData.id }));
                setIsDbEnabled(true);
                console.log("✅ New session created:", sessionData.id);
              }
            } else {
              // No stored session, create a new one
              console.log("No stored session found, creating new session...");
              const sessionData = await dbApi.createSession("Sprint Refinement");
              sessionIdRef.current = sessionData.id;
              localStorage.setItem(SESSION_STORAGE_KEY, sessionData.id);
              setSession((prev) => ({ ...prev, id: sessionData.id }));
              setIsDbEnabled(true);
              console.log("✅ Session created successfully:", sessionData.id);
            }
          } catch (error) {
            console.warn("⚠️ Database not available, using local state:", error);
            setIsDbEnabled(false);
            isInitializingRef.current = false;
            setIsInitializing(false);
            hasInitializedRef.current = true;
            return;
          }
        }

        const sessionId = sessionIdRef.current;
        if (!sessionId) {
          isInitializingRef.current = false;
          setIsInitializing(false);
          hasInitializedRef.current = true;
          return;
        }

        // Save/update stories if we have them (prefer JIRA stories over demo)
        const storiesToUse = jiraData?.stories && jiraData.stories.length > 0 ? jiraData.stories : (stories.length > 0 ? stories : null);
        
        if (storiesToUse && storiesToUse.length > 0) {
          await dbApi.saveStories(sessionId, storiesToUse);
          
          // Save/update members
          const savedMembers = await dbApi.saveMembers(sessionId, teamMembers);

          // Load votes and state from database
          // Votes are now global per story, so fetch votes for all stories in this session
          const storyIds = storiesToUse.map(s => s.id);
          const [votesRaw, state] = await Promise.all([
            dbApi.getVotesForStories(storyIds).catch(() => []),
            dbApi.getSessionState(sessionId).catch(() => ({ currentStoryIndex: 0, isRevealed: false })),
          ]);
          
          // Deduplicate votes: ensure only one vote per (memberId, storyId) combination
          // This is a safety check in case the database somehow has duplicates
          const votes = votesRaw.reduce((acc, vote) => {
            const existing = acc.find(
              (v) => v.memberId === vote.memberId && v.storyId === vote.storyId
            );
            if (!existing) {
              acc.push(vote);
            } else {
              // If duplicate found, keep the most recent one (based on updated_at if available)
              // For now, just keep the first one found
            }
            return acc;
          }, [] as Vote[]);

          setSession((prev) => ({
            ...prev,
            id: sessionId,
            stories: storiesToUse,
            members: savedMembers,
            votes,
            currentStoryIndex: Math.min(state.currentStoryIndex, storiesToUse.length - 1),
            isRevealed: state.isRevealed,
          }));
        } else {
          // No stories yet, but initialize members and state
          const savedMembers = await dbApi.saveMembers(sessionId, teamMembers);
          const state = await dbApi.getSessionState(sessionId).catch(() => ({ currentStoryIndex: 0, isRevealed: false }));

          setSession((prev) => ({
            ...prev,
            id: sessionId,
            members: savedMembers,
            currentStoryIndex: state.currentStoryIndex,
            isRevealed: state.isRevealed,
          }));
        }
      } catch (error) {
        console.warn("Error updating session:", error);
        // Fallback to local state
        if (stories && stories.length > 0) {
          setSession((prev) => ({
            ...prev,
            stories,
            currentStoryIndex: Math.min(prev.currentStoryIndex, stories.length - 1),
          }));
        }
      } finally {
        isInitializingRef.current = false;
        setIsInitializing(false);
        hasInitializedRef.current = true;
      }
    };

    initializeSession();
  }, [isLoading, jiraData, stories, teamMembers]);

  // Update currentMember to use database UUID when members are updated
  useEffect(() => {
    if (currentMember && session.members.length > 0) {
      const dbMember = session.members.find(m => m.name === currentMember.name);
      if (dbMember && dbMember.id !== currentMember.id) {
        // Only update if the ID is different (hash-based vs UUID)
        setCurrentMember(dbMember);
      }
    }
  }, [session.members, currentMember]);

  const currentStory = session.stories[session.currentStoryIndex];

  // Find current vote using the database member ID (if available) or fallback to currentMember.id
  const dbMemberForVote = currentMember ? session.members.find(m => m.name === currentMember.name) : null;
  const memberIdForVote = dbMemberForVote?.id || currentMember?.id;
  
  const currentVote = session.votes.find(
    (v) => v.memberId === memberIdForVote && v.storyId === currentStory?.id
  );

  const storyVotes = session.votes.filter((v) => v.storyId === currentStory?.id);
  const allVoted = storyVotes.length === session.members.length;

  const submitVote = useCallback(
    async (points: StoryPoint) => {
      if (!currentMember || !currentStory) {
        console.warn("Cannot submit vote: missing currentMember or currentStory");
        return;
      }

      if (!session.id) {
        console.error("Cannot save vote: session.id is not set");
        return;
      }

      // Look up member from session.members to get the correct UUID
      const dbMember = session.members.find(m => m.name === currentMember.name);
      const memberId = dbMember?.id || currentMember.id;

      if (!memberId) {
        console.error("Cannot save vote: memberId is not set", { currentMember, dbMember, sessionMembers: session.members });
        return;
      }

      // Check if user is trying to vote the same value they already voted
      const existingVote = session.votes.find(
        (v) => v.memberId === memberId && v.storyId === currentStory.id
      );
      
      // If clicking the same value, do nothing (can't vote twice on the same value)
      if (existingVote && existingVote.points === points) {
        console.log("Already voted this value, ignoring click");
        return;
      }

      const newVote: Vote = {
        memberId,
        storyId: currentStory.id,
        points,
        isUnclear: existingVote?.isUnclear || false, // Preserve unclear flag if changing vote
      };

      setSession((prev) => {
        const existingVoteIndex = prev.votes.findIndex(
          (v) => v.memberId === memberId && v.storyId === currentStory.id
        );

        const newVotes = [...prev.votes];
        if (existingVoteIndex >= 0) {
          // Update existing vote (user is changing their vote)
          newVotes[existingVoteIndex] = newVote;
        } else {
          // Add new vote (user hasn't voted on this story yet)
          newVotes.push(newVote);
        }

        // Ensure no duplicates: filter to keep only one vote per (memberId, storyId) combination
        // This is a safety check in case of any race conditions
        const deduplicatedVotes = newVotes.reduce((acc, vote) => {
          const existing = acc.find(
            (v) => v.memberId === vote.memberId && v.storyId === vote.storyId
          );
          if (!existing) {
            acc.push(vote);
          } else {
            // If duplicate found, keep the most recent one (the one we just added/updated)
            const existingIndex = acc.indexOf(existing);
            acc[existingIndex] = vote;
          }
          return acc;
        }, [] as Vote[]);

        return { ...prev, votes: deduplicatedVotes };
      });

      // Always try to persist to database if session ID exists
      // Don't rely on isDbEnabled flag - try to save and handle errors gracefully
      if (session.id) {
        try {
          console.log("Saving vote to database:", {
            sessionId: session.id,
            storyId: currentStory.id,
            memberId,
            memberName: currentMember.name,
            points,
          });
          await dbApi.saveVote(session.id, currentStory.id, memberId, points, false, currentMember.name);
          console.log("✅ Vote saved successfully to database");
          
          // Update isDbEnabled flag if save was successful
          if (!isDbEnabled) {
            setIsDbEnabled(true);
          }
          
          // Reload votes from database to ensure consistency
          try {
            const storyIds = session.stories.map(s => s.id);
            const updatedVotes = await dbApi.getVotesForStories(storyIds);
            setSession((prev) => ({ ...prev, votes: updatedVotes }));
            console.log("✅ Votes reloaded from database:", updatedVotes.length);
          } catch (reloadError) {
            console.warn("⚠️ Failed to reload votes after saving:", reloadError);
            // Continue with local state update
          }
        } catch (error) {
          console.error("❌ Failed to save vote to database:", error);
          // Don't throw - allow local state to be updated even if DB save fails
          // This ensures the UI still works even if database is temporarily unavailable
        }
      } else {
        console.warn("⚠️ Cannot save vote: session.id is not set");
      }
    },
    [currentMember, currentStory, session.id, session.members, isDbEnabled]
  );

  const toggleUnclear = useCallback(async () => {
    if (!currentMember || !currentStory) {
      console.warn("Cannot toggle unclear: missing currentMember or currentStory");
      return;
    }

    if (!session.id) {
      console.error("Cannot save unclear flag: session.id is not set");
      return;
    }

    // Look up member from session.members to get the correct UUID
    const dbMember = session.members.find(m => m.name === currentMember.name);
    const memberId = dbMember?.id || currentMember.id;

    if (!memberId) {
      console.error("Cannot save unclear flag: memberId is not set", { currentMember, dbMember, sessionMembers: session.members });
      return;
    }

    const existingVote = session.votes.find(
      (v) => v.memberId === memberId && v.storyId === currentStory.id
    );

    const isUnclear = existingVote ? !existingVote.isUnclear : true;
    const points = existingVote?.points || '?';

    const updatedVote: Vote = {
      memberId,
      storyId: currentStory.id,
      points,
      isUnclear,
    };

    setSession((prev) => {
      const existingVoteIndex = prev.votes.findIndex(
        (v) => v.memberId === memberId && v.storyId === currentStory.id
      );

      const newVotes = [...prev.votes];
      if (existingVoteIndex >= 0) {
        // Update existing vote
        newVotes[existingVoteIndex] = updatedVote;
      } else {
        // Add new vote (user hasn't voted on this story yet)
        newVotes.push(updatedVote);
      }

      // Ensure no duplicates: filter to keep only one vote per (memberId, storyId) combination
      const deduplicatedVotes = newVotes.reduce((acc, vote) => {
        const existing = acc.find(
          (v) => v.memberId === vote.memberId && v.storyId === vote.storyId
        );
        if (!existing) {
          acc.push(vote);
        } else {
          // If duplicate found, keep the most recent one (the one we just added/updated)
          const existingIndex = acc.indexOf(existing);
          acc[existingIndex] = vote;
        }
        return acc;
      }, [] as Vote[]);

      return { ...prev, votes: deduplicatedVotes };
    });

    // Always try to persist to database if session ID exists
    if (session.id) {
      try {
        console.log("Saving unclear flag to database:", {
          sessionId: session.id,
          storyId: currentStory.id,
          memberId,
          memberName: currentMember.name,
          isUnclear,
        });
        await dbApi.saveVote(session.id, currentStory.id, memberId, points, isUnclear, currentMember.name);
        console.log("✅ Unclear flag saved successfully to database");
        
        // Update isDbEnabled flag if save was successful
        if (!isDbEnabled) {
          setIsDbEnabled(true);
        }
        
        // Reload votes from database to ensure consistency
        try {
          const updatedVotes = await dbApi.getVotes(session.id);
          setSession((prev) => ({ ...prev, votes: updatedVotes }));
          console.log("✅ Votes reloaded from database after unclear toggle:", updatedVotes.length);
        } catch (reloadError) {
          console.warn("⚠️ Failed to reload votes after saving unclear flag:", reloadError);
        }
      } catch (error) {
        console.error("❌ Failed to save unclear flag to database:", error);
        // Don't throw - allow local state to be updated even if DB save fails
      }
    } else {
      console.warn("⚠️ Cannot save unclear flag: session.id is not set");
    }
  }, [currentMember, currentStory, session.votes, session.members, session.id, isDbEnabled]);

  const saveSessionState = useCallback(async (currentStoryIndex: number, isRevealed: boolean) => {
    // Always try to persist to database if session ID exists
    if (session.id) {
      try {
        await dbApi.saveSessionState(session.id, currentStoryIndex, isRevealed);
      } catch (error) {
        console.error("Failed to save session state:", error);
      }
    }
  }, [session.id]);

  const goToStory = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, session.stories.length - 1));
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: newIndex,
      isRevealed: false,
    }));
    saveSessionState(newIndex, false);
  }, [session.stories.length, saveSessionState]);

  const goToNextStory = useCallback(() => {
    const newIndex = Math.min(session.currentStoryIndex + 1, session.stories.length - 1);
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: newIndex,
      isRevealed: false,
    }));
    saveSessionState(newIndex, false);
  }, [session.currentStoryIndex, session.stories.length, saveSessionState]);

  const goToPreviousStory = useCallback(() => {
    const newIndex = Math.max(session.currentStoryIndex - 1, 0);
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: newIndex,
      isRevealed: false,
    }));
    saveSessionState(newIndex, false);
  }, [session.currentStoryIndex, saveSessionState]);

  const revealVotes = useCallback(() => {
    setSession((prev) => ({ ...prev, isRevealed: true }));
    saveSessionState(session.currentStoryIndex, true);
  }, [session.currentStoryIndex, saveSessionState]);

  const hideVotes = useCallback(() => {
    setSession((prev) => ({ ...prev, isRevealed: false }));
    saveSessionState(session.currentStoryIndex, false);
  }, [session.currentStoryIndex, saveSessionState]);

  const isUnclear = currentVote?.isUnclear || false;

  return {
    session,
    currentMember,
    setCurrentMember,
    currentStory,
    currentVote,
    allVoted,
    submitVote,
    toggleUnclear,
    isUnclear,
    goToStory,
    goToNextStory,
    goToPreviousStory,
    revealVotes,
    hideVotes,
    isLoading,
    isInitializing,
    error,
    isUsingJira: !!jiraData?.stories && jiraData.stories.length > 0,
    jiraPage,
    setJiraPage,
    jiraTotal: jiraData?.total || 0,
    jiraHasMore: jiraData?.hasMore || false,
    jiraPageSize: pageSize,
  };
}
