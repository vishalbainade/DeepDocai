import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Extract text from PDF using Gemini OCR (gemini-2.5-flash)
 * Used as fallback when pdf-parse extracts insufficient text
 */
export const extractTextWithOCR = async (filePath) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Read PDF file as base64
    const pdfBuffer = await fs.readFile(filePath);
    const pdfBase64 = pdfBuffer.toString('base64');

    const prompt = `Extract all text from this PDF document. Preserve the structure, formatting, and terminology accurately. Return only the extracted text without any additional commentary.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf',
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();

    return text || '';
  } catch (error) {
    console.error('Error in Gemini OCR:', error);
    throw new Error(`Failed to extract text with OCR: ${error.message}`);
  }
};

/**
 * IMPROVED: Extract text and detect tables from PDF using Gemini OCR with enhanced layout analysis
 * This function uses Gemini's advanced OCR capabilities to detect tables and preserve their structure
 * 
 * Returns: { text: string, tables: Array<{page: number, content: string, tsv?: string}> }
 * 
 * CRITICAL: Tables are detected and stored as single logical units with TSV format for structure preservation
 */
export const extractTextAndTablesWithOCR = async (filePath) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.2, // Lower temperature for more consistent extraction
        topP: 0.95,
      },
    });

    // Read PDF file as base64
    const pdfBuffer = await fs.readFile(filePath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Enhanced prompt with better table detection
    const prompt = `Analyze this PDF document and extract both text and tables.

YOUR TASK:
1. Extract ALL regular text content, preserving paragraph structure
2. Detect and extract ALL tables found in the document
3. For each table, convert it to TSV (Tab-Separated Values) format
4. Note which page each table appears on

CRITICAL INSTRUCTIONS FOR TABLES:
- Look for any structured data that appears in rows and columns
- This includes: formal tables, comparison charts, schedules, lists with alignment, data grids
- Preserve the EXACT structure of each table
- Use TAB character (\\t) between columns
- Use NEWLINE character (\\n) between rows
- Include table headers as the first row

REQUIRED JSON OUTPUT FORMAT:
{
  "text": "All extracted regular text content here, with paragraphs preserved...",
  "tables": [
    {
      "page": 1,
      "description": "Brief description of what this table contains",
      "content": "Human-readable table content",
      "tsv": "Header1\\tHeader2\\tHeader3\\nRow1Col1\\tRow1Col2\\tRow1Col3\\nRow2Col1\\tRow2Col2\\tRow2Col3"
    }
  ]
}

EXAMPLES OF WHAT TO DETECT AS TABLES:
- Payment schedules with dates and amounts
- Lists of items with prices
- Comparison data in columns
- Any data organized in a grid format
- Terms and conditions in columnar format
- Statistical data with headers

If there are no tables, return: {"text": "...", "tables": []}

