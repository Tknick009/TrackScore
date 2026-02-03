import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Meet, EventWithEntries } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrintMeet() {
  const [, params] = useRoute("/print/meets/:id");
  const meetId = params?.id;

  const { data, isLoading } = useQuery<{
    meet: Meet;
    eventsWithEntries: EventWithEntries[];
  }>({
    queryKey: [`/api/meets/${meetId}/print-data`],
    enabled: !!meetId,
  });

  // Auto-trigger print dialog when data is loaded
  useEffect(() => {
    if (data && !isLoading) {
      // Small delay to ensure rendering is complete
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data, isLoading]);

  if (isLoading || !data) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-3/4 mb-6" />
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { meet, eventsWithEntries } = data;

  const formatPerformance = (value: number | null | undefined, resultType: string): string => {
    if (value === null || value === undefined) return '-';
    
    if (resultType === 'time') {
      if (value < 60) {
        return `${value.toFixed(2)}s`;
      } else {
        const minutes = Math.floor(value / 60);
        const seconds = (value % 60).toFixed(2);
        return `${minutes}:${seconds.padStart(5, '0')}`;
      }
    } else if (resultType === 'distance' || resultType === 'height') {
      return `${value.toFixed(2)}m`;
    } else if (resultType === 'points') {
      return `${value.toFixed(0)} pts`;
    }
    
    return value.toFixed(2);
  };

  // Sort events by event number
  const sortedEvents = [...eventsWithEntries].sort((a, b) => 
    a.eventNumber - b.eventNumber
  );

  return (
    <div className="p-8 max-w-6xl mx-auto bg-white">
      {/* Meet header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
        {meet.logoUrl && (
          <img
            src={meet.logoUrl}
            alt="Meet logo"
            className="mx-auto mb-4 max-w-[150px] max-h-[100px]"
          />
        )}
        <h1 className="text-4xl font-bold text-gray-900 mb-2" data-testid="heading-meet-name">
          {meet.name}
        </h1>
        {meet.location && (
          <div className="text-xl text-gray-700 mb-1" data-testid="text-meet-location">
            {meet.location}
          </div>
        )}
        <div className="text-lg text-gray-600" data-testid="text-meet-date">
          {format(new Date(meet.startDate), 'MMMM d, yyyy')}
          {meet.endDate && ` - ${format(new Date(meet.endDate), 'MMMM d, yyyy')}`}
        </div>
      </div>

      {/* Events with results */}
      {sortedEvents.map((eventWithEntries, eventIndex) => {
        const { entries, ...event } = eventWithEntries;
        // Sort entries by place
        const sortedEntries = [...entries].sort((a, b) => {
          const aPlace = a.finalPlace ?? a.semifinalPlace ?? a.quarterfinalPlace ?? a.preliminaryPlace ?? 999;
          const bPlace = b.finalPlace ?? b.semifinalPlace ?? b.quarterfinalPlace ?? b.preliminaryPlace ?? 999;
          return aPlace - bPlace;
        });

        const hasWind = entries.some(e => 
          e.finalWind !== null || e.semifinalWind !== null || 
          e.quarterfinalWind !== null || e.preliminaryWind !== null
        );

        const hasLanes = entries.some(e => 
          e.finalLane !== null || e.semifinalLane !== null || 
          e.quarterfinalLane !== null || e.preliminaryLane !== null
        );

        return (
          <div 
            key={event.id} 
            className="mb-12 page-break-inside-avoid"
            data-testid={`section-event-${eventIndex}`}
          >
            {/* Event header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold text-gray-900" data-testid={`heading-event-${eventIndex}`}>
                  Event #{event.eventNumber} - {event.name}
                </h2>
                <div className="text-sm text-gray-600">
                  {event.eventType} - {event.gender}
                </div>
              </div>
              {event.eventDate && (
                <div className="text-sm text-gray-600">
                  {format(new Date(event.eventDate), 'MMMM d, yyyy')}
                </div>
              )}
            </div>

            {/* Results table or empty message */}
            {entries.length === 0 ? (
              <p className="text-gray-500 italic py-4" data-testid={`text-no-entries-${eventIndex}`}>
                No entries
              </p>
            ) : (
              <table className="w-full border-collapse mb-4">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Place</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Bib</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Name</th>
                    <th className="border border-gray-400 px-3 py-2 text-left font-bold">Team</th>
                    {hasLanes && <th className="border border-gray-400 px-3 py-2 text-left font-bold">Lane</th>}
                    <th className="border border-gray-400 px-3 py-2 text-right font-bold">Performance</th>
                    {hasWind && <th className="border border-gray-400 px-3 py-2 text-right font-bold">Wind</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedEntries.map((entry, idx) => {
                    const place = entry.finalPlace ?? entry.semifinalPlace ?? entry.quarterfinalPlace ?? entry.preliminaryPlace;
                    const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
                    const lane = entry.finalLane ?? entry.semifinalLane ?? entry.quarterfinalLane ?? entry.preliminaryLane;
                    const wind = entry.finalWind ?? entry.semifinalWind ?? entry.quarterfinalWind ?? entry.preliminaryWind;
                    
                    const podiumClass = place === 1 ? 'bg-yellow-100' : place === 2 ? 'bg-gray-100' : place === 3 ? 'bg-orange-100' : '';
                    
                    return (
                      <tr 
                        key={idx} 
                        className={podiumClass} 
                        data-testid={`row-event-${eventIndex}-result-${idx}`}
                      >
                        <td className="border border-gray-400 px-3 py-1 text-center font-bold">
                          {place || '-'}
                        </td>
                        <td className="border border-gray-400 px-3 py-1 text-center">
                          {entry.athlete?.bibNumber || '-'}
                        </td>
                        <td className="border border-gray-400 px-3 py-1">
                          {entry.athlete?.firstName} {entry.athlete?.lastName}
                        </td>
                        <td className="border border-gray-400 px-3 py-1">
                          {entry.team?.name || '-'}
                        </td>
                        {hasLanes && (
                          <td className="border border-gray-400 px-3 py-1 text-center">
                            {lane || '-'}
                          </td>
                        )}
                        <td className="border border-gray-400 px-3 py-1 text-right font-bold">
                          {formatPerformance(mark, entry.resultType)}
                        </td>
                        {hasWind && (
                          <td className="border border-gray-400 px-3 py-1 text-right">
                            {wind ? wind.toFixed(1) : '-'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 pt-6 border-t border-gray-300 mt-8">
        <p data-testid="text-generated-date">
          Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
        </p>
        <p className="mt-1">{meet.name}</p>
      </div>

      <style>{`
        @media print {
          @page {
            margin: 1.5cm;
            size: letter;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
