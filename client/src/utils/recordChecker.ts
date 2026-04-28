import { 
  type RecordCheck, 
  isTimeEvent, 
  isDistanceEvent, 
  isHeightEvent,
  parsePerformanceToSeconds,
  validatePerformanceString 
} from "@shared/schema";

export async function checkForRecords(
  eventType: string,
  gender: string,
  performance: string
): Promise<RecordCheck[]> {
  const response = await fetch(
    `/api/records/check?eventType=${encodeURIComponent(eventType)}&gender=${encodeURIComponent(gender)}&performance=${encodeURIComponent(performance)}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to check records: ${response.statusText}`);
  }
  
  return response.json();
}

export function formatPerformance(eventType: string, performance: string): string {
  const seconds = parsePerformanceToSeconds(performance);
  
  if (seconds === null) {
    return performance; // Return as-is if invalid
  }
  
  // Time-based events
  if (isTimeEvent(eventType)) {
    if (seconds < 60) {
      return `${seconds.toFixed(2)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const secs = (seconds % 60).toFixed(2);
      return `${minutes}:${secs.padStart(5, '0')}`;
    }
  }
  
  // Distance/height events
  if (isDistanceEvent(eventType) || isHeightEvent(eventType)) {
    return `${seconds.toFixed(2)}m`;
  }
  
  return seconds.toFixed(2);
}

export function isRecordBroken(
  eventType: string,
  newPerformance: string,
  recordPerformance: string
): boolean {
  const newSeconds = parsePerformanceToSeconds(newPerformance);
  const recordSeconds = parsePerformanceToSeconds(recordPerformance);
  
  if (newSeconds === null || recordSeconds === null) {
    return false;
  }
  
  // Time events: lower is better
  if (isTimeEvent(eventType)) {
    return newSeconds < recordSeconds;
  }
  
  // Distance/height events: higher is better
  return newSeconds > recordSeconds;
}

// Export validatePerformance for backward compatibility
export { validatePerformanceString as validatePerformance } from '@shared/schema';
