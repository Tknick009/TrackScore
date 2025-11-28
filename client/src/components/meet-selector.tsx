import { useQuery } from "@tanstack/react-query";
import { Meet } from "@shared/schema";
import { useMeet } from "@/contexts/MeetContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export function MeetSelector() {
  const { currentMeetId, setCurrentMeetId } = useMeet();
  
  const { data: meets = [], isLoading } = useQuery<Meet[]>({
    queryKey: ["/api/meets"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">Loading meets...</span>
      </div>
    );
  }

  if (meets.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span className="text-sm">No meets available</span>
      </div>
    );
  }

  return (
    <Select 
      value={currentMeetId || ""} 
      onValueChange={setCurrentMeetId}
    >
      <SelectTrigger 
        className="w-[280px]" 
        data-testid="select-meet"
      >
        <Calendar className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Select a meet..." />
      </SelectTrigger>
      <SelectContent>
        {meets.map((meet) => (
          <SelectItem 
            key={meet.id} 
            value={meet.id}
            data-testid={`select-meet-${meet.id}`}
          >
            <div className="flex flex-col">
              <span>{meet.name}</span>
              {meet.startDate && (
                <span className="text-xs text-muted-foreground">
                  {new Date(meet.startDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
