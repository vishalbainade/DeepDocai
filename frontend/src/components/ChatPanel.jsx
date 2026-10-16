import { useEffect, useRef, useState } from 'react';
import { 
  Bot, 
  ChevronDown, 
  Loader2, 
  MessageSquare, 
  ArrowUp, 
  Sparkles, 
  User, 
  FileText, 
  Brain, 
  Globe, 
  Cpu, 
  Sliders, 
  Folder, 
  Mic, 
  Plus, 
  Upload, 
  Eye, 
  X, 
  Check, 
  FileCheck 
} from 'lucide-react';
import AnswerCard from './AnswerCard';
import ClaudeModelSelector from './ClaudeModelSelector';
import ReconstructedOCRModal from './ReconstructedOCRModal';
import { useChat } from '../contexts/ChatContext';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const PROVIDER_COLORS = {
  google: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  openrouter: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  glm: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  nvidia: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

const DEFAULT_MODEL_OPTIONS = [
  { id: 'gemini-3.8-flash', modelName: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', label: 'Gemini 3.8 Flash', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.7-flash', modelName: 'gemini-3.7-flash', displayName: 'Gemini 3.7 Flash', label: 'Gemini 3.7 Flash', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.8-live-extended-thinking', modelName: 'gemini-3.8-live-extended-thinking', displayName: 'Gemini 3.8 Live Extended Thinking', label: 'Gemini 3.8 Live Extended Thinking', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.8-live', modelName: 'gemini-3.8-live', displayName: 'Gemini 3.8 Live', label: 'Gemini 3.8 Live', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3-flash-live', modelName: 'gemini-3-flash-live', displayName: 'Gemini 3 Flash Live', label: 'Gemini 3 Flash Live', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.6-flash', modelName: 'gemini-3.6-flash', displayName: 'Gemini 3.6 Flash', label: 'Gemini 3.6 Flash', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.5-flash-lite', modelName: 'gemini-3.5-flash-lite', displayName: 'Gemini 3.5 Flash Lite', label: 'Gemini 3.5 Flash Lite', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemini-3.1-flash-lite', modelName: 'gemini-3.1-flash-lite', displayName: 'Gemini 3.1 Flash Lite', label: 'Gemini 3.1 Flash Lite', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemma-4-31b', modelName: 'gemma-4-31b', displayName: 'Gemma 4 31B', label: 'Gemma 4 31B', provider: { slug: 'google', name: 'Google AI Studio' } },
  { id: 'gemma-4-26b', modelName: 'gemma-4-26b', displayName: 'Gemma 4 26B', label: 'Gemma 4 26B', provider: { slug: 'google', name: 'Google AI Studio' } },
];

const ChatPanel = ({
  chatHistory = [],
  onSendMessage,
  onSummarize,
  isThinking,
  currentDocumentId,
  selectedModel,
  availableModels = [],
  modelsLoaded = false,
  onModelChange,
  onCitationClick,
  currentFileName,
  onAttachDocument,
  onDetachDocument,
  onUploadDocument,
  userDocuments = [],
}) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  const [input, setInput] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [viewingOCRDoc, setViewingOCRDoc] = useState(null);
  const [chatMode, setChatMode] = useState(currentDocumentId ? 'cowork' : 'chat');
  
  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);

  const {
    thinkingMode,
    setThinkingMode,
    webMode,
    setWebMode,
    activeProject,
    setIsUsageModalOpen,
    setIsPersonalizationModalOpen,
    setIsLiveAudioOpen,
    usageSummary,
  } = useChat();

  const modelOptions = Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : DEFAULT_MODEL_OPTIONS;

  const activeModel = modelsLoaded
    ? (modelOptions.some((model) => model.id === selectedModel) ? selectedModel : modelOptions[0]?.id)
    : (selectedModel || modelOptions[0]?.id);

  const activeModelData = modelOptions.find((m) => m.id === activeModel);
  const providerSlug = activeModelData?.provider?.slug || 'google';
  const providerColors = PROVIDER_COLORS[providerSlug] || PROVIDER_COLORS.google;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  useEffect(() => {
    if (currentDocumentId) {
      setChatMode('cowork');
    }
  }, [currentDocumentId]);

  // Close attach menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (event) => {
    event?.preventDefault();
    const prompt = input.trim();
    if (!prompt || isThinking) return;

    const accepted = onSendMessage?.(prompt);
    if (accepted !== false) {
      setInput('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent?.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleImproveText = async () => {
    if (!input.trim() || isImproving || isThinking) return;
    setIsImproving(true);
    try {
      setInput(`Please perform a detailed statutory and contractual risk analysis on: "${input.trim()}"`);
    } finally {
      setIsImproving(false);
    }
  };

  const handleModeToggle = (mode) => {
    setChatMode(mode);
    if (mode === 'cowork') {
      if (!currentDocumentId) {
        if (userDocuments.length > 0) {
          onAttachDocument?.(userDocuments[0].id);
        } else {
          setAttachMenuOpen(true);
        }
      }
    } else {
      if (currentDocumentId) {
        onDetachDocument?.();
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUploadDocument?.(file);
    setAttachMenuOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div 
      className="flex flex-col h-full overflow-hidden transition-colors"
      style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Messages Scroll Area */}
      <div 
        ref={scrollerRef} 
        className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin space-y-5"
      >
        <div className="max-w-3xl mx-auto space-y-5">
          {(!Array.isArray(chatHistory) || chatHistory.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                How can I assist your legal analysis today?
              </h2>
              <p className="text-xs text-neutral-400 max-w-md">
                {currentFileName 
                  ? `Active document: ${currentFileName}. Ask questions with Legal RAG citations and clause verification.` 
                  : 'Ask general legal questions, verify statutory clauses, or attach a contract for deep RAG analysis.'}
              </p>
            </div>
          ) : (
            (Array.isArray(chatHistory) ? chatHistory : []).map((message) => {
              const isUser = message.role === 'user';
              return (
                <div 
                  key={message.id} 
                  className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border mt-0.5"
                      style={{ 
                        backgroundColor: isDark ? '#262522' : '#ffffff',
                        borderColor: isDark ? '#383734' : '#e5e3da',
                        color: '#da7756'
                      }}
                    >
                      <Sparkles size={14} />
                    </div>
                  )}

                  <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
                    {isUser ? (
                      <div 
                        className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed text-white shadow-xs"
                        style={{ backgroundColor: '#da7756' }}
                      >
                        {message.content}
                      </div>
                    ) : (
                      <AnswerCard
                        message={message}
                        onCitationClick={onCitationClick}
                        thinkingMode={thinkingMode}
                      />
                    )}
                  </div>

                  {isUser && (
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 border mt-0.5 text-xs font-semibold"
                      style={{ 
                        backgroundColor: isDark ? '#2e2d2a' : '#eae8e1',
                        borderColor: isDark ? '#3d3b37' : '#dad7cf',
                        color: dc.textPrimary
                      }}
                    >
                      V
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Claude Rounded Prompt Input Card Area */}
      <div 
        className="p-4 border-t transition-colors shrink-0"
        style={{ 
          borderColor: isDark ? '#2e2d2a' : '#eae8e1',
          backgroundColor: isDark ? '#1f1e1d' : '#faf9f5',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border shadow-sm p-3.5 transition-all focus-within:shadow-md"
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383734' : '#e5e3da',
            }}
          >
            {/* Active Document Attachment Pill */}
            {currentFileName && (
              <div className="flex items-center gap-2 mb-2 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium w-fit">
                <FileText size={13} className="text-amber-500 shrink-0" />
                <span className="truncate max-w-[200px] sm:max-w-[320px] font-semibold">{currentFileName}</span>
                <span className="text-[10px] text-emerald-500 font-medium shrink-0">• Legal RAG Active</span>
                
                {/* View OCR Text Modal */}
                <button
                  type="button"
                  onClick={() => {
                    const doc = userDocuments.find((d) => d.id === currentDocumentId);
                    setViewingOCRDoc(doc || { id: currentDocumentId, fileName: currentFileName });
                  }}
                  className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-1"
                  title="View Reconstructed OCR"
                >
                  <Eye size={11} />
                  <span>OCR</span>
                </button>

                {/* Detach document */}
                <button
                  type="button"
                  onClick={() => onDetachDocument?.()}
                  className="p-0.5 rounded-full hover:bg-neutral-300/50 dark:hover:bg-neutral-700/50 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                  title="Detach document"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {/* Prompt Textarea */}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
              placeholder={
                currentFileName 
                  ? `Ask anything about ${currentFileName} with Legal RAG (Shift+Enter for newline)...` 
                  : 'Ask anything about your documents, legal questions, or contracts...'
              }
              rows={2}
              className="w-full bg-transparent resize-none text-[15px] outline-none leading-relaxed placeholder:text-neutral-400"
              style={{ color: isDark ? '#eceae6' : '#2d2b28' }}
            />

            {/* Bottom Controls Bar */}
            <div 
              className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-1"
              style={{ borderColor: isDark ? '#383734' : '#f0eee6' }}
            >
              {/* Left Group */}
              <div className="flex flex-wrap items-center gap-1.5 relative" ref={attachMenuRef}>
                {/* + Attachment Button */}
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                  title="Attach file or knowledge"
                >
                  <Plus size={16} />
                </button>

                {/* Attachment Dropdown */}
                {attachMenuOpen && (
                  <div 
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl shadow-xl border bg-white dark:bg-[#262522] border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                        setAttachMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer text-left"
                    >
                      <Upload size={14} className="text-[#da7756]" />
                      <div className="flex flex-col">
                        <span className="font-medium">Upload New Document</span>
                        <span className="text-[10px] text-neutral-400">PDF, DOCX with OCR reconstruction</span>
                      </div>
                    </button>

                    {userDocuments.length > 0 && (
                      <>
                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          Attach from Knowledge Base
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {userDocuments.map((doc) => {
                            const isCurrent = doc.id === currentDocumentId;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => {
                                  onAttachDocument?.(doc.id);
                                  setAttachMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors text-left"
                              >
                                <span className="truncate text-neutral-700 dark:text-neutral-300 pr-2">
                                  {doc.fileName || doc.file_name}
                                </span>
                                {isCurrent && <Check size={12} className="text-emerald-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mode Segmented Controls: Chat & Legal RAG */}
                <div 
                  className="flex items-center p-0.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: isDark ? '#1f1e1d' : '#f5f4ef',
                    borderColor: isDark ? '#383734' : '#e5e3da',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleModeToggle('chat')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      chatMode === 'chat'
                        ? 'bg-white dark:bg-[#262522] text-[#2d2b28] dark:text-[#eceae6] shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeToggle('cowork')}
                    className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      chatMode === 'cowork'
                        ? 'bg-white dark:bg-[#262522] text-[#2d2b28] dark:text-[#eceae6] shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                    title="Legal RAG mode with chunk search and citations"
                  >
                    Legal RAG
                  </button>
                </div>

                {/* Model Selector */}
                <ClaudeModelSelector
                  selectedModel={activeModel}
                  onModelChange={onModelChange}
                  availableModels={modelOptions}
                  disabled={isThinking}
                  placement="bottom-up"
                  compact={true}
                />

                {/* Thinking Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setThinkingMode(!thinkingMode)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    thinkingMode 
                      ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold' 
                      : 'border-transparent text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                  }`}
                  title="Toggle Extended Thinking Mode (Deep reasoning trace)"
                >
                  <Brain size={12} className={thinkingMode ? 'text-amber-500' : 'text-neutral-400'} />
                  <span>Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Web Search Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setWebMode(!webMode)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    webMode 
                      ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'border-transparent text-neutral-500 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                  }`}
                  title="Toggle Real-time Web Search Grounding"
                >
                  <Globe size={12} className={webMode ? 'text-blue-500' : 'text-neutral-400'} />
                  <span>Web: {webMode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Improve Prompt */}
                {input.trim() && (
                  <button
                    type="button"
                    onClick={handleImproveText}
                    disabled={isImproving || isThinking}
                    className="p-1 rounded-lg text-amber-500 hover:text-amber-600 transition-colors"
                    title="Improve prompt with AI"
                  >
                    {isImproving ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  </button>
                )}
              </div>

              {/* Right Group */}
              <div className="flex items-center gap-2">
                {/* Summarize button */}
                <button
                  type="button"
                  onClick={() => onSummarize?.()}
                  disabled={!currentDocumentId || isThinking}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors disabled:opacity-40"
                  style={{ 
                    borderColor: isDark ? '#383734' : '#e5e3da', 
                    color: isDark ? '#eceae6' : '#2d2b28' 
                  }}
                  title={currentDocumentId ? 'Generate comprehensive document summary' : 'Attach a document to summarize'}
                >
                  Summarize
                </button>

                {/* Gemini Live Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveAudioOpen(true)}
                  className="h-7 px-2.5 rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white font-medium text-xs shadow-xs transition-all cursor-pointer"
                  title="Open Gemini Live Voice Session"
                >
                  <div className="flex items-center gap-0.5 h-2.5">
                    <span className="w-0.5 h-2 bg-white rounded-full animate-pulse" />
                    <span className="w-0.5 h-2.5 bg-white rounded-full animate-pulse delay-75" />
                    <span className="w-0.5 h-1.5 bg-white rounded-full animate-pulse delay-150" />
                  </div>
                  <span className="font-semibold text-[11px]">Live</span>
                </button>

                {/* Circular Send Button */}
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shadow-xs cursor-pointer ${
                    input.trim() && !isThinking
                      ? 'bg-[#da7756] text-white hover:opacity-90'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-50'
                  }`}
                  title="Send message"
                >
                  <ArrowUp size={15} />
                </button>
              </div>
            </div>
          </form>
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

export default ChatPanel;
