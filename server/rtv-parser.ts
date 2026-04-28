export interface RtvTextObject {
  name: string;
  textContent: string;
  x: number;
  y: number;
  width: number;
  height: number;
  suggestedFieldCode: string | null;
}

export interface RtvParseResult {
  success: boolean;
  objects: RtvTextObject[];
  warnings: string[];
  fileVersion: string | null;
}

const RTV_NAME_TO_FIELD_CODE: Record<string, string> = {
  'place': '{place}',
  'name': '{name}',
  'time': '{time}',
  'mark': '{mark}',
  'affiliation': '{affiliation}',
  'team': '{affiliation}',
  'lane': '{lane}',
  'wind': '{wind}',
  'best mark': '{best_mark}',
  'best': '{best_mark}',
  'reaction': '{reaction}',
  'bib': '{bib}',
  'number': '{bib}',
};

function suggestFieldCode(objectName: string, textContent: string): string | null {
  const lowerName = objectName.toLowerCase();
  
  for (const [pattern, fieldCode] of Object.entries(RTV_NAME_TO_FIELD_CODE)) {
    if (lowerName.includes(pattern)) {
      return fieldCode;
    }
  }
  
  if (textContent.includes('%s')) {
    if (lowerName.includes('1') || lowerName.includes('2') || lowerName.includes('3') || 
        lowerName.includes('4') || lowerName.includes('5') || lowerName.includes('6') ||
        lowerName.includes('7') || lowerName.includes('8')) {
      if (lowerName.includes('place') || lowerName.includes('pos')) {
        return '{place}';
      }
    }
  }
  
  return null;
}

function readUTF16LEString(buffer: Buffer, offset: number, maxLength: number = 1000): { str: string; bytesRead: number } {
  let str = '';
  let i = 0;
  
  while (i < maxLength && offset + i + 1 < buffer.length) {
    const charCode = buffer.readUInt16LE(offset + i);
    if (charCode === 0) {
      i += 2;
      break;
    }
    str += String.fromCharCode(charCode);
    i += 2;
  }
  
  return { str, bytesRead: i };
}

