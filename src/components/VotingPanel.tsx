import { VoteCard } from "./VoteCard";
import { STORY_POINTS, StoryPoint } from "@/types/refinement";

interface VotingPanelProps {
  selectedPoints: StoryPoint | null;
  onVote: (points: StoryPoint) => void;
  hasVoted: boolean;
  isRevealed: boolean;
}

export function VotingPanel({ selectedPoints, onVote, hasVoted, isRevealed }: VotingPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Your Estimate</h3>
        {hasVoted && !isRevealed && (
          <span className="text-sm text-vote-3 font-medium">Vote submitted ✓</span>
        )}
      </div>
      
      <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
        {STORY_POINTS.map((points) => (
          <VoteCard
            key={points}
            value={points}
            selected={selectedPoints === points}
            onClick={() => onVote(points)}
            disabled={isRevealed}
          />
        ))}
      </div>
    </div>
  );
}
