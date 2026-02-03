import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { FolderOpen, Calendar, Users, Trophy, Layers, ArrowLeft, Download, Trash2, RefreshCw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface PackageInfo {
  packageName: string;
  meetName: string;
  meetCode: string;
  exportedAt: string;
  stats: {
    events: number;
    athletes: number;
    teams: number;
    scenes: number;
  };
  hasLogo: boolean;
}

function LoadMeetSkeleton() {
  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onImport, isImporting }: { 
  pkg: PackageInfo; 
  onImport: (name: string) => void;
  isImporting: boolean;
}) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/meet-packages/${pkg.packageName}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meet-packages"] });
      toast({
        title: "Package Deleted",
        description: `${pkg.meetName} package has been removed.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="hover-elevate" data-testid={`card-package-${pkg.packageName}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              {pkg.meetName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">{pkg.meetCode}</Badge>
              <span className="text-xs">
                Exported {format(new Date(pkg.exportedAt), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </CardDescription>
          </div>
          {pkg.hasLogo && (
            <Badge variant="outline">Has Logo</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <span>{pkg.stats.events} events</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{pkg.stats.athletes} athletes</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>{pkg.stats.teams} teams</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <span>{pkg.stats.scenes} scenes</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              disabled={deleteMutation.isPending}
              data-testid={`button-delete-${pkg.packageName}`}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete the "{pkg.meetName}" package from the meets folder. 
                This action cannot be undone, but the package can be re-exported from the source meet.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          onClick={() => onImport(pkg.packageName)}
          disabled={isImporting}
          data-testid={`button-load-${pkg.packageName}`}
        >
          {isImporting ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Load Meet
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function LoadMeet() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [importingPackage, setImportingPackage] = useState<string | null>(null);

  const { data: packages, isLoading, refetch } = useQuery<PackageInfo[]>({
    queryKey: ["/api/meet-packages"],
  });

  const importMutation = useMutation({
    mutationFn: async (packageName: string) => {
      setImportingPackage(packageName);
      const response = await apiRequest("POST", `/api/meet-packages/import/${packageName}`);
      return response.json();
    },
    onSuccess: (data) => {
      setImportingPackage(null);
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      
      toast({
        title: "Meet Loaded Successfully",
        description: (
          <div className="space-y-1 mt-2">
            <div className="font-medium">{data.meetName}</div>
            <div className="text-xs text-muted-foreground">
              {data.stats?.events} events, {data.stats?.athletes} athletes, {data.stats?.teams} teams
            </div>
          </div>
        ),
      });

      if (data.meetId) {
        navigate(`/meet/${data.meetId}`);
      }
    },
    onError: (error: Error) => {
      setImportingPackage(null);
      toast({
        title: "Load Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <LoadMeetSkeleton />;
  }

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Load Meet from Package</h1>
              <p className="text-muted-foreground">
                Select a meet package from your Dropbox sync folder
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            data-testid="button-refresh-packages"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {!packages || packages.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <FolderOpen className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">No Meet Packages Found</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No meet packages were found in the <code className="text-xs bg-muted px-1 py-0.5 rounded">meets/</code> folder.
                    Export a meet from the meet detail page, or sync packages from another computer via Dropbox.
                  </p>
                </div>
                <Link href="/meets">
                  <Button variant="outline" data-testid="button-go-to-meets">
                    Go to Meets List
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4" data-testid="packages-list">
            {packages.map((pkg) => (
              <PackageCard 
                key={pkg.packageName} 
                pkg={pkg} 
                onImport={(name) => importMutation.mutate(name)}
                isImporting={importingPackage === pkg.packageName}
              />
            ))}
          </div>
        )}

        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 text-primary" />
              </div>
              <div className="text-sm">
                <p className="font-medium mb-1">How Dropbox Sync Works</p>
                <p className="text-muted-foreground">
                  When you export a meet, it's saved to the <code className="text-xs bg-muted px-1 py-0.5 rounded">meets/</code> folder. 
                  If this folder is in your Dropbox, it will automatically sync to other computers. 
                  On another computer, use Edge Launcher to sync the latest files, then come here to load the meet.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
