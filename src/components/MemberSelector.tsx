import { TeamMember } from "@/types/refinement";
import { cn } from "@/lib/utils";
import { User, Check } from "lucide-react";

interface MemberSelectorProps {
  members: TeamMember[];
  selectedMember: TeamMember | null;
  onSelect: (member: TeamMember) => void;
}

export function MemberSelector({ members, selectedMember, onSelect }: MemberSelectorProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground text-center">Who are you?</h2>
      <p className="text-muted-foreground text-center text-sm">
        Select your name to start voting
      </p>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
        {members.map((member) => {
          const isSelected = selectedMember?.id === member.id;
          return (
            <button
              key={member.id}
              onClick={() => onSelect(member)}
              className={cn(
                "story-card rounded-xl p-4 flex flex-col items-center gap-3 transition-all duration-200 hover:scale-105",
                isSelected && "ring-2 ring-primary"
              )}
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                  {member.avatar ? (
                    <img src={member.avatar} alt={member.name} className="w-12 h-12 rounded-full" />
                  ) : (
                    <User className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                {isSelected && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-foreground">{member.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
