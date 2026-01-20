import { Vote, TeamMember, StoryPoint } from "@/types/refinement";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface TeamVotesRevealProps {
  votes: Vote[];
  members: TeamMember[];
  isRevealed: boolean;
  storyId: string;
}

const getVoteColor = (points: StoryPoint) => {
  const colors: Record<string, string> = {
    '1': 'bg-vote-1',
    '2': 'bg-vote-2',
    '3': 'bg-vote-3',
    '5': 'bg-vote-5',
    '8': 'bg-vote-8',
    '13': 'bg-vote-13',
    '21': 'bg-vote-21',
    '?': 'bg-vote-question',
  };
  return colors[String(points)] || 'bg-muted';
};

export function TeamVotesReveal({ votes, members, isRevealed, storyId }: TeamVotesRevealProps) {
  const storyVotes = votes.filter(v => v.storyId === storyId);
  
  // Convert votes to numbers, handling both number and string types
  // Filter out '?' and invalid values
  const numericVotes = storyVotes
    .map(v => {
      const points = v.points;
      if (points === '?') return null;
      // Handle both number and string types
      const num = typeof points === 'number' ? points : Number(points);
      return isNaN(num) ? null : num;
    })
    .filter((p): p is number => p !== null);
  
  const average = numericVotes.length > 0 
    ? Math.round(numericVotes.reduce((a, b) => a + b, 0) / numericVotes.length * 10) / 10
    : null;

  // Consensus only if all members voted and all votes are the same
  const allVoted = storyVotes.length === members.length;
  const consensus = allVoted && numericVotes.length > 0 && new Set(numericVotes).size === 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Team Votes</h3>
        <span className="text-sm text-muted-foreground">
          {storyVotes.length} of {members.length} voted
        </span>
      </div>

      {/* Show current average above the grid, even if not all voted */}
      {average !== null && (
        <div className="story-card rounded-xl p-4 flex items-center justify-center">
          <span className="text-sm text-muted-foreground mr-2">Current average:</span>
          <span className="text-2xl font-mono font-bold text-foreground">{average.toFixed(1)}</span>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {members.map((member, index) => {
          const vote = storyVotes.find(v => v.memberId === member.id);
          const hasVoted = !!vote;

          return (
            <div
              key={member.id}
              className={cn(
                "story-card rounded-xl p-4 flex flex-col items-center gap-3 transition-all duration-300",
                isRevealed && "reveal-animation"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                {member.avatar ? (
                  <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
                ) : (
                  <User className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium text-foreground truncate max-w-full">
                {member.name}
              </span>
              
              {isRevealed ? (
                hasVoted ? (
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-white font-mono font-bold text-xl",
                    getVoteColor(vote.points)
                  )}>
                    {vote.points}
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground text-sm">
                    —
                  </div>
                )
              ) : (
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  hasVoted ? "bg-vote-3/20 text-vote-3" : "bg-muted text-muted-foreground"
                )}>
                  {hasVoted ? "✓" : "..."}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isRevealed && numericVotes.length > 0 && (
        <div className="story-card rounded-xl p-6 flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">Average</span>
            <p className="text-3xl font-mono font-bold text-foreground">{average}</p>
          </div>
          {consensus && (
            <div className="px-4 py-2 rounded-full bg-vote-3/20 text-vote-3 font-medium">
              🎉 Consensus!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
