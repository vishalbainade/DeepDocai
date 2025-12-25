import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jurinex-backend-120280829617.asia-south1.run.app';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle 401 errors (unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const register = async (userData) => {
  const response = await api.post('/api/auth/register', userData);
  return response.data;
};

export const verifyOTP = async (email, otp) => {
  const response = await api.post('/api/auth/verify-otp', { email, otp });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Store if this is a new user (first login after registration)
    if (response.data.isNewUser !== undefined) {
      localStorage.setItem('isNewUser', JSON.stringify(response.data.isNewUser));
    }
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await api.post('/api/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    // Store if this is a new user (first login)
    if (response.data.isNewUser !== undefined) {
      localStorage.setItem('isNewUser', JSON.stringify(response.data.isNewUser));
    }
  }
  return response.data;
};

export const forgotPassword = async (email, personalDetails = null) => {
  const response = await api.post('/api/auth/forgot-password', {
    email,
    ...personalDetails,
  });
  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await api.post('/api/auth/reset-password', {
    email,
    otp,
    newPassword,
  });
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const getUser = () => {
  const userStr = localStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Get signed URL for uploading a PDF document
 * @param {string} fileName - Name of the file to upload
 * @returns {Promise<{documentId: string, uploadUrl: string, fileName: string}>}
 */
export const getSignedUploadUrl = async (fileName) => {
  const response = await api.get('/api/upload/signed-url', {
    params: { fileName },
  });
  return response.data;
};

/**
 * Upload file directly to GCS using signed URL with progress tracking
 * @param {File} file - PDF file to upload
 * @param {string} uploadUrl - Signed URL from backend
 * @param {Function} onProgress - Progress callback (progress: number 0-100)
 * @returns {Promise<void>}
 */
export const uploadToGCS = async (file, uploadUrl, onProgress) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const percentComplete = Math.round((e.loaded / e.total) * 100);
        onProgress(percentComplete);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Failed to upload to GCS: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.send(file);
  });
};

/**
 * Process uploaded document (trigger OCR and embedding generation)
 * @param {string} documentId - Document ID
 * @param {string} fileName - Original file name
 * @param {string} gcsFileName - GCS file name
 * @returns {Promise<{documentId: string, fileName: string, chunksCount: number}>}
 */
export const processDocument = async (documentId, fileName, gcsFileName) => {
  const response = await api.post('/api/upload/process', {
    documentId,
    fileName,
    gcsFileName,
  });
  return response.data;
};

/**
 * Upload a PDF document (complete flow: get signed URL, upload to GCS, process)
 * @param {File} file - PDF file to upload
 * @param {Function} onProgress - Progress callback (progress: number 0-100, stage: string)
 * @returns {Promise<{documentId: string, fileName: string, chunksCount: number}>}
 */
export const uploadDocument = async (file, onProgress) => {
  try {
    // Step 1: Get signed URL (10% progress)
    if (onProgress) onProgress(10, 'Preparing upload...');
    const signedUrlData = await getSignedUploadUrl(file.name);
    
    // Step 2: Upload file directly to GCS (10-80% progress)
    if (onProgress) onProgress(15, 'Uploading file...');
    await uploadToGCS(file, signedUrlData.uploadUrl, (uploadProgress) => {
      // Map upload progress from 15% to 80%
      const mappedProgress = 15 + Math.round((uploadProgress / 100) * 65);
      if (onProgress) onProgress(mappedProgress, 'Uploading file...');
    });
    
    // Step 3: Trigger processing (OCR, chunking, embeddings) (80-100% progress)
    if (onProgress) onProgress(85, 'Processing document...');
    const result = await processDocument(
      signedUrlData.documentId,
      file.name,
      signedUrlData.fileName
    );
    
    if (onProgress) onProgress(100, 'Complete!');
    return result;
  } catch (error) {
    if (onProgress) onProgress(0, 'Error');
    throw error;
  }
};

/**
 * Get document preview URL
 * @param {string} documentId - Document ID
 * @returns {Promise<{previewUrl: string, fileName: string}>}
 */
export const getDocumentPreview = async (documentId) => {
  const response = await api.get(`/api/upload/preview/${documentId}`);
  return response.data;
};

