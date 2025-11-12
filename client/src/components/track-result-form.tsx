import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTrackResultSchema, type InsertTrackResult, type Athlete } from "@shared/schema";
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
  onSubmit: (data: InsertTrackResult) => void;
  isPending?: boolean;
}

export function TrackResultForm({
  eventId,
  athletes,
  onSubmit,
  isPending,
}: TrackResultFormProps) {
  const form = useForm<InsertTrackResult>({
    resolver: zodResolver(insertTrackResultSchema),
    defaultValues: {
      eventId,
      athleteId: "",
      lane: 1,
      time: 0,
      position: 1,
      reaction: 0,
      isDisqualified: false,
      notes: "",
    },
  });

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
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-athlete">
                        <SelectValue placeholder="Select athlete" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {athletes.map((athlete) => (
                        <SelectItem key={athlete.id} value={athlete.id}>
                          {athlete.name} ({athlete.bib})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lane"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lane</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-lane"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Position</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-position"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 9.98"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-time"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reaction"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reaction (seconds)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        placeholder="e.g., 0.156"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-reaction"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isDisqualified"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-md border p-4">
                  <div>
                    <FormLabel>Disqualified</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="switch-disqualified"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

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
