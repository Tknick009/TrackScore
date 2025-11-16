import { useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { EventWithEntries, Meet } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrintResults() {
  const [, params] = useRoute("/print/events/:id");
  const eventId = params?.id;

  const { data, isLoading } = useQuery<{
    event: EventWithEntries;
    entries: any[];
    meet: Meet | null;
  }>({
    queryKey: [`/api/events/${eventId}/print-data`],
    enabled: !!eventId,
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
      <div className="p-8 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const { event, meet } = data;

  // Sort entries by place
  const sortedEntries = [...event.entries].sort((a, b) => {
    const aPlace = a.finalPlace ?? a.semifinalPlace ?? a.quarterfinalPlace ?? a.preliminaryPlace ?? 999;
    const bPlace = b.finalPlace ?? b.semifinalPlace ?? b.quarterfinalPlace ?? b.preliminaryPlace ?? 999;
    return aPlace - bPlace;
  });

  const hasWind = event.entries.some(e => 
    e.finalWind !== null || e.semifinalWind !== null || 
    e.quarterfinalWind !== null || e.preliminaryWind !== null
  );

  const hasLanes = event.entries.some(e => 
    e.finalLane !== null || e.semifinalLane !== null || 
    e.quarterfinalLane !== null || e.preliminaryLane !== null
  );

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

  return (
    <div className="p-8 max-w-5xl mx-auto bg-white">
      {/* Print header */}
      <div className="text-center mb-8 pb-6 border-b-2 border-gray-800">
        {meet?.logoUrl && (
          <img
            src={meet.logoUrl}
            alt="Meet logo"
            className="mx-auto mb-4 max-w-[150px] max-h-[100px]"
          />
        )}
        <h1 className="text-4xl font-bold text-gray-900 mb-2" data-testid="heading-event-name">
          {event.name}
        </h1>
        {meet && (
          <div className="text-xl text-gray-700 mb-1" data-testid="text-meet-name">
            <strong>{meet.name}</strong>
          </div>
        )}
        <div className="text-lg text-gray-600" data-testid="text-event-meta">
          {event.eventType} - {event.gender}
          {event.eventDate && ` - ${format(new Date(event.eventDate), 'MMMM d, yyyy')}`}
        </div>
      </div>

      {/* Results table */}
      <table className="w-full border-collapse mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 px-4 py-3 text-left font-bold">Place</th>
            <th className="border border-gray-400 px-4 py-3 text-left font-bold">Bib</th>
            <th className="border border-gray-400 px-4 py-3 text-left font-bold">Name</th>
            <th className="border border-gray-400 px-4 py-3 text-left font-bold">Team</th>
            {hasLanes && <th className="border border-gray-400 px-4 py-3 text-left font-bold">Lane</th>}
            <th className="border border-gray-400 px-4 py-3 text-right font-bold">Performance</th>
            {hasWind && <th className="border border-gray-400 px-4 py-3 text-right font-bold">Wind</th>}
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
              <tr key={idx} className={podiumClass} data-testid={`row-result-${idx}`}>
                <td className="border border-gray-400 px-4 py-2 text-center font-bold">
                  {place || '-'}
                </td>
                <td className="border border-gray-400 px-4 py-2 text-center">
                  {entry.athlete.bibNumber || '-'}
                </td>
                <td className="border border-gray-400 px-4 py-2">
                  {entry.athlete.firstName} {entry.athlete.lastName}
                </td>
                <td className="border border-gray-400 px-4 py-2">
                  {entry.team?.name || '-'}
                </td>
                {hasLanes && (
                  <td className="border border-gray-400 px-4 py-2 text-center">
                    {lane || '-'}
                  </td>
                )}
                <td className="border border-gray-400 px-4 py-2 text-right font-bold">
                  {formatPerformance(mark, entry.resultType)}
                </td>
                {hasWind && (
                  <td className="border border-gray-400 px-4 py-2 text-right">
                    {wind ? wind.toFixed(1) : '-'}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="text-center text-sm text-gray-600 pt-4 border-t border-gray-300">
        <p data-testid="text-generated-date">
          Generated on {format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}
        </p>
        {meet && <p className="mt-1">{meet.name}</p>}
      </div>
    </div>
  );
}