/**
 * Ask a question about a document (non-streaming, backward compatibility)
 * @param {string} documentId - Document ID
 * @param {string} question - Question to ask
 * @param {string|null} chatId - Optional chat ID to continue conversation
 * @param {string|null} intent - Query intent: 'table', 'summary', or null (auto-detect)
 * @returns {Promise<{answer: string, sources: Array, documentId: string, chatId: string}>}
 */
export const askQuestion = async (documentId, question, chatId = null, intent = null) => {
  const response = await api.post('/api/ask', {
    documentId,
    question,
    chatId: chatId || null,
    intent: intent || null, // Send intent for table-aware retrieval
  });

  return response.data;
};

/**
 * Ask a question about a document with streaming support
 * Uses ReadableStream to read Server-Sent Events (SSE)
 * @param {string} documentId - Document ID
 * @param {string} question - Question to ask
 * @param {string|null} chatId - Optional chat ID to continue conversation
 * @param {Function} onChunk - Callback for each text chunk: (chunk: string) => void
 * @param {Function} onSources - Callback when sources are received: (sources: Array) => void
 * @param {Function} onChatId - Optional callback when chatId is received: (chatId: string) => void
 * @param {Function} onError - Callback for errors: (error: Error) => void
 * @param {Function} onComplete - Optional callback when complete response is received: (data: {answer_type, table, answer}) => void
 * @param {string|null} intent - Query intent: 'table', 'summary', or null (auto-detect)
 * @returns {Promise<void>}
 */


// export const askQuestionStream = async (
//   documentId,
//   question,
//   chatId,
//   onChunk,
//   onSources,
//   onChatId,
//   onError,
//   onComplete,
//   intent = null
// ) => {
//   const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jurinex-backend-120280829617.asia-south1.run.app';
//   const token = getToken();

//   const safeCall = (fn, ...args) => {
//     try {
//       if (typeof fn === 'function') fn(...args);
//     } catch (e) {
//       console.error('Callback error:', e);
//     }
//   };

//   // Parse SSE blocks separated by a blank line (supports \n\n and \r\n\r\n)
//   const parseSSEBlocks = (text) => {
//     const blocks = text.split(/\r?\n\r?\n/);
//     const remainder = blocks.pop() ?? '';
//     return { blocks, remainder };
//   };

//   const parseSSEBlock = (block) => {
//     const lines = block.split(/\r?\n/);
//     let eventType = 'message';
//     const dataLines = [];

//     for (const line of lines) {
//       if (line.startsWith('event:')) {
//         eventType = line.slice('event:'.length).trim() || 'message';
//       } else if (line.startsWith('data:')) {
//         // supports "data:" and "data: "
//         dataLines.push(line.slice('data:'.length).trim());
//       }
//       // ignore id:, retry:, etc.
//     }

//     const data = dataLines.join('\n').trim();
//     return { eventType, data };
//   };

//   try {
//     const headers = {
//       'Content-Type': 'application/json',
//       'Accept': 'text/event-stream',
//     };

//     if (token) headers['Authorization'] = `Bearer ${token}`;

//     const response = await fetch(`${API_BASE_URL}/api/ask/stream`, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify({
//         documentId,
//         question,
//         chatId: chatId || null,
//         intent: intent || null,
//       }),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP error! status: ${response.status}`);
//     }

//     if (!response.body) {
//       throw new Error('Streaming not supported by browser');
//     }

//     const reader = response.body.getReader();
//     const decoder = new TextDecoder();

//     let buffer = '';
//     let streamEnded = false;

//     try {
//       while (true) {
//         const { done, value } = await reader.read();
//         if (done) break;

//         buffer += decoder.decode(value, { stream: true });

//         const { blocks, remainder } = parseSSEBlocks(buffer);
//         buffer = remainder;

//         for (const block of blocks) {
//           if (!block.trim()) continue;

//           const { eventType, data } = parseSSEBlock(block);

//           if (eventType === 'start') continue;

//           if (eventType === 'end') {
//             streamEnded = true;
//             break;
//           }

//           if (eventType === 'error') {
//             // try parse JSON error
//             try {
//               const errObj = JSON.parse(data || '{}');
//               const msg = errObj.error || errObj.details || 'Streaming error';
//               safeCall(onError, new Error(msg));
//             } catch {
//               safeCall(onError, new Error(data || 'Streaming error'));
//             }
//             return;
//           }

