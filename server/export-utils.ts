import { Event, Meet, EntryWithDetails, EventWithEntries } from "@shared/schema";
import { isTimeEvent, isDistanceEvent, isHeightEvent } from "@shared/schema";
import { format } from "date-fns";

/**
 * Formats a performance value based on the result type
 */
function formatPerformance(value: number | null | undefined, resultType: string): string {
  if (value === null || value === undefined) return '-';
  
  if (resultType === 'time') {
    // Format time results
    if (value < 60) {
      return `${value.toFixed(2)}s`;
    } else {
      const minutes = Math.floor(value / 60);
      const seconds = (value % 60).toFixed(2);
      return `${minutes}:${seconds.padStart(5, '0')}`;
    }
  } else if (resultType === 'distance' || resultType === 'height') {
    // Format distance/height results
    return `${value.toFixed(2)}m`;
  } else if (resultType === 'points') {
    // Format points
    return `${value.toFixed(0)} pts`;
  }
  
  return value.toFixed(2);
}

/**
 * Escapes CSV field value by wrapping in quotes and escaping internal quotes
 */
function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV export for a single event
 */
export function generateEventCSV(event: EventWithEntries): string {
  const lines: string[] = [];
  
  // Header section
  lines.push(`Event,${escapeCSV(event.name)}`);
  lines.push(`Type,${escapeCSV(event.eventType)}`);
  lines.push(`Gender,${escapeCSV(event.gender)}`);
  if (event.eventDate) {
    lines.push(`Date,${format(new Date(event.eventDate), 'MMM d, yyyy')}`);
  }
  lines.push(''); // Blank line
  
  // Determine columns based on event type
  const hasWind = event.entries.some(e => 
    e.finalWind !== null || e.semifinalWind !== null || 
    e.quarterfinalWind !== null || e.preliminaryWind !== null
  );
  
  const hasLanes = event.entries.some(e => 
    e.finalLane !== null || e.semifinalLane !== null || 
    e.quarterfinalLane !== null || e.preliminaryLane !== null
  );
  
  const hasHeats = event.entries.some(e => 
    (e.finalHeat !== null && e.finalHeat > 1) || 
    (e.semifinalHeat !== null && e.semifinalHeat > 1) || 
    (e.quarterfinalHeat !== null && e.quarterfinalHeat > 1) || 
    (e.preliminaryHeat !== null && e.preliminaryHeat > 1)
  );
  
  // Column headers
  const headers = ['Place', 'Bib', 'First Name', 'Last Name', 'Team', 'Performance'];
  if (hasHeats) headers.push('Heat');
  if (hasLanes) headers.push('Lane');
  if (hasWind) headers.push('Wind');
  lines.push(headers.map(h => escapeCSV(h)).join(','));
  
  // Sort entries by place
  const sortedEntries = [...event.entries].sort((a, b) => {
    const aPlace = a.finalPlace ?? a.semifinalPlace ?? a.quarterfinalPlace ?? a.preliminaryPlace ?? 999;
    const bPlace = b.finalPlace ?? b.semifinalPlace ?? b.quarterfinalPlace ?? b.preliminaryPlace ?? 999;
    return aPlace - bPlace;
  });
  
  // Data rows
  sortedEntries.forEach(entry => {
    const place = entry.finalPlace ?? entry.semifinalPlace ?? entry.quarterfinalPlace ?? entry.preliminaryPlace;
    const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
    const lane = entry.finalLane ?? entry.semifinalLane ?? entry.quarterfinalLane ?? entry.preliminaryLane;
    const heat = entry.finalHeat ?? entry.semifinalHeat ?? entry.quarterfinalHeat ?? entry.preliminaryHeat;
    const wind = entry.finalWind ?? entry.semifinalWind ?? entry.quarterfinalWind ?? entry.preliminaryWind;
    
    const row = [
      place?.toString() || '-',
      entry.athlete.bibNumber || '-',
      entry.athlete.firstName,
      entry.athlete.lastName,
      entry.team?.name || '-',
      formatPerformance(mark, entry.resultType),
    ];
    
    if (hasHeats) row.push(heat?.toString() || '-');
    if (hasLanes) row.push(lane?.toString() || '-');
    if (hasWind) row.push(wind?.toFixed(1) || '-');
    
    lines.push(row.map(v => escapeCSV(v)).join(','));
  });
  
  return lines.join('\n');
}

/**
 * Generate CSV export for entire meet (all events)
 * Accepts EventWithEntries[] for type consistency with client/server
 */
