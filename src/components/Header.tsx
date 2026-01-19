import { Users, LayoutGrid } from "lucide-react";

interface HeaderProps {
  sessionName: string;
  memberCount: number;
}

export function Header({ sessionName, memberCount }: HeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutGrid className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Async Refinement</h1>
            <p className="text-sm text-muted-foreground">{sessionName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{memberCount}</span>
        </div>
      </div>
    </header>
  );
}
