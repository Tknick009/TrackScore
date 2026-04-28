import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  insertMeetScoringProfileSchema,
  type InsertMeetScoringProfile,
  type ScoringPreset,
  type MeetScoringProfile,
  type MeetScoringOverride,
  genderModeEnum,
  divisionModeEnum,
} from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Trophy, Save, X } from "lucide-react";

interface TeamScoringConfigProps {
  meetId: string;
}

export function TeamScoringConfig({ meetId }: TeamScoringConfigProps) {
  const { toast } = useToast();

  // Fetch available scoring presets
  const { data: presets = [], isLoading: presetsLoading } = useQuery<ScoringPreset[]>({
    queryKey: ["/api/scoring/presets"],
  });

  // Fetch current scoring configuration (flattened response with overrides)
  const { data: currentConfig, isLoading: configLoading } = useQuery<MeetScoringProfile & { overrides?: MeetScoringOverride[] }>({
    queryKey: ["/api/meets", meetId, "scoring"],
    enabled: !!meetId,
  });

  const form = useForm<InsertMeetScoringProfile>({
    resolver: zodResolver(insertMeetScoringProfileSchema),
    defaultValues: {
      meetId: meetId,
      presetId: currentConfig?.presetId || 0,
      genderMode: currentConfig?.genderMode || "combined",
      divisionMode: currentConfig?.divisionMode || "overall",
      allowRelayScoring: currentConfig?.allowRelayScoring ?? true,
    },
    values: currentConfig ? {
      meetId: meetId,
      presetId: currentConfig.presetId,
      genderMode: currentConfig.genderMode as "combined" | "separate",
      divisionMode: currentConfig.divisionMode as "overall" | "by_division",
      allowRelayScoring: currentConfig.allowRelayScoring ?? true,
    } : undefined,
  });

  // Save scoring configuration mutation
  const saveScoringMutation = useMutation({
    mutationFn: (data: InsertMeetScoringProfile) =>
      apiRequest("PUT", `/api/meets/${meetId}/scoring`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "scoring"] });
      queryClient.invalidateQueries({ queryKey: ["/api/meets", meetId, "scoring", "standings"] });
      toast({
        title: "Configuration saved",
        description: "Team scoring configuration has been updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error saving configuration",
        description: error.message || "Failed to save scoring configuration",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertMeetScoringProfile) => {
    saveScoringMutation.mutate(data);
  };

  const isLoading = presetsLoading || configLoading;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Team Scoring Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-muted-foreground" data-testid="loading-config">
            Loading configuration...
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Preset Selector */}
              <FormField
                control={form.control}
                name="presetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scoring Preset</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                      data-testid="select-scoring-preset"
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a scoring preset..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {presets.map((preset) => (
                          <SelectItem
                            key={preset.id}
                            value={preset.id.toString()}
                            data-testid={`preset-option-${preset.id}`}
                          >
                            {preset.name} - {preset.category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select a predefined scoring system for this meet
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Gender Mode Toggle */}
              <FormField
                control={form.control}
                name="genderMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        data-testid="radio-gender-mode"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="combined" id="gender-combined" data-testid="radio-gender-combined" />
                          <label htmlFor="gender-combined" className="cursor-pointer">
                            Combined
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="separate" id="gender-separate" data-testid="radio-gender-separate" />
                          <label htmlFor="gender-separate" className="cursor-pointer">
                            Separate
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Score men and women together or separately
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Division Mode Toggle */}
              <FormField
                control={form.control}
                name="divisionMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Division Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex gap-4"
                        data-testid="radio-division-mode"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="overall" id="division-overall" data-testid="radio-division-overall" />
                          <label htmlFor="division-overall" className="cursor-pointer">
                            Overall
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="by_division" id="division-by-division" data-testid="radio-division-by-division" />
                          <label htmlFor="division-by-division" className="cursor-pointer">
                            By Division
                          </label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Score all divisions together or separately
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Relay Scoring Checkbox */}
              <FormField
                control={form.control}
                name="allowRelayScoring"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Relay Scoring</FormLabel>
                      <FormDescription>
                        Include relay events in team scoring calculations
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-relay-scoring"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  className="gap-2"
                  disabled={saveScoringMutation.isPending}
                  data-testid="button-save-config"
                >
                  <Save className="w-4 h-4" />
                  {saveScoringMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => form.reset()}
                  disabled={saveScoringMutation.isPending}
                  data-testid="button-cancel-config"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
