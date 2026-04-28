import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Plus, Book, Edit, Filter, Download } from "lucide-react";
import {
  type SelectRecordBook,
  type SelectRecord,
  type InsertRecordBook,
  type RecordBookWithRecords,
  insertRecordBookSchema,
  insertRecordSchema,
} from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RecordEditor } from "@/components/RecordEditor";
import { RecordComparison } from "@/components/RecordComparison";
import { formatPerformance } from "@/utils/recordChecker";
import { useToast } from "@/hooks/use-toast";

const recordBookFormSchema = insertRecordBookSchema;
type RecordBookFormData = z.infer<typeof recordBookFormSchema>;

export default function RecordBooksPage() {
  const { toast } = useToast();
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [editingBook, setEditingBook] = useState<SelectRecordBook | null>(null);
  const [showRecordDialog, setShowRecordDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SelectRecord | null>(null);
  const [eventFilter, setEventFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [selectedRecord, setSelectedRecord] = useState<SelectRecord | null>(null);

  const { data: books = [], isLoading: loadingBooks } = useQuery<SelectRecordBook[]>({
    queryKey: ["/api/record-books"],
  });

  const { data: selectedBookData, isLoading: loadingRecords } = useQuery<RecordBookWithRecords>({
    queryKey: ["/api/record-books", selectedBookId],
    enabled: !!selectedBookId,
  });

  const form = useForm<RecordBookFormData>({
    resolver: zodResolver(recordBookFormSchema),
    defaultValues: editingBook || {
      name: "",
      description: "",
      scope: "facility",
      isActive: true,
    },
  });

  const createBookMutation = useMutation({
    mutationFn: (data: RecordBookFormData) =>
      apiRequest("POST", "/api/record-books", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books"] });
      toast({
        title: "Success",
        description: "Record book created successfully",
      });
      setShowBookDialog(false);
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

  const updateBookMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertRecordBook> }) =>
      apiRequest("PATCH", `/api/record-books/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books"] });
      toast({
        title: "Success",
        description: "Record book updated successfully",
      });
      setShowBookDialog(false);
      setEditingBook(null);
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

  const createRecordMutation = useMutation({
    mutationFn: (data: z.infer<typeof insertRecordSchema>) =>
      apiRequest("POST", "/api/records", {
        ...data,
        date: new Date(data.date).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books", selectedBookId] });
      toast({
        title: "Success",
        description: "Record created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRecordMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<z.infer<typeof insertRecordSchema>> }) =>
      apiRequest("PATCH", `/api/records/${id}`, {
        ...data,
        date: data.date ? new Date(data.date).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books", selectedBookId] });
      toast({
        title: "Success",
        description: "Record updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteRecordMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/records/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books", selectedBookId] });
      toast({
        title: "Success",
        description: "Record deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateBook = () => {
    setEditingBook(null);
    form.reset({
      name: "",
      description: "",
      scope: "facility",
      isActive: true,
    });
    setShowBookDialog(true);
  };

  const handleEditBook = (book: SelectRecordBook) => {
    setEditingBook(book);
    form.reset(book);
    setShowBookDialog(true);
  };

  const handleSubmitBook = (data: RecordBookFormData) => {
    if (editingBook) {
      updateBookMutation.mutate({ id: editingBook.id, data });
    } else {
      createBookMutation.mutate(data);
    }
  };

  const handleCreateRecord = () => {
    if (!selectedBookId) return;
    setEditingRecord(null);
    setShowRecordDialog(true);
  };

  const handleEditRecord = (record: SelectRecord) => {
    setEditingRecord(record);
    setShowRecordDialog(true);
  };

  const handleSaveRecord = async (data: z.infer<typeof insertRecordSchema>) => {
    if (editingRecord) {
      await updateRecordMutation.mutateAsync({ id: editingRecord.id, data });
    } else {
      await createRecordMutation.mutateAsync(data);
    }
  };

  const handleDeleteRecord = async () => {
    if (!editingRecord) return;
    await deleteRecordMutation.mutateAsync(editingRecord.id);
  };

  const filteredRecords = selectedBookData?.records.filter((record) => {
    if (eventFilter !== "all" && record.eventType !== eventFilter) return false;
    if (genderFilter !== "all" && record.gender !== genderFilter) return false;
    return true;
  }) || [];

  const uniqueEventTypes = Array.from(
    new Set(selectedBookData?.records.map((r) => r.eventType) || [])
  );

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">
            Record Books
          </h1>
          <p className="text-muted-foreground">
            Manage facility, meet, and national records
          </p>
        </div>
        <Button onClick={handleCreateBook} data-testid="button-create-book">
          <Plus className="w-4 h-4 mr-2" />
          New Record Book
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {loadingBooks ? (
          <div className="col-span-3 text-center py-12">Loading...</div>
        ) : books.length === 0 ? (
          <div className="col-span-3 text-center py-12">
            <Book className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              No record books yet. Create one to get started.
            </p>
          </div>
        ) : (
          books.map((book) => (
            <Card
              key={book.id}
              className={`cursor-pointer transition-all ${
                selectedBookId === book.id ? "ring-2 ring-accent" : ""
              }`}
              onClick={() => setSelectedBookId(book.id)}
              data-testid={`card-book-${book.id}`}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{book.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditBook(book);
                    }}
                    data-testid={`button-edit-book-${book.id}`}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Badge variant="secondary">{book.scope}</Badge>
                  {book.description && (
                    <p className="text-sm text-muted-foreground">
                      {book.description}
                    </p>
                  )}
                  {!book.isActive && (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {selectedBookId && selectedBookData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Records in {selectedBookData.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {}}
                  data-testid="button-export"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateRecord}
                  data-testid="button-add-record"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-event-filter">
                      <SelectValue placeholder="Filter by event" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Events</SelectItem>
                      {uniqueEventTypes.map((event) => (
                        <SelectItem key={event} value={event}>
                          {event.replace(/_/g, ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="w-[150px]" data-testid="select-gender-filter">
                    <SelectValue placeholder="Filter by gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="M">Men</SelectItem>
                    <SelectItem value="F">Women</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingRecords ? (
                <div className="text-center py-12">Loading records...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No records found. Add your first record to get started.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead>Athlete</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow
                        key={record.id}
                        className="cursor-pointer hover-elevate"
                        onClick={() => setSelectedRecord(record)}
                        data-testid={`row-record-${record.id}`}
                      >
                        <TableCell className="font-medium">
                          {record.eventType.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell>
                          {record.gender === "M" ? "Men" : record.gender === "F" ? "Women" : "Mixed"}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatPerformance(record.eventType, record.performance)}
                          {record.wind && (
                            <span className="text-xs text-muted-foreground ml-1">
                              ({record.wind})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{record.athleteName}</TableCell>
                        <TableCell>
                          {new Date(record.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.location || "—"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditRecord(record);
                            }}
                            data-testid={`button-edit-record-${record.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedRecord && (
        <RecordComparison record={selectedRecord} eventType={selectedRecord.eventType} />
      )}

      <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle data-testid="text-book-dialog-title">
              {editingBook ? "Edit Record Book" : "Create Record Book"}
            </DialogTitle>
            <DialogDescription>
              {editingBook
                ? "Update the record book details"
                : "Create a new record book to track records"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmitBook)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Facility Records"
                        data-testid="input-book-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scope"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scope</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-book-scope">
                          <SelectValue placeholder="Select scope" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="facility">Facility</SelectItem>
                        <SelectItem value="meet">Meet</SelectItem>
                        <SelectItem value="national">National</SelectItem>
                        <SelectItem value="international">International</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ""}
                        placeholder="Description of this record book"
                        rows={3}
                        data-testid="input-book-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookDialog(false)}
                  data-testid="button-cancel-book"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBookMutation.isPending || updateBookMutation.isPending}
                  data-testid="button-submit-book"
                >
                  {createBookMutation.isPending || updateBookMutation.isPending
                    ? "Saving..."
                    : editingBook
                    ? "Update"
                    : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {showRecordDialog && selectedBookId && (
        <RecordEditor
          open={showRecordDialog}
          onOpenChange={setShowRecordDialog}
          onSave={handleSaveRecord}
          onDelete={editingRecord ? handleDeleteRecord : undefined}
          record={editingRecord || undefined}
          recordBookId={selectedBookId}
        />
      )}
    </div>
  );
}
