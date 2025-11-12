import { Event } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PlayCircle, CheckCircle2 } from "lucide-react";

interface EventListProps {
  events: Event[];
  onSelectEvent: (event: Event) => void;
  selectedEventId?: string;
}

const statusConfig = {
  scheduled: {
    icon: Clock,
    variant: "secondary" as const,
    label: "Scheduled",
  },
  in_progress: {
    icon: PlayCircle,
    variant: "default" as const,
    label: "In Progress",
  },
  completed: {
    icon: CheckCircle2,
    variant: "outline" as const,
    label: "Completed",
  },
};

export function EventList({ events, onSelectEvent, selectedEventId }: EventListProps) {
  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Clock className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first event to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const config = statusConfig[event.status as keyof typeof statusConfig];
        const StatusIcon = config.icon;
        const isSelected = event.id === selectedEventId;

        return (
          <Card
            key={event.id}
            className={isSelected ? "ring-2 ring-primary" : ""}
            data-testid={`card-event-${event.id}`}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold truncate" data-testid={`text-event-name-${event.id}`}>
                      {event.name}
                    </h3>
                    <Badge variant={config.variant} className="gap-1 shrink-0">
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    <span>Heat {event.heat}</span>
                    <span>•</span>
                    <span>{event.round}</span>
                    <span>•</span>
                    <span className="capitalize">{event.gender}</span>
                  </div>
                </div>
                <Button
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => onSelectEvent(event)}
                  data-testid={`button-select-event-${event.id}`}
                >
                  {isSelected ? "Selected" : "Select"}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
