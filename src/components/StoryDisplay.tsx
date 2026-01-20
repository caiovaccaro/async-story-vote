import { Story } from "@/types/refinement";
import { FileText, CheckCircle2, ExternalLink } from "lucide-react";

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

interface StoryDisplayProps {
  story: Story;
  currentIndex: number;
  totalStories: number;
}

export function StoryDisplay({ story, currentIndex, totalStories }: StoryDisplayProps) {
  return (
    <div className="story-card rounded-2xl p-6 sm:p-8 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={getJiraTicketUrl(story.ticketId)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <FileText className="w-4 h-4" />
            {story.ticketId}
            <ExternalLink className="w-3 h-3" />
          </a>
          {story.issueType && (
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {story.issueType}
            </span>
          )}
          {story.createdDate && (
            <span className="text-sm text-muted-foreground">
              Created: {new Date(story.createdDate).toLocaleDateString()}
            </span>
          )}
        </div>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {totalStories}
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-semibold text-foreground leading-tight">
        {story.title}
      </h2>

      {story.descriptionHtml ? (
        <div 
          className="text-muted-foreground leading-relaxed jira-description"
          dangerouslySetInnerHTML={{ __html: story.descriptionHtml }}
        />
      ) : (
        <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
          {story.description}
        </p>
      )}

      {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
        <div className="pt-4 border-t border-border">
          <h3 className="text-sm font-medium text-foreground mb-3">Acceptance Criteria</h3>
          <ul className="space-y-2">
            {story.acceptanceCriteria.map((criteria, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-vote-3 mt-0.5 shrink-0" />
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
