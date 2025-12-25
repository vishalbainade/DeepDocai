// import express from 'express';
// import { generateAnswer, generateAnswerStream } from '../services/rag_service.js';
// import { uploadLogToOutputBucket, generateLogFileName } from '../services/storage.service.js';
// import { query } from '../db/index.js';
// import { authenticateToken } from '../middleware/auth.middleware.js';

// const router = express.Router();

// // All routes require authentication
// router.use(authenticateToken);

// const getUserId = (req) => {
//   return req.user.id;
// };

// /**
//  * Get or create a chat for the conversation
//  * Returns chatId
//  */
// async function getOrCreateChat(userId, documentId, chatId = null) {
//   if (chatId) {
//     // Verify chat exists and belongs to user
//     const result = await query(
//       'SELECT id FROM chats WHERE id = $1 AND user_id = $2 AND document_id = $3',
//       [chatId, userId, documentId]
//     );
//     if (result.rows.length > 0) {
//       return chatId;
//     }
//   }

//   // Create new chat
//   const newChatResult = await query(
//     `INSERT INTO chats (user_id, document_id, title) 
//      VALUES ($1, $2, 'New Chat') 
//      RETURNING id`,
//     [userId, documentId]
//   );
//   return newChatResult.rows[0].id;
// }

// /**
//  * Auto-generate chat title from first user message if still "New Chat"
//  */
// async function updateChatTitleIfNeeded(chatId, question) {
//   const chatResult = await query(
//     'SELECT title FROM chats WHERE id = $1',
//     [chatId]
//   );

//   if (chatResult.rows.length > 0 && chatResult.rows[0].title === 'New Chat') {
//     // Generate title from first 50 characters of question
//     const title = question.trim().substring(0, 50) || 'New Chat';
//     await query(
//       `UPDATE chats SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
//       [title, chatId]
//     );
//   }
// }

// /**
//  * POST /api/ask
//  * Ask a question about a document using RAG with streaming support
//  * Supports both streaming (SSE) and non-streaming responses based on Accept header
//  */
// router.post('/', async (req, res) => {
//   try {
//     const { documentId, question, chatId, intent } = req.body;
//     const userId = getUserId(req);

//     if (!documentId || !question) {
//       return res.status(400).json({
//         error: 'Both documentId and question are required',
//       });
//     }
    
//     // Intent can be: 'table', 'summary', or null (auto-detect)
//     // This allows frontend to explicitly specify query intent for better retrieval

//     // Verify document exists
//     const docResult = await query(
//       'SELECT id FROM documents WHERE id = $1',
//       [documentId]
//     );

//     if (docResult.rows.length === 0) {
//       return res.status(404).json({
//         error: 'Document not found',
//       });
//     }

//     // Get or create chat
//     const currentChatId = await getOrCreateChat(userId, documentId, chatId);

//     // Auto-generate title from first message if needed
//     await updateChatTitleIfNeeded(currentChatId, question);

//     // Save user message to database with chat_id
//     await query(
//       'INSERT INTO chat_history (chat_id, document_id, role, content) VALUES ($1, $2, $3, $4)',
//       [currentChatId, documentId, 'user', question]
//     );

//     // Update chat's updated_at timestamp
//     await query(
//       'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
//       [currentChatId]
//     );

//     // Check if document has embeddings
//     const embeddingCheck = await query(
//       'SELECT COUNT(*) as count FROM embeddings WHERE document_id = $1',
//       [documentId]
//     );
    
//     const embeddingCount = parseInt(embeddingCheck.rows[0]?.count || 0);
    
//     if (embeddingCount === 0) {
//       return res.status(400).json({
//         error: 'Document has not been processed yet. Please wait for processing to complete.',
//         message: 'No embeddings found for this document. The document may still be processing.',
//       });
//     }

//     console.log(`Document ${documentId} has ${embeddingCount} embeddings`);

//     // Check if client wants streaming (SSE)
//     const acceptHeader = req.headers.accept || '';
//     const wantsStreaming = acceptHeader.includes('text/event-stream') || req.query.stream === 'true';

//     if (wantsStreaming) {
//       // Streaming mode: Use Server-Sent Events (SSE)
//       return handleStreamingResponse(req, res, documentId, question, currentChatId, intent);
//     } else {
//       // Non-streaming mode: Return complete response (backward compatibility)
//       return handleNonStreamingResponse(res, documentId, question, currentChatId, intent);
//     }
//   } catch (error) {
//     console.error('Ask error:', error);
//     res.status(500).json({
//       error: 'Failed to generate answer',
//       message: error.message,
//     });
//   }
// });

