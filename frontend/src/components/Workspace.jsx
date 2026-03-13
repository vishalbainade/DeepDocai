import { useEffect, useRef, useState } from 'react';
import Navbar from './Navbar';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import UploadZone from './UploadZone';
import PDFViewer from '/PDFViewer';
import ChatPanel from './ChatPanel';
import ChatStream from './ChatStream';
import { getAvailableModels, getChatMessages, getDocumentPreview, uploadDocument } from '../services/api';
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
  const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
  const [selectedModel, setSelectedModel] = useState(FALLBACK_MODELS[0].id);
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const activeStreamIdRef = useRef(null);
  const submissionLockRef = useRef(false);

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
    activeStreamIdRef.current = activeStream?.id || null;
  }, [activeStream]);

  useEffect(() => {
    if (!isThinking && !activeStream) {
      submissionLockRef.current = false;
    }
  }, [activeStream, isThinking]);

  const patchMessage = (messageId, updater) => {
    setChatHistory((previous) =>
      previous.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return typeof updater === 'function' ? updater(message) : { ...message, ...updater };
      })
    );
  };

  const handleCitationClick = (citation) => {
    setActiveHighlight(citation);
  };

  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      setCurrentDocumentId(result.documentId);
      setCurrentFileName(result.fileName);
      setCurrentChatId(null);
      setChatHistory([]);
      setActiveHighlight(null);

      try {
        const previewData = await getDocumentPreview(result.documentId);
        setPdfUrl(previewData.previewUrl);
      } catch (error) {
        console.error('Error loading preview URL', error);
        setPdfUrl(URL.createObjectURL(file));
      }

      setShowUploadZone(false);
    } catch (error) {
      console.error('Upload error', error);
      alert(`Failed to upload document: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const loadChatMessages = async (chat) => {
    if (!chat) {
      setCurrentChatId(null);
      setChatHistory([]);
      return;
    }

    setCurrentChatId(chat.id);
    setCurrentDocumentId(chat.documentId);
    setShowUploadZone(false);
    setActiveHighlight(null);

    try {
      const result = await getChatMessages(chat.id);
      const formattedMessages = (result?.messages || []).map((message, index) => ({
        id: message?.id || `${message?.role || 'msg'}-${index}`,
        role: (message?.role || 'user').toLowerCase(),
        content: message?.content || '',
        createdAt: message?.createdAt || new Date().toISOString(),
        answer_type: message?.answer_type || 'text',
        table: message?.table || null,
      }));
      setChatHistory(formattedMessages);
    } catch (error) {
      console.error('Error loading chat history', error);
      alert('Failed to load chat history.');
    }

    try {
      const previewData = await getDocumentPreview(chat.documentId);
      setPdfUrl(previewData.previewUrl);
      setCurrentFileName(previewData.fileName);
    } catch (error) {
      console.error('Error loading document preview', error);
    }
  };

  const handleSendMessage = (question) => {
    if (!currentDocumentId || isThinking || submissionLockRef.current) {
      return false;
    }

    submissionLockRef.current = true;

    const userMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      role: 'user',
      content: question,
      createdAt: new Date().toISOString(),
    };

    const aiMessageId = `ai-${Date.now()}-${Math.random()}`;
    const aiMessage = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      citations: [],
      paragraphCitations: [],
      isStreaming: true,
      createdAt: new Date().toISOString(),
    };

    setChatHistory((previous) => [...previous, userMessage, aiMessage]);
    setIsThinking(true);
    setActiveHighlight(null);

    const intent = detectQueryIntent(question);
    setActiveStream({
      id: `stream-${Date.now()}`,
      messageId: aiMessageId,
      documentId: currentDocumentId,
      question,
      chatId: currentChatId,
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

  const handleUploadNew = () => {
    setShowUploadZone(true);
    setCurrentDocumentId(null);
    setCurrentChatId(null);
    setPdfUrl(null);
    setChatHistory([]);
    setActiveHighlight(null);
    setActiveStream(null);
  };

  const isCurrentStream = (streamId) => activeStreamIdRef.current === streamId;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {activeStream ? (
        <ChatStream
          key={activeStream.id}
          request={activeStream}
          onToken={(token) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            patchMessage(activeStream.messageId, (message) => ({
              ...message,
              content: `${message.content || ''}${token}`,
              isStreaming: true,
            }));
          }}
          onChatId={(chatId) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            if (!currentChatId && chatId) {
              setCurrentChatId(chatId);
            }
          }}
          onCitations={(payload) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            patchMessage(activeStream.messageId, {
              citations: payload.citations || [],
              paragraphCitations: payload.paragraphCitations || [],
              isStreaming: true,
            });
          }}
          onComplete={(payload) => {
            if (!isCurrentStream(activeStream.id)) {
              return;
            }
            patchMessage(activeStream.messageId, (message) => ({
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
            setChatListRefreshTrigger((value) => value + 1);
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
            patchMessage(activeStream.messageId, (message) => ({
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

      <Navbar onUploadClick={handleUploadNew} onMenuClick={() => setDrawerOpen((value) => !value)} />

      <ChatHistoryDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        currentChatId={currentChatId}
        currentDocumentId={currentDocumentId}
        onSelectChat={loadChatMessages}
        refreshTrigger={chatListRefreshTrigger}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 overflow-hidden border-r border-slate-200">
          {showUploadZone || !pdfUrl ? (
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
          ) : (
            <PDFViewer fileUrl={pdfUrl} activeHighlight={activeHighlight} />
          )}
        </div>

        <div className="w-1/2 overflow-hidden">
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
    </div>
  );
};

export default Workspace;
