import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { 
  FileText, 
  Sparkles, 
  Eye, 
  ChevronDown, 
  X, 
  Plus, 
  Upload, 
  PanelLeftClose, 
  PanelLeftOpen, 
  FileCheck,
  FolderPlus
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import ChatPanel from './ChatPanel';
import PDFViewer from './PDFViewer';
import OCRViewer from './OCRViewer';
import UploadZone from './UploadZone';
import ChatStream from './ChatStream';
import ReconstructedOCRModal from './ReconstructedOCRModal';
import { getAvailableModels, getDocumentPreview, setChatDocument, uploadDocument } from '../services/api';
import { detectQueryIntent } from '../utils/intentDetection';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const FALLBACK_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Gemini 3.8 Flash' },
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash' },
  { id: 'gemini-3.8-live-extended-thinking', label: 'Gemini 3.8 Live Extended Thinking' },
  { id: 'gemini-3.8-live', label: 'Gemini 3.8 Live' },
  { id: 'gemini-3-flash-live', label: 'Gemini 3 Flash Live' },
  { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
  { id: 'gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { id: 'gemma-4-31b', label: 'Gemma 4 31B' },
  { id: 'gemma-4-26b', label: 'Gemma 4 26B' },
];

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    currentChatId,
    currentDocumentId,
    userDocuments = [],
    loadUserDocuments,
    chatHistory,
    loading,
    loadChatMessages,
    addMessage,
    updateMessage,
    refreshChats,
    setCurrentChatId,
    setCurrentDocumentId,
    thinkingMode,
    webMode,
    activeProject,
    loadUsageSummary,
  } = useChat();

  const [pdfUrl, setPdfUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [currentFileName, setCurrentFileName] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(48);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [availableModels, setAvailableModels] = useState(FALLBACK_MODELS);
  const { preferences, updatePreference } = useTheme();
  const [selectedModel, setSelectedModel] = useState(preferences?.defaultModelId || FALLBACK_MODELS[0].id);
  const dc = useDarkColors();
  const isDark = useIsDark();
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [activeStream, setActiveStream] = useState(null);
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  const [viewingOCRDoc, setViewingOCRDoc] = useState(null);
  const [previewError, setPreviewError] = useState(false);

  const activeStreamIdRef = useRef(null);
  const loadChatMessagesRef = useRef(loadChatMessages);
  const containerRef = useRef(null);
  const docMenuRef = useRef(null);
  const initialPromptRef = useRef(location.state?.initialPrompt || sessionStorage.getItem('initial_user_prompt') || '');
  const initialPromptChatIdRef = useRef(chatId);
  const initialPromptSentRef = useRef(false);
  const [isChatReady, setIsChatReady] = useState(false);

  const workspaceDocuments = Array.isArray(activeProject?.documents) && activeProject.documents.length > 0
    ? activeProject.documents
    : userDocuments;

  useEffect(() => {
    activeStreamIdRef.current = activeStream?.id || null;
  }, [activeStream]);

  useEffect(() => {
    loadChatMessagesRef.current = loadChatMessages;
  }, [loadChatMessages]);

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
    if (preferences?.defaultModelId && availableModels.some(m => m.id === preferences.defaultModelId)) {
      setSelectedModel(preferences.defaultModelId);
    }
  }, [preferences?.defaultModelId, availableModels]);

  useEffect(() => {
    const routeModel = location.state?.initialModel;
    if (routeModel && availableModels.some((model) => model.id === routeModel)) {
      setSelectedModel(routeModel);
    }
  }, [location.state?.initialModel, availableModels]);

  // Close doc menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (docMenuRef.current && !docMenuRef.current.contains(e.target)) {
        setDocMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadedChatIdRef = useRef(null);

  // Load chat messages when chatId changes
  useEffect(() => {
    if (!chatId) return;

    if (loadedChatIdRef.current === chatId) {
      return;
    }
    loadedChatIdRef.current = chatId;

    if (initialPromptChatIdRef.current !== chatId) {
      initialPromptChatIdRef.current = chatId;
      initialPromptSentRef.current = false;
      initialPromptRef.current = location.state?.initialPrompt || '';
    }

    if (activeStreamIdRef.current) {
      return;
    }

    let cancelled = false;
    setIsChatReady(false);
    Promise.resolve(loadChatMessagesRef.current(chatId))
      .catch((error) => {
        console.error('Error loading chat:', error);
        navigate('/chat', { replace: true });
      })
      .finally(() => {
        if (!cancelled) setIsChatReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [chatId, navigate]);

  // Load document preview when currentDocumentId changes
  useEffect(() => {
    if (!currentDocumentId) {
      setPdfUrl(null);
      setCurrentFileName(null);
      setShowUploadZone(false);
      setPreviewError(false);
      return;
    }

    let isMounted = true;
    const loadDocumentPreview = async () => {
      setPreviewError(false);
      try {
        const previewData = await getDocumentPreview(currentDocumentId);
        if (isMounted) {
          setPdfUrl(previewData.previewUrl);
          setCurrentFileName(previewData.fileName);
          setShowUploadZone(false);
        }
      } catch (error) {
        console.error('Error loading document preview:', error);
        if (isMounted) {
          const doc = workspaceDocuments.find((d) => d.id === currentDocumentId);
          setCurrentFileName(doc?.fileName || doc?.file_name || 'Document');
          setPreviewError(true);
        }
      }
    };

    loadDocumentPreview();
    return () => { isMounted = false; };
  }, [currentDocumentId, workspaceDocuments]);

  // Send initial prompt if provided
  useEffect(() => {
    const initialPrompt = initialPromptRef.current;
    if (
      initialPrompt &&
      chatId &&
      isChatReady &&
      !initialPromptSentRef.current &&
      !isThinking &&
      !activeStream
    ) {
      initialPromptSentRef.current = true;
      initialPromptRef.current = '';
      sessionStorage.removeItem('initial_user_prompt');
      handleSendMessage(initialPrompt);
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [chatId, isChatReady, isThinking, activeStream]);

  // Resizing left / right panel
  useEffect(() => {
    const handleMouseMove = (event) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((event.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.max(25, Math.min(75, newWidth)));
    };

    const handleMouseUp = () => setIsResizing(false);

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

  // Document attachment handler
  const handleAttachDocument = async (docId) => {
    try {
      if (chatId) {
        await setChatDocument(chatId, docId);
      }
      setCurrentDocumentId(docId);
      setIsPanelCollapsed(false);
      setDocMenuOpen(false);
      await refreshChats();
    } catch (err) {
      console.error('Failed to attach document:', err);
      setCurrentDocumentId(docId);
      setIsPanelCollapsed(false);
      setDocMenuOpen(false);
    }
  };

  // Document detach handler
  const handleDetachDocument = async () => {
    try {
      if (chatId) {
        await setChatDocument(chatId, null);
      }
      setCurrentDocumentId(null);
      setPdfUrl(null);
      setCurrentFileName(null);
      await refreshChats();
    } catch (err) {
      console.error('Failed to detach document:', err);
      setCurrentDocumentId(null);
    }
  };

  // Direct upload handler
  const handleUpload = async (file) => {
    setIsUploading(true);
    try {
      const result = await uploadDocument(file);
      await loadUserDocuments();
      if (result?.document?.id) {
        await handleAttachDocument(result.document.id);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload document: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = (message) => {
    if (!message || !message.trim() || isThinking || activeStream) {
      return false;
    }

    const docToUse = currentDocumentId || null;

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
    const newStream = {
      id: `stream-${Date.now()}-${Math.random()}`,
      messageId: aiMessageId,
      documentId: docToUse,
      question: message,
      chatId: currentChatId || chatId || null,
      intent,
      model: selectedModel,
      thinkingMode: thinkingMode,
      webMode: webMode,
      projectId: activeProject?.id || null,
    };
    activeStreamIdRef.current = newStream.id;
    setActiveStream(newStream);

    return true;
  };

  const handleSummarize = () => {
    if (!currentDocumentId) {
      alert('Please attach a document first to generate a summary.');
      return;
    }
    return handleSendMessage('Please provide a comprehensive summary of this document.');
  };

  const handleCitationClick = (citation) => {
    setActiveHighlight(citation);
    if (isPanelCollapsed) {
      setIsPanelCollapsed(false);
    }
  };

  if (!isChatReady || (loading && (!Array.isArray(chatHistory) || chatHistory.length === 0))) {
    return (
      <div className="flex h-full w-full items-center justify-center transition-colors duration-300" 
        style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
      >
        <div className="text-center">
          <div className="animate-pulse text-sm" style={{ color: dc.textMuted }}>Loading chat...</div>
        </div>
      </div>
    );
  }

  const hasDocument = Boolean(currentDocumentId);
  const showLeftPanel = hasDocument && !isPanelCollapsed;
  const activeDocObject = workspaceDocuments.find((d) => d.id === currentDocumentId);

  return (
    <div 
      ref={containerRef} 
      className="relative flex h-full w-full overflow-hidden transition-colors duration-300"
      style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
    >
      {/* Streaming Event Handler Component */}
      {activeStream ? (
        <ChatStream
          key={activeStream.id}
          request={activeStream}
          onToken={(token) => {
            if (!isCurrentStream(activeStream.id)) return;
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              content: `${message.content || ''}${token}`,
              isStreaming: true,
            }));
          }}
          onChatId={(resolvedChatId) => {
            if (!isCurrentStream(activeStream.id)) return;
            if (resolvedChatId && resolvedChatId !== currentChatId) {
              setCurrentChatId(resolvedChatId);
            }
          }}
          onCitations={(citations) => {
            if (!isCurrentStream(activeStream.id)) return;
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              citations: citations || [],
            }));
          }}
          onWebSources={(webSources) => {
            if (!isCurrentStream(activeStream.id)) return;
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              webSources: webSources || [],
            }));
          }}
          onUsage={() => {
            loadUsageSummary?.();
          }}
          onComplete={() => {
            if (!isCurrentStream(activeStream.id)) return;
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              isStreaming: false,
            }));
            setIsThinking(false);
            setActiveStream(null);
            refreshChats();
          }}
          onDone={() => {
            if (!isCurrentStream(activeStream.id)) return;
            setIsThinking(false);
            setActiveStream(null);
          }}
          onError={(error) => {
            if (!isCurrentStream(activeStream.id)) return;
            updateMessage(activeStream.messageId, (message) => ({
              ...message,
              isStreaming: false,
              content:
                message.content && message.content.trim().length > 0
                  ? message.content
                  : error.message || 'Sorry, I encountered an error while processing your question. Please try again.',
            }));
            setIsThinking(false);
            setActiveStream(null);
            refreshChats();
          }}
        />
      ) : null}

      {/* Left Panel: OCR Viewer & Document Controls (Rendered ONLY when a document is attached & expanded) */}
      {showLeftPanel && (
        <div 
          className="flex-shrink-0 overflow-hidden flex flex-col transition-all duration-150"
          style={{ 
            width: `${leftPanelWidth}%`, 
            borderRight: `1px solid ${isDark ? '#2e2d2a' : '#e5e3da'}` 
          }}
        >
          {/* Top Document Bar */}
          <div 
            className="flex items-center justify-between px-3 py-2 border-b shrink-0 text-xs"
            style={{
              backgroundColor: isDark ? '#1a1918' : '#f5f4ef',
              borderColor: isDark ? '#2e2d2a' : '#e5e3da',
            }}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
              <FileText size={14} className="text-amber-500 shrink-0" />
              <span className="font-semibold truncate" style={{ color: dc.textPrimary }}>
                {currentFileName || activeDocObject?.fileName || activeDocObject?.file_name || 'Active Document'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                OCR Ready
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* Reconstructed OCR Modal Trigger */}
              <button
                type="button"
                onClick={() => setViewingOCRDoc(activeDocObject || { id: currentDocumentId, fileName: currentFileName })}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                title="Open Reconstructed OCR Text"
              >
                <Eye size={12} />
                <span className="hidden sm:inline">OCR View</span>
              </button>

              {/* Detach Document Button */}
              <button
                type="button"
                onClick={handleDetachDocument}
                className="p-1 rounded-md text-neutral-400 hover:text-rose-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                title="Detach document from this chat"
              >
                <X size={14} />
              </button>

              {/* Collapse Left Panel */}
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(true)}
                className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                title="Collapse document panel"
              >
                <PanelLeftClose size={15} />
              </button>
            </div>
          </div>

          {/* OCR Content Area */}
          <div className="flex-1 overflow-hidden relative">
            {showUploadZone ? (
              <UploadZone onUpload={handleUpload} isUploading={isUploading} />
            ) : pdfUrl && currentDocumentId ? (
              <OCRViewer 
                documentId={currentDocumentId} 
                pdfUrl={pdfUrl} 
                activeHighlight={activeHighlight} 
              />
            ) : previewError ? (
              <div className="flex h-full flex-col items-center justify-center p-6 text-center" style={{ backgroundColor: isDark ? '#1a1918' : '#faf9f5' }}>
                <FileText size={32} className="text-amber-500 mb-2 opacity-60" />
                <p className="text-xs font-medium mb-1" style={{ color: dc.textPrimary }}>
                  {currentFileName || 'Document'} is ready for Legal RAG
                </p>
                <p className="text-[11px] text-neutral-400 mb-4 max-w-xs">
                  The document chunks and Sarvam OCR text are loaded and searchable.
                </p>
                <button
                  type="button"
                  onClick={() => setViewingOCRDoc(activeDocObject || { id: currentDocumentId, fileName: currentFileName })}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-[#da7756] text-white hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                >
                  Open Reconstructed OCR Text
                </button>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center" style={{ backgroundColor: isDark ? '#1a1918' : '#faf9f5' }}>
                <div className="text-center p-4">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <div className="text-xs text-neutral-400">Loading document preview...</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resizable Divider Handle (Only when left panel is visible) */}
      {showLeftPanel && (
        <div
          className="group relative w-1 flex-shrink-0 cursor-col-resize transition-colors hover:bg-amber-500"
          style={{ backgroundColor: isDark ? '#2e2d2a' : '#e5e3da' }}
          onMouseDown={(event) => {
            event.preventDefault();
            setIsResizing(true);
          }}
        >
          <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-transparent transition-colors group-hover:bg-amber-500" />
          <div className="absolute left-1/2 top-1/2 h-8 w-2 -translate-x-1/2 -translate-y-1/2 rounded transition-colors group-hover:bg-amber-500" style={{ backgroundColor: isDark ? '#3d3b37' : '#dad7cf' }} />
        </div>
      )}

      {/* Right / Main Panel: Chat Panel */}
      <div 
        className="flex-1 flex flex-col overflow-hidden h-full"
        style={{ width: showLeftPanel ? `${100 - leftPanelWidth}%` : '100%' }}
      >
        {/* Top Chat Bar for expanding document viewer or attaching files */}
        <div 
          className="px-4 py-2 border-b flex items-center justify-between shrink-0 text-xs"
          style={{
            backgroundColor: isDark ? '#1f1e1d' : '#faf9f5',
            borderColor: isDark ? '#2e2d2a' : '#e5e3da',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* If document is attached but collapsed, show toggle button */}
            {hasDocument && isPanelCollapsed && (
              <button
                type="button"
                onClick={() => setIsPanelCollapsed(false)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                style={{ borderColor: isDark ? '#3d3b37' : '#eae8e1' }}
                title="Show document preview"
              >
                <PanelLeftOpen size={14} />
                <span className="truncate max-w-[140px]">{currentFileName || 'Show Document'}</span>
              </button>
            )}

            {!hasDocument && (
              <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                <Sparkles size={13} className="text-amber-500" />
                <span className="font-medium text-xs">General AI Chat</span>
              </div>
            )}
          </div>

          {/* Right Action: Attach Document Dropdown */}
          <div className="relative" ref={docMenuRef}>
            <button
              type="button"
              onClick={() => setDocMenuOpen(!docMenuOpen)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
              style={{
                backgroundColor: isDark ? '#262522' : '#ffffff',
                borderColor: isDark ? '#383734' : '#e5e3da',
              }}
            >
              <FileText size={13} className="text-amber-500" />
              <span>{hasDocument ? 'Switch Document' : 'Attach Document (Legal RAG)'}</span>
              <ChevronDown size={12} className="text-neutral-400" />
            </button>

            {docMenuOpen && (
              <div 
                className="absolute right-0 top-full mt-1.5 w-64 rounded-2xl shadow-xl border bg-white dark:bg-[#262522] border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
              >
                <label className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer text-left">
                  <Upload size={14} className="text-[#da7756]" />
                  <div className="flex flex-col">
                    <span className="font-medium">Upload New Document</span>
                    <span className="text-[10px] text-neutral-400">PDF, DOCX with Sarvam OCR</span>
                  </div>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      setDocMenuOpen(false);
                    }}
                  />
                </label>

                {workspaceDocuments.length > 0 && (
                  <>
                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                      Select Workspace Document
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {workspaceDocuments.map((doc) => {
                        const isCurrent = doc.id === currentDocumentId;
                        return (
                          <button
                            key={doc.id}
                            type="button"
                            onClick={() => handleAttachDocument(doc.id)}
                            className={`w-full flex items-center justify-between px-3 py-1.5 transition-colors text-left ${
                              isCurrent ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800/70 text-neutral-700 dark:text-neutral-300'
                            }`}
                          >
                            <span className="truncate pr-2">{doc.fileName || doc.file_name}</span>
                            {isCurrent && <FileCheck size={12} className="text-emerald-500 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {hasDocument && (
                  <>
                    <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                    <button
                      type="button"
                      onClick={() => {
                        handleDetachDocument();
                        setDocMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                    >
                      <X size={13} />
                      <span>Detach Document (Switch to General Chat)</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Messages and Input Panel */}
        <div className="flex-1 overflow-hidden">
          <ChatPanel
            chatHistory={chatHistory}
            onSendMessage={handleSendMessage}
            onSummarize={handleSummarize}
            isThinking={isThinking}
            currentDocumentId={currentDocumentId}
            selectedModel={selectedModel}
            availableModels={availableModels}
            onModelChange={(newModelId) => {
              setSelectedModel(newModelId);
              updatePreference({ defaultModelId: newModelId });
            }}
            onCitationClick={handleCitationClick}
            currentFileName={currentFileName}
            onAttachDocument={handleAttachDocument}
            onDetachDocument={handleDetachDocument}
            onUploadDocument={handleUpload}
            userDocuments={workspaceDocuments}
          />
        </div>
      </div>

      {/* Reconstructed OCR Viewer Modal */}
      <ReconstructedOCRModal
        isOpen={!!viewingOCRDoc}
        document={viewingOCRDoc}
        onClose={() => setViewingOCRDoc(null)}
      />
    </div>
  );
};

export default ChatPage;
