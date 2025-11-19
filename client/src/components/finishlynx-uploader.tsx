import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Upload, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function FinishLynxUploader() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<any>(null);
  
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("lif", file);
      formData.append("meetId", currentMeetId || "");
      
      const response = await fetch("/api/finishlynx/upload", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setUploadResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ 
        title: "Results uploaded",
        description: `Processed: ${data.processed}, Duplicates: ${data.duplicates}, Unmatched: ${data.unmatched}`
      });
    },
    onError: () => {
      toast({ 
        title: "Upload failed",
        variant: "destructive"
      });
    }
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setUploadResult(null);
    }
  };
  
  const handleUpload = () => {
    if (!currentMeetId) {
      toast({ title: "No meet selected", variant: "destructive" });
      return;
    }
    
    if (!selectedFile) {
      toast({ title: "No file selected", variant: "destructive" });
      return;
    }
    
    uploadMutation.mutate(selectedFile);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            FinishLynx File Upload
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="file"
              accept=".lif"
              onChange={handleFileChange}
              data-testid="input-file"
            />
            {selectedFile && (
              <p className="text-sm text-muted-foreground mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
          
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadMutation.isPending}
            className="w-full"
            data-testid="button-upload"
          >
            Upload & Process Results
          </Button>
        </CardContent>
      </Card>
      
      {uploadResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {uploadResult.processed}
                </div>
                <div className="text-sm text-muted-foreground">Processed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {uploadResult.duplicates}
                </div>
                <div className="text-sm text-muted-foreground">Duplicates</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {uploadResult.unmatched}
                </div>
                <div className="text-sm text-muted-foreground">Unmatched</div>
              </div>
            </div>
            
            {uploadResult.errors && uploadResult.errors.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {uploadResult.errors.slice(0, 5).map((err: string, idx: number) => (
                    <div key={idx} className="text-sm">{err}</div>
                  ))}
                  {uploadResult.errors.length > 5 && (
                    <div className="text-sm">...and {uploadResult.errors.length - 5} more</div>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
