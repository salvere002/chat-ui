/**
 * Chart parsing utilities for MessageItem component
 * Handles parsing of chart attributes and markdown tables
 */
import qs from 'qs';

// Utility function to parse attributes from chart{key=value;key2="quoted value"} format
// Also handles truncated input gracefully
export const parseChartAttributes = (attributeString: string): Record<string, string> => {
  // First try robust parsing with qs using correct delimiter
  const delimiter = attributeString.includes(';') ? ';' : (attributeString.includes('|') ? '|' : ';');
  try {
    const parsed = qs.parse(attributeString, {
      delimiter,
      depth: 0,
      plainObjects: true,
      allowDots: false,
      parameterLimit: 1000,
    }) as Record<string, unknown>;

    const attrs: Record<string, string> = {};
    for (const k in parsed) {
      if (!Object.prototype.hasOwnProperty.call(parsed, k)) continue;
      let v = parsed[k];
      if (v == null) continue;
      let s = String(v).trim();
      // Unwrap quotes if present
      if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
        s = s.slice(1, -1);
      } else if ((s.startsWith('"') && !s.endsWith('"')) || (s.startsWith("'") && !s.endsWith("'"))) {
        // Truncated quoted value - remove opening quote to mirror previous behavior
        s = s.slice(1);
      }
      attrs[k.trim()] = s;
    }
    if (Object.keys(attrs).length > 0) {
      return attrs;
    }
  } catch {
    // Fall through to manual parser if qs fails
  }

  // Fallback to manual parser (previous implementation)
  const attributes: Record<string, string> = {};
  const pairs: string[] = [];
  let currentPair = '';
  let insideQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < attributeString.length; i++) {
    const char = attributeString[i];
    if (!insideQuotes && (char === '"' || char === "'")) {
      insideQuotes = true;
      quoteChar = char;
      currentPair += char;
    } else if (insideQuotes && char === quoteChar) {
      insideQuotes = false;
      quoteChar = '';
      currentPair += char;
    } else if (!insideQuotes && char === delimiter) {
      if (currentPair.trim()) pairs.push(currentPair.trim());
      currentPair = '';
    } else {
      currentPair += char;
    }
  }
  if (currentPair.trim()) pairs.push(currentPair.trim());

  for (const pair of pairs) {
    const equalIndex = pair.indexOf('=');
    if (equalIndex === -1) continue;
    const key = pair.substring(0, equalIndex).trim();
    let value = pair.substring(equalIndex + 1).trim();
    if (key && value !== undefined) {
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value.startsWith('"') || value.startsWith("'")) {
        value = value.slice(1);
      }
      attributes[key] = value;
    }
  }
  return attributes;
};

// Utility function to parse markdown table to data array
export const parseMarkdownTable = (content: string): any[] => {
  const lines = content.trim().split('\n').filter(line => line.trim());
  if (lines.length < 3) return []; // Need at least header, separator, and one data row
  
  // Extract headers (remove leading/trailing | and trim)
  const headerLine = lines[0];
  const headers = headerLine.split('|')
    .map(h => h.trim())
    .filter(h => h && h !== ''); // Remove empty strings
  
  // Skip separator line (line[1])
  // Extract data rows
  const dataRows = lines.slice(2);
  
  return dataRows.map(row => {
    // Remove leading/trailing | and split
    const cells = row.split('|')
      .map(cell => cell.trim())
      .filter(cell => cell !== ''); // Don't filter out 0 values
    
    const rowData: any = {};
    
    headers.forEach((header, index) => {
      if (index < cells.length) {
        // Keep all values as strings - let the chart library handle data types
        const value = cells[index];
        rowData[header] = value;
      }
    });
    
    return rowData;
  });
};
