import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEntrySchema, type InsertEntry, type Athlete } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface TrackResultFormProps {
  eventId: string;
  athletes: Athlete[];
  onSubmit: (data: InsertEntry) => void;
  isPending?: boolean;
}

export function TrackResultForm({
  eventId,
  athletes,
  onSubmit,
  isPending,
}: TrackResultFormProps) {
  const [selectedRound, setSelectedRound] = useState<"preliminary" | "quarterfinal" | "semifinal" | "final">("final");

  const form = useForm<InsertEntry>({
    resolver: zodResolver(insertEntrySchema),
    defaultValues: {
      eventId,
      athleteId: "",
      teamId: undefined,
      divisionId: undefined,
      resultType: "time",
      finalLane: 1,
      finalMark: undefined,
      finalPlace: undefined,
      isDisqualified: false,
      isScratched: false,
      notes: "",
    },
  });

  const roundLabels = {
    preliminary: "Preliminary",
    quarterfinal: "Quarterfinal",
    semifinal: "Semifinal",
    final: "Final",
  };

  const laneFieldName = `${selectedRound}Lane` as keyof InsertEntry;
  const markFieldName = `${selectedRound}Mark` as keyof InsertEntry;
  const placeFieldName = `${selectedRound}Place` as keyof InsertEntry;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Track Result</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="athleteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const athlete = athletes.find(a => a.id === value);
                      if (athlete) {
                        form.setValue("teamId", athlete.teamId || undefined);
                        form.setValue("divisionId", athlete.divisionId || undefined);
                      }
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-athlete">
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.firstName} {athlete.lastName} ({athlete.bibNumber})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <FormLabel>Round</FormLabel>
              <Select 
                value={selectedRound} 
                onValueChange={(value) => setSelectedRound(value as typeof selectedRound)}
              >
                <SelectTrigger data-testid="select-round">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="preliminary">Preliminary</SelectItem>
                  <SelectItem value="quarterfinal">Quarterfinal</SelectItem>
                  <SelectItem value="semifinal">Semifinal</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>

            <FormField
              control={form.control}
              name="resultType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-result-type">
                        <SelectValue placeholder="Select result type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="time">Time</SelectItem>
                      <SelectItem value="distance">Distance</SelectItem>
                      <SelectItem value="height">Height</SelectItem>
                      <SelectItem value="points">Points</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name={laneFieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lane</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        disabled={field.disabled}
                        value={typeof field.value === 'number' ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-lane"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={placeFieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Place</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        disabled={field.disabled}
                        value={typeof field.value === 'number' ? field.value : ""}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        data-testid="input-place"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name={markFieldName}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {form.watch("resultType") === "time" ? "Time (seconds)" : "Mark"}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 9.98"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                      value={typeof field.value === 'number' ? field.value : ""}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      data-testid="input-mark"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="isDisqualified"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between rounded-md border p-4">
                    <div>
                      <FormLabel>Disqualified</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        data-testid="switch-disqualified"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isScratched"
                render={({ field }) => (
                  <FormItem className="flex flex-1 items-center justify-between rounded-md border p-4">
                    <div>
                      <FormLabel>Scratched</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value ?? false}
                        onCheckedChange={field.onChange}
                        data-testid="switch-scratched"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Additional notes"
                      {...field}
                      value={field.value ?? ""}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-submit-result"
            >
              {isPending ? "Recording..." : "Record Result"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
