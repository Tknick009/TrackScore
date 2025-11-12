import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFieldResultSchema, type InsertFieldResult, type Athlete } from "@shared/schema";
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

interface FieldResultFormProps {
  eventId: string;
  athletes: Athlete[];
  onSubmit: (data: InsertFieldResult) => void;
  isPending?: boolean;
}

export function FieldResultForm({
  eventId,
  athletes,
  onSubmit,
  isPending,
}: FieldResultFormProps) {
  const form = useForm<InsertFieldResult>({
    resolver: zodResolver(insertFieldResultSchema),
    defaultValues: {
      eventId,
      athleteId: "",
      attempt1: undefined,
      attempt2: undefined,
      attempt3: undefined,
      attempt4: undefined,
      attempt5: undefined,
      attempt6: undefined,
      bestMark: 0,
      position: 1,
      isDisqualified: false,
      notes: "",
    },
  });

  const attempts = [1, 2, 3, 4, 5, 6];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Field Event Result</CardTitle>
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {attempts.map((num) => (
                <FormField
                  key={num}
                  control={form.control}
                  name={`attempt${num}` as keyof InsertFieldResult}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Attempt {num}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g., 7.85"
                          {...field}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? parseFloat(e.target.value) : undefined
                            )
                          }
                          value={field.value ?? ""}
                          data-testid={`input-attempt-${num}`}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bestMark"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Best Mark</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="e.g., 7.85"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                        data-testid="input-best-mark"
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