// /**
//  * Handle streaming response using Server-Sent Events (SSE)
//  * Streams tokens as they arrive from the LLM
//  * @param {string} intent - Query intent: 'table', 'summary', or null (auto-detect)
//  */
// async function handleStreamingResponse(req, res, documentId, question, chatId, intent = null) {
//   // Set SSE headers for streaming
//   res.setHeader('Content-Type', 'text/event-stream');
//   res.setHeader('Cache-Control', 'no-cache');
//   res.setHeader('Connection', 'keep-alive');
//   res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

//   let fullAnswer = '';
//   let sources = [];

//   try {
//     // Send initial event with chatId (chatId is already created in main handler)
//     res.write(`data: ${JSON.stringify({ type: 'chatId', chatId: chatId })}\n\n`);
//     res.write('event: start\ndata: {"status": "streaming"}\n\n');

//     // Generate answer with streaming (pass intent for table-aware retrieval)
//     const streamGenerator = generateAnswerStream(question, documentId, intent);
    
//     let answerType = 'text';
//     let tableData = null;
//     let finalAnswerText = '';
    
//     // Stream each chunk as it arrives
//     try {
//       for await (const chunk of streamGenerator) {
//         if (typeof chunk === 'string') {
//           // Text chunk: send it immediately (only for text responses)
//           fullAnswer += chunk;
//           finalAnswerText += chunk;
//           // JSON.stringify handles all escaping (newlines, quotes, etc.)
//           res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
//         } else if (chunk && typeof chunk === 'object') {
//           // Final value with sources and potentially table data
//           if (chunk.sources) {
//             sources = chunk.sources;
//           }
//           if (chunk.answer_type) {
//             answerType = chunk.answer_type;
//           }
//           if (chunk.table) {
//             tableData = chunk.table;
//           }
//           if (chunk.answer) {
//             finalAnswerText = chunk.answer;
//           }
          
//           // For table responses, send complete table data
//           if (answerType === 'table' && tableData) {
//             res.write(`data: ${JSON.stringify({ type: 'complete', answer_type: 'table', table: tableData, answer: finalAnswerText || '' })}\n\n`);
//           } else if (answerType === 'text' && finalAnswerText) {
//             // For text responses, send complete event with final answer
//             res.write(`data: ${JSON.stringify({ type: 'complete', answer_type: 'text', answer: finalAnswerText })}\n\n`);
//           }
//         }
//       }
//     } catch (streamError) {
//       // Handle errors from the stream generator (e.g., embedding failures)
//       console.error('Error in stream generator:', streamError);
//       throw streamError; // Re-throw to be caught by outer try-catch
//     }
    
//     // Ensure we have valid data before saving
//     if (answerType === 'table' && !tableData) {
//       answerType = 'text';
//       tableData = null;
//     }
//     if (answerType === 'text' && !fullAnswer.trim() && !finalAnswerText.trim()) {
//       fullAnswer = 'No relevant information found in this document.';
//     }

//     // Send complete event if not already sent (for text responses that didn't get complete event)
//     if (answerType === 'text' && fullAnswer.trim() && !finalAnswerText) {
//       res.write(`data: ${JSON.stringify({ type: 'complete', answer_type: 'text', answer: fullAnswer.trim() })}\n\n`);
//     } else if (answerType === 'text' && finalAnswerText && !fullAnswer.trim()) {
//       res.write(`data: ${JSON.stringify({ type: 'complete', answer_type: 'text', answer: finalAnswerText })}\n\n`);
//     } else if (answerType === 'text' && !fullAnswer.trim() && !finalAnswerText) {
//       // Fallback: send complete event with default message
//       res.write(`data: ${JSON.stringify({ type: 'complete', answer_type: 'text', answer: 'No relevant information found in this document.' })}\n\n`);
//     }

//     // Save complete AI response to database with chat_id
//     // For table responses, store the table data as JSON string
//     const finalContent = answerType === 'table' && tableData 
//       ? JSON.stringify({ answer_type: 'table', table: tableData })
//       : (fullAnswer.trim() || finalAnswerText || 'No relevant information found in this document.');
    
//     await query(
//       'INSERT INTO chat_history (chat_id, document_id, role, content) VALUES ($1, $2, $3, $4)',
//       [chatId, documentId, 'ai', finalContent]
//     );

//     // Update chat's updated_at timestamp
//     await query(
//       'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
//       [chatId]
//     );

//     // Send sources and completion event
//     res.write(`data: ${JSON.stringify({ type: 'sources', sources: sources || [] })}\n\n`);
//     res.write('event: end\ndata: {"status": "complete"}\n\n');

