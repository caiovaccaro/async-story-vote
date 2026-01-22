import { Story, Vote, TeamMember } from "@/types/refinement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Users, AlertTriangle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useEffect, useRef } from "react";

// Get JIRA base URL from environment
function getJiraBaseUrl(): string {
  return import.meta.env.VITE_JIRA_BASE_URL || '';
}

// Generate JIRA ticket URL
function getJiraTicketUrl(ticketId: string): string {
  const baseUrl = getJiraBaseUrl();
  if (!baseUrl) return '#';
  return `${baseUrl}/browse/${ticketId}`;
}

interface StoryListViewProps {
  stories: Story[];
  votes: Vote[];
  members: TeamMember[];
  onSelectStory: (index: number) => void;
  currentStoryIndex: number;
  shouldScrollToCurrent?: boolean;
  currentPage?: number;
  totalPages?: number;
  hasMore?: boolean;
  onPageChange?: (page: number) => void;
}

function calculateVoteStats(storyId: string, votes: Vote[], memberCount: number) {
  const storyVotes = votes.filter((v) => v.storyId === storyId);
  
  // Convert votes to numbers, handling both number and string types
  // Filter out '?' and invalid values
  // Note: Unclear flags (isUnclear) don't affect the average calculation
  // The average is calculated from numeric votes only, regardless of unclear flags
  const numericVotes = storyVotes
    .map((v) => {
      const points = v.points;
      if (points === '?') return null;
      // Handle both number and string types
      const num = typeof points === 'number' ? points : Number(points);
      return isNaN(num) ? null : num;
    })
    .filter((p): p is number => p !== null);

  const voteCount = storyVotes.length;
  const allVoted = voteCount === memberCount;
  // Count unclear flags - explicitly check for true (handles boolean, string "true", etc.)
  const unclearCount = storyVotes.filter((v) => {
    // Handle boolean true, string "true", or truthy values
    return v.isUnclear === true || v.isUnclear === "true" || Boolean(v.isUnclear);
  }).length;
  
  // Debug logging for unclear flags
  if (process.env.NODE_ENV === 'development' && voteCount > 0) {
    const unclearVotes = storyVotes.filter((v) => {
      return v.isUnclear === true || v.isUnclear === "true" || Boolean(v.isUnclear);
    });
    console.log(`🔍 Story ${storyId} unclear flag analysis:`, {
      voteCount,
      unclearCount,
      unclearVotesCount: unclearVotes.length,
      allVotes: storyVotes.map(v => ({ 
        points: v.points, 
        isUnclear: v.isUnclear,
        isUnclearType: typeof v.isUnclear,
        isUnclearTruthy: Boolean(v.isUnclear),
        memberId: v.memberId,
        memberName: v.memberName,
      })),
      unclearVotes: unclearVotes.map(v => ({
        points: v.points,
        isUnclear: v.isUnclear,
        memberName: v.memberName,
      })),
    });
  }

  // Always calculate average if there are any numeric votes, even if not all voted
  // This is independent of unclear flags - unclear flags don't affect the average
  const average = numericVotes.length > 0 
    ? numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length 
    : null;
  const allSame = numericVotes.length > 0 && numericVotes.every((v) => v === numericVotes[0]);
  const consensus: number | null = allSame ? numericVotes[0] : null;

  // Debug logging to understand why average might not show
  if (process.env.NODE_ENV === 'development' && voteCount > 0) {
    if (average === null) {
      console.log(`⚠️ Story ${storyId} has ${voteCount} votes but no average:`, {
        storyVotes: storyVotes.map(v => ({ 
          points: v.points, 
          isUnclear: v.isUnclear,
          memberId: v.memberId,
          memberName: v.memberName,
        })),
        numericVotesCount: numericVotes.length,
        numericVotes: numericVotes,
      });
    } else {
      console.log(`✅ Story ${storyId} has ${voteCount} votes, ${numericVotes.length} numeric, average: ${average.toFixed(1)}`);
    }
  }

  return { average, consensus, voteCount, allVoted, unclearCount };
}

function getStatusColor(allVoted: boolean, consensus: number | null) {
  if (!allVoted) return "bg-muted text-muted-foreground";
  if (consensus !== null) return "bg-green-500/10 text-green-600 border-green-500/20";
  return "bg-amber-500/10 text-amber-600 border-amber-500/20";
}

