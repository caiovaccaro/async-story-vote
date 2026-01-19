import { cn } from "@/lib/utils";
import { StoryPoint } from "@/types/refinement";

interface VoteCardProps {
  value: StoryPoint;
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const getCardClass = (value: StoryPoint) => {
  if (value === '?') return 'vote-card-question';
  return `vote-card-${value}`;
};

export function VoteCard({ value, selected, onClick, disabled }: VoteCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "vote-card w-20 h-28 sm:w-24 sm:h-32 flex flex-col items-center justify-center",
        getCardClass(value),
        selected && "selected",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      <span className="font-mono text-3xl sm:text-4xl font-bold text-foreground">
        {value}
      </span>
      <span className="text-xs text-muted-foreground mt-2">
        {value === '?' ? 'Unsure' : 'points'}
      </span>
    </button>
  );
}