//     // Log Q&A session to GCS (async, don't block response)
//     try {
//       const logData = {
//         timestamp: new Date().toISOString(),
//         question: question,
//         answer: fullAnswer.trim(),
//         documentId: documentId,
//         sources: sources,
//       };

//       const logFileName = generateLogFileName(documentId);
//       await uploadLogToOutputBucket(logData, logFileName);
//       console.log(`Q&A session logged to GCS: ${logFileName}`);
//     } catch (logError) {
//       console.error('Failed to log Q&A session to GCS:', logError);
//     }

//     // Close the stream
//     res.end();
//   } catch (error) {
//     console.error('Streaming error:', error);
    
//     // Create user-friendly error message
//     let errorMessage = 'Sorry, I encountered an error while processing your question.';
//     if (error.message.includes('embedding')) {
//       errorMessage = 'Failed to process your question. Please check your API configuration and try again.';
//     } else if (error.message.includes('fetch failed') || error.message.includes('network')) {
//       errorMessage = 'Network error. Please check your internet connection and try again.';
//     } else if (error.message) {
//       errorMessage = `Error: ${error.message}`;
//     }
    
//     // Send error event with user-friendly message
//     res.write(`event: error\ndata: ${JSON.stringify({ error: errorMessage, details: error.message })}\n\n`);
//     res.end();
//   }

//   // Handle client disconnect
//   req.on('close', () => {
//     console.log('Client disconnected from streaming');
//     res.end();
//   });
// }

// /**
//  * Handle non-streaming response (backward compatibility)
//  * Returns complete response after generation finishes
//  * @param {string} intent - Query intent: 'table', 'summary', or null (auto-detect)
//  */
// async function handleNonStreamingResponse(res, documentId, question, chatId, intent = null) {
//   try {
//     // Generate answer using RAG (non-streaming, pass intent for table-aware retrieval)
//     const result = await generateAnswer(question, documentId, intent);

//     // Save AI response to database with chat_id
//     // For table responses, store the table data as JSON string
//     const contentToStore = result.answer_type === 'table' && result.table
//       ? JSON.stringify({ answer_type: 'table', table: result.table })
//       : (result.answer || '');

//     await query(
//       'INSERT INTO chat_history (chat_id, document_id, role, content) VALUES ($1, $2, $3, $4)',
//       [chatId, documentId, 'ai', contentToStore]
//     );

//     // Update chat's updated_at timestamp
//     await query(
//       'UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
//       [chatId]
//     );

//     // Ensure result has valid structure
//     if (!result.answer_type) {
//       result.answer_type = 'text';
//     }
//     if (result.answer_type === 'text' && !result.answer) {
//       result.answer = 'No relevant information found in this document.';
//     }
//     if (result.answer_type === 'table' && !result.table) {
//       result.table = {
//         title: 'No Data Found',
//         columns: [],
//         rows: [],
//       };
//     }

//     // Send response to user with structured data
//     const response = {
//       success: true,
//       answer_type: result.answer_type,
//       sources: result.sources || [],
//       documentId: documentId,
//       chatId: chatId,
//     };

//     if (result.answer_type === 'table' && result.table) {
//       response.table = result.table;
//       response.answer = result.answer || ''; // Fallback text if provided
//     } else {
//       response.answer = result.answer || 'No relevant information found in this document.';
//     }

//     res.json(response);

//     // After sending response, log Q&A session to GCS (async, don't block response)
//     try {
//       const logData = {
//         timestamp: new Date().toISOString(),
//         question: question,
//         answer: result.answer,
//         documentId: documentId,
//         sources: result.sources,
//       };

//       const logFileName = generateLogFileName(documentId);
//       await uploadLogToOutputBucket(logData, logFileName);
//       console.log(`Q&A session logged to GCS: ${logFileName}`);
//     } catch (logError) {
//       console.error('Failed to log Q&A session to GCS:', logError);
//     }
//   } catch (error) {
//     console.error('Non-streaming error:', error);
//     res.status(500).json({
//       error: 'Failed to generate answer',
//       message: error.message,
//     });
//   }
// }

// export default router;





import express from 'express';
import { generateAnswer, generateAnswerStream } from '../services/rag_service.js';
import { query } from '../db/index.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/ask
 * Ask a question about a document (non-streaming)
 */