export function generateMeetCSV(
  meet: Meet, 
  eventsWithEntries: EventWithEntries[]
): string {
  const lines: string[] = [];
  
  // Meet header
  lines.push(`Meet,${escapeCSV(meet.name)}`);
  if (meet.location) {
    lines.push(`Location,${escapeCSV(meet.location)}`);
  }
  lines.push(`Date,${format(new Date(meet.startDate), 'MMM d, yyyy')}`);
  lines.push('');
  lines.push('');
  
  // Sort events by event number
  const sortedEvents = [...eventsWithEntries].sort((a, b) => 
    a.eventNumber - b.eventNumber
  );
  
  // Generate CSV for each event (INCLUDING empty events)
  sortedEvents.forEach((eventWithEntries, index) => {
    const { entries, ...event } = eventWithEntries;
    
    if (index > 0) {
      lines.push('');
      lines.push('');
    }
    
    // Event header
    lines.push(`Event #${event.eventNumber}`);
    lines.push(`Event,${escapeCSV(event.name)}`);
    lines.push(`Type,${escapeCSV(event.eventType)}`);
    lines.push(`Gender,${escapeCSV(event.gender)}`);
    if (event.eventDate) {
      lines.push(`Date,${format(new Date(event.eventDate), 'MMM d, yyyy')}`);
    }
    lines.push('');
    
    // If no entries, explicitly note it
    if (entries.length === 0) {
      lines.push('Place,Bib,First Name,Last Name,Team,Performance');
      lines.push('No entries');
    } else {
      // Iterate entries directly - NO nested CSV strings
      // Determine columns based on entry data
      const hasWind = entries.some((e: any) => 
        e.finalWind !== null || e.semifinalWind !== null || 
        e.quarterfinalWind !== null || e.preliminaryWind !== null
      );
      
      const hasLanes = entries.some((e: any) => 
        e.finalLane !== null || e.semifinalLane !== null || 
        e.quarterfinalLane !== null || e.preliminaryLane !== null
      );
      
      const hasHeats = entries.some((e: any) => 
        (e.finalHeat !== null && e.finalHeat > 1) || 
        (e.semifinalHeat !== null && e.semifinalHeat > 1) || 
        (e.quarterfinalHeat !== null && e.quarterfinalHeat > 1) || 
        (e.preliminaryHeat !== null && e.preliminaryHeat > 1)
      );
      
      // Column headers
      const headers = ['Place', 'Bib', 'First Name', 'Last Name', 'Team', 'Performance'];
      if (hasHeats) headers.push('Heat');
      if (hasLanes) headers.push('Lane');
      if (hasWind) headers.push('Wind');
      lines.push(headers.map(h => escapeCSV(h)).join(','));
      
      // Sort entries by place
      const sortedEntries = [...entries].sort((a: any, b: any) => {
        const aPlace = a.finalPlace ?? a.semifinalPlace ?? a.quarterfinalPlace ?? a.preliminaryPlace ?? 999;
        const bPlace = b.finalPlace ?? b.semifinalPlace ?? b.quarterfinalPlace ?? b.preliminaryPlace ?? 999;
        return aPlace - bPlace;
      });
      
      // Data rows - iterate entries directly to build rows
      sortedEntries.forEach((entry: any) => {
        const place = entry.finalPlace ?? entry.semifinalPlace ?? entry.quarterfinalPlace ?? entry.preliminaryPlace;
        const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
        const lane = entry.finalLane ?? entry.semifinalLane ?? entry.quarterfinalLane ?? entry.preliminaryLane;
        const heat = entry.finalHeat ?? entry.semifinalHeat ?? entry.quarterfinalHeat ?? entry.preliminaryHeat;
        const wind = entry.finalWind ?? entry.semifinalWind ?? entry.quarterfinalWind ?? entry.preliminaryWind;
        
        const row = [
          place?.toString() || '-',
          entry.athlete.bibNumber || '-',
          entry.athlete.firstName,
          entry.athlete.lastName,
          entry.team?.name || '-',
          formatPerformance(mark, entry.resultType),
        ];
        
        if (hasHeats) row.push(heat?.toString() || '-');
        if (hasLanes) row.push(lane?.toString() || '-');
        if (hasWind) row.push(wind?.toFixed(1) || '-');
        
        lines.push(row.map(v => escapeCSV(v)).join(','));
      });
    }
  });
  
  return lines.join('\n');
}

/**
 * @deprecated Use React print routes at /print/events/:id instead
 * Generate printable HTML for a single event
 * This function is deprecated and should not be used for new features.
 */
