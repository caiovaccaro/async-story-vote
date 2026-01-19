import { useState } from "react";
import { Header } from "@/components/Header";
import { StoryDisplay } from "@/components/StoryDisplay";
import { VotingPanel } from "@/components/VotingPanel";
import { TeamVotesReveal } from "@/components/TeamVotesReveal";
import { NavigationControls } from "@/components/NavigationControls";
import { MemberSelector } from "@/components/MemberSelector";
import { StoryListView } from "@/components/StoryListView";
import { useRefinementSession } from "@/hooks/useRefinementSession";
import { Button } from "@/components/ui/button";
import { List, Vote } from "lucide-react";

const Index = () => {
  const [viewMode, setViewMode] = useState<"voting" | "list">("voting");

  const {
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
  } = useRefinementSession();

  if (!currentMember) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header sessionName={session.name} memberCount={session.members.length} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-lg animate-fade-in-up">
            <MemberSelector
              members={session.members}
              selectedMember={currentMember}
              onSelect={setCurrentMember}
            />
          </div>
        </main>
      </div>
    );
  }

  const handleSelectStory = (index: number) => {
    goToStory(index);
    setViewMode("voting");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header sessionName={session.name} memberCount={session.members.length} />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* View Toggle */}
        <div className="flex justify-center gap-2">
          <Button
            variant={viewMode === "voting" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("voting")}
            className="gap-2"
          >
            <Vote className="h-4 w-4" />
            Voting
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <List className="h-4 w-4" />
            All Stories
          </Button>
        </div>

        {viewMode === "list" ? (
          <div className="animate-fade-in-up">
            <StoryListView
              stories={session.stories}
              votes={session.votes}
              members={session.members}
              onSelectStory={handleSelectStory}
              currentStoryIndex={session.currentStoryIndex}
            />
          </div>
        ) : (
          currentStory && (
            <>
              <div className="animate-fade-in-up">
                <StoryDisplay
                  story={currentStory}
                  currentIndex={session.currentStoryIndex}
                  totalStories={session.stories.length}
                />
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: "100ms" }}>
                <VotingPanel
                  selectedPoints={currentVote?.points ?? null}
                  onVote={submitVote}
                  hasVoted={!!currentVote}
                  isRevealed={session.isRevealed}
                />
              </div>

              <div className="animate-fade-in-up" style={{ animationDelay: "200ms" }}>
                <TeamVotesReveal
                  votes={session.votes}
                  members={session.members}
                  isRevealed={session.isRevealed}
                  storyId={currentStory.id}
                />
              </div>

              <div className="animate-fade-in-up pt-4" style={{ animationDelay: "300ms" }}>
                <NavigationControls
                  canGoBack={session.currentStoryIndex > 0}
                  canGoForward={session.currentStoryIndex < session.stories.length - 1}
                  onPrevious={goToPreviousStory}
                  onNext={goToNextStory}
                  onReveal={revealVotes}
                  onHide={hideVotes}
                  isRevealed={session.isRevealed}
                  allVoted={allVoted}
                />
              </div>
            </>
          )
        )}
      </main>
    </div>
  );
};

export default Index;
