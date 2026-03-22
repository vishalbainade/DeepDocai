import { useEffect, useRef, useState, useCallback } from 'react';
import Navbar from './Navbar';
import ChatHistoryDrawer from './ChatHistoryDrawer';
import UploadZone from './UploadZone';
import PDFViewer from './PDFViewer';
import OCRViewer from './OCRViewer';
import ChatPanel from './ChatPanel';
import ChatStream from './ChatStream';
import { getAvailableModels, getChatMessages, getDocumentPreview, uploadDocument, getUserSelectedModel, saveUserSelectedModel } from '../services/api';
import { detectQueryIntent } from '../utils/intentDetection';

const FALLBACK_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', displayName: 'Gemini 2.5 Flash', modelName: 'gemini-2.5-flash', provider: { slug: 'google', name: 'Google AI Studio' } },
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
  const [availableModels, setAvailableModels] = useState([]);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(() => {
    // Instant restore from localStorage on first render (before any API call)
    return localStorage.getItem('deepdocai_selected_model_id') || null;
  });
  const [selectedModelName, setSelectedModelName] = useState(() => {
    return localStorage.getItem('deepdocai_selected_model_name') || null;
  });
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const activeStreamIdRef = useRef(null);
  const submissionLockRef = useRef(false);
  const modelSavePendingRef = useRef(false);

  // ─── Load models from backend + verify persisted selection ──────────────
  useEffect(() => {
    const loadModelsAndSelection = async () => {
      try {
        // Load models from new multi-provider endpoint
        const modelsResult = await getAvailableModels();
        let models = [];

        if (Array.isArray(modelsResult?.models) && modelsResult.models.length > 0) {
          models = modelsResult.models;
          setAvailableModels(models);
        }

        if (models.length === 0) return;

        // ── Try 1: Restore from localStorage (already set in useState init) ──
        const cachedId = localStorage.getItem('deepdocai_selected_model_id');
        const cachedName = localStorage.getItem('deepdocai_selected_model_name');

        if (cachedId || cachedName) {
          // Match by UUID first, then by modelName as fallback
          const matched = models.find((m) => m.id === cachedId)
            || models.find((m) => m.modelName === cachedName);

          if (matched) {
            setSelectedModelId(matched.id);
            setSelectedModelName(matched.modelName);
            // Update localStorage in case ID changed (re-seed)
            localStorage.setItem('deepdocai_selected_model_id', matched.id);
            localStorage.setItem('deepdocai_selected_model_name', matched.modelName);
            console.log('[DeepDocAI] ✅ Restored model from cache:', matched.displayName);
            return;
          }
        }

        // ── Try 2: Load from backend DB (user_settings table) ──
        try {
          const selectionResult = await getUserSelectedModel();
          if (selectionResult?.selected?.modelId) {
            const persistedId = selectionResult.selected.modelId;
            const persistedName = selectionResult.selected.modelName;

            const matched = models.find((m) => m.id === persistedId)
              || models.find((m) => m.modelName === persistedName);

            if (matched) {
              setSelectedModelId(matched.id);
              setSelectedModelName(matched.modelName);
              localStorage.setItem('deepdocai_selected_model_id', matched.id);
              localStorage.setItem('deepdocai_selected_model_name', matched.modelName);
              console.log('[DeepDocAI] ✅ Restored model from backend:', matched.displayName);
              return;
            }
          }
        } catch (error) {
          console.warn('[DeepDocAI] Could not load from backend, using default', error);
        }

        // ── Default: first model in list ──
        setSelectedModelId(models[0].id);
        setSelectedModelName(models[0].modelName);
        console.log('[DeepDocAI] Using default model:', models[0].displayName);
      } catch (error) {
        console.error('[DeepDocAI] Failed to load models', error);
      } finally {
        setModelsLoaded(true);
      }
    };

    loadModelsAndSelection();
  }, []);

  // ─── Persist model selection to backend AND localStorage ──────────────
  const handleModelChange = useCallback(async (modelId) => {
    setSelectedModelId(modelId);

    const model = availableModels.find((m) => m.id === modelId);
    const modelName = model?.modelName || null;
    setSelectedModelName(modelName);

    // Save to localStorage IMMEDIATELY (survives refresh instantly)
    localStorage.setItem('deepdocai_selected_model_id', modelId);
    if (modelName) {
      localStorage.setItem('deepdocai_selected_model_name', modelName);
    }

    // Also persist to backend DB (for cross-device sync)
    if (modelSavePendingRef.current) return;
    modelSavePendingRef.current = true;

    try {
      await saveUserSelectedModel(modelId);
      console.log('[DeepDocAI] ✅ Model saved to backend:', model?.displayName || modelId);
    } catch (error) {
      console.error('[DeepDocAI] Failed to save to backend (localStorage still has it)', error);
    } finally {
      modelSavePendingRef.current = false;
    }
  }, [availableModels]);

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

    // Use the model_name for the backend (it resolves via the router)
    setActiveStream({
      id: `stream-${Date.now()}`,
      messageId: aiMessageId,
      documentId: currentDocumentId,
      question,
      chatId: currentChatId,
      intent,
      model: selectedModelName || selectedModelId,
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
          {showUploadZone || !currentDocumentId ? (
            <UploadZone onUpload={handleUpload} isUploading={isUploading} />
          ) : (
            <OCRViewer 
              documentId={currentDocumentId} 
              pdfUrl={pdfUrl} 
              activeHighlight={activeHighlight} 
            />
          )}
        </div>

        <div className="w-1/2 overflow-hidden">
          <ChatPanel
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            onSummarize={handleSummarize}
            isThinking={isThinking}
            currentDocumentId={currentDocumentId}
            selectedModel={selectedModelId}
            availableModels={availableModels}
            modelsLoaded={modelsLoaded}
            onModelChange={handleModelChange}
            onCitationClick={handleCitationClick}
            currentFileName={currentFileName}
          />
        </div>
      </div>
    </div>
  );
};

export default Workspace;