router.post('/', async (req, res) => {
  try {
    const { documentId, question, chatId, intent } = req.body;
    const userId = req.user.id;

    if (!documentId || !question) {
      return res.status(400).json({ 
        error: 'Document ID and question are required' 
      });
    }

    console.log(`\n📝 Question received: "${question}"`);
    console.log(`   Document: ${documentId}`);
    console.log(`   Intent: ${intent || 'auto-detect'}`);

    // Generate answer using RAG
    const result = await generateAnswer(question, documentId, intent);

    // Create or get chat
    let currentChatId = chatId;
    if (!currentChatId) {
      // Create new chat
      const chatResult = await query(
        `INSERT INTO chats (user_id, document_id, title) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        [userId, documentId, question.substring(0, 50) + (question.length > 50 ? '...' : '')]
      );
      currentChatId = chatResult.rows[0].id;
    }

    // Save user message
    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content) 
       VALUES ($1, $2, 'user', $3)`,
      [currentChatId, documentId, question]
    );

    // Save AI response - handle both table and text
    const aiContent = result.answer_type === 'table' 
      ? JSON.stringify({ answer_type: 'table', table: result.table })
      : result.answer;

    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content) 
       VALUES ($1, $2, 'ai', $3)`,
      [currentChatId, documentId, aiContent]
    );

    // Update chat timestamp
    await query(
      `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [currentChatId]
    );

    // Return response
    res.json({
      answer: result.answer || '',
      answer_type: result.answer_type || 'text',
      table: result.table || null,
      sources: result.sources || [],
      chatId: currentChatId,
    });

  } catch (error) {
    console.error('Error processing question:', error);
    res.status(500).json({ 
      error: 'Failed to process question',
      message: error.message 
    });
  }
});

/**
 * POST /api/ask/stream
 * Ask a question with streaming response (Server-Sent Events)
 * CRITICAL: Properly handles both table and text responses
 */
