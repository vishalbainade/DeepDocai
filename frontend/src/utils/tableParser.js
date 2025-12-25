/**
 * Table Parser Utility
 * Extracts and parses markdown tables from content
 */

/**
 * Extract a markdown table from content string
 * @param {string} content - Content that may contain a markdown table
 * @returns {{table: object|null, remainingContent: string}}
 */
export const extractTableFromContent = (content) => {
  if (!content || typeof content !== 'string') {
    return { table: null, remainingContent: content || '' };
  }

  // Look for markdown table pattern
  // Tables start with | and have a separator row with |---|
  const lines = content.split('\n');
  let tableStartIndex = -1;
  let tableEndIndex = -1;
  let separatorIndex = -1;

  // Find table boundaries
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for table separator row (|---|---|)
    if (isSeparatorRow(line)) {
      separatorIndex = i;
      
      // Look back for header row
      if (i > 0 && isTableRow(lines[i - 1].trim())) {
        tableStartIndex = i - 1;
      }
      
      // Look forward for data rows
      for (let j = i + 1; j < lines.length; j++) {
        const nextLine = lines[j].trim();
        if (isTableRow(nextLine)) {
          tableEndIndex = j;
        } else if (nextLine === '') {
          // Empty line might continue or end table
          continue;
        } else {
          // Non-table content found
          break;
        }
      }
      
      // If we found a complete table, break
      if (tableStartIndex !== -1 && tableEndIndex !== -1) {
        break;
      }
    }
  }

  // If no valid table found, return original content
  if (tableStartIndex === -1 || separatorIndex === -1 || tableEndIndex === -1) {
    return { table: null, remainingContent: content };
  }

  // Extract table lines
  const tableLines = lines.slice(tableStartIndex, tableEndIndex + 1);
  
  // Parse the table
  const table = parseMarkdownTable(tableLines);
  
  if (!table || table.columns.length === 0) {
    return { table: null, remainingContent: content };
  }

  // Get remaining content (before and after table)
  const beforeTable = lines.slice(0, tableStartIndex).join('\n').trim();
  const afterTable = lines.slice(tableEndIndex + 1).join('\n').trim();
  const remainingContent = [beforeTable, afterTable].filter(Boolean).join('\n\n');

  return { table, remainingContent };
};

/**
 * Check if a line is a table separator row
 * @param {string} line 
 * @returns {boolean}
 */
const isSeparatorRow = (line) => {
  if (!line.startsWith('|') || !line.endsWith('|')) {
    // Also check for separator without outer pipes
    return /^[\s\-:|]+$/.test(line) && line.includes('---');
  }
  
  // Check for pattern like |---|---|---|
  const cells = line.split('|').filter(cell => cell.trim());
  return cells.every(cell => /^[\s\-:]+$/.test(cell));
};

/**
 * Check if a line looks like a table row
 * @param {string} line 
 * @returns {boolean}
 */
const isTableRow = (line) => {
  // Must contain at least one pipe and have some content
  if (!line.includes('|')) return false;
  
  const cells = line.split('|').filter(cell => cell.trim());
  return cells.length >= 2;
};

/**
 * Parse markdown table lines into structured data
 * @param {string[]} lines - Array of table lines
 * @returns {{columns: string[], rows: string[][]}}
 */
const parseMarkdownTable = (lines) => {
  if (!lines || lines.length < 3) {
    return { columns: [], rows: [] };
  }

  // Find header and separator
  let headerLine = null;
  let separatorLine = null;
  let dataStartIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (isSeparatorRow(line)) {
      separatorLine = line;
      if (i > 0) {
        headerLine = lines[i - 1].trim();
      }
      dataStartIndex = i + 1;
      break;
    }
  }

  if (!headerLine || !separatorLine || dataStartIndex === -1) {
    return { columns: [], rows: [] };
  }

  // Parse header
  const columns = parseTableRow(headerLine);

  // Parse data rows
  const rows = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (isTableRow(line)) {
      const row = parseTableRow(line);
      // Normalize row to match column count
      while (row.length < columns.length) {
        row.push('');
      }
      rows.push(row.slice(0, columns.length));
    }
  }

  return { columns, rows };
};

/**
 * Parse a single table row into cells
 * @param {string} line 
 * @returns {string[]}
 */
const parseTableRow = (line) => {
  // Remove leading/trailing pipes
  let cleaned = line.trim();
  if (cleaned.startsWith('|')) cleaned = cleaned.slice(1);
  if (cleaned.endsWith('|')) cleaned = cleaned.slice(0, -1);
  
  // Split by pipe and trim cells
  return cleaned.split('|').map(cell => cell.trim());
};

/**
 * Convert structured table data to markdown format
 * @param {string[]} columns - Column headers
 * @param {string[][]} rows - Data rows
 * @param {string} title - Optional title
 * @returns {string}
 */
export const tableToMarkdown = (columns, rows, title = '') => {
  if (!columns || columns.length === 0) {
    return '';
  }

  let markdown = '';
  
  if (title) {
    markdown += `**${title}**\n\n`;
  }

  // Header row
  markdown += '| ' + columns.join(' | ') + ' |\n';
  
  // Separator row
  markdown += '| ' + columns.map(() => '---').join(' | ') + ' |\n';
  
  // Data rows
  rows.forEach(row => {
    // Ensure row has correct number of columns
    const normalizedRow = [...row];
    while (normalizedRow.length < columns.length) {
      normalizedRow.push('');
    }
    markdown += '| ' + normalizedRow.slice(0, columns.length).join(' | ') + ' |\n';
  });

  return markdown;
};

/**
 * Convert structured table data to TSV format
 * @param {string[]} columns 
 * @param {string[][]} rows 
 * @returns {string}
 */
export const tableToTSV = (columns, rows) => {
  if (!columns || columns.length === 0) {
    return '';
  }

  let tsv = columns.join('\t') + '\n';
  
  rows.forEach(row => {
    const normalizedRow = [...row];
    while (normalizedRow.length < columns.length) {
      normalizedRow.push('');
    }
    tsv += normalizedRow.slice(0, columns.length).join('\t') + '\n';
  });

  return tsv;
};

/**
 * Convert structured table data to CSV format
 * @param {string[]} columns 
 * @param {string[][]} rows 
 * @returns {string}
 */
export const tableToCSV = (columns, rows) => {
  if (!columns || columns.length === 0) {
    return '';
  }

  const escapeCSV = (cell) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return '"' + cell.replace(/"/g, '""') + '"';
    }
    return cell;
  };

  let csv = columns.map(escapeCSV).join(',') + '\n';
  
  rows.forEach(row => {
    const normalizedRow = [...row];
    while (normalizedRow.length < columns.length) {
      normalizedRow.push('');
    }
    csv += normalizedRow.slice(0, columns.length).map(escapeCSV).join(',') + '\n';
  });

  return csv;
};

export default extractTableFromContent;