//           // Normal message: try JSON, else treat as chunk
//           if (!data) continue;

//           try {
//             const parsed = JSON.parse(data);

//             if (parsed.type === 'chunk') {
//               safeCall(onChunk, parsed.content ?? '');
//             } else if (parsed.type === 'sources') {
//               safeCall(onSources, parsed.sources || []);
//             } else if (parsed.type === 'chatId') {
//               safeCall(onChatId, parsed.chatId);
//             } else if (parsed.type === 'complete') {
//               safeCall(onComplete, {
//                 answer_type: parsed.answer_type || 'text',
//                 table: parsed.table,
//                 answer: parsed.answer,
//               });
//             } else {
//               // unknown JSON: show something instead of silence
//               safeCall(onChunk, data);
//             }
//           } catch {
//             // plain text fallback
//             safeCall(onChunk, data);
//           }
//         }

//         if (streamEnded) break;
//       }

//       // Flush leftover buffer if it contains a final SSE block without trailing blank line
//       if (buffer.trim()) {
//         const { eventType, data } = parseSSEBlock(buffer);
//         if (eventType === 'error') {
//           safeCall(onError, new Error(data || 'Streaming error'));
//           return;
//         }
//         if (data) {
//           try {
//             const parsed = JSON.parse(data);
//             if (parsed.type === 'chunk') safeCall(onChunk, parsed.content ?? '');
//             if (parsed.type === 'sources') safeCall(onSources, parsed.sources || []);
//             if (parsed.type === 'chatId') safeCall(onChatId, parsed.chatId);
//             if (parsed.type === 'complete') {
//               safeCall(onComplete, {
//                 answer_type: parsed.answer_type || 'text',
//                 table: parsed.table,
//                 answer: parsed.answer,
//               });
//             }
//           } catch {
//             safeCall(onChunk, data);
//           }
//         }
//       }
//     } finally {
//       reader.releaseLock();
//     }
//   } catch (error) {
//     console.error('Streaming error:', error);
//     safeCall(onError, error);
//   }
// };

/////////////////////////////////////////////////////////////


export const askQuestionStream = async (
  documentId,
  question,
  chatId,
  onChunk,
  onSources,
  onChatId,
  onError,
  onComplete,
  intent = null
) => {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://jurinex-backend-120280829617.asia-south1.run.app';
  const token = getToken();

  const safeCall = (fn, ...args) => {
    try {
      if (typeof fn === 'function') fn(...args);
    } catch (e) {
      console.error('Callback error:', e);
    }
  };

  // Split SSE blocks by blank line (supports \n\n and \r\n\r\n)
  const parseSSEBlocks = (text) => {
    const blocks = text.split(/\r?\n\r?\n/);
    const remainder = blocks.pop() ?? '';
    return { blocks, remainder };
  };

  const parseSSEBlock = (block) => {
    const lines = block.split(/\r?\n/);
    let eventType = 'message';
    const dataLines = [];

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice('event:'.length).trim() || 'message';
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice('data:'.length).trim()); // supports "data:" and "data: "
      }
    }

    const data = dataLines.join('\n').trim();
    return { eventType, data };
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}/api/ask/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        documentId,
        question,
        chatId: chatId || null,
        intent: intent || null,
      }),
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    if (!response.body) throw new Error('Streaming not supported by browser');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let streamEnded = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const { blocks, remainder } = parseSSEBlocks(buffer);
        buffer = remainder;

        for (const block of blocks) {
          if (!block.trim()) continue;

          const { eventType, data } = parseSSEBlock(block);

          if (eventType === 'start') continue;
          if (eventType === 'end') {
            streamEnded = true;
            break;
          }
          if (eventType === 'error') {
            try {
              const errObj = JSON.parse(data || '{}');
              safeCall(onError, new Error(errObj.error || errObj.details || 'Streaming error'));
            } catch {
              safeCall(onError, new Error(data || 'Streaming error'));
            }
            return;
          }

          if (!data) continue;

          // ✅ MAIN FIX: support BOTH styles
          // Style A: event: message + {type:"complete"}
          // Style B: event: complete + {answer_type:"table", table:{...}}
          try {
            const parsed = JSON.parse(data);

            // If backend uses "type" field (old style)
            if (parsed && parsed.type) {
              if (parsed.type === 'chunk') safeCall(onChunk, parsed.content ?? '');
              else if (parsed.type === 'sources') safeCall(onSources, parsed.sources || []);
              else if (parsed.type === 'chatId') safeCall(onChatId, parsed.chatId);
              else if (parsed.type === 'complete') {
                safeCall(onComplete, {
                  answer_type: parsed.answer_type || 'text',
                  table: parsed.table,
                  answer: parsed.answer,
                });
              }
              continue;
            }

            // ✅ If backend uses SSE event types (new style)
            if (eventType === 'complete') {
              safeCall(onComplete, {
                answer_type: parsed.answer_type || 'text',
                table: parsed.table,
                answer: parsed.answer,
              });
              continue;
            }

            if (eventType === 'sources') {
              safeCall(onSources, parsed.sources || []);
              continue;
            }

            if (eventType === 'chatId') {
              safeCall(onChatId, parsed.chatId || parsed.id);
              continue;
            }

            // If nothing matched, show something instead of silence
            safeCall(onChunk, parsed.content ?? parsed.answer ?? data);
          } catch {
            // plain text fallback
            safeCall(onChunk, data);
          }
        }

        if (streamEnded) break;
      }

      // Flush leftover buffer (in case last SSE block has no trailing blank line)
      if (buffer.trim()) {
        const { eventType, data } = parseSSEBlock(buffer);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (eventType === 'complete') {
              safeCall(onComplete, {
                answer_type: parsed.answer_type || 'text',
                table: parsed.table,
                answer: parsed.answer,
              });
            } else if (parsed.type === 'complete') {
              safeCall(onComplete, {
                answer_type: parsed.answer_type || 'text',
                table: parsed.table,
                answer: parsed.answer,
              });
            } else if (parsed.type === 'sources') {
              safeCall(onSources, parsed.sources || []);
            } else if (parsed.type === 'chunk') {
              safeCall(onChunk, parsed.content ?? '');
            } else {
              safeCall(onChunk, data);
            }
          } catch {
            safeCall(onChunk, data);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('Streaming error:', error);
    safeCall(onError, error);
  }
};


