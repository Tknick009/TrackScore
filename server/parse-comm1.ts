export interface ParsedComm1 {
  time: string | null;
  rawText: string;
  notes: string;
}

/**
 * Parses Comm_1 field text to extract scheduled time information
 * 
 * @param text - The Comm_1 text from HyTek database
 * @returns Object containing parsed time (24-hour format), original text, and notes
 * 
 * Examples:
 * - "Heat 3 Invite Heat to be run at 8:45" → {time: "08:45", notes: "Heat 3 Invite Heat", ...}
 * - "Heats 7, 8, 9 Invite Heats to be run at 8:30" → {time: "08:30", notes: "Heats 7, 8, 9 Invite Heats", ...}
 * - "1.51 - 1.56 - 1.61" → {time: null, notes: "1.51 - 1.56 - 1.61", ...}
 */
export function parseComm1(text: string): ParsedComm1 {
  const rawText = text;
  const normalizedText = text.trim();
  
  // Primary regex to extract times: matches patterns like "run at 8:45", "start at 8:45 am", etc.
  const timeRegex = /\b(?:run|start|at)\s*(?:around\s*)?(\d{1,2})([:\.](\d{2}))?\s*(am|pm)?\b/i;
  const match = timeRegex.exec(normalizedText);
  
  if (!match) {
    return {
      time: null,
      rawText,
      notes: normalizedText
    };
  }
  
  const hour = parseInt(match[1], 10);
  const minutes = match[3] ? parseInt(match[3], 10) : 0;
  const ampm = match[4]?.toLowerCase();
  
  let hour24: number;
  if (ampm === 'am') {
    hour24 = hour === 12 ? 0 : hour;
  } else if (ampm === 'pm') {
    hour24 = hour === 12 ? 12 : hour + 12;
  } else {
    if (hour >= 7 && hour !== 12) {
      hour24 = hour;
    } else {
      hour24 = hour === 12 ? 12 : hour + 12;
    }
  }
  
  const timeStr = `${hour24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  let notes = normalizedText.substring(0, match.index).trim();
  notes = notes.replace(/\s*(to\s+be\s+)?(run|start|at)\s*$/i, '').trim();
  
  return {
    time: timeStr,
    rawText,
    notes
  };
}

if (process.argv[1]?.includes('parse-comm1')) {
  const testCases = [
    "Heat 3 Invite Heat to be run at 8:45",
    "Heats 7, 8, 9 Invite Heats to be run at 8:30",
    "1.51 - 1.56 - 1.61",
    "2.97 - 3.12 -3.27 - 3.42 - 3.57 - 3.72",
    "4.20 - 4.35 - 4.50 - 4.65 - 4.80",
    "1.51 - 1.56 - 1.61 - 1.66 - 1.71 - 1.76",
    "1.84 - 1.89 - 1.94 - 1.99 - 2.04",
  ];

  console.log('parseComm1 Test Results:');
  console.log('='.repeat(70));
  console.log();

  testCases.forEach((test, index) => {
    const result = parseComm1(test);
    console.log(`Test ${index + 1}:`);
    console.log(`  Input:   "${test}"`);
    console.log(`  Time:    ${result.time || 'null'}`);
    console.log(`  Notes:   "${result.notes}"`);
    console.log();
  });
}
