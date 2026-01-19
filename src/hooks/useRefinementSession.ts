import { useState, useCallback } from "react";
import { Story, TeamMember, Vote, StoryPoint, RefinementSession } from "@/types/refinement";

// Demo data
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

const DEMO_MEMBERS: TeamMember[] = [
  { id: "1", name: "Alex" },
  { id: "2", name: "Jordan" },
  { id: "3", name: "Sam" },
  { id: "4", name: "Casey" },
  { id: "5", name: "Morgan" },
];

export function useRefinementSession() {
  const [session, setSession] = useState<RefinementSession>({
    id: "demo-session",
    name: "Sprint 24 Refinement",
    stories: DEMO_STORIES,
    members: DEMO_MEMBERS,
    votes: [],
    currentStoryIndex: 0,
    isRevealed: false,
  });

  const [currentMember, setCurrentMember] = useState<TeamMember | null>(null);

  const currentStory = session.stories[session.currentStoryIndex];

  const currentVote = session.votes.find(
    (v) => v.memberId === currentMember?.id && v.storyId === currentStory?.id
  );

  const storyVotes = session.votes.filter((v) => v.storyId === currentStory?.id);
  const allVoted = storyVotes.length === session.members.length;

  const submitVote = useCallback(
    (points: StoryPoint) => {
      if (!currentMember || !currentStory) return;

      setSession((prev) => {
        const existingVoteIndex = prev.votes.findIndex(
          (v) => v.memberId === currentMember.id && v.storyId === currentStory.id
        );

        const newVote: Vote = {
          memberId: currentMember.id,
          storyId: currentStory.id,
          points,
        };

        const newVotes = [...prev.votes];
        if (existingVoteIndex >= 0) {
          newVotes[existingVoteIndex] = newVote;
        } else {
          newVotes.push(newVote);
        }

        return { ...prev, votes: newVotes };
      });
    },
    [currentMember, currentStory]
  );

  const goToStory = useCallback((index: number) => {
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: Math.max(0, Math.min(index, prev.stories.length - 1)),
      isRevealed: false,
    }));
  }, []);

  const goToNextStory = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: Math.min(prev.currentStoryIndex + 1, prev.stories.length - 1),
      isRevealed: false,
    }));
  }, []);

  const goToPreviousStory = useCallback(() => {
    setSession((prev) => ({
      ...prev,
      currentStoryIndex: Math.max(prev.currentStoryIndex - 1, 0),
      isRevealed: false,
    }));
  }, []);

  const revealVotes = useCallback(() => {
    setSession((prev) => ({ ...prev, isRevealed: true }));
  }, []);

  const hideVotes = useCallback(() => {
    setSession((prev) => ({ ...prev, isRevealed: false }));
  }, []);

  return {
    session,
    currentMember,
    setCurrentMember,
    currentStory,
    currentVote,
    allVoted,
    submitVote,
    goToStory,
    goToNextStory,
    goToPreviousStory,
    revealVotes,
    hideVotes,
  };
}
