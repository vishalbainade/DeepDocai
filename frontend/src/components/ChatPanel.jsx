import { useEffect, useRef, useState } from 'react';
import { 
  Bot, 
  ChevronDown, 
  Loader2, 
  MessageSquare, 
  ArrowUp, 
  Sparkles, 
  User, 
  Brain, 
  Globe, 
  Upload, 
  Cpu, 
  Sliders, 
  Folder,
  Mic
} from 'lucide-react';
import AnswerCard from './AnswerCard';
import ClaudeModelSelector from './ClaudeModelSelector';
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
  chatHistory,
  onSendMessage,
  onSummarize,
  isThinking,
  currentDocumentId,
  selectedModel,
  availableModels = [],
  modelsLoaded = false,
  onModelChange,
  onCitationClick,
}) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  const [input, setInput] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const submitLockRef = useRef(false);

  const {
    thinkingMode,
    setThinkingMode,
    webMode,
    setWebMode,
    activeProject,
    setIsMultiUploadOpen,
    setIsUsageModalOpen,
    setIsPersonalizationModalOpen,
    setIsLiveAudioOpen,
    usageSummary,
  } = useChat();

  const modelOptions = Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : DEFAULT_MODEL_OPTIONS;

  // Wait to determine active model until models are loaded
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
    if (!isThinking) {
      submitLockRef.current = false;
    }
  }, [isThinking]);

  const runSingleSubmit = (submitter) => {
    if (submitLockRef.current) {
      return;
    }

    submitLockRef.current = true;
    const accepted = submitter();

    if (accepted === false) {
      submitLockRef.current = false;
    }
  };

  const handleSubmit = (event) => {
    if (event) event.preventDefault();
    runSingleSubmit(() => {
      if (!input.trim() || isThinking) {
        return false;
      }

      const accepted = onSendMessage?.(input.trim());
      if (accepted === false) {
        return false;
      }

      setInput('');
      return true;
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleImproveText = async () => {
    if (!input.trim() || isImproving || isThinking) {
      return;
    }

    setIsImproving(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiBaseUrl}/api/ask/improve-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ text: input }),
      });

      if (!response.ok) {
        throw new Error('Failed to improve text');
      }

      const data = await response.json();
      if (data.improvedText) {
        setInput(data.improvedText);
      }
    } catch (error) {
      console.error('Failed to improve text', error);
    } finally {
      setIsImproving(false);
    }
  };

  // Group models by provider for dropdown
  const groupedModels = modelOptions.reduce((groups, model) => {
    const slug = model.provider?.slug || 'google';
    const name = model.provider?.name || 'Google AI Studio';
    if (!groups[slug]) {
      groups[slug] = { name, models: [] };
    }
    groups[slug].models.push(model);
    return groups;
  }, {});

  return (
    <div 
      className="flex h-full flex-col transition-colors duration-300"
      style={{ 
        backgroundColor: isDark ? '#101013' : '#fcfcfc' 
      }}
    >
      {/* Header Bar */}
      <div 
        className="flex items-center justify-between px-5 py-3 border-b backdrop-blur z-10"
        style={{ 
          backgroundColor: isDark ? 'rgba(19, 19, 22, 0.85)' : 'rgba(255, 255, 255, 0.85)', 
          borderColor: isDark ? '#27272a' : '#f0f0f2' 
        }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {activeProject ? (
            <span 
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0"
              style={{ backgroundColor: `${activeProject.color}15`, color: activeProject.color }}
            >
              <Folder size={12} /> {activeProject.name}
            </span>
          ) : (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold" style={{ color: dc.textPrimary }}>Document Analysis</span>
            </div>
          )}
        </div>

        {/* Right side controls: Token usage pill, Personalization, Model switcher */}
        <div className="flex items-center gap-2">
          {/* Quick Token pill */}
          <button
            onClick={() => setIsUsageModalOpen(true)}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono border hover:bg-slate-500/5 transition-colors cursor-pointer"
            style={{ borderColor: isDark ? '#27272a' : '#e4e4e7', color: dc.textSecondary }}
            title="View Usage & Token Consumption"
          >
            <Cpu size={12} className="text-amber-500" />
            <span>{Math.round((usageSummary?.aiTokens?.totalTokens ?? 12300) / 1000)}k tkn</span>
          </button>

          {/* Personalization shortcut */}
          <button
            onClick={() => setIsPersonalizationModalOpen(true)}
            className="p-1.5 rounded-lg border hover:bg-slate-500/5 transition-colors text-slate-500"
            title="Personalization settings"
          >
            <Sliders size={14} />
          </button>

          {/* Claude Model Selector */}
          <ClaudeModelSelector
            selectedModel={activeModel}
            onModelChange={onModelChange}
            availableModels={modelOptions}
            disabled={isThinking}
            placement="top-down"
            compact={true}
          />
        </div>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6" ref={scrollerRef}>
        {!chatHistory.length ? (
          <div className="flex h-full items-center justify-center">
            <div 
              className="max-w-md rounded-2xl p-8 text-center border shadow-sm backdrop-blur"
              style={{ 
                backgroundColor: isDark ? '#141417' : '#ffffff', 
                borderColor: isDark ? '#27272a' : '#f0f0f2' 
              }}
            >
              <div 
                className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(218, 119, 86, 0.15)', color: '#da7756' }}
              >
                <Sparkles size={22} />
              </div>
              <h3 className="text-base font-bold" style={{ color: dc.textPrimary }}>Ask anything about this document</h3>
              <p className="mt-1.5 text-xs leading-relaxed" style={{ color: dc.textSecondary }}>
                Stream real-time answers with verified citations, extended chain-of-thought reasoning, and live web intelligence.
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {chatHistory.map((message, index) => {
              if (!message) return null;

              const isUser = (message.role || '').toLowerCase() === 'user';
              const isStreaming = message.isStreaming;

              return (
                <div key={message.id || index} className={`flex w-full items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {/* Avatar */}
                  <div 
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-semibold shadow-xs ${
                      isUser ? 'bg-slate-900 text-white' : ''
                    }`}
                    style={{ 
                      backgroundColor: !isUser ? (isDark ? '#232328' : '#f4f4f5') : undefined,
                      color: !isUser ? '#da7756' : undefined,
                    }}
                  >
                    {isUser ? <User size={15} /> : <Sparkles size={16} className={isStreaming ? 'animate-spin text-amber-500' : ''} />}
                  </div>

                  {/* Message Bubble */}
                  <div 
                    className={`relative max-w-[85%] rounded-2xl px-5 py-3.5 transition-colors ${
                      isUser
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'border shadow-xs'
                    }`}
                    style={{
                      backgroundColor: !isUser ? (isDark ? '#16161a' : '#ffffff') : undefined,
                      borderColor: !isUser ? (isDark ? '#27272a' : '#e4e4e7') : undefined,
                      color: !isUser ? dc.textPrimary : undefined,
                    }}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    ) : (
                      <div className="text-sm">
                        {!message.content && !message.table && isStreaming ? (
                          <div className="flex items-center gap-2 py-1 text-xs text-amber-500">
                            <Loader2 size={15} className="animate-spin" />
                            <span className="animate-pulse">Reasoning and analyzing document...</span>
                          </div>
                        ) : (
                          <AnswerCard
                            message={message}
                            onCitationClick={onCitationClick}
                            onRegenerate={() => {
                              const idx = chatHistory.findIndex((m) => m.id === message.id);
                              let lastUserMsg = null;
                              for (let i = idx - 1; i >= 0; i--) {
                                if (chatHistory[i].role === 'user') {
                                  lastUserMsg = chatHistory[i].content;
                                  break;
                                }
                              }
                              if (lastUserMsg) {
                                onSendMessage(lastUserMsg);
                              }
                            }}
                          />
                        )}

                        {isStreaming && (
                          <span className="ml-1 inline-block h-[1em] w-1.5 animate-pulse rounded-full bg-amber-500 align-middle" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={endRef} className="h-4 w-full" />
          </div>
        )}
      </div>

      {/* Claude-style Floating Prompt Box */}
      <div 
        className="p-4 border-t transition-colors"
        style={{ 
          borderColor: isDark ? '#27272a' : '#f0f0f2',
          backgroundColor: isDark ? '#101013' : '#fafafa',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div 
            className="rounded-2xl border shadow-lg p-3 transition-all focus-within:ring-2 focus-within:ring-amber-500/30"
            style={{
              backgroundColor: isDark ? '#18181b' : '#ffffff',
              borderColor: isDark ? '#2e2e34' : '#e4e4e7',
            }}
          >
            {/* Claude-style Active Document Attachment Pill */}
            {currentFileName && (
              <div className="flex items-center gap-1.5 mb-2 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium w-fit">
                <FileText size={12} className="text-amber-500" />
                <span className="truncate max-w-[220px] font-semibold">{currentFileName}</span>
                <span className="text-[10px] text-emerald-500 font-bold">• Reconstructed OCR Active</span>
              </div>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isThinking}
              placeholder={currentFileName ? `Ask anything about ${currentFileName} (Shift+Enter for new line)...` : 'Ask anything about your documents, contracts, or legal questions...'}
              rows={2}
              className="w-full bg-transparent resize-none text-sm outline-none leading-relaxed placeholder:text-slate-400"
              style={{ color: dc.textPrimary }}
            />

            {/* Bottom Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-1"
              style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
            >
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Claude Model Selector in prompt box */}
                <ClaudeModelSelector
                  selectedModel={activeModel}
                  onModelChange={onModelChange}
                  availableModels={modelOptions}
                  disabled={isThinking}
                  placement="bottom-up"
                  compact={false}
                />

                {/* Thinking Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setThinkingMode(!thinkingMode)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    thinkingMode 
                      ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold' 
                      : 'border-transparent text-slate-500 hover:bg-slate-500/5'
                  }`}
                  title="Toggle Extended Thinking Mode (Deep reasoning trace)"
                >
                  <Brain size={13} className={thinkingMode ? 'text-amber-500' : 'text-slate-400'} />
                  <span>Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Web Search Mode Toggle */}
                <button
                  type="button"
                  onClick={() => setWebMode(!webMode)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    webMode 
                      ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'border-transparent text-slate-500 hover:bg-slate-500/5'
                  }`}
                  title="Toggle Real-time Web Search Grounding"
                >
                  <Globe size={13} className={webMode ? 'text-blue-500' : 'text-slate-400'} />
                  <span>Web: {webMode ? 'ON' : 'OFF'}</span>
                </button>

                {/* Upload More Files */}
                <button
                  type="button"
                  onClick={() => setIsMultiUploadOpen(true)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                  title="Upload more files to project"
                >
                  <Upload size={14} />
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
                    {isImproving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Summarize button */}
                <button
                  type="button"
                  onClick={() => onSummarize?.()}
                  disabled={!currentDocumentId || isThinking}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border hover:bg-slate-500/5 transition-colors disabled:opacity-40"
                  style={{ borderColor: isDark ? '#27272a' : '#e4e4e7', color: dc.textSecondary }}
                >
                  Summarize
                </button>

                {/* Gemini Live Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveAudioOpen(true)}
                  className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white font-medium text-xs shadow-sm transition-all cursor-pointer group"
                  title="Open Gemini Live Voice Session"
                >
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-0.5 h-2 bg-white rounded-full group-hover:h-3 transition-all animate-pulse" />
                    <span className="w-0.5 h-3 bg-white rounded-full group-hover:h-3.5 transition-all animate-pulse delay-75" />
                    <span className="w-0.5 h-2.5 bg-white rounded-full group-hover:h-3 transition-all animate-pulse delay-150" />
                    <span className="w-0.5 h-1.5 bg-white rounded-full group-hover:h-2.5 transition-all animate-pulse delay-200" />
                  </div>
                  <span className="font-semibold tracking-tight text-[11px]">Live</span>
                </button>

                {/* Send Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() || isThinking}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 cursor-pointer shadow-sm"
                  style={{ backgroundColor: '#da7756' }}
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
