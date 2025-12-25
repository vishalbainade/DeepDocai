import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateEmbedding } from './embedding.service.js';
import { searchSimilarChunks, hybridSearch, getAllDocumentChunks } from './vector_service.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Clean query for vector search by removing formatting instructions
 * This ensures we search for the core content, not formatting keywords
 * @param {string} question - Original user question
 * @returns {string} - Cleaned query for embedding/search
 */
const cleanQueryForSearch = (question) => {
  if (!question || typeof question !== 'string') {
    return question;
  }

  let cleaned = question.trim();

  // Remove formatting-related phrases (case-insensitive)
  const formattingPatterns = [
    /\bin\s+tabular\s+format\b/gi,
    /\bin\s+a\s+table\b/gi,
    /\bin\s+table\s+format\b/gi,
    /\bas\s+a\s+table\b/gi,
    /\bin\s+table\b/gi,
    /\btabular\s+format\b/gi,
    /\btable\s+format\b/gi,
    /\bin\s+tabular\b/gi,
    /\bshow\s+in\s+table\b/gi,
    /\bdisplay\s+in\s+table\b/gi,
    /\bpresent\s+in\s+table\b/gi,
    /\bformat\s+as\s+table\b/gi,
    /\bin\s+points\b/gi,
    /\bas\s+points\b/gi,
    /\bin\s+bullet\s+points\b/gi,
    /\bas\s+bullet\s+points\b/gi,
    /\bin\s+list\s+format\b/gi,
    /\bas\s+a\s+list\b/gi,
    /\bin\s+markdown\b/gi,
    /\bmarkdown\s+format\b/gi,
    /\bstructured\s+format\b/gi,
    /\bstructure\s+it\b/gi,
    /\bstructure\s+as\b/gi,
    /\bformat\s+it\b/gi,
    /\bformat\s+as\b/gi,
    /\bpresent\s+it\b/gi,
    /\bdisplay\s+it\b/gi,
    /\bshow\s+it\b/gi,
    /\bgive\s+me\s+points\b/gi,
    /\bprovide\s+points\b/gi,
    /\blist\s+the\s+points\b/gi,
  ];

  // Remove formatting patterns
  formattingPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  // Remove extra whitespace and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If cleaned query is too short or empty, return original (fallback)
  if (cleaned.length < 3) {
    console.warn(`⚠️ Cleaned query too short (${cleaned.length} chars), using original query`);
    return question.trim();
  }

  return cleaned;
};

/**
 * Check if question requests tabular format
 * IMPROVED: More comprehensive detection
 */
const isTableRequest = (question) => {
  const lowerQuestion = question.toLowerCase();
  const tableKeywords = [
    'tabular format',
    'table format',
    'in table',
    'as table',
    'tabular',
    'timeline',
    'events timeline',
    'facts table',
    'summary table',
    'document summary table',
    'in tabular',
    'show in table',
    'display in table',
    'create a table',
    'make a table',
    'generate a table',
    'output as table',
    'present as table',
    'format as table',
    'table of',
    'list in table',
  ];
  return tableKeywords.some(keyword => lowerQuestion.includes(keyword));
};

/**
 * Check if question is a generic/summary query that requires broad retrieval
 */
const isGenericQuery = (question) => {
  const lowerQuestion = question.toLowerCase();
  const genericKeywords = [
    'summarize',
    'summary',
    'summarise',
    'overview',
    'key points',
    'important points',
    'main points',
    'highlights',
    'give me',
    'what is',
    'what are',
    'tell me about',
    'explain',
    'describe',
    'general',
    'overall',
    'entire',
    'whole document',
    'document',
  ];
  
  const isShort = question.trim().split(/\s+/).length <= 5;
  const hasGenericKeyword = genericKeywords.some(keyword => lowerQuestion.includes(keyword));
  const isFormatOnly = (lowerQuestion.includes('tabular') || lowerQuestion.includes('table') || lowerQuestion.includes('format')) 
    && !lowerQuestion.match(/\b(who|what|when|where|why|how|which|name|list|find|search|locate)\b/);
  
  return hasGenericKeyword || (isShort && isFormatOnly);
};

/**
 * Hash a row for deduplication
 */
const hashRow = (row) => {
  if (!Array.isArray(row)) return '';
  return row.map(cell => String(cell || '').trim().toLowerCase()).join('|');
};

