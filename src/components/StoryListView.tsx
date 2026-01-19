import { Story, Vote, TeamMember } from "@/types/refinement";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, Users } from "lucide-react";

interface StoryListViewProps {
  stories: Story[];
  votes: Vote[];
  members: TeamMember[];
  onSelectStory: (index: number) => void;
  currentStoryIndex: number;
}

function calculateVoteStats(storyId: string, votes: Vote[], memberCount: number) {
  const storyVotes = votes.filter((v) => v.storyId === storyId);
  const numericVotes = storyVotes
    .map((v) => v.points)
    .filter((p): p is Exclude<typeof p, '?'> => typeof p === "number") as number[];

  const voteCount = storyVotes.length;
  const allVoted = voteCount === memberCount;

  if (numericVotes.length === 0) {
    return { average: null, consensus: null, voteCount, allVoted };
  }

  const average = numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length;
  const allSame = numericVotes.every((v) => v === numericVotes[0]);
  const consensus: number | null = allSame ? numericVotes[0] : null;

  return { average, consensus, voteCount, allVoted };
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
}: StoryListViewProps) {
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
            <Card
              key={story.id}
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
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono shrink-0">
                        {story.ticketId}
                      </Badge>
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
                    <div className="text-xs text-muted-foreground">
                      {stats.voteCount}/{members.length} voted
                    </div>
                    
                    {stats.allVoted && (
                      <div className="flex items-center gap-2">
                        {stats.consensus !== null ? (
                          <Badge
                            className={`${getStatusColor(stats.allVoted, stats.consensus)} border`}
                          >
                            Consensus: {stats.consensus}
                          </Badge>
                        ) : (
                          <Badge
                            className={`${getStatusColor(stats.allVoted, stats.consensus)} border`}
                          >
                            Avg: {stats.average?.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
