import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Plus, Calendar } from "lucide-react";
import { Link } from "wouter";
import { insertMeetSchema, type Meet } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// Create a schema for the form with only the required fields
const createMeetFormSchema = insertMeetSchema
  .pick({ name: true, location: true, startDate: true })
  .extend({
    name: z.string().min(1, "Name is required"),
    startDate: z.date({ required_error: "Date is required" }),
    location: z.string().optional(),
  });

type CreateMeetFormData = z.infer<typeof createMeetFormSchema>;

function CreateMeetDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateMeetFormData>({
    resolver: zodResolver(createMeetFormSchema),
    defaultValues: {
      name: "",
      location: "",
      startDate: new Date(),
    },
  });

  const createMeetMutation = useMutation({
    mutationFn: async (data: CreateMeetFormData) => {
      const response = await apiRequest("POST", "/api/meets", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meets"] });
      toast({
        title: "Meet created",
        description: "Your meet has been created successfully.",
      });
      setOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateMeetFormData) => {
    createMeetMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" data-testid="button-create-meet">
          <Plus className="w-4 h-4 mr-2" />
          Create Meet
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="dialog-create-meet">
        <DialogHeader>
          <DialogTitle>Create New Meet</DialogTitle>
          <DialogDescription>
            Add a new track and field meet. A unique meet code will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meet Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Spring Track Championship"
                      data-testid="input-meet-name"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          data-testid="button-select-date"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        data-testid="calendar-meet-date"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="City Stadium"
                      data-testid="input-meet-location"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                data-testid="button-cancel-create-meet"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMeetMutation.isPending}
                data-testid="button-submit-create-meet"
              >
                {createMeetMutation.isPending ? "Creating..." : "Create Meet"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MeetCard({ meet }: { meet: Meet }) {
  return (
    <Link href={`/meets/${meet.id}`}>
      <Card className="hover-elevate" data-testid={`card-meet-${meet.id}`}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span className="truncate" data-testid={`text-meet-name-${meet.id}`}>
              {meet.name}
            </span>
            <span className="text-sm font-mono text-muted-foreground" data-testid={`text-meet-code-${meet.id}`}>
              {meet.meetCode}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span data-testid={`text-meet-date-${meet.id}`}>
              {format(new Date(meet.startDate), "MMMM d, yyyy")}
            </span>
          </div>
          {meet.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span data-testid={`text-meet-location-${meet.id}`}>
                {meet.location}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function MeetCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Calendar className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-xl font-semibold mb-2">No meets yet</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">
        Get started by creating your first track and field meet.
      </p>
      <CreateMeetDialog />
    </div>
  );
}

export default function MeetsList() {
  const { data: meets, isLoading } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground" data-testid="heading-meets-list">
              Track & Field Meets
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your track and field competitions
            </p>
          </div>
          {meets && meets.length > 0 && <CreateMeetDialog />}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <MeetCardSkeleton key={i} />
            ))}
          </div>
        ) : meets && meets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="grid-meets">
            {meets.map((meet) => (
              <MeetCard key={meet.id} meet={meet} />
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
