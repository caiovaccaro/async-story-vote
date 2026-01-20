import { TeamMember } from "@/types/refinement";

/**
 * Generate a simple UUID-like ID from a name
 * This ensures consistent IDs for the same name
 */
function generateIdFromName(name: string): string {
  // Simple hash function to generate consistent IDs
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    const char = name.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive number and pad
  return Math.abs(hash).toString(36).padStart(8, '0');
}

/**
 * Parse team members from environment variable
 * Format: comma-separated names, e.g., "Alice,Bob,Charlie"
 */
export function getTeamMembersFromEnv(): TeamMember[] {
  const membersStr = import.meta.env.VITE_TEAM_MEMBERS;
  
  if (!membersStr || membersStr.trim() === '') {
    // Fallback to demo members if not configured
    return [
      { id: "1", name: "Alex" },
      { id: "2", name: "Jordan" },
      { id: "3", name: "Sam" },
      { id: "4", name: "Casey" },
      { id: "5", name: "Morgan" },
    ];
  }

  // Parse comma-separated names
  const names = membersStr
    .split(',')
    .map(name => name.trim())
    .filter(name => name.length > 0);

  if (names.length === 0) {
    // If empty after parsing, use demo members
    return [
      { id: "1", name: "Alex" },
      { id: "2", name: "Jordan" },
      { id: "3", name: "Sam" },
      { id: "4", name: "Casey" },
      { id: "5", name: "Morgan" },
    ];
  }

  // Generate consistent IDs for each member
  return names.map(name => ({
    id: generateIdFromName(name),
    name: name,
  }));
}