function findUTF16LEString(buffer: Buffer, offset: number, searchStr: string): number {
  const searchBuffer = Buffer.alloc(searchStr.length * 2);
  for (let i = 0; i < searchStr.length; i++) {
    searchBuffer.writeUInt16LE(searchStr.charCodeAt(i), i * 2);
  }
  
  for (let i = offset; i <= buffer.length - searchBuffer.length; i++) {
    let found = true;
    for (let j = 0; j < searchBuffer.length; j++) {
      if (buffer[i + j] !== searchBuffer[j]) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  
  return -1;
}

function findASCIIString(buffer: Buffer, searchStr: string, startOffset: number = 0): number {
  for (let i = startOffset; i <= buffer.length - searchStr.length; i++) {
    let found = true;
    for (let j = 0; j < searchStr.length; j++) {
      if (buffer[i + j] !== searchStr.charCodeAt(j)) {
        found = false;
        break;
      }
    }
    if (found) {
      return i;
    }
  }
  return -1;
}

function extractUTF16LEStringNear(buffer: Buffer, offset: number, direction: 'forward' | 'backward' = 'forward', maxSearch: number = 500): string | null {
  if (direction === 'forward') {
    let start = offset;
    while (start < buffer.length - 1 && start < offset + maxSearch) {
      const char = buffer.readUInt16LE(start);
      if (char >= 32 && char <= 126) {
        const { str } = readUTF16LEString(buffer, start);
        if (str.length > 0) {
          return str;
        }
      }
      start += 2;
    }
  } else {
    let end = offset;
    while (end > 1 && end > offset - maxSearch) {
      end -= 2;
      const char = buffer.readUInt16LE(end);
      if (char === 0 && end + 2 < buffer.length) {
        const { str } = readUTF16LEString(buffer, end + 2);
        if (str.length > 0) {
          return str;
        }
      }
    }
  }
  return null;
}

function extractPositionData(buffer: Buffer, offset: number): { x: number; y: number; width: number; height: number } | null {
  try {
    let searchStart = Math.max(0, offset - 200);
    let searchEnd = Math.min(buffer.length - 16, offset + 500);
    
    for (let i = searchStart; i < searchEnd; i += 4) {
      if (i + 16 <= buffer.length) {
        const val1 = buffer.readInt32LE(i);
        const val2 = buffer.readInt32LE(i + 4);
        const val3 = buffer.readInt32LE(i + 8);
        const val4 = buffer.readInt32LE(i + 12);
        
        if (val1 >= 0 && val1 <= 5000 &&
            val2 >= 0 && val2 <= 3000 &&
            val3 > 0 && val3 <= 5000 &&
            val4 > 0 && val4 <= 2000) {
          return {
            x: val1,
            y: val2,
            width: val3,
            height: val4,
          };
        }
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

function convertToPercentage(x: number, y: number, width: number, height: number, canvasWidth: number = 1920, canvasHeight: number = 1080): { x: number; y: number; width: number; height: number } {
  return {
    x: Math.round((x / canvasWidth) * 100 * 100) / 100,
    y: Math.round((y / canvasHeight) * 100 * 100) / 100,
    width: Math.round((width / canvasWidth) * 100 * 100) / 100,
    height: Math.round((height / canvasHeight) * 100 * 100) / 100,
  };
}

export function parseRtvFile(buffer: Buffer): RtvParseResult {
  const result: RtvParseResult = {
    success: false,
    objects: [],
    warnings: [],
    fileVersion: null,
  };
  
  try {
    const markers = ['RTextObject', 'TRTVTextObj', 'TextObject', 'TTextObj'];
    const foundPositions: Array<{ offset: number; marker: string }> = [];
    
    for (const marker of markers) {
      let offset = 0;
      while (offset < buffer.length) {
        const asciiPos = findASCIIString(buffer, marker, offset);
        if (asciiPos === -1) break;
        foundPositions.push({ offset: asciiPos, marker });
        offset = asciiPos + marker.length;
      }
      
      offset = 0;
      while (offset < buffer.length) {
        const utf16Pos = findUTF16LEString(buffer, offset, marker);
        if (utf16Pos === -1) break;
        const alreadyFound = foundPositions.some(p => Math.abs(p.offset - utf16Pos) < 10);
        if (!alreadyFound) {
          foundPositions.push({ offset: utf16Pos, marker: `${marker} (UTF-16)` });
        }
        offset = utf16Pos + marker.length * 2;
      }
    }
    
    foundPositions.sort((a, b) => a.offset - b.offset);
    
    if (foundPositions.length === 0) {
      result.warnings.push('No RTextObject markers found in file - attempting string extraction');
      
      const strings = extractAllStrings(buffer);
      const textObjects = strings.filter(s => 
        /^(place|name|time|mark|affiliation|lane|wind|team|best)/i.test(s.str) ||
        s.str.includes('%s')
      );
      
      let yOffset = 10;
      for (const { str, offset } of textObjects) {
        const cleanName = str.replace(/%s/g, '').trim() || 'Text Object';
        const positions = extractPositionData(buffer, offset);
        
        let x = 10, y = yOffset, width = 30, height = 10;
        if (positions) {
          const pct = convertToPercentage(positions.x, positions.y, positions.width, positions.height);
          x = pct.x;
          y = pct.y;
          width = Math.max(10, pct.width);
          height = Math.max(5, pct.height);
        } else {
          yOffset += 12;
        }
        
        result.objects.push({
          name: cleanName,
          textContent: str.includes('%s') ? str : '%s',
          x,
          y,
          width,
          height,
          suggestedFieldCode: suggestFieldCode(cleanName, str),
        });
      }
    } else {
      for (let i = 0; i < foundPositions.length; i++) {
        try {
          const { offset, marker } = foundPositions[i];
          
          const nameForward = extractUTF16LEStringNear(buffer, offset + marker.length, 'forward', 300);
          const nameBackward = extractUTF16LEStringNear(buffer, offset, 'backward', 200);
          
          let objectName = 'Unknown Object';
          let textContent = '%s';
          
          if (nameForward && nameForward.length > 1 && nameForward.length < 100) {
            if (/^[A-Za-z0-9\s_\-]+$/.test(nameForward)) {
              objectName = nameForward.trim();
            } else if (nameForward.includes('%s')) {
              textContent = nameForward;
            }
          }
          
          if (nameBackward && nameBackward.length > 1 && nameBackward.length < 100) {
            if (/^[A-Za-z0-9\s_\-]+$/.test(nameBackward) && objectName === 'Unknown Object') {
              objectName = nameBackward.trim();
            }
          }
          
          const nearStrings = extractAllStringsNear(buffer, offset, 500);
          for (const s of nearStrings) {
            if (s.includes('%s') && s.length < 200) {
              textContent = s;
              break;
            }
          }
          
          for (const s of nearStrings) {
            if (objectName === 'Unknown Object' && 
                /^(place|name|time|mark|affiliation|lane|wind|team|best)/i.test(s)) {
              objectName = s;
              break;
            }
          }
          
          const positions = extractPositionData(buffer, offset);
          let x = 10 + (i % 3) * 30;
          let y = 10 + Math.floor(i / 3) * 15;
          let width = 25;
          let height = 10;
          
          if (positions) {
            const pct = convertToPercentage(positions.x, positions.y, positions.width, positions.height);
            x = pct.x;
            y = pct.y;
            width = Math.max(10, pct.width);
            height = Math.max(5, pct.height);
          }
          
          const existingWithSameName = result.objects.filter(o => o.name === objectName).length;
          if (existingWithSameName > 0) {
            objectName = `${objectName} (${existingWithSameName + 1})`;
          }
          
          result.objects.push({
            name: objectName,
            textContent,
            x,
            y,
            width,
            height,
            suggestedFieldCode: suggestFieldCode(objectName, textContent),
          });
          
        } catch (e: any) {
          result.warnings.push(`Error parsing object at offset ${foundPositions[i].offset}: ${e.message}`);
        }
      }
    }
    
    result.success = result.objects.length > 0;
    
    if (result.objects.length === 0) {
      result.warnings.push('No text objects could be extracted from this RTV file');
    }
    
  } catch (e: any) {
    result.warnings.push(`Parse error: ${e.message}`);
  }
  
  return result;
}

function extractAllStrings(buffer: Buffer, minLength: number = 3, maxLength: number = 200): Array<{ str: string; offset: number }> {
  const results: Array<{ str: string; offset: number }> = [];
  
  for (let i = 0; i < buffer.length - 2; i += 2) {
    const { str, bytesRead } = readUTF16LEString(buffer, i, maxLength * 2);
    if (str.length >= minLength && str.length <= maxLength) {
      if (/^[\x20-\x7E]+$/.test(str)) {
        results.push({ str, offset: i });
        i += bytesRead - 2;
      }
    }
  }
  
  let currentStr = '';
  let startOffset = 0;
  for (let i = 0; i < buffer.length; i++) {
    const char = buffer[i];
    if (char >= 32 && char <= 126) {
      if (currentStr.length === 0) startOffset = i;
      currentStr += String.fromCharCode(char);
    } else {
      if (currentStr.length >= minLength && currentStr.length <= maxLength) {
        const alreadyFound = results.some(r => r.offset === startOffset || r.str === currentStr);
        if (!alreadyFound) {
          results.push({ str: currentStr, offset: startOffset });
        }
      }
      currentStr = '';
    }
  }
  
  return results;
}

function extractAllStringsNear(buffer: Buffer, offset: number, range: number): string[] {
  const results: string[] = [];
  const start = Math.max(0, offset - range);
  const end = Math.min(buffer.length, offset + range);
  
  const extracted = extractAllStrings(buffer.subarray(start, end));
  for (const { str } of extracted) {
    if (!results.includes(str)) {
      results.push(str);
    }
  }
  
  return results;
}

export function mapRtvPlaceholdersToFieldCodes(textContent: string, suggestedField: string | null): string {
  if (suggestedField) {
    return textContent.replace('%s', suggestedField);
  }
  return textContent.replace('%s', '{value}');
}
