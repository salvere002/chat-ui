/**
 * Chart parsing utilities for MessageItem component
 * Handles parsing of chart attributes and markdown tables
 */

// Utility function to parse attributes from chart{key=value;key2="quoted value"} format
// Also handles truncated input gracefully
export const parseChartAttributes = (attributeString: string): Record<string, string> => {
  const attributes: Record<string, string> = {};
  
  // Support both semicolon (;) and pipe (|) delimiters for backward compatibility
  const delimiter = attributeString.includes(';') ? ';' : '|';
  
  // Enhanced parsing to handle quoted values with spaces and special characters
  const pairs: string[] = [];
  let currentPair = '';
  let insideQuotes = false;
  let quoteChar = '';
  
  // Parse character by character to handle quoted values properly
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
      // Found separator outside quotes
      if (currentPair.trim()) {
        pairs.push(currentPair.trim());
      }
      currentPair = '';
    } else {
      currentPair += char;
    }
  }
  
  // Add the last pair (might be truncated)
  if (currentPair.trim()) {
    pairs.push(currentPair.trim());
  }
  
  // Process each key=value pair
  for (const pair of pairs) {
    const equalIndex = pair.indexOf('=');
    if (equalIndex === -1) continue;
    
    const key = pair.substring(0, equalIndex).trim();
    let value = pair.substring(equalIndex + 1).trim();
    
    if (key && value !== undefined) {
      // Handle potentially truncated values (missing closing quotes)
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      } else if (value.startsWith('"') || value.startsWith("'")) {
        // Truncated quoted value - remove opening quote
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