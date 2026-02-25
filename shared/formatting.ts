/**
 * Shared Formatting & Conversion Utilities
 * 
 * Canonical implementations of unit conversion and mark formatting functions.
 * All other files should import from here instead of defining their own versions.
 */

// ====================
// CONSTANTS
// ====================

const METERS_PER_FOOT = 0.3048;
const INCHES_PER_FOOT = 12;

// ====================
// UNIT CONVERSION
// ====================

/**
 * Convert feet and inches to meters
 * @param feet - Number of feet
 * @param inches - Number of inches (can include decimals)
 * @returns Distance in meters
 */
export function feetInchesToMeters(feet: number, inches: number): number {
  const totalInches = feet * INCHES_PER_FOOT + inches;
  const totalFeet = totalInches / INCHES_PER_FOOT;
  return totalFeet * METERS_PER_FOOT;
}

/**
 * Convert meters to feet and inches (structured result)
 * @param meters - Distance in meters
 * @returns Object with feet (whole number) and inches (with decimals)
 */
export function metersToFeetInches(meters: number): { feet: number; inches: number } {
  const totalFeet = meters / METERS_PER_FOOT;
  const feet = Math.floor(totalFeet);
  const inches = (totalFeet - feet) * INCHES_PER_FOOT;
  return { feet, inches };
}

/**
 * Convert meters to a human-readable feet-inches string with fractions
 * e.g., 1.85m -> "6' 1 1/4"
 * @param meters - Distance in meters
 * @returns Formatted string like "6' 3 1/4""
 */
export function metersToFeetInchesString(meters: number): string {
  const totalInches = meters * 39.3701;
  const feet = Math.floor(totalInches / 12);
  const remainingInches = totalInches % 12;
  const wholeInches = Math.floor(remainingInches);
  const fraction = remainingInches - wholeInches;

  let fractionStr = "";
  if (fraction >= 0.875) {
    return `${feet}' ${wholeInches + 1}"`;
  } else if (fraction >= 0.625) {
    fractionStr = "3/4";
  } else if (fraction >= 0.375) {
    fractionStr = "1/2";
  } else if (fraction >= 0.125) {
    fractionStr = "1/4";
  }

  if (fractionStr) {
    return `${feet}' ${wholeInches} ${fractionStr}"`;
  }
  return `${feet}' ${wholeInches}"`;
}

// ====================
// MARK FORMATTING
// ====================

/**
 * Format a distance measurement for display (e.g., long jump, throws)
 * @param meters - Distance in meters
 * @param unit - 'metric' for meters (e.g., "17.52m") or 'english' for feet-inches (e.g., "57-06.25")
 * @returns Formatted string
 */
export function formatDistanceMark(meters: number, unit: 'metric' | 'english' = 'metric'): string {
  if (unit === 'metric') {
    return `${meters.toFixed(2)}m`;
  }
  
  const { feet, inches } = metersToFeetInches(meters);
  const inchesWhole = Math.floor(inches);
  const inchesFrac = inches - inchesWhole;
  
  if (inchesFrac > 0.001) {
    const inchesFormatted = inches.toFixed(2).padStart(5, '0');
    return `${feet}-${inchesFormatted}`;
  }
  
  return `${feet}-${inchesWhole.toString().padStart(2, '0')}`;
}

/**
 * Format a height measurement for display (e.g., high jump, pole vault)
 * @param meters - Height in meters
 * @param unit - 'metric' for meters (e.g., "2.15m") or 'english' for feet-inches (e.g., "7-00.50")
 * @returns Formatted string
 */
export function formatHeightMark(meters: number, unit: 'metric' | 'english' = 'metric'): string {
  if (unit === 'metric') {
    return `${meters.toFixed(2)}m`;
  }
  
  const { feet, inches } = metersToFeetInches(meters);
  const inchesWhole = Math.floor(inches);
  const inchesFrac = inches - inchesWhole;
  
  if (inchesFrac > 0.001) {
    const inchesFormatted = inches.toFixed(2).padStart(5, '0');
    return `${feet}-${inchesFormatted}`;
  }
  
  return `${feet}-${inchesWhole.toString().padStart(2, '0')}`;
}

/**
 * Format a time value in seconds for display
 * @param seconds - Time in seconds
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string like "10.52" or "1:23.45" or "1:02:03.45"
 */
export function formatTimeValue(seconds: number, precision: number = 2): string {
  if (seconds < 0) return "—";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toFixed(precision).padStart(precision + 3, '0')}`;
  }
  if (minutes > 0) {
    return `${minutes}:${secs.toFixed(precision).padStart(precision + 3, '0')}`;
  }
  return secs.toFixed(precision);
}

/**
 * Parse a feet-inches string (e.g., "6-03.25" or "6' 3.25\"") back to components
 * @param str - The feet-inches string
 * @returns Object with feet and inches, or null if parsing fails
 */
export function parseFeetInchesString(str: string): { feet: number; inches: number } | null {
  // Try "feet-inches" format (e.g., "6-03.25")
  let match = str.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
  if (match) {
    return { feet: parseInt(match[1], 10), inches: parseFloat(match[2]) };
  }
  
  // Try "feet' inches"" format (e.g., "6' 3.25\"")
  match = str.match(/^(\d+)'\s*(\d+(?:\.\d+)?)"?$/);
  if (match) {
    return { feet: parseInt(match[1], 10), inches: parseFloat(match[2]) };
  }
  
  return null;
}