/**
 * Get all uploaded documents
 * @returns {Promise<{documents: Array}>}
 */
export const getDocuments = async () => {
  const response = await api.get('/api/history/documents');
  return response.data;
};

/**
 * Get chat history for a document
 * @param {string} documentId - Document ID
 * @returns {Promise<{messages: Array, documentId: string, fileName: string}>}
 */
export const getChatHistory = async (documentId) => {
  const response = await api.get(`/api/history/chat/${documentId}`);
  return response.data;
};

/**
 * Create a new chat conversation
 * @param {string} documentId - Document ID
 * @returns {Promise<{chat: Object}>}
 */
export const createChat = async (documentId) => {
  const response = await api.post('/api/chats', { documentId });
  return response.data;
};

/**
 * Get all chats for the current user
 * @returns {Promise<{chats: Array}>}
 */
export const getChats = async () => {
  const response = await api.get('/api/chats');
  return response.data;
};

/**
 * Get messages for a specific chat
 * @param {string} chatId - Chat ID
 * @returns {Promise<{chat: Object, messages: Array}>}
 */
export const getChatMessages = async (chatId) => {
  const response = await api.get(`/api/chats/${chatId}/messages`);
  return response.data;
};

/**
 * Rename a chat conversation
 * @param {string} chatId - Chat ID
 * @param {string} title - New title
 * @returns {Promise<{chat: Object}>}
 */
export const renameChat = async (chatId, title) => {
  const response = await api.patch(`/api/chats/${chatId}`, { title });
  return response.data;
};

/**
 * Delete a chat conversation
 * @param {string} chatId - Chat ID
 * @returns {Promise<{success: boolean}>}
 */
export const deleteChat = async (chatId) => {
  const response = await api.delete(`/api/chats/${chatId}`);
  return response.data;
};

/**
 * Diagnose table format issues for a question and document
 * Returns detailed diagnostics about the RAG pipeline
 * @param {string} question - User's question
 * @param {string} documentId - Document ID
 * @returns {Promise<{success: boolean, diagnostics: Object}>}
 */
export const diagnoseTableFormat = async (question, documentId) => {
  const response = await api.post('/api/diagnostics/table-format', {
    question,
    documentId,
  });
  return response.data;
};

export default api;