export function StoryListView({
  stories,
  votes,
  members,
  onSelectStory,
  currentStoryIndex,
  shouldScrollToCurrent = false,
  currentPage = 1,
  totalPages = 1,
  hasMore = false,
  onPageChange,
}: StoryListViewProps) {
  const currentStoryRef = useRef<HTMLDivElement>(null);
  const prevStoryIndexRef = useRef(currentStoryIndex);

  // Debug: Log pagination props
  useEffect(() => {
    console.log('StoryListView pagination props:', {
      currentPage,
      totalPages,
      hasMore,
      hasOnPageChange: !!onPageChange,
      storiesCount: stories.length,
    });
  }, [currentPage, totalPages, hasMore, onPageChange, stories.length]);

  // Scroll to current story when switching to list view or when story index changes
  useEffect(() => {
    if (currentStoryRef.current && (shouldScrollToCurrent || prevStoryIndexRef.current !== currentStoryIndex)) {
      prevStoryIndexRef.current = currentStoryIndex;
      setTimeout(() => {
        if (currentStoryRef.current) {
          currentStoryRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [currentStoryIndex, shouldScrollToCurrent]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && onPageChange) {
      // Allow going to next page if hasMore is true, or if we know totalPages
      if (totalPages > 1 && newPage > totalPages) {
        return;
      }
      // If we don't know total pages but don't have more, prevent going beyond current
      if (!hasMore && !totalPages && newPage > currentPage) {
        return;
      }
      onPageChange(newPage);
    }
  };

  // Generate page numbers to show (max 7 pages: current ± 3)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7;
    
    // If we know the total pages, use it; otherwise only show current and next (if hasMore)
    const useKnownTotal = totalPages > 1;
    const maxPageToShow = useKnownTotal ? totalPages : (hasMore ? currentPage + 1 : currentPage);
    
    if (maxPageToShow <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= maxPageToShow; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('...');
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = useKnownTotal 
        ? Math.min(totalPages - 1, currentPage + 1)
        : currentPage + 1;
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      // Only show ellipsis and last page if we know the total
      if (useKnownTotal) {
        if (currentPage < totalPages - 2) {
          pages.push('...');
        }
        pages.push(totalPages);
      }
      // If we don't know total, don't show a last page number - just show what we have
    }
    
    return pages;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">All Stories</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{members.length} members</span>
        </div>
      </div>

      <div className="space-y-2">
        {stories.map((story, index) => {
          const stats = calculateVoteStats(story.id, votes, members.length);
          const isActive = index === currentStoryIndex;

          return (
            <div key={story.id} ref={isActive ? currentStoryRef : null}>
              <Card
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive
                    ? "ring-2 ring-primary shadow-md"
                    : "hover:border-primary/50"
                }`}
                onClick={() => onSelectStory(index)}
              >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <a
                        href={getJiraTicketUrl(story.ticketId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-border bg-background hover:bg-accent text-xs font-mono shrink-0 transition-colors"
                      >
                        {story.ticketId}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      {story.issueType && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {story.issueType}
                        </Badge>
                      )}
                      {story.createdDate && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {new Date(story.createdDate).toLocaleDateString()}
                        </span>
                      )}
                      {stats.allVoted ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    <h3 className="font-medium text-foreground truncate">
                      {story.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                      {story.description}
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-3">
                      {stats.unclearCount > 0 && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-500/10 border border-amber-500/20">
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0" />
                          <span className="text-sm font-semibold text-amber-600 dark:text-amber-500">
                            {stats.unclearCount}
                          </span>
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {stats.voteCount}/{members.length} voted
                        {stats.average !== null && (
                          <span className="text-muted-foreground ml-2">
                            • Current average: {stats.average.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Always show average if there are votes, even if not all voted */}
                    {/* Only show consensus if all members have voted */}
                    {stats.average !== null && (
                      <div className="flex items-center gap-2">
                        {stats.consensus !== null && stats.allVoted ? (
                          <Badge
                            className={`${getStatusColor(stats.allVoted, stats.consensus)} border`}
                          >
                            Consensus: {stats.consensus}
                          </Badge>
                        ) : (
                          <Badge
                            className={`${getStatusColor(stats.allVoted, stats.consensus)} border`}
                          >
                            Avg: {stats.average.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls - Show if we have more pages or if totalPages > 1 */}
      {onPageChange && (totalPages > 1 || hasMore || currentPage > 1) && (
        <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, idx) => {
              if (page === '...') {
                return (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">
                    ...
                  </span>
                );
              }
              const pageNum = page as number;
              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? "default" : "outline"}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                  className="min-w-[2.5rem]"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={!hasMore && currentPage >= totalPages}
            className="gap-1"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
