export interface Story {
  id: string;
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  ticketId: string;
}

export interface Vote {
  memberId: string;
  storyId: string;
  points: StoryPoint;
}

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface RefinementSession {
  id: string;
  name: string;
  stories: Story[];
  members: TeamMember[];
  votes: Vote[];
  currentStoryIndex: number;
  isRevealed: boolean;
}

export const STORY_POINTS = [1, 2, 3, 5, 8, 13, 21, '?'] as const;
export type StoryPoint = typeof STORY_POINTS[number];
