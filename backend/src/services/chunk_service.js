/**
 * IMPROVED Chunk Service
 * 
 * Key improvements:
 * 1. Tables are NEVER split across chunks - preserved as single units
 * 2. Better sentence boundary detection
 * 3. Chunk metadata for better retrieval
 */

/**
 * Chunk text into overlapping segments with sentence boundary awareness
 * @param {string} text - Text to chunk
 * @param {number} chunkSize - Maximum chunk size in characters (default: 800)
 * @param {number} overlap - Overlap between chunks in characters (default: 100)
 * @returns {Array<string>} Array of text chunks
 */
export const chunkText = (text, chunkSize = 800, overlap = 100) => {
  if (!text || text.length === 0) {
    return [];
  }

  const chunks = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = Math.min(startIndex + chunkSize, text.length);
    
    // If not at the end of text, try to end at a sentence boundary
    if (endIndex < text.length) {
      // Look for sentence endings within the last 150 characters
      const searchStart = Math.max(startIndex + chunkSize - 150, startIndex);
      const searchEnd = Math.min(endIndex + 50, text.length);
      const searchText = text.slice(searchStart, searchEnd);
      
      // Find the last sentence boundary (period, exclamation, question mark followed by space or newline)
      const sentenceEndRegex = /[.!?]\s+/g;
      let lastMatch = null;
      let match;
      
      while ((match = sentenceEndRegex.exec(searchText)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        endIndex = searchStart + lastMatch.index + lastMatch[0].length;
      }
    }

    const chunk = text.slice(startIndex, endIndex).trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    // Move start index forward by (chunkSize - overlap)
    const nextStart = startIndex + chunkSize - overlap;
    startIndex = Math.max(nextStart, startIndex + 1);

    if (startIndex >= text.length) {
      break;
    }
  }

  console.log(`📝 Created ${chunks.length} text chunks from ${text.length} characters`);
  
  return chunks;
};

/**
 * IMPROVED: Chunk text and tables with metadata
 * CRITICAL: Tables are preserved as single logical chunks and NEVER split
 * 
 * @param {string} text - Regular text content
 * @param {Array<{page: number, content: string, tsv?: string, description?: string}>} tables - Array of table objects
 * @param {number} chunkSize - Maximum chunk size for text (default: 800)
 * @param {number} overlap - Overlap between text chunks (default: 100)
 * @returns {Array<{text: string, type: 'text'|'table', page_number?: number, metadata?: object}>}
 */
export const chunkTextAndTables = (text, tables = [], chunkSize = 800, overlap = 100) => {
  const chunks = [];

  console.log(`\n📦 CHUNKING STARTED`);
  console.log(`   - Text length: ${text?.length || 0} characters`);
  console.log(`   - Tables provided: ${tables?.length || 0}`);

  // Step 1: Process tables FIRST - they take priority
  // Tables are NEVER split - each table becomes exactly one chunk
  let tableChunkCount = 0;
  if (tables && Array.isArray(tables) && tables.length > 0) {
    console.log(`\n📊 Processing ${tables.length} tables...`);
    
    tables.forEach((table, index) => {
      // Prefer TSV format for structured data, fallback to content
      const tableContent = table.tsv || table.content || '';
      
      if (tableContent && tableContent.trim().length > 0) {
        // Create a descriptive header for the table chunk
        const tableHeader = table.description 
          ? `[TABLE: ${table.description}]\n`
          : `[TABLE ${index + 1}]\n`;
        
        const tableText = tableHeader + tableContent;
        
        chunks.push({
          text: tableText,
          type: 'table',
          page_number: table.page || null,
          metadata: {
            chunkIndex: tableChunkCount,
            isTable: true,
            tableIndex: index,
            description: table.description || `Table ${index + 1}`,
            originalFormat: table.tsv ? 'tsv' : 'text',
            characterCount: tableText.length,
          },
        });
        
        tableChunkCount++;
        console.log(`   ✅ Table ${index + 1}: ${tableText.length} chars (page ${table.page || 'N/A'})`);
      } else {
        console.log(`   ⚠️ Table ${index + 1}: Empty content, skipped`);
      }
    });
  }

  // Step 2: Chunk regular text (with sentence boundary preservation)
  if (text && text.trim().length > 0) {
    console.log(`\n📝 Processing text content...`);
    
    const textChunks = chunkText(text, chunkSize, overlap);
    
    textChunks.forEach((chunkText, index) => {
      chunks.push({
        text: chunkText,
        type: 'text',
        page_number: null, // Text chunks don't have specific page numbers
        metadata: {
          chunkIndex: tableChunkCount + index,
          isTable: false,
          textChunkIndex: index,
          characterCount: chunkText.length,
        },
      });
    });
    
    console.log(`   ✅ Created ${textChunks.length} text chunks`);
  }

  // Update chunk indices to be sequential
  chunks.forEach((chunk, index) => {
    chunk.metadata.chunkIndex = index;
  });

  console.log(`\n📦 CHUNKING COMPLETE`);
  console.log(`   - Total chunks: ${chunks.length}`);
  console.log(`   - Table chunks: ${tableChunkCount} (preserved as single units)`);
  console.log(`   - Text chunks: ${chunks.length - tableChunkCount}`);
  
  return chunks;
};

