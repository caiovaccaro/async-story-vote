import { Header } from "@/components/Header";
import { StoryDisplay } from "@/components/StoryDisplay";
import { VotingPanel } from "@/components/VotingPanel";
import { TeamVotesReveal } from "@/components/TeamVotesReveal";
import { NavigationControls } from "@/components/NavigationControls";
import { MemberSelector } from "@/components/MemberSelector";
import { useRefinementSession } from "@/hooks/useRefinementSession";

const Index = () => {
  const {
    session,
    currentMember,
    setCurrentMember,
    currentStory,
    currentVote,
    allVoted,
    submitVote,
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header sessionName={session.name} memberCount={session.members.length} />

      <main className="flex-1 container max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {currentStory && (
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
        )}
      </main>
    </div>
  );
};

export default Index;
