import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import UploadZone from './UploadZone';
import PDFViewer from './PDFViewer';
import ChatPanel from './ChatPanel';
import { uploadDocument, askQuestion, askQuestionStream, getChatMessages, getDocumentPreview } from '../services/api';
import { detectQueryIntent } from '../utils/intentDetection';

const Workspace = () => {
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [showUploadZone, setShowUploadZone] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [chatListRefreshTrigger, setChatListRefreshTrigger] = useState(0);

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      // Upload document (gets signed URL, uploads to GCS, processes with Tesseract)
      const result = await uploadDocument(file);
      setCurrentDocumentId(result.documentId);
      setCurrentFileName(result.fileName);
      
      // Get preview URL from GCS
      try {
        const previewData = await getDocumentPreview(result.documentId);
        setPdfUrl(previewData.previewUrl);
      } catch (previewError) {
        console.error('Error getting preview URL:', previewError);
        // Fallback: use object URL temporarily
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
      
      setShowUploadZone(false);
      
      // Clear previous chat history and current chat
      setChatHistory([]);
      setCurrentChatId(null);
      
      console.log('Document uploaded and processed:', result);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectChat = async (chat) => {
    if (!chat) {
      // New chat - clear history
      setCurrentChatId(null);
      setChatHistory([]);
      return;
    }

    setCurrentChatId(chat.id);
    setCurrentDocumentId(chat.documentId);
    setShowUploadZone(false);

    // Load chat messages
    try {
      const result = await getChatMessages(chat.id);
      // Ensure all messages have stable IDs for proper React key handling
      // Add safety checks to prevent crashes if data is malformed
      const formattedMessages = (result?.messages || []).map((msg, index) => {
        // Normalize role to lowercase to ensure consistent matching
        const normalizedRole = (msg?.role || 'user').toLowerCase();
        return {
          id: msg?.id || `${normalizedRole}-${index}-${msg?.createdAt || Date.now()}`, // Use DB id or generate stable id
          role: normalizedRole, // Ensure role is lowercase: 'user' or 'ai'
          content: msg?.content || '',
          createdAt: msg?.createdAt || new Date().toISOString(),
        };
      });
      setChatHistory(formattedMessages);

      // Load document preview
      try {
        const previewData = await getDocumentPreview(chat.documentId);
        setPdfUrl(previewData.previewUrl);
        setCurrentFileName(previewData.fileName);
      } catch (previewError) {
        console.error('Error loading document preview:', previewError);
      }
    } catch (error) {
      console.error('Error loading chat messages:', error);
      alert('Failed to load chat. Please try again.');
    }
  };

  const handleSendMessage = async (message) => {
    if (!currentDocumentId) return;

    // Add user message to chat immediately (optimistic UI)
    // Give user message a stable ID to prevent it from disappearing during updates
    const userMessageId = `user-${Date.now()}-${Math.random()}`;
    const userMessage = { 
      id: userMessageId,
      role: 'user', // Ensure role is exactly 'user' (lowercase)
      content: message || '', // Ensure content is never undefined
      createdAt: new Date().toISOString() 
    };
    // Append user message - preserve all existing messages
    setChatHistory((prev) => [...prev, userMessage]);
    
    // Create empty AI message bubble for streaming
    const aiMessageId = Date.now(); // Use timestamp as unique ID
    const initialAiMessage = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      isStreaming: true,
      sources: null,
      createdAt: new Date().toISOString(),
    };
    setChatHistory((prev) => [...prev, initialAiMessage]);
    setIsThinking(true);

    // Store chatId from response for future messages
    let responseChatId = currentChatId;

    // Detect query intent for table-aware retrieval
    const intent = detectQueryIntent(message);
    console.log(`Query intent detected: ${intent || 'auto-detect'}`);

    try {
      let accumulatedContent = '';
      let finalSources = null;
      let streamingFailed = false;

      // Use streaming API with fallback to non-streaming
      try {
        await askQuestionStream(
          currentDocumentId,
          message,
          currentChatId, // Pass chatId to maintain conversation
          // onChunk: Append each chunk to the message
          // CRITICAL: Skip text accumulation for table queries (tables return complete, not streamed)
          (chunk) => {
            // Only accumulate text for non-table responses
            // Table responses are handled in onComplete callback
            accumulatedContent += chunk;
            // Update ONLY the AI message with accumulated content
            // Preserve all other messages (including user messages) by using map correctly
            setChatHistory((prev) =>
              prev.map((msg) => {
                // Only update the specific AI message being streamed
                // Skip if message already has table data (table queries don't stream text)
                if (msg.id === aiMessageId && !(msg.answer_type === 'table' && msg.table)) {
                  return { ...msg, content: accumulatedContent, isStreaming: true };
                }
                // Return all other messages unchanged (including user messages)
                return msg;
              })
            );
          },
          // onSources: Store sources when received
          (sources) => {
            finalSources = sources;
            // Update ONLY the AI message with sources but keep streaming flag
            // Preserve all other messages unchanged
            setChatHistory((prev) =>
              prev.map((msg) => {
                if (msg.id === aiMessageId) {
                  return { ...msg, sources: sources, isStreaming: true };
                }
                return msg; // Preserve all other messages
              })
            );
          },
          // onChatId: Update current chat ID if we don't have one
          (chatId) => {
            if (!responseChatId && chatId) {
              responseChatId = chatId;
              setCurrentChatId(chatId);
            }
          },
          // onError: Handle streaming errors - show error message (don't fallback to avoid double API calls)
          async (error) => {
            console.error('Streaming error:', error);
            streamingFailed = true;
            
            // Extract error message from error object
            let errorMessage = 'Sorry, I encountered an error while processing your question. Please try again.';
            if (error.message) {
              // Check if it's a network/API error that won't be fixed by retry
              if (error.message.includes('embedding') || error.message.includes('fetch failed') || error.message.includes('network')) {
                errorMessage = 'Unable to connect to the AI service. Please check your internet connection and API configuration, then try again.';
              } else {
                errorMessage = error.message;
              }
            }
            
            // Update ONLY the AI message with error
            // Preserve all other messages (including user messages)
            setChatHistory((prev) =>
              prev.map((msg) => {
                if (msg.id === aiMessageId) {
                  return {
                    ...msg,
                    content: errorMessage,
                    isStreaming: false,
                  };
                }
                return msg; // Preserve all other messages
              })
            );
            setIsThinking(false);
          },
          // onComplete: Handle complete response (for both table and text data)
          (completeData) => {
            if (completeData) {
              setChatHistory((prev) =>
                prev.map((msg) => {
                  if (msg.id === aiMessageId) {
                    // Handle table responses
                    if (completeData.answer_type === 'table' && completeData.table) {
                      return {
                        ...msg,
                        answer_type: 'table',
                        table: completeData.table,
                        answer: completeData.answer || '',
                        isStreaming: false,
                      };
                    }
                    // Handle text responses - use answer from complete event or accumulated content
                    else if (completeData.answer_type === 'text') {
                      // Use answer from complete event (backend sends full text), or fallback to accumulated
                      const finalContent = completeData.answer || accumulatedContent || '';
                      return {
                        ...msg,
                        content: finalContent,
                        answer_type: 'text',
                        isStreaming: false,
                      };
                    }
                    // Fallback: use accumulated content or answer field
                    return {
                      ...msg,
                      content: completeData.answer || accumulatedContent || '',
                      isStreaming: false,
                    };
                  }
                  return msg;
                })
              );
            }
          },
          intent // Pass intent for table-aware retrieval
        );

        // Streaming completed successfully: mark message as no longer streaming
        // CRITICAL: Preserve data if it was already set by onComplete callback
        // Only update isStreaming and sources if not already finalized
        if (!streamingFailed) {
          setChatHistory((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                // If message already has table data, preserve it
                if (msg.answer_type === 'table' && msg.table) {
                  return {
                    ...msg,
                    isStreaming: false,
                    sources: finalSources || msg.sources,
                  };
                }
                // If message already has content (set by onComplete or chunks), preserve it
                // Only use accumulatedContent if msg.content is empty
                const finalContent = msg.content || accumulatedContent || '';
                return {
                  ...msg,
                  content: finalContent,
                  isStreaming: false,
                  sources: finalSources || msg.sources,
                };
              }
              return msg; // Preserve all other messages
            })
          );
          // Trigger chat list refresh to update timestamps
          setChatListRefreshTrigger(prev => prev + 1);
        }
      } catch (streamError) {
        // If streaming setup fails, try non-streaming
        console.error('Streaming setup failed, using non-streaming:', streamError);
        try {
          const result = await askQuestion(currentDocumentId, message, currentChatId, intent);
          if (result.chatId && !responseChatId) {
            responseChatId = result.chatId;
            setCurrentChatId(result.chatId);
          }
          
          // Update ONLY the AI message with complete response
          // CRITICAL: Handle table responses vs text responses differently
          // Preserve all other messages (including user messages)
          setChatHistory((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                // If result is a table response, store table data with empty content
                if (result.answer_type === 'table' && result.table) {
                  return {
                    ...msg,
                    answer_type: 'table',
                    table: result.table,
                    answer: result.answer || '',
                    content: '', // Empty content so ChatPanel shows table
                    sources: result.sources,
                    isStreaming: false,
                  };
                }
                // Otherwise, store as text response
                return {
                  ...msg,
                  content: result.answer || '',
                  sources: result.sources,
                  isStreaming: false,
                };
              }
              return msg; // Preserve all other messages
            })
          );
          // Trigger chat list refresh to update timestamps
          setChatListRefreshTrigger(prev => prev + 1);
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          // Update ONLY the AI message with error
          // Preserve all other messages (including user messages)
          setChatHistory((prev) =>
            prev.map((msg) => {
              if (msg.id === aiMessageId) {
                return {
                  ...msg,
                  content: 'Sorry, I encountered an error while processing your question. Please try again.',
                  isStreaming: false,
                };
              }
              return msg; // Preserve all other messages
            })
          );
        }
      }
    } catch (error) {
      console.error('Ask error:', error);
      // Update ONLY the AI message with error
      // Preserve all other messages (including user messages)
      setChatHistory((prev) =>
        prev.map((msg) => {
          if (msg.id === aiMessageId) {
            return {
              ...msg,
              content: 'Sorry, I encountered an error while processing your question. Please try again.',
              isStreaming: false,
            };
          }
          return msg; // Preserve all other messages
        })
      );
    } finally {
      setIsThinking(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentDocumentId) return;
    handleSendMessage('Please provide a comprehensive summary of this document.');
  };

  const handleUploadNew = () => {
    setShowUploadZone(true);
    setCurrentDocumentId(null);
    setCurrentChatId(null);
    setPdfUrl(null);
    setChatHistory([]);
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar 
        onUploadClick={handleUploadNew} 
        onMenuClick={() => setDrawerOpen(!drawerOpen)}
      />
      
      {/* Chat History Drawer */}
      <ChatHistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentChatId={currentChatId}
        currentDocumentId={currentDocumentId}
        onSelectChat={handleSelectChat}
        refreshTrigger={chatListRefreshTrigger}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - PDF Viewer / Upload Zone */}
        <div className="w-1/2 border-r border-gray-200 overflow-hidden">
          {showUploadZone || !pdfUrl ? (
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
          ) : (
            <PDFViewer fileUrl={pdfUrl} />
          )}
        </div>

        {/* Right Panel - Chat Interface */}
        <div className="w-1/2 overflow-hidden">
          <ChatPanel
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            onSummarize={handleSummarize}
            isThinking={isThinking}
            currentDocumentId={currentDocumentId}
          />
        </div>
      </div>
    </div>
  );
};

export default Workspace;