/**
 * Deduplicate rows based on content hash
 */
const deduplicateRows = (rows) => {
  const seen = new Set();
  const unique = [];
  
  for (const row of rows) {
    const hash = hashRow(row);
    if (hash && !seen.has(hash)) {
      seen.add(hash);
      unique.push(row);
    }
  }
  
  return unique;
};

/**
 * IMPROVED: Build table answer with better extraction
 * This is the core function that extracts structured data from document chunks
 */
const buildTableAnswer = async (question, documentId, documentChunks) => {
  console.log(`\n📊 ========== IMPROVED TABLE BUILDER ==========`);
  console.log(`Question: ${question}`);
  console.log(`Total chunks: ${documentChunks.length}`);
  
  if (documentChunks.length === 0) {
    console.log('❌ No chunks available for table extraction');
    return {
      answer_type: 'table',
      table: {
        title: 'No Data Found',
        columns: [],
        rows: [],
      },
      sources: [],
    };
  }

  // Build complete context from all chunks
  const context = documentChunks
    .map((chunk, idx) => {
      const chunkType = chunk.metadata?.chunkType || 'text';
      const pageNum = chunk.metadata?.pageNumber;
      const header = pageNum 
        ? `[Section ${idx + 1} - Page ${pageNum} - Type: ${chunkType}]`
        : `[Section ${idx + 1} - Type: ${chunkType}]`;
      return `${header}\n${chunk.text || ''}`;
    })
    .join('\n\n---\n\n');

  console.log(`📝 Context length: ${context.length} characters`);

  // Determine appropriate table structure based on question
  const lowerQuestion = question.toLowerCase();
  let tableType = 'general';
  let suggestedColumns = ['Key Point', 'Description'];
  let extractionHint = 'Extract key points and important information';

  if (lowerQuestion.includes('timeline') || lowerQuestion.includes('events')) {
    tableType = 'timeline';
    suggestedColumns = ['Date', 'Event', 'Description'];
    extractionHint = 'Extract chronological events with dates';
  } else if (lowerQuestion.includes('facts')) {
    tableType = 'facts';
    suggestedColumns = ['Fact', 'Source/Reference'];
    extractionHint = 'Extract factual statements and their sources';
  } else if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview')) {
    tableType = 'summary';
    suggestedColumns = ['Topic', 'Summary'];
    extractionHint = 'Summarize main topics and themes';
  } else if (lowerQuestion.includes('important') || lowerQuestion.includes('key point')) {
    tableType = 'keypoints';
    suggestedColumns = ['Key Point', 'Details'];
    extractionHint = 'Extract the most important points and their details';
  } else if (lowerQuestion.includes('compare') || lowerQuestion.includes('comparison')) {
    tableType = 'comparison';
    suggestedColumns = ['Aspect', 'Item 1', 'Item 2'];
    extractionHint = 'Compare different items or concepts';
  }

  console.log(`📋 Table type detected: ${tableType}`);
  console.log(`📋 Suggested columns: ${suggestedColumns.join(', ')}`);

  // IMPROVED PROMPT: More explicit instructions for table extraction
  const prompt = `You are extracting structured information from a document to create a table.

USER REQUEST: ${question}

EXTRACTION GOAL: ${extractionHint}

DOCUMENT CONTENT:
${context}

CRITICAL INSTRUCTIONS:
1. You MUST return ONLY valid JSON - no markdown, no explanations, no code blocks.
2. ANALYZE THE ENTIRE DOCUMENT CONTENT and extract relevant structured information.
3. Create meaningful rows - each row should represent a distinct piece of information.
4. For "${tableType}" type tables, use columns like: ${JSON.stringify(suggestedColumns)}
5. If the document contains any information at all, you MUST extract at least some data.
6. Be thorough - extract ALL relevant points, not just a few.
7. Keep cell content concise but informative.

REQUIREMENTS FOR DIFFERENT REQUEST TYPES:
- "summary" / "overview" → Extract main topics, themes, key sections. Create at least 5-10 rows.
- "important points" / "key points" → Extract critical information, main claims, key facts. Create at least 5-10 rows.
- "timeline" / "events" → Extract dates and events chronologically.
- "facts" → Extract factual statements with their references.
- Generic requests → Provide a comprehensive overview of the document content.

REQUIRED JSON FORMAT:
{
  "answer_type": "table",
  "table": {
    "title": "Descriptive title based on the user's question",
    "columns": ${JSON.stringify(suggestedColumns)},
    "rows": [
      ["Value for column 1", "Value for column 2"],
      ["Another value", "Another description"],
      ...more rows...
    ]
  }
}

IMPORTANT:
- The rows array must contain actual data extracted from the document
- Each row must have the same number of elements as there are columns
- If you truly cannot find any relevant information, return empty rows
- But if there is ANY content in the document, extract something meaningful

Return ONLY the JSON object, nothing else:`;

  try {
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.3,
        topP: 0.95,
        topK: 40,
        responseMimeType: 'application/json',
      },
    });

    console.log('🤖 Calling Gemini for table extraction...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawText = response.text();
    
    console.log(`📤 Raw response length: ${rawText.length} characters`);
    console.log(`📤 Raw response preview: ${rawText.substring(0, 200)}...`);

    // Parse JSON response
    let cleanedText = rawText.trim();
    cleanedText = cleanedText.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim();
    
    const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.answer_type === 'table' && parsed.table) {
        const table = parsed.table;
        
        // Validate and normalize the table
        const columns = Array.isArray(table.columns) ? table.columns : suggestedColumns;
        let rows = Array.isArray(table.rows) ? table.rows : [];
        
        // Normalize rows to match column count
        const columnCount = columns.length;
        rows = rows.map(row => {
          if (!Array.isArray(row)) return Array(columnCount).fill('');
          const normalized = [...row];
          while (normalized.length < columnCount) {
            normalized.push('');
          }
          return normalized.slice(0, columnCount);
        });

        // Deduplicate rows
        rows = deduplicateRows(rows);

        console.log(`✅ Table extracted: ${columns.length} columns, ${rows.length} rows`);

        // If we got an empty table but have content, try fallback extraction
        if (rows.length === 0 && context.length > 100) {
          console.log('⚠️ Empty table from context with content - attempting fallback extraction');
          const fallbackTable = await fallbackTableExtraction(question, context, suggestedColumns);
          if (fallbackTable.rows.length > 0) {
            return {
              answer_type: 'table',
              table: fallbackTable,
              sources: documentChunks.map((chunk) => ({
                chunkIndex: chunk.metadata?.chunkIndex || 0,
                documentId: chunk.metadata?.documentId || documentId,
                similarity: chunk.similarity || 0.5,
              })),
            };
          }
        }

        return {
          answer_type: 'table',
          table: {
            title: table.title || 'Document Summary',
            columns: columns,
            rows: rows,
          },
          sources: documentChunks.map((chunk) => ({
            chunkIndex: chunk.metadata?.chunkIndex || 0,
            documentId: chunk.metadata?.documentId || documentId,
            similarity: chunk.similarity || 0.5,
          })),
        };
      }
    }

    throw new Error('Failed to parse table response');
  } catch (error) {
    console.error('❌ Table extraction error:', error.message);
    
    // Fallback: try simpler extraction
    try {
      console.log('🔄 Attempting fallback table extraction...');
      const fallbackTable = await fallbackTableExtraction(question, context, suggestedColumns);
      
      return {
        answer_type: 'table',
        table: fallbackTable,
        sources: documentChunks.map((chunk) => ({
          chunkIndex: chunk.metadata?.chunkIndex || 0,
          documentId: chunk.metadata?.documentId || documentId,
          similarity: chunk.similarity || 0.5,
        })),
      };
    } catch (fallbackError) {
      console.error('❌ Fallback extraction also failed:', fallbackError.message);
      
      return {
        answer_type: 'table',
        table: {
          title: 'Extraction Failed',
          columns: ['Status', 'Details'],
          rows: [
            ['Error', 'Failed to extract structured data from the document'],
            ['Suggestion', 'Try asking a more specific question or request text format instead'],
          ],
        },
        sources: [],
      };
    }
  }
};

