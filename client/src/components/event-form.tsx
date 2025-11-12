import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertEventSchema, type InsertEvent, eventTypeEnum, genderEnum } from "@shared/schema";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EventFormProps {
  onSubmit: (data: InsertEvent) => void;
  isPending?: boolean;
}

const eventTypeLabels: Record<string, string> = {
  "100m": "100m",
  "200m": "200m",
  "400m": "400m",
  "800m": "800m",
  "1500m": "1500m",
  "3000m": "3000m",
  "5000m": "5000m",
  "10000m": "10000m",
  "110m_hurdles": "110m Hurdles",
  "400m_hurdles": "400m Hurdles",
  "4x100m": "4x100m Relay",
  "4x400m": "4x400m Relay",
  "high_jump": "High Jump",
  "long_jump": "Long Jump",
  "triple_jump": "Triple Jump",
  "pole_vault": "Pole Vault",
  "shot_put": "Shot Put",
  "discus": "Discus",
  "javelin": "Javelin",
  "hammer": "Hammer",
};

export function EventForm({ onSubmit, isPending }: EventFormProps) {
  const form = useForm<InsertEvent>({
    resolver: zodResolver(insertEventSchema),
    defaultValues: {
      name: "",
      eventType: "100m",
      gender: "men",
      heat: 1,
      round: "Final",
      status: "scheduled",
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Event</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Men's 100m Final"
                      {...field}
                      data-testid="input-event-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue placeholder="Select event type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {eventTypeEnum.options.map((type) => (
                          <SelectItem key={type} value={type}>
                            {eventTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="mixed">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="heat"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Heat Number</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-heat"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="round"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Round</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Final, Semi-Final"
                        {...field}
                        data-testid="input-round"
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
              data-testid="button-create-event"
            >
              {isPending ? "Creating..." : "Create Event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
