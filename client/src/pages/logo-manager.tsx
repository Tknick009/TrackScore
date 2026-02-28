import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, CheckCircle2, XCircle, ArrowUpDown, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TeamMatch = {
  teamId: string;
  teamName: string;
  affiliation: string;
  expectedFilename: string;
  matchedFile: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
};

type LogoData = {
  teams: TeamMatch[];
  orphanFiles: string[];
  logosDir: string;
  totalLogos: number;
};

export default function LogoManager() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status">("status");
  const [filterStatus, setFilterStatus] = useState<"all" | "matched" | "missing">("all");

  const { data, isLoading, error } = useQuery<LogoData>({
    queryKey: ['/api/meets', currentMeetId, 'logo-manager'],
    queryFn: async () => {
      const res = await fetch(`/api/meets/${currentMeetId}/logo-manager`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load logo data');
      }
      return res.json();
    },
    enabled: !!currentMeetId,
  });

  const renameMutation = useMutation({
    mutationFn: async ({ oldFilename, newFilename }: { oldFilename: string; newFilename: string }) => {
      return apiRequest('POST', `/api/meets/${currentMeetId}/logo-manager/rename`, { oldFilename, newFilename });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets', currentMeetId, 'logo-manager'] });
      toast({ title: 'Logo renamed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rename failed', description: error.message, variant: 'destructive' });
    },
  });

  const filteredAndSorted = useMemo(() => {
    if (!data?.teams) return [];
    let items = [...data.teams];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(t =>
        t.teamName.toLowerCase().includes(q) ||
        t.affiliation.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus === "matched") items = items.filter(t => t.hasLogo);
    if (filterStatus === "missing") items = items.filter(t => !t.hasLogo);

    // Sort
    if (sortBy === "status") {
      items.sort((a, b) => {
        if (a.hasLogo !== b.hasLogo) return a.hasLogo ? 1 : -1; // Missing first
        return a.teamName.localeCompare(b.teamName);
      });
    } else {
      items.sort((a, b) => a.teamName.localeCompare(b.teamName));
    }

    return items;
  }, [data, search, sortBy, filterStatus]);

  const matchedCount = data?.teams.filter(t => t.hasLogo).length || 0;
  const missingCount = data?.teams.filter(t => !t.hasLogo).length || 0;
  const totalCount = data?.teams.length || 0;

  if (!currentMeetId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No meet selected. Go to a meet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Logo Manager</h1>
        <p className="text-muted-foreground mt-1">
          Match team logo files (public/logos/NCAA/) to team names from the database. Rename unmatched files to fix mismatches.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {data && (
        <>
          {/* Stats bar */}
          <div className="flex flex-wrap items-center gap-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              {totalCount} teams
            </Badge>
            <Badge variant="default" className="text-sm px-3 py-1 bg-green-600">
              {matchedCount} matched
            </Badge>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {missingCount} missing
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {data.totalLogos} logo files
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/meets', currentMeetId, 'logo-manager'] })}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search teams..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as "all" | "matched" | "missing")}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="matched">Matched</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSortBy(s => s === "status" ? "name" : "status")}
            >
              <ArrowUpDown className="w-4 h-4 mr-1" />
              {sortBy === "status" ? "Missing first" : "A-Z"}
            </Button>
          </div>

          {/* Team list */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Status</th>
                  <th className="text-left px-4 py-2 font-medium">Preview</th>
                  <th className="text-left px-4 py-2 font-medium">Team</th>
                  <th className="text-left px-4 py-2 font-medium">Expected File</th>
                  <th className="text-left px-4 py-2 font-medium">Assign From Unmatched</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((team) => (
                  <TeamRow
                    key={team.teamId}
                    team={team}
                    orphanFiles={data.orphanFiles}
                    onRename={(oldFilename, newFilename) => {
                      renameMutation.mutate({ oldFilename, newFilename });
                    }}
                    isRenaming={renameMutation.isPending}
                  />
                ))}
                {filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-muted-foreground py-8">
                      No teams found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function TeamRow({
  team,
  orphanFiles,
  onRename,
  isRenaming,
}: {
  team: TeamMatch;
  orphanFiles: string[];
  onRename: (oldFilename: string, newFilename: string) => void;
  isRenaming: boolean;
}) {
  const [selectedFile, setSelectedFile] = useState("");

  return (
    <tr className={`border-t ${team.hasLogo ? '' : 'bg-red-50 dark:bg-red-950/20'}`}>
      <td className="px-4 py-2">
        {team.hasLogo ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </td>
      <td className="px-4 py-2">
        {team.logoUrl && (
          <img src={team.logoUrl} alt="" className="w-8 h-8 object-contain" />
        )}
      </td>
      <td className="px-4 py-2 font-medium">
        {team.teamName}
        {team.affiliation && team.affiliation !== team.teamName && (
          <span className="text-muted-foreground text-xs ml-2">({team.affiliation})</span>
        )}
      </td>
      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
        {team.expectedFilename}.png
      </td>
      <td className="px-4 py-2">
        {!team.hasLogo && orphanFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="w-48 h-8 text-xs">
                <SelectValue placeholder="Pick a file..." />
              </SelectTrigger>
              <SelectContent>
                {orphanFiles.map(f => (
                  <SelectItem key={f} value={f} className="text-xs">
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="default"
              disabled={!selectedFile || isRenaming}
              onClick={() => {
                if (selectedFile) {
                  onRename(selectedFile, team.expectedFilename);
                  setSelectedFile("");
                }
              }}
              className="h-8 text-xs"
            >
              Rename
            </Button>
          </div>
        )}
        {team.hasLogo && (
          <span className="text-xs text-muted-foreground">{team.matchedFile}</span>
        )}
      </td>
    </tr>
  );
}