/**
 * Fallback table extraction with simpler prompt
 */
const fallbackTableExtraction = async (question, context, suggestedColumns) => {
  const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    generationConfig: {
      temperature: 0.5,
      topP: 0.95,
      responseMimeType: 'application/json',
    },
  });

  const simplePrompt = `Extract key information from this text as JSON.

TEXT:
${context.substring(0, 10000)}

TASK: Create a simple table with columns ${JSON.stringify(suggestedColumns)}.
Extract at least 5-10 distinct points from the text.

Return JSON ONLY:
{
  "title": "Summary",
  "columns": ${JSON.stringify(suggestedColumns)},
  "rows": [["point 1", "description 1"], ["point 2", "description 2"], ...]
}`;

  const result = await model.generateContent(simplePrompt);
  const response = await result.response;
  const rawText = response.text();
  
  let cleanedText = rawText.trim();
  cleanedText = cleanedText.replace(/^```(?:json)?\s*/gm, '').replace(/```\s*$/gm, '').trim();
  
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      title: parsed.title || 'Document Summary',
      columns: Array.isArray(parsed.columns) ? parsed.columns : suggestedColumns,
      rows: Array.isArray(parsed.rows) ? deduplicateRows(parsed.rows) : [],
    };
  }
  
  throw new Error('Failed to parse fallback response');
};

