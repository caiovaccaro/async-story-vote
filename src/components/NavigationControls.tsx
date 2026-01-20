import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, EyeOff, List } from "lucide-react";

interface NavigationControlsProps {
  canGoBack: boolean;
  canGoForward: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onReveal: () => void;
  onHide: () => void;
  isRevealed: boolean;
  allVoted: boolean;
  onViewAll?: () => void;
}

export function NavigationControls({
  canGoBack,
  canGoForward,
  onPrevious,
  onNext,
  onReveal,
  onHide,
  isRevealed,
  allVoted,
  onViewAll,
}: NavigationControlsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={!canGoBack}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <div className="flex gap-2">
          {isRevealed ? (
            <Button variant="secondary" onClick={onHide} className="gap-2">
              <EyeOff className="w-4 h-4" />
              Hide Votes
            </Button>
          ) : (
            <Button
              onClick={onReveal}
              disabled={!allVoted}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Reveal Votes
            </Button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={!canGoForward}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
      
      {onViewAll && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="gap-2"
          >
            <List className="w-4 h-4" />
            View All Stories
          </Button>
        </div>
      )}
    </div>
  );
}
