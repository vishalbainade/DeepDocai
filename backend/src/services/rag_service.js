import geminiClient from './gemini-client.js';
import { retrieveRelevantChunks, isGenericQuery, isTableRequest } from './retrievalService.js';
import { buildParagraphCitations } from './citationService.js';
import logger from '../utils/logger.js';
import { routeTextRequest, routeStreamRequest } from './providerRouter.js';

const summarizeChunksForFlow = (chunks = []) =>
  chunks.map((chunk, index) => ({
    rank: index + 1,
    chunkId: chunk.id,
    page: chunk.pageNumber,
    type: chunk.chunkType,
    similarity: Number(chunk.similarity || 0).toFixed(4),
    preview: String(chunk.content || '').replace(/\s+/g, ' ').trim().slice(0, 90),
  }));

const summarizeTableRows = (columns = [], rows = []) =>
  rows.slice(0, 5).map((row, index) => {
    const summary = { row: index + 1 };
    columns.forEach((column, columnIndex) => {
      summary[column] = row?.[columnIndex] ?? '';
    });
    return summary;
  });

const deduplicateRows = (rows) => {
  const seen = new Set();
  const unique = [];

  rows.forEach((row) => {
    const normalized = Array.isArray(row)
      ? row.map((cell) => String(cell || '').trim().toLowerCase()).join('|')
      : '';

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      unique.push(row);
    }
  });

  return unique;
};

const buildTextContext = (chunks) =>
  chunks
    .map((chunk, index) => {
      const similarity = Number((chunk.similarity || 0) * 100).toFixed(1);
      return `[Chunk ${index + 1} | Page ${chunk.pageNumber} | Relevance ${similarity}%]\n${chunk.content}`;
    })
    .join('\n\n---\n\n');

const buildTableContext = (chunks) =>
  chunks
    .map((chunk, index) => `[Chunk ${index + 1} | Page ${chunk.pageNumber} | Type ${chunk.chunkType}]\n${chunk.content}`)
    .join('\n\n---\n\n');

const parseJsonResponse = (rawText) => {
  const trimmed = String(rawText || '')
    .trim()
    .replace(/^```(?:json)?\s*/gm, '')
    .replace(/```\s*$/gm, '')
    .trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON object found in model response');
  }
  return JSON.parse(jsonMatch[0]);
};

const buildTableAnswer = async (question, chunks, preferredModel) => {
  const prompt = `You are extracting structured data from a document for a production RAG system.

QUESTION:
${question}

DOCUMENT CHUNKS:
${buildTableContext(chunks)}

Return ONLY valid JSON using this exact shape:
{
  "answer_type": "table",
  "table": {
    "title": "Short title",
    "columns": ["Column 1", "Column 2"],
    "rows": [["Value 1", "Value 2"]]
  },
  "answer": "Optional short summary"
}

Rules:
- Use information only from the document chunks.
- Keep columns consistent across all rows.
- If data is sparse, still return a useful small table instead of empty prose.`;

  const execution = await geminiClient.executeWithFallback(
    async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          responseMimeType: 'application/json',
        },
      });
      return model.generateContent(prompt);
    },
    { taskLabel: 'Table Extraction', preferredModel: preferredModel || geminiClient.MODELS.TEXT }
  );
  const parsed = parseJsonResponse((await execution.result.response).text());
  const table = parsed.table || {};
  const columns = Array.isArray(table.columns) && table.columns.length ? table.columns : ['Key', 'Value'];
  const rows = Array.isArray(table.rows) ? deduplicateRows(table.rows) : [];
  logger.info('LLM', 'Table answer generated', {
    modelUsed: execution.modelName,
    requestedModel: execution.requestedModel,
    columnCount: columns.length,
    rowCount: rows.length,
  });
  logger.table('INFO', 'TABLE FLOW', 'Structured table preview', summarizeTableRows(columns, rows), {
    modelUsed: execution.modelName,
    title: table.title || 'Structured Answer',
  });

  return {
    answer_type: 'table',
    answer: parsed.answer || '',
    table: {
      title: table.title || 'Structured Answer',
      columns,
      rows,
    },
    modelUsed: execution.modelName,
  };
};

const generateTextAnswerInternal = async (question, chunks, preferredModel) => {
  const prompt = `You are an AI assistant integrated into DeepDocAI.

Always format responses in a structured, UI-friendly way using the following rules:

Divide the response into sections:
📄 Overview
🔍 Key Details
⚙️ Technical Points (if applicable)
✅ Final Summary
Use bullet points instead of long paragraphs.
Keep sentences short and clean.
Add relevant emojis for readability (not excessive).
Inline citations format:
Use [Pg. X] inside sentences
Example: "The system uses Vue 3 [Pg. 1]"
At the end, include:
"📚 Sources: Pg. 1, Pg. 2"
Avoid repeating the same citation multiple times.
Do NOT output raw paragraphs.
Output should be structured and easy to scan.

Use ONLY the supplied context. Do not invent facts that are not present.

CONTEXT:
${buildTextContext(chunks)}

QUESTION:
${question}

ANSWER:`;

  const result = await routeTextRequest({
    modelIdentifier: preferredModel,
    prompt,
    config: { temperature: 0.4, top_p: 0.95 },
  });

  logger.info('LLM', 'Text answer generated', {
    modelUsed: result.modelName,
    requestedModel: preferredModel || 'auto-resolved',
    chunkCount: chunks.length,
  });

  return {
    answer: result.text.trim(),
    modelUsed: result.modelName,
  };
};