/**
 * Generate answer using RAG
 * @param {string} question - User's question
 * @param {string} documentId - Document ID
 * @param {string} intent - Optional intent override ('table', 'summary', or null for auto-detect)
 * @returns {Promise<Object>} Answer object with type, content, and sources
 */
export const generateAnswer = async (question, documentId, intent = null) => {
  try {
    console.log(`\n=== RAG Generation Started ===`);
    console.log(`Question: ${question}`);
    console.log(`Document ID: ${documentId}`);
    console.log(`Intent: ${intent || 'auto-detected'}`);

    // Step 1: Detect query intent
    const isTable = intent === 'table' || (intent === null && isTableRequest(question));
    const isGeneric = intent === 'summary' || (intent === null && isGenericQuery(question));
    
    console.log(`📋 Query Analysis:`);
    console.log(`   - Table query: ${isTable ? 'YES' : 'NO'}`);
    console.log(`   - Generic/Summary query: ${isGeneric ? 'YES' : 'NO'}`);
    
    // Step 2: Clean query for search
    const searchQuery = cleanQueryForSearch(question);
    console.log(`🔍 Cleaned query: "${searchQuery}"`);
    
    // Step 3: Generate embedding
    const questionEmbedding = await generateEmbedding(searchQuery);
    console.log(`✅ Embedding generated (dim: ${questionEmbedding.length})`);

    // Step 4: Retrieve chunks - for table queries, get ALL chunks
    let documentChunks;
    if (isTable) {
      console.log('📊 Table query: Retrieving ALL document chunks');
      documentChunks = await getAllDocumentChunks(documentId, true);
    } else {
      documentChunks = await hybridSearch(questionEmbedding, documentId, 10, isGeneric, false);
    }

    if (documentChunks.length === 0) {
      return {
        answer_type: 'text',
        answer: 'I could not find relevant information in the document. Please try rephrasing your question.',
        sources: [],
      };
    }

    console.log(`✅ Retrieved ${documentChunks.length} chunks`);

    // Step 5: For table queries, use table builder
    if (isTable) {
      const tableResult = await buildTableAnswer(question, documentId, documentChunks);
      return tableResult;
    }

    // Step 6: For text queries, generate text response
    const context = documentChunks
      .map((chunk, index) => {
        const similarityPercent = (chunk.similarity * 100).toFixed(1);
        return `[Section ${index + 1} - Relevance: ${similarityPercent}%]\n${chunk.text || ''}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a helpful document assistant. Answer the question based on the provided context.

CONTEXT:
${context}

QUESTION: ${question}

INSTRUCTIONS:
1. Answer based ONLY on the provided context
2. Be clear and comprehensive
3. If the information is not in the context, say so
4. Use a professional but friendly tone

Answer:`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const answer = response.text();

    return {
      answer_type: 'text',
      answer: answer.trim(),
      sources: documentChunks.map((chunk) => ({
        chunkIndex: chunk.metadata?.chunkIndex || 0,
        documentId: chunk.metadata?.documentId || documentId,
        similarity: chunk.similarity || 0.5,
      })),
    };
  } catch (error) {
    console.error('Error in RAG generation:', error);
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};

/**
 * Generate answer with streaming support
 * For table requests, returns complete structured data
 * For text requests, yields chunks as they arrive
 */
export const generateAnswerStream = async function* (question, documentId, intent = null) {
  try {
    console.log(`\n=== RAG Streaming Started ===`);
    console.log(`Question: ${question}`);
    console.log(`Intent: ${intent || 'auto-detected'}`);

    // Detect query intent
    const isTable = intent === 'table' || (intent === null && isTableRequest(question));
    const isGeneric = intent === 'summary' || (intent === null && isGenericQuery(question));
    
    console.log(`📋 Query type: ${isTable ? 'Table' : isGeneric ? 'Generic' : 'Specific'}`);

    // Clean and embed query
    const searchQuery = cleanQueryForSearch(question);
    const questionEmbedding = await generateEmbedding(searchQuery);

    // Retrieve chunks
    let documentChunks;
    if (isTable) {
      documentChunks = await getAllDocumentChunks(documentId, true);
    } else {
      documentChunks = await hybridSearch(questionEmbedding, documentId, 10, isGeneric, false);
    }

    if (documentChunks.length === 0) {
      yield 'I could not find relevant information in the document.';
      return {
        sources: [],
        answer_type: 'text',
      };
    }

    // For table queries, build table and return (no streaming)
    if (isTable) {
      console.log('📊 Building table response...');
      const tableResult = await buildTableAnswer(question, documentId, documentChunks);
      
      // Return the complete table result
      return {
        ...tableResult,
        sources: tableResult.sources || [],
      };
    }

    // For text queries, stream the response
    const context = documentChunks
      .map((chunk, index) => {
        const similarityPercent = (chunk.similarity * 100).toFixed(1);
        return `[Section ${index + 1} - Relevance: ${similarityPercent}%]\n${chunk.text || ''}`;
      })
      .join('\n\n---\n\n');

    const prompt = `You are a helpful document assistant. Answer based on the context.

CONTEXT:
${context}

QUESTION: ${question}

Answer clearly and comprehensively:`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      },
    });

    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      if (chunkText) {
        fullText += chunkText;
        yield chunkText;
      }
    }

    return {
      sources: documentChunks.map((chunk) => ({
        chunkIndex: chunk.metadata?.chunkIndex || 0,
        documentId: chunk.metadata?.documentId || documentId,
        similarity: chunk.similarity || 0.5,
      })),
      answer_type: 'text',
      answer: fullText.trim(),
    };
  } catch (error) {
    console.error('Error in RAG streaming:', error);
    throw error;
  }
};

