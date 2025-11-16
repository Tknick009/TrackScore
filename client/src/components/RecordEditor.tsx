import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertRecordSchema, type SelectRecord } from "@shared/schema";
import { Calendar, Trash2 } from "lucide-react";
import { validatePerformance } from "@/utils/recordChecker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const recordFormSchema = insertRecordSchema.extend({
  date: z.string().min(1, "Date is required"),
});

type RecordFormData = z.infer<typeof recordFormSchema>;

interface RecordEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: RecordFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
  record?: SelectRecord;
  recordBookId: number;
}

const EVENT_TYPES = [
  "100m", "200m", "400m", "800m", "1500m", "3000m", "5000m", "10000m",
  "110m_hurdles", "400m_hurdles",
  "4x100m", "4x400m",
  "high_jump", "long_jump", "triple_jump", "pole_vault",
  "shot_put", "discus", "javelin", "hammer"
];

const GENDERS = ["M", "F", "mixed"];

export function RecordEditor({
  open,
  onOpenChange,
  onSave,
  onDelete,
  record,
  recordBookId,
}: RecordEditorProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const form = useForm<RecordFormData>({
    resolver: zodResolver(recordFormSchema),
    defaultValues: record
      ? {
          ...record,
          date: new Date(record.date).toISOString().split('T')[0],
        }
      : {
          recordBookId,
          eventType: "",
          gender: "M",
          performance: "",
          athleteName: "",
          team: "",
          date: new Date().toISOString().split('T')[0],
          location: "",
          wind: "",
          notes: "",
          verifiedBy: "",
        },
  });

  const handleSubmit = async (data: RecordFormData) => {
    const performanceValidation = validatePerformance(data.performance);
    if (!performanceValidation.valid) {
      form.setError('performance', { message: performanceValidation.error });
      return;
    }
    
    setIsSaving(true);
    try {
      await onSave(data);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error("Failed to save record:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !confirm("Are you sure you want to delete this record?")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await onDelete();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to delete record:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle data-testid="text-dialog-title">
            {record ? "Edit Record" : "Add New Record"}
          </DialogTitle>
          <DialogDescription>
            {record
              ? "Update the record details below"
              : "Enter the details for the new record"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Event Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-event-type">
                          <SelectValue placeholder="Select event" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EVENT_TYPES.map((event) => (
                          <SelectItem key={event} value={event}>
                            {event.replace(/_/g, ' ')}
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender === "M" ? "Men" : gender === "F" ? "Women" : "Mixed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="athleteName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Athlete Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="John Doe"
                      data-testid="input-athlete-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="performance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Performance</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="10.23 or 2.01m"
                        data-testid="input-performance"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="wind"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Wind (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="+1.5"
                        data-testid="input-wind"
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
                name="team"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ""}
                        placeholder="Team name"
                        data-testid="input-team"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type="date"
                          data-testid="input-date"
                        />
                        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Stadium or venue name"
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="verifiedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verified By (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ""}
                      placeholder="Official name"
                      data-testid="input-verified-by"
                    />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Additional notes about this record"
                      rows={3}
                      data-testid="input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              {record && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isDeleting || isSaving}
                  data-testid="button-delete-record"
                  className="mr-auto"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {isDeleting ? "Deleting..." : "Delete"}
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isDeleting}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving || isDeleting}
                data-testid="button-save-record"
              >
                {isSaving ? "Saving..." : record ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