export function generateEventHTML(event: EventWithEntries, meet?: Meet): string {
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
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${event.name} - Results</title>
  <style>
    @media print {
      @page {
        margin: 1.5cm;
        size: letter;
      }
      .no-print {
        display: none !important;
      }
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      color: #000;
      background: #fff;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #333;
    }
    
    .meet-logo {
      max-width: 150px;
      max-height: 100px;
      margin-bottom: 15px;
    }
    
    h1 {
      font-size: 28px;
      margin: 0 0 10px 0;
      font-weight: bold;
    }
    
    .event-meta {
      font-size: 16px;
      color: #555;
      margin: 5px 0;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    
    thead {
      background-color: #f0f0f0;
    }
    
    th, td {
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    
    th {
      font-weight: bold;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    td {
      font-size: 14px;
    }
    
    tbody tr:nth-child(odd) {
      background-color: #f9f9f9;
    }
    
    tbody tr:hover {
      background-color: #e8f4f8;
    }
    
    .place-col {
      width: 60px;
      font-weight: bold;
      text-align: center;
    }
    
    .bib-col {
      width: 60px;
      text-align: center;
    }
    
    .performance-col {
      width: 120px;
      font-weight: bold;
      text-align: right;
    }
    
    .podium-1 {
      background-color: #ffd700 !important;
      font-weight: bold;
    }
    
    .podium-2 {
      background-color: #c0c0c0 !important;
      font-weight: bold;
    }
    
    .podium-3 {
      background-color: #cd7f32 !important;
      font-weight: bold;
    }
    
    .footer {
      margin-top: 30px;
      padding-top: 15px;
      border-top: 2px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .print-button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">Print Results</button>
  
  <div class="header">
    ${meet?.logoUrl ? `<img src="${meet.logoUrl}" alt="Meet logo" class="meet-logo">` : ''}
    <h1>${event.name}</h1>
    ${meet ? `<div class="event-meta"><strong>${meet.name}</strong></div>` : ''}
    <div class="event-meta">${event.eventType} - ${event.gender}</div>
    ${event.eventDate ? `<div class="event-meta">${format(new Date(event.eventDate), 'MMMM d, yyyy')}</div>` : ''}
  </div>
  
  <table>
    <thead>
      <tr>
        <th class="place-col">Place</th>
        <th class="bib-col">Bib</th>
        <th>Name</th>
        <th>Team</th>
        ${hasLanes ? '<th>Lane</th>' : ''}
        <th class="performance-col">Performance</th>
        ${hasWind ? '<th>Wind</th>' : ''}
      </tr>
    </thead>
    <tbody>
      ${sortedEntries.map(entry => {
        const place = entry.finalPlace ?? entry.semifinalPlace ?? entry.quarterfinalPlace ?? entry.preliminaryPlace;
        const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
        const lane = entry.finalLane ?? entry.semifinalLane ?? entry.quarterfinalLane ?? entry.preliminaryLane;
        const wind = entry.finalWind ?? entry.semifinalWind ?? entry.quarterfinalWind ?? entry.preliminaryWind;
        
        const podiumClass = place === 1 ? 'podium-1' : place === 2 ? 'podium-2' : place === 3 ? 'podium-3' : '';
        
        return `
          <tr class="${podiumClass}">
            <td class="place-col">${place || '-'}</td>
            <td class="bib-col">${entry.athlete.bibNumber || '-'}</td>
            <td>${entry.athlete.firstName} ${entry.athlete.lastName}</td>
            <td>${entry.team?.name || '-'}</td>
            ${hasLanes ? `<td>${lane || '-'}</td>` : ''}
            <td class="performance-col">${formatPerformance(mark, entry.resultType)}</td>
            ${hasWind ? `<td>${wind ? wind.toFixed(1) : '-'}</td>` : ''}
          </tr>
        `;
      }).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <p>Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
    ${meet ? `<p>${meet.name}</p>` : ''}
  </div>
</body>
</html>`;
  
  return html;
}

/**
 * @deprecated Use React print routes at /print/meets/:id instead
 * Generate printable HTML for entire meet (all events)
 * This function is deprecated and should not be used for new features.
 */
export function generateMeetHTML(meet: Meet, events: EventWithEntries[]): string {
  // Sort events by event number
  const sortedEvents = [...events].sort((a, b) => a.eventNumber - b.eventNumber);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${meet.name} - Complete Results</title>
  <style>
    @media print {
      @page {
        margin: 1.5cm;
        size: letter;
      }
      .no-print {
        display: none !important;
      }
      .event-section {
        page-break-before: always;
      }
      .event-section:first-child {
        page-break-before: avoid;
      }
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #000;
      background: #fff;
    }
    
    .meet-header {
      text-align: center;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 4px solid #333;
    }
    
    .meet-logo {
      max-width: 180px;
      max-height: 120px;
      margin-bottom: 20px;
    }
    
    .meet-header h1 {
      font-size: 32px;
      margin: 0 0 10px 0;
      font-weight: bold;
    }
    
    .meet-meta {
      font-size: 18px;
      color: #555;
      margin: 5px 0;
    }
    
    .event-section {
      margin-bottom: 50px;
    }
    
    .event-header {
      background-color: #333;
      color: white;
      padding: 15px 20px;
      margin-bottom: 15px;
    }
    
    .event-header h2 {
      margin: 0;
      font-size: 22px;
    }
    
    .event-header .event-details {
      font-size: 14px;
      margin-top: 5px;
      opacity: 0.9;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    thead {
      background-color: #f0f0f0;
    }
    
    th, td {
      padding: 8px 10px;
      text-align: left;
      border: 1px solid #ddd;
      font-size: 13px;
    }
    
    th {
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    tbody tr:nth-child(odd) {
      background-color: #f9f9f9;
    }
    
    .place-col {
      width: 50px;
      font-weight: bold;
      text-align: center;
    }
    
    .bib-col {
      width: 50px;
      text-align: center;
    }
    
    .performance-col {
      width: 100px;
      font-weight: bold;
      text-align: right;
    }
    
    .podium-1 {
      background-color: #ffd700 !important;
    }
    
    .podium-2 {
      background-color: #c0c0c0 !important;
    }
    
    .podium-3 {
      background-color: #cd7f32 !important;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 3px solid #ddd;
      text-align: center;
      font-size: 12px;
      color: #777;
    }
    
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      background-color: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      z-index: 1000;
    }
    
    .print-button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <button onclick="window.print()" class="print-button no-print">Print Results</button>
  
  <div class="meet-header">
    ${meet.logoUrl ? `<img src="${meet.logoUrl}" alt="Meet logo" class="meet-logo">` : ''}
    <h1>${meet.name}</h1>
    ${meet.location ? `<div class="meet-meta"><strong>${meet.location}</strong></div>` : ''}
    <div class="meet-meta">${format(new Date(meet.startDate), 'MMMM d, yyyy')}</div>
  </div>
  
  ${sortedEvents.map((event, index) => {
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
    
    return `
      <div class="event-section">
        <div class="event-header">
          <h2>Event #${event.eventNumber}: ${event.name}</h2>
          <div class="event-details">${event.eventType} - ${event.gender}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th class="place-col">Place</th>
              <th class="bib-col">Bib</th>
              <th>Name</th>
              <th>Team</th>
              ${hasLanes ? '<th>Lane</th>' : ''}
              <th class="performance-col">Performance</th>
              ${hasWind ? '<th>Wind</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${sortedEntries.map(entry => {
              const place = entry.finalPlace ?? entry.semifinalPlace ?? entry.quarterfinalPlace ?? entry.preliminaryPlace;
              const mark = entry.finalMark ?? entry.semifinalMark ?? entry.quarterfinalMark ?? entry.preliminaryMark;
              const lane = entry.finalLane ?? entry.semifinalLane ?? entry.quarterfinalLane ?? entry.preliminaryLane;
              const wind = entry.finalWind ?? entry.semifinalWind ?? entry.quarterfinalWind ?? entry.preliminaryWind;
              
              const podiumClass = place === 1 ? 'podium-1' : place === 2 ? 'podium-2' : place === 3 ? 'podium-3' : '';
              
              return `
                <tr class="${podiumClass}">
                  <td class="place-col">${place || '-'}</td>
                  <td class="bib-col">${entry.athlete.bibNumber || '-'}</td>
                  <td>${entry.athlete.firstName} ${entry.athlete.lastName}</td>
                  <td>${entry.team?.name || '-'}</td>
                  ${hasLanes ? `<td>${lane || '-'}</td>` : ''}
                  <td class="performance-col">${formatPerformance(mark, entry.resultType)}</td>
                  ${hasWind ? `<td>${wind ? wind.toFixed(1) : '-'}</td>` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }).join('')}
  
  <div class="footer">
    <p>Complete Meet Results - Generated on ${format(new Date(), 'MMMM d, yyyy \'at\' h:mm a')}</p>
    <p>${meet.name}</p>
  </div>
</body>
</html>`;
  
  return html;
}