/**
 * Diagnose table format issues for a question and document
 * Returns detailed information about each step in the RAG pipeline
 */
export const diagnoseTableFormat = async (question, documentId) => {
  try {
    const diagnostics = {
      question,
      documentId,
      steps: {},
      timestamp: new Date().toISOString(),
    };

    // Step 1: Check if question is detected as table request
    const isTable = isTableRequest(question);
    diagnostics.steps.intentDetection = {
      success: true,
      isTableRequest: isTable,
      isGenericQuery: isGenericQuery(question),
    };

    // Step 2: Generate embedding for question
    try {
      const questionEmbedding = await generateEmbedding(question);
      diagnostics.steps.embedding = {
        success: true,
        dimension: questionEmbedding.length,
      };
    } catch (error) {
      diagnostics.steps.embedding = {
        success: false,
        error: error.message,
      };
    }

    // Step 3: Retrieve chunks
    try {
      const documentChunks = await hybridSearch(
        await generateEmbedding(question),
        documentId,
        10,
        isGenericQuery(question),
        isTable
      );
      diagnostics.steps.retrieval = {
        success: true,
        chunksRetrieved: documentChunks.length,
        tableChunks: documentChunks.filter(c => c.metadata?.chunkType === 'table').length,
        textChunks: documentChunks.filter(c => c.metadata?.chunkType === 'text').length,
      };
    } catch (error) {
      diagnostics.steps.retrieval = {
        success: false,
        error: error.message,
      };
    }

    // Step 4: If table request, check buildTableAnswer path
    if (isTable) {
      diagnostics.steps.tablePipeline = {
        note: 'Table queries use buildTableAnswer() map-reduce pipeline',
        path: 'buildTableAnswer() → batchChunks() → extractTableRowsFromBatch() → formatTableResponse()',
      };
    }

    return diagnostics;
  } catch (error) {
    return {
      question,
      documentId,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    };
  }
};

export { isTableRequest, isGenericQuery, cleanQueryForSearch };
