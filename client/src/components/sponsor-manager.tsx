import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useMeet } from "@/contexts/MeetContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, Trash2, Plus, Star } from "lucide-react";
import type { SelectSponsor, InsertSponsor, SponsorTier } from "@shared/schema";

export function SponsorManager() {
  const { currentMeetId } = useMeet();
  const { toast } = useToast();
  const [newSponsor, setNewSponsor] = useState<Partial<InsertSponsor>>({});
  const [uploadingFor, setUploadingFor] = useState<number | null>(null);
  
  const { data: sponsors } = useQuery<SelectSponsor[]>({
    queryKey: ["/api/sponsors"]
  });
  
  const createSponsorMutation = useMutation({
    mutationFn: async (sponsor: InsertSponsor) => 
      apiRequest("/api/sponsors", "POST", sponsor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors"] });
      setNewSponsor({});
      toast({ title: "Sponsor created" });
    }
  });
  
  const deleteSponsorMutation = useMutation({
    mutationFn: async (id: number) => 
      apiRequest(`/api/sponsors/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors"] });
      toast({ title: "Sponsor deleted" });
    }
  });
  
  const uploadLogoMutation = useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch(`/api/sponsors/${id}/logo`, {
        method: "POST",
        body: formData
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors"] });
      setUploadingFor(null);
      toast({ title: "Logo uploaded" });
    }
  });
  
  const handleCreate = () => {
    if (!newSponsor.name || !newSponsor.tier) {
      toast({ 
        title: "Missing fields",
        description: "Name and tier are required",
        variant: "destructive"
      });
      return;
    }
    
    createSponsorMutation.mutate(newSponsor as InsertSponsor);
  };
  
  const handleLogoUpload = (sponsorId: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadLogoMutation.mutate({ id: sponsorId, file });
    }
  };
  
  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      platinum: "bg-slate-200 text-slate-900",
      gold: "bg-yellow-400 text-yellow-900",
      silver: "bg-gray-300 text-gray-900",
      bronze: "bg-amber-600 text-white",
      supporter: "bg-blue-500 text-white"
    };
    return (
      <Badge className={colors[tier] || ""}>
        <Star className="h-3 w-3 mr-1" />
        {tier.toUpperCase()}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Sponsor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Input
              placeholder="Sponsor Name"
              value={newSponsor.name || ""}
              onChange={e => setNewSponsor({ ...newSponsor, name: e.target.value })}
              data-testid="input-sponsor-name"
            />
            <Select
              value={newSponsor.tier || ""}
              onValueChange={v => setNewSponsor({ ...newSponsor, tier: v as SponsorTier })}
            >
              <SelectTrigger data-testid="select-tier">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="platinum">Platinum</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="supporter">Supporter</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Website URL (optional)"
              value={newSponsor.clickthroughUrl || ""}
              onChange={e => setNewSponsor({ ...newSponsor, clickthroughUrl: e.target.value })}
              data-testid="input-url"
            />
          </div>
          <Button 
            onClick={handleCreate}
            disabled={createSponsorMutation.isPending}
            data-testid="button-create-sponsor"
          >
            Create Sponsor
          </Button>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Sponsors</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Logo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sponsors?.map(sponsor => (
                <TableRow key={sponsor.id}>
                  <TableCell className="font-medium">{sponsor.name}</TableCell>
                  <TableCell>{getTierBadge(sponsor.tier)}</TableCell>
                  <TableCell>
                    {sponsor.logoUrl ? (
                      <img src={sponsor.logoUrl} alt={sponsor.name} className="h-8 object-contain" />
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleLogoUpload(sponsor.id, e)}
                          className="hidden"
                          id={`upload-${sponsor.id}`}
                        />
                        <label htmlFor={`upload-${sponsor.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            data-testid={`button-upload-${sponsor.id}`}
                          >
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload
                            </span>
                          </Button>
                        </label>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {sponsor.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSponsorMutation.mutate(sponsor.id)}
                      data-testid={`button-delete-${sponsor.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
