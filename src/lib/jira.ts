import { Story } from "@/types/refinement";

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string | any; // Can be ADF format or string
    customfield_10016?: number; // Story points field (may vary by JIRA instance)
    status: {
      name: string;
    };
    issuetype?: {
      name: string;
      iconUrl?: string;
    };
    created?: string; // ISO date string
    [key: string]: any;
  };
  renderedFields?: {
    description?: string; // HTML rendered description
  };
}


export interface JiraSearchResponse {
  issues: JiraIssue[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
}

/**
 * Get API base URL (backend server)
 */
function getApiBaseUrl(): string {
  // In development, Vite proxy handles /api routes
  // In production, use VITE_API_URL or default to same origin
  if (import.meta.env.DEV) {
    return ''; // Use relative URL, Vite proxy will handle it
  }
  return import.meta.env.VITE_API_URL || '';
}

/**
 * Extract text content from JIRA ADF (Atlassian Document Format)
 */
function extractTextFromADF(adf: any): string | null {
  if (!adf || typeof adf !== 'object') return null;
  
  const textParts: string[] = [];
  
  function traverse(node: any) {
    if (!node) return;
    
    if (node.type === 'text' && node.text) {
      textParts.push(node.text);
    }
    
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach(traverse);
    }
  }
  
  if (adf.content && Array.isArray(adf.content)) {
    adf.content.forEach(traverse);
  } else {
    traverse(adf);
  }
  
  return textParts.length > 0 ? textParts.join(' ') : null;
}

/**
 * Fetch tickets from JIRA that are in backlog with "Need Refinement" status
 * Supports pagination
 */
export async function fetchJiraTickets(page: number = 1, pageSize: number = 50): Promise<{ stories: Story[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/api/jira/tickets?page=${page}&pageSize=${pageSize}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(
        errorData.error || `JIRA API error: ${response.status} ${response.statusText}`
      );
    }

    const data: JiraSearchResponse = await response.json();

    console.log('JIRA API response received:', {
      issuesCount: data.issues?.length || 0,
      total: data.total,
      page: data.page,
      hasIssues: !!data.issues,
    });

    if (!data.issues || data.issues.length === 0) {
      console.warn('No issues returned from JIRA API');
      return {
        stories: [],
        total: data.total || 0,
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        hasMore: false,
      };
    }

    // Transform JIRA issues to Story format
    const stories = data.issues.map((issue) => {
      // Extract description - prefer rendered HTML, then try to extract from ADF, then fallback to summary
      let descriptionText = issue.fields.summary;
      let descriptionHtml: string | undefined = undefined;
      
      // Try to get rendered description (HTML) - keep HTML for proper formatting
      if (issue.renderedFields?.description) {
        descriptionHtml = issue.renderedFields.description;
        // Also create plain text version by stripping HTML tags
        descriptionText = issue.renderedFields.description
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else if (issue.fields.description) {
        const desc = issue.fields.description;
        // If it's a string, use it directly
        if (typeof desc === 'string') {
          descriptionText = desc;
        } else if (desc && typeof desc === 'object') {
          // Try to extract text from ADF format
          descriptionText = extractTextFromADF(desc) || issue.fields.summary;
        }
      }

      // Extract acceptance criteria from description if present
      // Common patterns: "Acceptance Criteria:", "AC:", or bullet points
      let acceptanceCriteria: string[] | undefined;
      if (descriptionText && descriptionText !== issue.fields.summary) {
        const acMatch = descriptionText.match(
          /(?:Acceptance Criteria|AC|Acceptance|Criteria):?\s*\n([\s\S]*?)(?:\n\n|\n[A-Z]|$)/i
        );
        if (acMatch) {
          acceptanceCriteria = acMatch[1]
            .split(/\n/)
            .map((line) => line.replace(/^[-*•]\s*/, "").trim())
            .filter((line) => line.length > 0);
        }
      }

      return {
        id: issue.id,
        ticketId: issue.key,
        title: issue.fields.summary,
        description: descriptionText,
        descriptionHtml,
        acceptanceCriteria,
        issueType: issue.fields.issuetype?.name,
        createdDate: issue.fields.created,
      };
    });

    return {
      stories,
      total: data.total || stories.length,
      page: data.page || page,
      pageSize: data.pageSize || pageSize,
      hasMore: data.hasMore || false,
    };
  } catch (error) {
    console.error("Error fetching JIRA tickets:", error);
    throw error;
  }
}

/**
 * Test JIRA connection
 */
export async function testJiraConnection(): Promise<boolean> {
  try {
    const apiBaseUrl = getApiBaseUrl();
    const url = `${apiBaseUrl}/api/jira/test`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.connected === true;
    }
    return false;
  } catch (error) {
    console.error("JIRA connection test failed:", error);
    return false;
  }
}

