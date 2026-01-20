export interface Story {
  id: string;
  title: string;
  description: string;
  descriptionHtml?: string; // HTML version for proper rendering
  acceptanceCriteria?: string[];
  ticketId: string;
  issueType?: string; // Task type (e.g., Story, Bug, Task)
  createdDate?: string; // ISO date string
}

export interface Vote {
  memberId: string;
  storyId: string;
  points: StoryPoint;
  isUnclear?: boolean;
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
