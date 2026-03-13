import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import ChatPanel from './ChatPanel';
import PDFViewer from './PDFViewer';
import UploadZone from './UploadZone';
import ChatStream from './ChatStream';
import { getAvailableModels, getDocumentPreview, uploadDocument } from '../services/api';
import { detectQueryIntent } from '../utils/intentDetection';

const FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemma-3-1b', label: 'Gemma 3 1B' },
  { id: 'gemma-3-4b', label: 'Gemma 3 4B' },
  { id: 'gemma-3-12b', label: 'Gemma 3 12B' },
  { id: 'gemma-3-27b', label: 'Gemma 3 27B' },
];

const flattenParagraphCitations = (paragraphCitations = []) => {
  const seen = new Set();
  const flattened = [];

  paragraphCitations.forEach((paragraph) => {
    (paragraph?.citations || []).forEach((citation) => {
      const key = `${citation.chunkId || 'chunk'}-${citation.page}-${JSON.stringify(citation.bbox || null)}`;
      if (!seen.has(key)) {
        seen.add(key);
        flattened.push(citation);
      }
    });
  });

  return flattened;
};

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
  } = useChat();

  const [pdfUrl, setPdfUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].id);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const activeStreamIdRef = useRef(null);
  const loadChatMessagesRef = useRef(loadChatMessages);
  const submissionLockRef = useRef(false);
  const containerRef = useRef(null);

  useEffect(() => {
    activeStreamIdRef.current = activeStream?.id || null;
  }, [activeStream]);

  useEffect(() => {
    loadChatMessagesRef.current = loadChatMessages;
  }, [loadChatMessages]);

  useEffect(() => {
    if (!isThinking && !activeStream) {
      submissionLockRef.current = false;
    }
  }, [activeStream, isThinking]);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const result = await getAvailableModels();
        if (Array.isArray(result?.models) && result.models.length > 0) {
          setAvailableModels(result.models);
          setSelectedModel((current) =>
            result.models.some((model) => model.id === current) ? current : result.models[0].id
          );
        }
      } catch (error) {
        console.error('Failed to load available models', error);
      }
    };

    loadModels();
  }, []);

  useEffect(() => {
    if (!chatId) {
      return;
    }

    if (activeStreamIdRef.current && currentChatId === chatId) {
      return;
    }

    setPdfUrl(null);
    setShowUploadZone(false);
    loadChatMessagesRef.current(chatId).catch((error) => {
      console.error('Error loading chat:', error);
      navigate('/');
    });
  }, [chatId, currentChatId, navigate]);

  useEffect(() => {
    if (!currentDocumentId) {
      setPdfUrl(null);
      setShowUploadZone(true);
      return;
    }

    const loadDocumentPreview = async () => {
      try {
        const previewData = await getDocumentPreview(currentDocumentId);
        setPdfUrl(previewData.previewUrl);
        setCurrentFileName(previewData.fileName);
        setShowUploadZone(false);
      } catch (error) {
        console.error('Error loading document preview:', error);
        setPdfUrl(null);
        setShowUploadZone(true);
      }
    };

    loadDocumentPreview();
  }, [currentDocumentId]);

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizing || !containerRef.current) {
        return;
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.max(20, Math.min(80, newWidth)));
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

  const isCurrentStream = (streamId) => activeStreamIdRef.current === streamId;

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      setCurrentDocumentId(result.documentId);
      setCurrentFileName(result.fileName);
      setCurrentChatId(null);

      try {
        const previewData = await getDocumentPreview(result.documentId);
        setPdfUrl(previewData.previewUrl);
      } catch (previewError) {
        console.error('Error getting preview URL:', previewError);
        setPdfUrl(URL.createObjectURL(file));
      }

      setShowUploadZone(false);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload document: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = (message) => {
    if (!currentDocumentId || isThinking || submissionLockRef.current) {
      return false;
    }

    submissionLockRef.current = true;

    const userMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: message || '',
      createdAt: new Date().toISOString(),
    };
    addMessage(userMessage);

    const aiMessageId = `ai-${Date.now()}-${Math.random()}`;
    addMessage({
      id: aiMessageId,
      role: 'ai',
      content: '',
      citations: [],
      paragraphCitations: [],
      isStreaming: true,
      createdAt: new Date().toISOString(),
    });

    setIsThinking(true);
    setActiveHighlight(null);

    const intent = detectQueryIntent(message);
    setActiveStream({
      id: `stream-${Date.now()}-${Math.random()}`,
      messageId: aiMessageId,
      documentId: currentDocumentId,
      question: message,
      chatId: currentChatId || chatId || null,
      intent,
      model: selectedModel,
    });

    return true;
  };

  const handleSummarize = () => {
    if (!currentDocumentId) {
      return false;
    }
    return handleSendMessage('Please provide a comprehensive summary of this document.');
  };

  const handleCitationClick = (citation) => {
    setActiveHighlight(citation);
  };

  if (loading && chatHistory.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-pulse text-slate-500">Loading chat...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative flex h-full w-full overflow-hidden">
      {activeStream ? (
        <ChatStream
          key={activeStream.id}
          request={activeStream}
          onToken={(token) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              content: `${message.content || ''}${token}`,
              isStreaming: true,
            }));
          }}
          onChatId={(newChatId) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            if (!currentChatId && newChatId) {
              setCurrentChatId(newChatId);
              if (newChatId !== chatId) {
                navigate(`/chat/${newChatId}`, { replace: true });
              }
            }
          }}
          onCitations={(payload) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            updateMessage(activeStream.messageId, {
              citations: payload.citations || [],
              paragraphCitations: payload.paragraphCitations || [],
              isStreaming: true,
            });
          }}
          onComplete={(payload) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              isStreaming: false,
              content: payload.answer_type === 'table' ? '' : payload.answer || message.content || '',
              answer: payload.answer || '',
              answer_type: payload.answer_type || 'text',
              table: payload.table || null,
              citations:
                Array.isArray(payload.citations) && payload.citations.length > 0
                  ? payload.citations
                  : Array.isArray(message.citations) && message.citations.length > 0
                    ? message.citations
                    : flattenParagraphCitations(payload.paragraphCitations || []),
              paragraphCitations: payload.paragraphCitations || message.paragraphCitations || [],
            }));
            setIsThinking(false);
            refreshChats();
          }}
          onDone={() => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            submissionLockRef.current = false;
            setIsThinking(false);
            setActiveStream(null);
          }}
          onError={(error) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              isStreaming: false,
              content:
                message.content && message.content.trim().length > 0
                  ? message.content
                  : error.message || 'Sorry, I encountered an error while processing your question. Please try again.',
            }));
            submissionLockRef.current = false;
            setIsThinking(false);
            setActiveStream(null);
          }}
        />
      ) : null}

      <div className="flex-shrink-0 overflow-hidden border-r border-gray-200" style={{ width: `${leftPanelWidth}%` }}>
        {showUploadZone ? (
          <UploadZone onUpload={handleUpload} isUploading={isUploading} />
        ) : pdfUrl ? (
          <PDFViewer fileUrl={pdfUrl} activeHighlight={activeHighlight} />
        ) : (
          <div className="flex h-full items-center justify-center bg-gray-50">
            <div className="text-center text-slate-500">
              <div className="animate-pulse">Loading document...</div>
            </div>
          </div>
        )}
      </div>

      <div
        className="group relative w-1 flex-shrink-0 cursor-col-resize bg-gray-200 transition-colors hover:bg-indigo-500"
        onMouseDown={(event) => {
          event.preventDefault();
          setIsResizing(true);
        }}
      >
        <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-indigo-500" />
        <div className="absolute left-1/2 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 rounded bg-gray-300 transition-colors group-hover:bg-indigo-500" />
      </div>

      <div className="flex-shrink-0 overflow-hidden" style={{ width: `${100 - leftPanelWidth}%` }}>
        <ChatPanel
          chatHistory={chatHistory}
          onSendMessage={handleSendMessage}
          onSummarize={handleSummarize}
          isThinking={isThinking}
          currentDocumentId={currentDocumentId}
          selectedModel={selectedModel}
          availableModels={availableModels}
          onModelChange={setSelectedModel}
          onCitationClick={handleCitationClick}
          currentFileName={currentFileName}
        />
      </div>
    </div>
  );
};

export default ChatPage;
