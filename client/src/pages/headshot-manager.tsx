import React, { useState, useMemo, useCallback, useEffect, memo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Search, CheckCircle2, XCircle, ArrowUpDown, RefreshCw, Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AthleteMatch = {
  athleteId: string;
  firstName: string;
  lastName: string;
  school: string;
  expectedFilename: string;
  matchedFile: string | null;
  hasHeadshot: boolean;
  suggestedFile: string | null;
};

type HeadshotData = {
  athletes: AthleteMatch[];
  orphanFiles: string[];
  headshotDir: string;
  totalImages: number;
};

export default function HeadshotManager() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "status">("status");
  const [filterStatus, setFilterStatus] = useState<"all" | "matched" | "missing">("all");
  const [checkedAthletes, setCheckedAthletes] = useState<Set<string>>(new Set());
  const [fileSelections, setFileSelections] = useState<Record<string, string>>({});

  const { data, isLoading, error } = useQuery<HeadshotData>({
    queryKey: ['/api/meets', currentMeetId, 'headshot-manager'],
    queryFn: async () => {
      const res = await fetch(`/api/meets/${currentMeetId}/headshot-manager`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load headshot data');
      }
      return res.json();
    },
    enabled: !!currentMeetId,
  });

  const renameMutation = useMutation({
    mutationFn: async ({ oldFilename, newFilename }: { oldFilename: string; newFilename: string }) => {
      return apiRequest('POST', `/api/meets/${currentMeetId}/headshot-manager/rename`, { oldFilename, newFilename });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets', currentMeetId, 'headshot-manager'] });
      toast({ title: 'Headshot renamed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Rename failed', description: error.message, variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (data?.athletes) {
      const newSelections: Record<string, string> = {};
      for (const a of data.athletes) {
        if (!a.hasHeadshot && a.suggestedFile) {
          newSelections[a.athleteId] = a.suggestedFile;
        }
      }
      setFileSelections(newSelections);
      setCheckedAthletes(new Set());
    }
  }, [data]);

  const bulkRenameMutation = useMutation({
    mutationFn: async (renames: { oldFilename: string; newFilename: string }[]) => {
      const res = await apiRequest('POST', `/api/meets/${currentMeetId}/headshot-manager/bulk-rename`, { renames });
      return res.json();
    },
    onSuccess: (result: { success: number; failed: number; errors: string[] }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/meets', currentMeetId, 'headshot-manager'] });
      setCheckedAthletes(new Set());
      toast({
        title: 'Bulk rename complete',
        description: `${result.success} renamed${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Bulk rename failed', description: error.message, variant: 'destructive' });
    },
  });

  const handleToggleCheck = useCallback((athleteId: string, checked: boolean) => {
    setCheckedAthletes(prev => {
      const next = new Set(prev);
      if (checked) next.add(athleteId);
      else next.delete(athleteId);
      return next;
    });
  }, []);

  const handleFileSelect = useCallback((athleteId: string, filename: string) => {
    setFileSelections(prev => ({ ...prev, [athleteId]: filename }));
  }, []);

  const handleBulkRename = useCallback(() => {
    if (!data) return;
    const renames: { oldFilename: string; newFilename: string }[] = [];
    for (const athleteId of checkedAthletes) {
      const athlete = data.athletes.find(a => a.athleteId === athleteId);
      const selectedFile = fileSelections[athleteId];
      if (athlete && selectedFile && !athlete.hasHeadshot) {
        renames.push({ oldFilename: selectedFile, newFilename: athlete.expectedFilename });
      }
    }
    if (renames.length > 0) {
      bulkRenameMutation.mutate(renames);
    }
  }, [data, checkedAthletes, fileSelections, bulkRenameMutation]);

  const handleSelectAllSuggested = useCallback(() => {
    if (!data) return;
    const newChecked = new Set<string>();
    for (const a of data.athletes) {
      if (!a.hasHeadshot && fileSelections[a.athleteId]) {
        newChecked.add(a.athleteId);
      }
    }
    setCheckedAthletes(newChecked);
  }, [data, fileSelections]);

  const handleDeselectAll = useCallback(() => {
    setCheckedAthletes(new Set());
  }, []);

  const handleSingleRename = useCallback((oldFilename: string, newFilename: string) => {
    renameMutation.mutate({ oldFilename, newFilename });
  }, [renameMutation]);

  const filteredAndSorted = useMemo(() => {
    if (!data?.athletes) return [];
    let items = [...data.athletes];

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(a =>
        a.firstName.toLowerCase().includes(q) ||
        a.lastName.toLowerCase().includes(q) ||
        a.school.toLowerCase().includes(q) ||
        a.expectedFilename.toLowerCase().includes(q)
      );
    }

    // Filter by status
    if (filterStatus === "matched") items = items.filter(a => a.hasHeadshot);
    if (filterStatus === "missing") items = items.filter(a => !a.hasHeadshot);

    // Sort
    if (sortBy === "status") {
      items.sort((a, b) => {
        if (a.hasHeadshot !== b.hasHeadshot) return a.hasHeadshot ? 1 : -1; // Missing first
        return `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`);
      });
    } else {
      items.sort((a, b) => `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`));
    }

    return items;
  }, [data, search, sortBy, filterStatus]);

  const matchedCount = data?.athletes.filter(a => a.hasHeadshot).length || 0;
  const missingCount = data?.athletes.filter(a => !a.hasHeadshot).length || 0;
  const totalCount = data?.athletes.length || 0;
  const checkedCount = checkedAthletes.size;

  if (!currentMeetId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">No meet selected. Go to a meet first.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Headshot Manager</h1>
        <p className="text-muted-foreground mt-1">
          Match athlete headshot files to database names. Check suggestions you accept, then bulk rename.
        </p>
        {data?.headshotDir && (
          <p className="text-sm text-muted-foreground mt-1 font-mono">{data.headshotDir}</p>
        )}
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
              {totalCount} athletes
            </Badge>
            <Badge variant="default" className="text-sm px-3 py-1 bg-green-600">
              {matchedCount} matched
            </Badge>
            <Badge variant="destructive" className="text-sm px-3 py-1">
              {missingCount} missing
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {data.totalImages} image files
            </Badge>
            <Badge variant="secondary" className="text-sm px-3 py-1">
              {data.orphanFiles.length} unmatched files
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/meets', currentMeetId, 'headshot-manager'] })}
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
            </Button>
          </div>

          {/* Bulk actions bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
            <Button variant="outline" size="sm" onClick={handleSelectAllSuggested}>
              Select All Suggested
            </Button>
            <Button variant="outline" size="sm" onClick={handleDeselectAll}>
              Deselect All
            </Button>
            <div className="flex-1" />
            <span className="text-sm text-muted-foreground">
              {checkedCount} selected
            </span>
            <Button
              variant="default"
              size="sm"
              disabled={checkedCount === 0 || bulkRenameMutation.isPending}
              onClick={handleBulkRename}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-1" />
              Execute Rename ({checkedCount})
            </Button>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search athletes..."
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

          {/* Athlete list */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium w-10"></th>
                  <th className="text-left px-3 py-2 font-medium w-10">Status</th>
                  <th className="text-left px-3 py-2 font-medium">Athlete</th>
                  <th className="text-left px-3 py-2 font-medium">School</th>
                  <th className="text-left px-3 py-2 font-medium">Expected File</th>
                  <th className="text-left px-3 py-2 font-medium">Assign File</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSorted.map((athlete) => (
                  <MemoAthleteRow
                    key={athlete.athleteId}
                    athlete={athlete}
                    orphanFiles={data.orphanFiles}
                    isChecked={checkedAthletes.has(athlete.athleteId)}
                    selectedFile={fileSelections[athlete.athleteId] || ""}
                    onToggleCheck={handleToggleCheck}
                    onFileSelect={handleFileSelect}
                    onRename={handleSingleRename}
                    isRenaming={renameMutation.isPending}
                  />
                ))}
                {filteredAndSorted.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-muted-foreground py-8">
                      No athletes found
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

interface AthleteRowProps {
  athlete: AthleteMatch;
  orphanFiles: string[];
  isChecked: boolean;
  selectedFile: string;
  onToggleCheck: (athleteId: string, checked: boolean) => void;
  onFileSelect: (athleteId: string, filename: string) => void;
  onRename: (oldFilename: string, newFilename: string) => void;
  isRenaming: boolean;
}

const MemoAthleteRow = memo(function AthleteRow({
  athlete,
  orphanFiles,
  isChecked,
  selectedFile,
  onToggleCheck,
  onFileSelect,
  onRename,
  isRenaming,
}: AthleteRowProps) {
  const handleCheck = useCallback((checked: boolean | "indeterminate") => {
    onToggleCheck(athlete.athleteId, !!checked);
  }, [athlete.athleteId, onToggleCheck]);

  const handleFile = useCallback((filename: string) => {
    onFileSelect(athlete.athleteId, filename);
  }, [athlete.athleteId, onFileSelect]);

  const handleRename = useCallback(() => {
    if (selectedFile) {
      onRename(selectedFile, athlete.expectedFilename);
    }
  }, [selectedFile, athlete.expectedFilename, onRename]);

  return (
    <tr className={`border-t ${athlete.hasHeadshot ? '' : 'bg-red-50 dark:bg-red-950/20'}`}>
      <td className="px-3 py-2">
        {!athlete.hasHeadshot && selectedFile && (
          <Checkbox
            checked={isChecked}
            onCheckedChange={handleCheck}
          />
        )}
      </td>
      <td className="px-3 py-2">
        {athlete.hasHeadshot ? (
          <CheckCircle2 className="w-5 h-5 text-green-600" />
        ) : (
          <XCircle className="w-5 h-5 text-red-500" />
        )}
      </td>
      <td className="px-3 py-2 font-medium">
        {athlete.lastName}, {athlete.firstName}
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {athlete.school}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
        {athlete.expectedFilename}
      </td>
      <td className="px-3 py-2">
        {!athlete.hasHeadshot && orphanFiles.length > 0 && (
          <div className="flex flex-col gap-1">
            {athlete.suggestedFile && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                Suggested: {athlete.suggestedFile}
              </span>
            )}
            <div className="flex items-center gap-2">
              <Select value={selectedFile} onValueChange={handleFile}>
                <SelectTrigger className="w-56 h-8 text-xs">
                  <SelectValue placeholder="Pick a file..." />
                </SelectTrigger>
                <SelectContent>
                  {orphanFiles.map(f => (
                    <SelectItem key={f} value={f} className="text-xs">
                      {f}{f === athlete.suggestedFile ? ' (suggested)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!selectedFile || isRenaming}
                onClick={handleRename}
                className="h-8 text-xs"
              >
                Rename
              </Button>
            </div>
          </div>
        )}
        {athlete.hasHeadshot && (
          <span className="text-xs text-muted-foreground">{athlete.matchedFile}</span>
        )}
      </td>
    </tr>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.isChecked === nextProps.isChecked &&
    prevProps.selectedFile === nextProps.selectedFile &&
    prevProps.isRenaming === nextProps.isRenaming &&
    prevProps.athlete.athleteId === nextProps.athlete.athleteId &&
    prevProps.athlete.hasHeadshot === nextProps.athlete.hasHeadshot &&
    prevProps.orphanFiles === nextProps.orphanFiles
  );
});
