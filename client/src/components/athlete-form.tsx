import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertAthleteSchema, type InsertAthlete } from "@shared/schema";
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

interface AthleteFormProps {
  onSubmit: (data: InsertAthlete) => void;
  isPending?: boolean;
}

export function AthleteForm({ onSubmit, isPending }: AthleteFormProps) {
  const form = useForm<InsertAthlete>({
    resolver: zodResolver(insertAthleteSchema),
    defaultValues: {
      name: "",
      bib: "",
      team: "",
      country: "",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Athlete</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Athlete Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., John Smith"
                        {...field}
                        data-testid="input-athlete-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bib"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bib Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 123"
                        {...field}
                        data-testid="input-bib"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Team USA"
                        {...field}
                        data-testid="input-team"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., us"
                        maxLength={2}
                        {...field}
                        onChange={(e) =>
                          field.onChange(e.target.value.toLowerCase())
                        }
                        data-testid="input-country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isPending}
              data-testid="button-add-athlete"
            >
              {isPending ? "Adding..." : "Add Athlete"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