export const generateAnswer = async (question, documentId, intent = null, preferredModel = null) => {
  try {
    const retrieval = await retrieveRelevantChunks({ question, documentId, intent });
    logger.table('INFO', 'DATA FLOW', 'RAG chunk context', summarizeChunksForFlow(retrieval.chunks), {
      documentId,
      flow: 'non-stream',
    });

    if (!retrieval.chunks.length) {
      return {
        answer_type: 'text',
        answer: 'I could not find relevant information in the document. Please try rephrasing your question.',
        sources: [],
        paragraphCitations: [],
      };
    }

    if (retrieval.isTable) {
      const tableResult = await buildTableAnswer(question, retrieval.chunks, preferredModel);
      return {
        ...tableResult,
        sources: retrieval.chunks,
        modelUsed: tableResult.modelUsed,
      };
    }

    const textResult = await generateTextAnswerInternal(question, retrieval.chunks, preferredModel);
    return {
      answer_type: 'text',
      answer: textResult.answer,
      sources: retrieval.chunks,
      paragraphCitations: buildParagraphCitations(textResult.answer, retrieval.chunks),
      modelUsed: textResult.modelUsed,
    };
  } catch (error) {
    logger.error('ERROR', 'RAG generation failed', {
      area: 'RAG',
      documentId,
      error: error.message,
    });
    throw new Error(`Failed to generate answer: ${error.message}`);
  }
};

export const generateAnswerStream = async function* (question, documentId, intent = null, preferredModel = null) {
  const retrieval = await retrieveRelevantChunks({ question, documentId, intent });
  logger.table('INFO', 'DATA FLOW', 'Streaming chunk context', summarizeChunksForFlow(retrieval.chunks), {
    documentId,
    flow: 'stream',
  });

  if (!retrieval.chunks.length) {
    yield 'I could not find relevant information in the document.';
    return {
      answer_type: 'text',
      answer: 'I could not find relevant information in the document.',
      sources: [],
      paragraphCitations: [],
    };
  }

  if (retrieval.isTable) {
    const tableResult = await buildTableAnswer(question, retrieval.chunks, preferredModel);
    return {
      ...tableResult,
      sources: retrieval.chunks,
      paragraphCitations: [],
      modelUsed: tableResult.modelUsed,
    };
  }

  const prompt = `You are an AI assistant integrated into DeepDocAI.

Always format responses in a structured, UI-friendly way using the following rules:

Divide the response into sections:
📄 Overview
🔍 Key Details
⚙️ Technical Points (if applicable)
✅ Final Summary
Use bullet points instead of long paragraphs.
Keep sentences short and clean.
Add relevant emojis for readability (not excessive).
Inline citations format:
Use [Pg. X] inside sentences
Example: "The system uses Vue 3 [Pg. 1]"
At the end, include:
"📚 Sources: Pg. 1, Pg. 2"
Avoid repeating the same citation multiple times.
Do NOT output raw paragraphs.
Output should be structured and easy to scan.

Use ONLY the supplied context. Do not invent facts that are not present.

CONTEXT:
${buildTextContext(retrieval.chunks)}

QUESTION:
${question}

ANSWER:`;

  const generator = routeStreamRequest({
    modelIdentifier: preferredModel,
    prompt,
    config: { temperature: 0.4, top_p: 0.95 },
  });

  let answer = '';
  let meta = null;

  while (true) {
    const { value, done } = await generator.next();
    if (done) {
      meta = value;
      break;
    }
    if (value) {
      answer += value;
      yield value;
    }
  }

  logger.info('LLM', 'Streaming stream finished', {
    modelUsed: meta?.modelName || 'unknown',
    requestedModel: preferredModel || 'auto-resolved',
    chunkCount: retrieval.chunks.length,
  });

  return {
    answer_type: 'text',
    answer: answer.trim(),
    sources: retrieval.chunks,
    paragraphCitations: buildParagraphCitations(answer, retrieval.chunks),
    modelUsed: meta?.modelName || 'unknown',
  };
};

export const diagnoseTableFormat = async (question, documentId) => {
  try {
    const retrieval = await retrieveRelevantChunks({ question, documentId, intent: null });

    return {
      question,
      documentId,
      timestamp: new Date().toISOString(),
      steps: {
        intentDetection: {
          success: true,
          isTableRequest: isTableRequest(question),
          isGenericQuery: isGenericQuery(question),
        },
        retrieval: {
          success: true,
          chunksRetrieved: retrieval.chunks.length,
          chunkIds: retrieval.chunks.map((chunk) => chunk.id),
        },
      },
    };
  } catch (error) {
    return {
      question,
      documentId,
      timestamp: new Date().toISOString(),
      error: error.message,
    };
  }
};

export { isTableRequest, isGenericQuery };
