import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Trash2, Plus } from "lucide-react";
import type { SelectRecordBook, RecordBookWithRecords, InsertRecord } from "@shared/schema";

export function RecordBookManager() {
  const { toast } = useToast();
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [newRecord, setNewRecord] = useState<Partial<InsertRecord>>({});
  
  const { data: books } = useQuery<SelectRecordBook[]>({
    queryKey: ["/api/record-books"]
  });
  
  const { data: selectedBook } = useQuery<RecordBookWithRecords>({
    queryKey: ["/api/record-books", selectedBookId],
    enabled: selectedBookId !== null
  });
  
  const createRecordMutation = useMutation({
    mutationFn: async (record: InsertRecord) => 
      apiRequest("/api/records", "POST", record),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books", selectedBookId] });
      setNewRecord({});
      toast({ title: "Record created" });
    }
  });
  
  const deleteRecordMutation = useMutation({
    mutationFn: async (id: number) => 
      apiRequest(`/api/records/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/record-books", selectedBookId] });
      toast({ title: "Record deleted" });
    }
  });
  
  const handleCreateRecord = () => {
    if (!selectedBookId || !newRecord.eventType || !newRecord.gender || 
        !newRecord.performance || !newRecord.athleteName || !newRecord.date) {
      toast({ 
        title: "Missing fields",
        description: "Event type, gender, performance, athlete name, and date are required",
        variant: "destructive"
      });
      return;
    }
    
    createRecordMutation.mutate({
      recordBookId: selectedBookId,
      eventType: newRecord.eventType,
      gender: newRecord.gender,
      performance: newRecord.performance,
      athleteName: newRecord.athleteName,
      team: newRecord.team || null,
      date: new Date(newRecord.date),
      location: newRecord.location || null,
      wind: newRecord.wind || null,
      notes: newRecord.notes || null,
      verifiedBy: newRecord.verifiedBy || null
    } as InsertRecord);
  };
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Record Book Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Select 
            value={selectedBookId?.toString() || ""} 
            onValueChange={v => setSelectedBookId(parseInt(v))}
          >
            <SelectTrigger data-testid="select-record-book">
              <SelectValue placeholder="Select record book" />
            </SelectTrigger>
            <SelectContent>
              {books?.map(book => (
                <SelectItem key={book.id} value={book.id.toString()}>
                  {book.name} ({book.scope})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
      
      {selectedBook && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add New Record
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Event Type (e.g., 100m)"
                  value={newRecord.eventType || ""}
                  onChange={e => setNewRecord({ ...newRecord, eventType: e.target.value })}
                  data-testid="input-event-type"
                />
                <Select
                  value={newRecord.gender || ""}
                  onValueChange={v => setNewRecord({ ...newRecord, gender: v })}
                >
                  <SelectTrigger data-testid="select-gender">
                    <SelectValue placeholder="Gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Men</SelectItem>
                    <SelectItem value="W">Women</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Performance (e.g., 10.23 or 1:45.32)"
                  value={newRecord.performance || ""}
                  onChange={e => setNewRecord({ ...newRecord, performance: e.target.value })}
                  data-testid="input-performance"
                />
                <Input
                  placeholder="Athlete Name"
                  value={newRecord.athleteName || ""}
                  onChange={e => setNewRecord({ ...newRecord, athleteName: e.target.value })}
                  data-testid="input-athlete-name"
                />
                <Input
                  placeholder="Team (optional)"
                  value={newRecord.team || ""}
                  onChange={e => setNewRecord({ ...newRecord, team: e.target.value })}
                  data-testid="input-team"
                />
                <Input
                  type="date"
                  value={(typeof newRecord.date === 'string' ? newRecord.date : newRecord.date?.toISOString().split('T')[0]) || ""}
                  onChange={e => setNewRecord({ ...newRecord, date: e.target.value as any })}
                  data-testid="input-date"
                />
                <Input
                  placeholder="Wind (e.g., +1.2)"
                  value={newRecord.wind || ""}
                  onChange={e => setNewRecord({ ...newRecord, wind: e.target.value })}
                  data-testid="input-wind"
                />
                <Input
                  placeholder="Location (optional)"
                  value={newRecord.location || ""}
                  onChange={e => setNewRecord({ ...newRecord, location: e.target.value })}
                  data-testid="input-location"
                />
              </div>
              <Button 
                onClick={handleCreateRecord}
                disabled={createRecordMutation.isPending}
                data-testid="button-create-record"
              >
                Add Record
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Records in {selectedBook.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Performance</TableHead>
                    <TableHead>Athlete</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Wind</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedBook.records.map(record => (
                    <TableRow key={record.id}>
                      <TableCell>{record.eventType}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.gender === 'M' ? 'Men' : 'Women'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-semibold">{record.performance}</TableCell>
                      <TableCell>{record.athleteName}</TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>{record.wind || '-'}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRecordMutation.mutate(record.id)}
                          data-testid={`button-delete-${record.id}`}
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
        </>
      )}
    </div>
  );
}