Return ONLY valid JSON, no markdown code blocks:`;

    console.log('🔍 Running enhanced OCR with table detection...');
    
    const result = await model.generateContent([
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf',
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const rawText = response.text();

    console.log(`📤 OCR response length: ${rawText.length} characters`);

    // Try to parse JSON response
    try {
      let cleanedText = rawText.trim();
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim();
      
      // Try to extract JSON object
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate structure
        if (typeof parsed.text === 'string' && Array.isArray(parsed.tables)) {
          // Process tables to ensure TSV format
          const processedTables = parsed.tables.map((table, idx) => {
            // If table has TSV, use it; otherwise try to convert content to TSV
            let tsv = table.tsv || '';
            if (!tsv && table.content) {
              // Try to extract TSV from content if it looks tabular
              tsv = convertToTSV(table.content);
            }
            
            return {
              page: table.page || idx + 1,
              description: table.description || `Table ${idx + 1}`,
              content: table.content || '',
              tsv: tsv,
            };
          });

          console.log(`✅ OCR extracted: ${parsed.text.length} chars of text, ${processedTables.length} tables`);
          
          if (processedTables.length > 0) {
            console.log('📊 Tables found:');
            processedTables.forEach((t, i) => {
              console.log(`   Table ${i + 1} (page ${t.page}): ${t.description}`);
              console.log(`   TSV preview: ${(t.tsv || '').substring(0, 100)}...`);
            });
          }

          return {
            text: parsed.text,
            tables: processedTables,
          };
        }
      }
    } catch (parseError) {
      console.warn('⚠️ Failed to parse OCR JSON response:', parseError.message);
      console.warn('Raw response preview:', rawText.substring(0, 500));
    }

    // Fallback: Try a second pass specifically for tables
    console.log('🔄 Attempting secondary table extraction...');
    const tablesResult = await extractTablesOnly(pdfBase64);
    
    return {
      text: rawText || '',
      tables: tablesResult,
    };
  } catch (error) {
    console.error('Error in enhanced OCR with table detection:', error);
    
    // Fallback to basic OCR
    try {
      const basicText = await extractTextWithOCR(filePath);
      return {
        text: basicText,
        tables: [],
      };
    } catch (fallbackError) {
      throw new Error(`Failed to extract text with OCR: ${error.message}`);
    }
  }
};

/**
 * Secondary extraction specifically focused on finding tables
 */
const extractTablesOnly = async (pdfBase64) => {
  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const prompt = `Look at this PDF and find ALL tables, charts, or structured data.
For each table found, extract it in TSV format.

Return JSON array:
[
  {
    "page": 1,
    "description": "What this table shows",
    "tsv": "Col1\\tCol2\\nVal1\\tVal2"
  }
]

If no tables found, return: []`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: pdfBase64,
          mimeType: 'application/pdf',
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const rawText = response.text();
    
    let cleanedText = rawText.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim();
    
    const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed.map((t, idx) => ({
          page: t.page || idx + 1,
          description: t.description || `Table ${idx + 1}`,
          content: t.content || t.tsv || '',
          tsv: t.tsv || '',
        }));
      }
    }
    
    return [];
  } catch (error) {
    console.warn('Secondary table extraction failed:', error.message);
    return [];
  }
};

/**
 * Try to convert text content to TSV format
 */
const convertToTSV = (content) => {
  if (!content) return '';
  
  try {
    // Split by newlines
    const lines = content.split('\n').filter(line => line.trim());
    
    // Check if lines have consistent structure (pipes, tabs, or multiple spaces)
    const tsvLines = lines.map(line => {
      // Remove leading/trailing whitespace
      line = line.trim();
      
      // Check for pipe-separated format
      if (line.includes('|')) {
        return line.split('|').map(cell => cell.trim()).filter(cell => cell).join('\t');
      }
      
      // Check for tab-separated format
      if (line.includes('\t')) {
        return line.split('\t').map(cell => cell.trim()).join('\t');
      }
      
      // Check for multiple-space separated format
      const cells = line.split(/\s{2,}/).map(cell => cell.trim()).filter(cell => cell);
      if (cells.length > 1) {
        return cells.join('\t');
      }
      
      return line;
    });
    
    return tsvLines.join('\n');
  } catch (error) {
    return content;
  }
};

/**
 * Parse TSV string to table data
 * @param {string} tsv - TSV formatted string
 * @returns {Object} - { columns: string[], rows: string[][] }
 */
export const parseTSV = (tsv) => {
  if (!tsv || typeof tsv !== 'string') {
    return { columns: [], rows: [] };
  }

  try {
    const lines = tsv.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return { columns: [], rows: [] };
    }

    // First line is headers
    const columns = lines[0].split('\t').map(col => col.trim());
    
    // Remaining lines are data rows
    const rows = lines.slice(1).map(line => 
      line.split('\t').map(cell => cell.trim())
    );

    return { columns, rows };
  } catch (error) {
    console.error('Error parsing TSV:', error);
    return { columns: [], rows: [] };
  }
};
