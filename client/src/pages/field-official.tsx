/**
 * Legacy field official page — redirects to the new Field Command Center.
 * 
 * The old 4,100-line monolith has been replaced by:
 * - field-command-center.tsx (persistent tabs, merged admin controls)
 * - HorizontalEventPanel.tsx (inline mark entry for horizontal events)
 * - VerticalEventPanel.tsx (inline O/X/P entry for vertical events)
 * - useFieldSession.ts (shared data hook)
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

export default function FieldOfficialPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/field-command", { replace: true });
  }, [setLocation]);

  return (
    <div className="h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
