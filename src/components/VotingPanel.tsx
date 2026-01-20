import { VoteCard } from "./VoteCard";
import { Button } from "./ui/button";
import { STORY_POINTS, StoryPoint } from "@/types/refinement";
import { AlertTriangle } from "lucide-react";

interface VotingPanelProps {
  selectedPoints: StoryPoint | null;
  onVote: (points: StoryPoint) => void;
  hasVoted: boolean;
  isRevealed: boolean;
  isUnclear: boolean;
  onToggleUnclear: () => void;
}

export function VotingPanel({ 
  selectedPoints, 
  onVote, 
  hasVoted, 
  isRevealed,
  isUnclear,
  onToggleUnclear 
}: VotingPanelProps) {
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

      <div className="flex justify-center pt-2">
        <Button
          variant={isUnclear ? "destructive" : "outline"}
          size="sm"
          onClick={onToggleUnclear}
          disabled={isRevealed}
          className="gap-2"
        >
          <AlertTriangle className="h-4 w-4" />
          {isUnclear ? "Marked as Unclear" : "Flag as Unclear"}
        </Button>
      </div>
    </div>
  );
}
