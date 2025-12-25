import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import ChatPanel from './ChatPanel';
import PDFViewer from './PDFViewer';
import UploadZone from './UploadZone';
import { askQuestion, askQuestionStream, getDocumentPreview, uploadDocument } from '../services/api';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const {
    currentChatId,
    currentDocumentId,
    chatHistory,
    loading,
    loadChatMessages,
    addMessage,
    updateMessage,
    refreshChats,
    setCurrentChatId,
    setCurrentDocumentId,
    setChatHistory,
  } = useChat();

  const [pdfUrl, setPdfUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50); // Percentage
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  // Load chat messages when chatId changes
  useEffect(() => {
    if (chatId) {
      // Reset PDF URL when switching chats to ensure document reloads
      setPdfUrl(null);
      setShowUploadZone(false);
      
      loadChatMessages(chatId)
        .then(() => {
          // Document will be loaded in the next useEffect
        })
        .catch((error) => {
          console.error('Error loading chat:', error);
          navigate('/');
        });
    }
  }, [chatId]);

  // Load document preview when currentDocumentId is available
  useEffect(() => {
    if (currentDocumentId) {
      // Always reload document when currentDocumentId changes (e.g., when switching chats)
      loadDocumentPreview(currentDocumentId);
    } else {
      // If no document, show upload zone
      setPdfUrl(null);
      setShowUploadZone(true);
    }
  }, [currentDocumentId]);

  const loadDocumentPreview = async (documentId) => {
    if (!documentId) {
      setShowUploadZone(true);
      return;
    }
    
    try {
      const previewData = await getDocumentPreview(documentId);
      setPdfUrl(previewData.previewUrl);
      setCurrentFileName(previewData.fileName);
      setShowUploadZone(false);
    } catch (error) {
      console.error('Error loading document preview:', error);
      setPdfUrl(null);
      setShowUploadZone(true);
    }
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      setCurrentDocumentId(result.documentId);
      setCurrentFileName(result.fileName);
      
      try {
        const previewData = await getDocumentPreview(result.documentId);
        setPdfUrl(previewData.previewUrl);
      } catch (previewError) {
        console.error('Error getting preview URL:', previewError);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
      
      setShowUploadZone(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload document: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (message) => {
    if (!currentDocumentId) {
      alert('Please upload a document first');
      return;
    }

    // Add user message to chat immediately (optimistic UI)
    const userMessageId = `user-${Date.now()}-${Math.random()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: message || '',
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    // Create empty AI message bubble for streaming
    const aiMessageId = Date.now();
    const initialAiMessage = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      isStreaming: true,
      sources: null,
      createdAt: new Date().toISOString(),
    };
    addMessage(initialAiMessage);
    setIsThinking(true);

    let responseChatId = currentChatId || chatId;

//     try {
//       let accumulatedContent = '';
//       let finalSources = null;
//       let streamingFailed = false;
//       let finalTableData = null;
//       let finalAnswerType = 'text';

//       try {
//         await askQuestionStream(
//           currentDocumentId,
//           message,
//           responseChatId,
//           // onChunk
//           (chunk) => {
//             accumulatedContent += chunk;
//             updateMessage(aiMessageId, {
//               content: accumulatedContent,
//               isStreaming: true,
//             });
//           },
//           // onSources
//           (sources) => {
//             finalSources = sources;
//             updateMessage(aiMessageId, {
//               sources: sources,
//               isStreaming: true,
//             });
//           },
//           // onChatId
//           (newChatId) => {
//             if (!responseChatId && newChatId) {
//               responseChatId = newChatId;
//               setCurrentChatId(newChatId);
//               // Update URL if chat was just created
//               if (newChatId !== chatId) {
//                 navigate(`/chat/${newChatId}`, { replace: true });
//               }
//             }
//           },
//           // onError
//           async (error) => {
//             console.error('Streaming error:', error);
//             streamingFailed = true;
            
//             let errorMessage = 'Sorry, I encountered an error while processing your question. Please try again.';
//             if (error.message) {
//               if (error.message.includes('embedding') || error.message.includes('fetch failed') || error.message.includes('network')) {
//                 errorMessage = 'Unable to connect to the AI service. Please check your internet connection and API configuration, then try again.';
//               } else {
//                 errorMessage = error.message;
//               }
//             }
            
//             updateMessage(aiMessageId, {
//               content: errorMessage,
//               isStreaming: false,
//             });
//             setIsThinking(false);
//           },
//           // onComplete - handles final response with table or text data
//           (completeData) => {
//             if (completeData) {
//               if (completeData.answer_type === 'table' && completeData.table) {
//                 finalAnswerType = 'table';
//                 finalTableData = completeData.table;
//                 // Use the answer as fallback text if provided
//                 if (completeData.answer) {
//                   accumulatedContent = completeData.answer;
//                 }
//               } else if (completeData.answer_type === 'text' && completeData.answer) {
//                 // For text responses, update accumulated content
//                 finalAnswerType = 'text';
//                 accumulatedContent = completeData.answer;
//               }
//             }
//           }
//         );

// //////////////////////////////////////////////////////

// if (!streamingFailed) {
//   updateMessage(aiMessageId, (prevMessage) => {
//     // For table responses
//     if (finalAnswerType === 'table' && finalTableData) {
//       return {
//         ...prevMessage,
//         content: '', // Tables don't need text content
//         isStreaming: false,
//         sources: finalSources || prevMessage.sources || [],
//         answer_type: 'table',
//         table: finalTableData,
//       };
//     }
    
//     // For text responses - preserve accumulated content that's already in the message
//     return {
//       ...prevMessage,
//       content: prevMessage.content || accumulatedContent || 'No response generated.',
//       isStreaming: false,
//       sources: finalSources || prevMessage.sources || [],
//       answer_type: 'text',
//     };
//   });
  
//   refreshChats(); // Refresh to update timestamps
// }
try {
  let accumulatedContent = '';
  let finalSources = null;
  let streamingFailed = false;
  let finalTableData = null;
  let finalAnswerType = 'text';

  try {
    await askQuestionStream(
      currentDocumentId,
      message,
      responseChatId,
      // onChunk
      (chunk) => {
        accumulatedContent += chunk;
        updateMessage(aiMessageId, (prevMessage) => ({
          ...prevMessage,
          content: accumulatedContent,
          isStreaming: true,
        }));
      },
      // onSources
      (sources) => {
        finalSources = sources;
        updateMessage(aiMessageId, (prevMessage) => ({
          ...prevMessage,
          sources: sources,
          isStreaming: true,
        }));
      },
      // onChatId
      (newChatId) => {
        if (!responseChatId && newChatId) {
          responseChatId = newChatId;
          setCurrentChatId(newChatId);
          if (newChatId !== chatId) {
            navigate(`/chat/${newChatId}`, { replace: true });
          }
        }
      },
      // onError
      async (error) => {
        console.error('Streaming error:', error);
        streamingFailed = true;
        
        let errorMessage = 'Sorry, I encountered an error while processing your question. Please try again.';
        if (error.message) {
          if (error.message.includes('embedding') || error.message.includes('fetch failed') || error.message.includes('network')) {
            errorMessage = 'Unable to connect to the AI service. Please check your internet connection and API configuration, then try again.';
          } else {
            errorMessage = error.message;
          }
        }
        
        updateMessage(aiMessageId, {
          content: errorMessage,
          isStreaming: false,
        });
        setIsThinking(false);
      },
      // onComplete - handles final response with table or text data
      (completeData) => {
        if (completeData) {
          if (completeData.answer_type === 'table' && completeData.table) {
            finalAnswerType = 'table';
            finalTableData = completeData.table;
            if (completeData.answer) {
              accumulatedContent = completeData.answer;
            }
          } else if (completeData.answer_type === 'text' && completeData.answer) {
            finalAnswerType = 'text';
            // Don't overwrite accumulated content if chunks were streamed
            if (!accumulatedContent) {
              accumulatedContent = completeData.answer;
            }
          }
        }
      }
    );

    // If streaming finished but produced no visible text (common when SSE parsing fails),
// fallback to non-streaming once so UI never shows "No response generated."
// if (!streamingFailed && finalAnswerType === 'text' && !accumulatedContent.trim()) {
//   try {
//     const result = await askQuestion(currentDocumentId, message, responseChatId);
//     accumulatedContent = (result.answer || '').trim();
//     finalSources = result.sources || finalSources;
//   } catch (e) {
//     console.error('Non-stream fallback after empty streaming failed:', e);
//   }
// }

// If streaming ended but we got neither text nor table, fallback once to non-stream
if (!streamingFailed && !accumulatedContent.trim() && !finalTableData) {
  try {
    const result = await askQuestion(currentDocumentId, message, responseChatId);

    // Update final outputs from fallback
    finalAnswerType = result.answer_type || 'text';
    finalTableData = result.table || null;
    finalSources = result.sources || finalSources;

    if (finalAnswerType === 'text') {
      accumulatedContent = (result.answer || '').trim();
    } else if (finalAnswerType === 'table') {
      // optional: keep a short caption if backend sends it
      accumulatedContent = (result.answer || '').trim();
    }
  } catch (e) {
    console.error('Fallback after empty streaming failed:', e);
  }
}



    if (!streamingFailed) {
      updateMessage(aiMessageId, (prevMessage) => {
        // For table responses
        // if (finalAnswerType === 'table' && finalTableData) {
        //   return {
        //     ...prevMessage,
        //     content: '',
        //     isStreaming: false,
        //     sources: finalSources || prevMessage.sources || [],
        //     answer_type: 'table',
        //     table: finalTableData,
        //   };
        // }
        if (finalAnswerType === 'table' && finalTableData) {
          return {
            ...prevMessage,
            content: '',                // keep empty so markdown doesn't interfere
            answer: accumulatedContent, // ✅ allows fallback text under table
            isStreaming: false,
            sources: finalSources || prevMessage.sources || [],
            answer_type: 'table',
            table: finalTableData,
          };
        }
        
        // For text responses - use accumulated content
        return {
          ...prevMessage,
          content: accumulatedContent || prevMessage.content || 'No response generated.',
          isStreaming: false,
          sources: finalSources || prevMessage.sources || [],
          answer_type: 'text',
        };
      });
      
      refreshChats();
    }


////////////////////////////////////////////////////////
















        // if (!streamingFailed) {
        //   // For table responses, don't use accumulatedContent (it's empty for tables)
        //   // But ensure we have some content or table data
        //   const messageContent = finalAnswerType === 'table' && finalTableData 
        //     ? '' // Table responses don't have text content
        //     : (accumulatedContent || 'No response generated.');
          
        //   // Ensure we always have answer_type set
        //   const answerType = finalAnswerType || 'text';
          
        //   // Ensure table data is valid if answer_type is table
        //   let tableData = finalTableData;
        //   if (answerType === 'table' && !tableData) {
        //     tableData = {
        //       title: 'No Data Found',
        //       columns: [],
        //       rows: [],
        //     };
        //   }
          
        //   updateMessage(aiMessageId, {
        //     content: messageContent,
        //     isStreaming: false,
        //     sources: finalSources || [],
        //     answer_type: answerType,
        //     table: tableData,
        //   });
        //   refreshChats(); // Refresh to update timestamps
        // }





      } catch (streamError) {
        console.error('Streaming setup failed, using non-streaming:', streamError);
        try {
          const result = await askQuestion(currentDocumentId, message, responseChatId);
          if (result.chatId && !responseChatId) {
            responseChatId = result.chatId;
            setCurrentChatId(result.chatId);
            navigate(`/chat/${result.chatId}`, { replace: true });
          }
          
          // Ensure we have valid response data
          const answerType = result.answer_type || 'text';
          const answerContent = result.answer || 'No response generated.';
          const tableData = result.table || null;
          
          updateMessage(aiMessageId, {
            content: answerType === 'table' ? '' : answerContent,
            sources: result.sources || [],
            answer_type: answerType,
            table: tableData,
            isStreaming: false,
          });
          refreshChats();
        } catch (fallbackError) {
          console.error('Fallback error:', fallbackError);
          updateMessage(aiMessageId, {
            content: 'Sorry, I encountered an error while processing your question. Please try again.',
            isStreaming: false,
          });
        }
      }
    } catch (error) {
      console.error('Ask error:', error);
      updateMessage(aiMessageId, {
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
        isStreaming: false,
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSummarize = async () => {
    if (!currentDocumentId) return;
    handleSendMessage('Please provide a comprehensive summary of this document.');
  };

  // Handle panel resizing
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.max(20, Math.min(80, newWidth));
      setLeftPanelWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  if (loading && chatHistory.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-slate-500">Loading chat...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full flex overflow-hidden relative">
      {/* Left Panel - PDF Viewer / Upload Zone */}
      <div 
        className="overflow-hidden flex-shrink-0 border-r border-gray-200"
        style={{ width: `${leftPanelWidth}%` }}
      >
        {showUploadZone ? (
          <UploadZone onUpload={handleUpload} isUploading={isUploading} />
        ) : pdfUrl ? (
          <PDFViewer fileUrl={pdfUrl} />
        ) : (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center text-slate-500">
              <div className="animate-pulse">Loading document...</div>
            </div>
          </div>
        )}
      </div>

      {/* Resizable Divider */}
      <div
        className="w-1 bg-gray-200 hover:bg-indigo-500 cursor-col-resize flex-shrink-0 transition-colors relative group"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      >
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-transparent group-hover:bg-indigo-500 transition-colors"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-8 bg-gray-300 rounded group-hover:bg-indigo-500 transition-colors"></div>
      </div>

      {/* Right Panel - Chat Interface */}
      <div 
        className="overflow-hidden flex-shrink-0"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        <ChatPanel
          chatHistory={chatHistory}
          onSendMessage={handleSendMessage}
          onSummarize={handleSummarize}
          isThinking={isThinking}
          currentDocumentId={currentDocumentId}
        />
      </div>
    </div>
  );
};

export default ChatPage;