/**
 * Extract potential tables from text using heuristics
 * This is a fallback when OCR doesn't detect tables
 * 
 * @param {string} text - Text content to analyze
 * @returns {Array<{content: string, tsv: string}>}
 */
export const extractTablesFromText = (text) => {
  if (!text) return [];
  
  const tables = [];
  const lines = text.split('\n');
  
  let currentTable = [];
  let inTable = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect table-like patterns
    const isTableRow = 
      // Pipe-separated
      (line.includes('|') && line.split('|').length > 2) ||
      // Tab-separated with multiple columns
      (line.includes('\t') && line.split('\t').length > 2) ||
      // Heavy space separation (3+ spaces between values)
      /\S+\s{3,}\S+\s{3,}\S+/.test(line);
    
    if (isTableRow) {
      if (!inTable) {
        inTable = true;
        currentTable = [];
      }
      currentTable.push(line);
    } else if (inTable) {
      // End of table
      if (currentTable.length >= 2) { // Need at least header + 1 row
        const tableContent = currentTable.join('\n');
        const tsv = convertLinesToTSV(currentTable);
        tables.push({
          content: tableContent,
          tsv: tsv,
        });
      }
      inTable = false;
      currentTable = [];
    }
  }
  
  // Don't forget last table
  if (inTable && currentTable.length >= 2) {
    const tableContent = currentTable.join('\n');
    const tsv = convertLinesToTSV(currentTable);
    tables.push({
      content: tableContent,
      tsv: tsv,
    });
  }
  
  if (tables.length > 0) {
    console.log(`📊 Extracted ${tables.length} potential tables from text`);
  }
  
  return tables;
};

/**
 * Convert lines to TSV format
 */
const convertLinesToTSV = (lines) => {
  return lines.map(line => {
    // Try pipe separator first
    if (line.includes('|')) {
      return line.split('|').map(cell => cell.trim()).filter(cell => cell).join('\t');
    }
    // Try tab separator
    if (line.includes('\t')) {
      return line.split('\t').map(cell => cell.trim()).join('\t');
    }
    // Try multi-space separator
    return line.split(/\s{3,}/).map(cell => cell.trim()).filter(cell => cell).join('\t');
  }).join('\n');
};

/**
 * Analyze text to determine if it's likely a table
 */
export const isLikelyTable = (text) => {
  if (!text) return false;
  
  const lines = text.trim().split('\n');
  if (lines.length < 2) return false;
  
  // Count consistent separators across lines
  let pipeCount = 0;
  let tabCount = 0;
  let spaceCount = 0;
  
  lines.forEach(line => {
    if (line.includes('|')) pipeCount++;
    if (line.includes('\t')) tabCount++;
    if (/\S+\s{3,}\S+/.test(line)) spaceCount++;
  });
  
  // If more than 60% of lines have consistent separators, it's likely a table
  const threshold = lines.length * 0.6;
  return pipeCount >= threshold || tabCount >= threshold || spaceCount >= threshold;
};
