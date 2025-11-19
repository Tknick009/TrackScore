import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSpectator } from "@/contexts/SpectatorContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function SpectatorAthletes() {
  const { currentMeetId } = useSpectator();
  const [search, setSearch] = useState("");
  
  const { data: athletes } = useQuery<any[]>({
    queryKey: ["/api/public/meets", currentMeetId, "athletes"],
    enabled: !!currentMeetId
  });
  
  const filtered = athletes?.filter(a => {
    const fullName = `${a.firstName} ${a.lastName}`.toLowerCase();
    const searchLower = search.toLowerCase();
    return fullName.includes(searchLower) || a.bib?.toString().includes(search);
  }) || [];
  
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search athletes by name or bib..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
          data-testid="input-search"
        />
      </div>
      
      <div className="space-y-2">
        {filtered.map(athlete => (
          <Card key={athlete.id} data-testid={`athlete-${athlete.id}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-bold">
                  {athlete.bib || "?"}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">
                    {athlete.firstName} {athlete.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {athlete.teamName}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