router.post('/stream', async (req, res) => {
  try {
    const { documentId, question, chatId, intent } = req.body;
    const userId = req.user.id;

    if (!documentId || !question) {
      return res.status(400).json({ 
        error: 'Document ID and question are required' 
      });
    }

    console.log(`\n📝 Streaming question: "${question}"`);
    console.log(`   Document: ${documentId}`);
    console.log(`   Intent: ${intent || 'auto-detect'}`);

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    // Create or get chat
    let currentChatId = chatId;
    if (!currentChatId) {
      const chatResult = await query(
        `INSERT INTO chats (user_id, document_id, title) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        [userId, documentId, question.substring(0, 50) + (question.length > 50 ? '...' : '')]
      );
      currentChatId = chatResult.rows[0].id;
      
      // Send chat ID to client
      res.write(`data: ${JSON.stringify({ type: 'chatId', chatId: currentChatId })}\n\n`);
    }

    // Save user message
    await query(
      `INSERT INTO chat_history (chat_id, document_id, role, content) 
       VALUES ($1, $2, 'user', $3)`,
      [currentChatId, documentId, question]
    );

    // Generate answer using streaming RAG
    const generator = generateAnswerStream(question, documentId, intent);
    
    let accumulatedText = '';
    let finalResult = null;

    try {
      // Iterate through the async generator manually to capture return value
      // The for-await loop doesn't capture the return value, so we use manual iteration
      while (true) {
        const { done, value } = await generator.next();
        
        if (done) {
          // Generator finished - value contains the return value (sources, answer_type, etc.)
          if (value && typeof value === 'object') {
            finalResult = value;
          }
          break;
        }
        
        // Process yielded value (text chunks)
        if (typeof value === 'string') {
          accumulatedText += value;
          // Split large chunks into smaller pieces for smoother streaming effect
          // If chunk is large (>50 chars), split by sentences; otherwise send as-is
          if (value.length > 50) {
            // Split by sentence boundaries (period, exclamation, question mark followed by space)
            const sentences = value.split(/([.!?]\s+)/);
            for (let i = 0; i < sentences.length; i++) {
              const sentence = sentences[i];
              if (sentence.trim()) {
                // Send each sentence as a separate chunk for visible streaming
                res.write(`data: ${JSON.stringify({ type: 'chunk', content: sentence })}\n\n`);
              }
            }
          } else {
            // Small chunks: send directly
            res.write(`data: ${JSON.stringify({ type: 'chunk', content: value })}\n\n`);
          }
        } else if (value && typeof value === 'object') {
          // Object yielded (might be intermediate result)
          finalResult = value;
        }
      }

    } catch (streamError) {
      console.error('Streaming error:', streamError);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: streamError.message 
      })}\n\n`);
    }

    // Handle the final result
    if (finalResult) {
      console.log(`\n📊 Final result type: ${finalResult.answer_type || 'text'}`);
      
      // CRITICAL: Handle table responses properly
      if (finalResult.answer_type === 'table' && finalResult.table) {
        console.log(`   Table: ${finalResult.table.columns?.length || 0} columns, ${finalResult.table.rows?.length || 0} rows`);
        
        // Send sources first
        if (finalResult.sources && finalResult.sources.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'sources', 
            sources: finalResult.sources 
          })}\n\n`);
        }

        // Send complete table response
        res.write(`data: ${JSON.stringify({ 
          type: 'complete',
          answer_type: 'table',
          table: finalResult.table,
          answer: finalResult.answer || ''
        })}\n\n`);

        // Save table response to chat history
        const tableContent = JSON.stringify({ 
          answer_type: 'table', 
          table: finalResult.table 
        });
        await query(
          `INSERT INTO chat_history (chat_id, document_id, role, content) 
           VALUES ($1, $2, 'ai', $3)`,
          [currentChatId, documentId, tableContent]
        );

      } else {
        // Text response
        console.log(`   Text length: ${accumulatedText.length} chars`);
        
        // Send sources
        if (finalResult.sources && finalResult.sources.length > 0) {
          res.write(`data: ${JSON.stringify({ 
            type: 'sources', 
            sources: finalResult.sources 
          })}\n\n`);
        }

        // Send completion signal with accumulated text
        res.write(`data: ${JSON.stringify({ 
          type: 'complete',
          answer_type: 'text',
          answer: accumulatedText || ''
        })}\n\n`);

        // Save text response to chat history
        await query(
          `INSERT INTO chat_history (chat_id, document_id, role, content) 
           VALUES ($1, $2, 'ai', $3)`,
          [currentChatId, documentId, accumulatedText || 'No response generated.']
        );
      }
    } else {
      // No final result - just text was streamed
      res.write(`data: ${JSON.stringify({ 
        type: 'complete',
        answer_type: 'text',
        answer: accumulatedText || ''
      })}\n\n`);

      // Save accumulated text
      if (accumulatedText) {
        await query(
          `INSERT INTO chat_history (chat_id, document_id, role, content) 
           VALUES ($1, $2, 'ai', $3)`,
          [currentChatId, documentId, accumulatedText]
        );
      }
    }

    // Update chat timestamp
    await query(
      `UPDATE chats SET updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [currentChatId]
    );

    // End the stream
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();

  } catch (error) {
    console.error('Error in streaming endpoint:', error);
    
    // If headers haven't been sent, send error as JSON
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to process question',
        message: error.message 
      });
    } else {
      // Headers sent, send error as SSE
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        error: error.message 
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * GET /api/ask/history/:chatId
 * Get chat history for a specific chat
 */
router.get('/history/:chatId', async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    // Verify chat belongs to user
    const chatCheck = await query(
      `SELECT id FROM chats WHERE id = $1 AND user_id = $2`,
      [chatId, userId]
    );

    if (chatCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Chat not found' });
    }

    // Get messages
    const result = await query(
      `SELECT id, role, content, created_at
       FROM chat_history
       WHERE chat_id = $1
       ORDER BY created_at ASC`,
      [chatId]
    );

    // Parse table content in messages
    const messages = result.rows.map(msg => {
      let parsedContent = msg.content;
      let answerType = 'text';
      let table = null;

      // Try to parse JSON content (table responses)
      if (msg.role === 'ai' && msg.content.startsWith('{')) {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.answer_type === 'table' && parsed.table) {
            answerType = 'table';
            table = parsed.table;
            parsedContent = ''; // Table responses don't have text content
          }
        } catch (e) {
          // Not JSON, keep as text
        }
      }

      return {
        id: msg.id,
        role: msg.role,
        content: parsedContent,
        answer_type: answerType,
        table: table,
        createdAt: msg.created_at,
      };
    });

    res.json({ messages });

  } catch (error) {
    console.error('Error fetching chat history:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

/**
 * POST /api/improve-text
 * Improve/enhance user's input text using Gemini
 */
router.post('/improve-text', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `Improve and enhance the following question or query to make it clearer, more specific, and better suited for document analysis. Keep the original intent and meaning, but make it more professional and effective. Only return the improved text, no explanations:

Original: ${text}

Improved:`;

    const result = await model.generateContent(prompt);
    const improvedText = result.response.text().trim();

    res.json({ improvedText });

  } catch (error) {
    console.error('Error improving text:', error);
    res.status(500).json({ 
      error: 'Failed to improve text',
      message: error.message 
    });
  }
});

export default router;