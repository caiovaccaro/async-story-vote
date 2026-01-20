import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/Header";
import { StoryDisplay } from "@/components/StoryDisplay";
import { VotingPanel } from "@/components/VotingPanel";
import { TeamVotesReveal } from "@/components/TeamVotesReveal";
import { NavigationControls } from "@/components/NavigationControls";
import { MemberSelector } from "@/components/MemberSelector";
import { StoryListView } from "@/components/StoryListView";
import { useRefinementSession } from "@/hooks/useRefinementSession";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { List, Vote, Loader2, AlertCircle, RefreshCw } from "lucide-react";

const Index = () => {
  const [viewMode, setViewMode] = useState<"voting" | "list">("voting");
  const [shouldScrollToList, setShouldScrollToList] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const {
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
    isUsingJira,
    jiraPage,
    setJiraPage,
    jiraTotal,
    jiraHasMore,
    jiraPageSize,
  } = useRefinementSession();

  // Scroll to top when navigating between stories in voting mode
  // This must be called before any early returns to maintain hook order
  const currentStoryIndex = session.currentStoryIndex;
  const prevStoryIndexRef = useRef(currentStoryIndex);
  const prevViewModeRef = useRef(viewMode);
  
  useEffect(() => {
    // Only scroll if the story index actually changed and we're in voting mode
    if (viewMode === "voting" && currentMember && prevStoryIndexRef.current !== currentStoryIndex) {
      prevStoryIndexRef.current = currentStoryIndex;
      // Use requestAnimationFrame to avoid triggering during render cycle
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    if (prevViewModeRef.current !== viewMode) {
      prevViewModeRef.current = viewMode;
    }
  }, [currentStoryIndex, viewMode, currentMember]);

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
    // Scroll to top when selecting a story - the useEffect will handle this
  };

  const handleViewAllStories = () => {
    setViewMode("list");
    setShouldScrollToList(true);
    // Reset after a delay
    setTimeout(() => setShouldScrollToList(false), 500);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header sessionName={session.name} memberCount={session.members.length} />

      <main ref={mainRef} className="flex-1 container max-w-5xl mx-auto px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Loading State - Show when loading JIRA or initializing database */}
        {isLoading || isInitializing ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">
              {isLoading ? "Loading stories from JIRA..." : "Initializing session..."}
            </p>
          </div>
        ) : (
          <>
            {/* Error State */}
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error loading JIRA tickets</AlertTitle>
                <AlertDescription className="mt-2">
                  {error instanceof Error ? error.message : "Failed to fetch tickets from JIRA"}
                  <br />
                  <span className="text-sm mt-2 block">
                    Falling back to demo data. Please check your JIRA credentials in the .env file.
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Info Alert when using demo data */}
            {!error && !isUsingJira && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Using demo data</AlertTitle>
            <AlertDescription>
              JIRA integration is not configured or no tickets found. Configure your JIRA credentials in the .env file to load real tickets.
            </AlertDescription>
          </Alert>
        )}

            {/* Empty State */}
            {session.stories.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No stories found</h3>
            <p className="text-muted-foreground text-center max-w-md">
              No tickets were found in JIRA with the specified status. Please check your filters or add tickets to the backlog.
            </p>
          </div>
        )}

            {/* View Toggle */}
            {session.stories.length > 0 && (
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
        )}

            {session.stories.length > 0 && viewMode === "list" ? (
              <div className="animate-fade-in-up">
                <StoryListView
                  stories={session.stories}
                  votes={session.votes}
                  members={session.members}
                  onSelectStory={handleSelectStory}
                  currentStoryIndex={session.currentStoryIndex}
                  shouldScrollToCurrent={shouldScrollToList}
                  currentPage={jiraPage}
                  totalPages={jiraTotal > 0 ? Math.ceil(jiraTotal / jiraPageSize) : (jiraHasMore ? jiraPage + 1 : jiraPage)}
                  hasMore={jiraHasMore}
                  onPageChange={(page) => {
                    setJiraPage(page);
                    // Scroll to top when changing pages
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              </div>
            ) : currentStory ? (
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
                    isUnclear={isUnclear}
                    onToggleUnclear={toggleUnclear}
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
                    onViewAll={handleViewAllStories}
                  />
                </div>
              </>
            ) : null}
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
