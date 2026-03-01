import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { MeetSelector } from "@/components/meet-selector";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Upload, FileText, CheckCircle2, Database } from "lucide-react";

type ImportStatistics = {
  meets: number;
  teams: number;
  divisions: number;
  athletes: number;
  events: number;
  entries: number;
};

export default function Import() {
  const { toast } = useToast();
  const { currentMeetId } = useMeet();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importStats, setImportStats] = useState<ImportStatistics | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("mdbFile", file);
      if (currentMeetId) {
        formData.append("meetId", currentMeetId);
      }
      const response = await fetch("/api/import/mdb", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setImportStats(data.statistics);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/athletes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({
        title: "Import successful",
        description: `Imported ${data.statistics.events} events and ${data.statistics.athletes} athletes`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import data",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportStats(null);
    }
  };

  const handleImport = () => {
    if (selectedFile) {
      importMutation.mutate(selectedFile);
    }
  };

  if (!currentMeetId) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertCircle className="w-5 h-5 text-muted-foreground" />
              Select a Meet
            </CardTitle>
            <CardDescription>
              Choose a meet to import HyTek data into
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <MeetSelector />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <MeetSelector />
          <h1 className="text-lg font-bold tracking-tight">Import HyTek Data</h1>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5" />
                HyTek Meet Manager Import
              </CardTitle>
              <CardDescription>
                Upload a HyTek Meet Manager .mdb file to import events, athletes, teams, and entries.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".mdb"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />

              <div 
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-primary" />
                    <div className="text-left">
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="font-medium">Click to select a HyTek .mdb file</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      or drag and drop
                    </p>
                  </div>
                )}
              </div>

              {importMutation.isPending && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Importing data...</p>
                  <Progress value={undefined} className="w-full" />
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!selectedFile || importMutation.isPending}
                className="w-full"
                data-testid="button-import"
              >
                {importMutation.isPending ? "Importing..." : "Import Data"}
              </Button>
            </CardContent>
          </Card>

          {importStats && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  Import Complete
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold tracking-tight">{importStats.teams}</p>
                    <p className="text-xs text-muted-foreground">Teams</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold tracking-tight">{importStats.athletes}</p>
                    <p className="text-xs text-muted-foreground">Athletes</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold tracking-tight">{importStats.events}</p>
                    <p className="text-xs text-muted-foreground">Events</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold tracking-tight">{importStats.entries}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 border border-green-500/10 rounded-xl">
                    <p className="text-2xl font-bold tracking-tight">{importStats.divisions}</p>
                    <p className="text-xs text-muted-foreground">Divisions</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
