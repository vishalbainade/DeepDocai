import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import AnswerCard from './AnswerCard';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const PROVIDER_COLORS = {
  google: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  openrouter: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  glm: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' },
  nvidia: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

const DEFAULT_MODEL_OPTIONS = [
  { id: 'gemini-2.5-flash', displayName: 'Gemini 2.5 Flash', label: 'Gemini 2.5 Flash', provider: { slug: 'google', name: 'Google AI Studio' } },
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

  const modelOptions = Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : DEFAULT_MODEL_OPTIONS;

  // Wait to determine active model until models are loaded. If not loaded, use the raw selectedModel string if available.
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
    event.preventDefault();
    runSingleSubmit(() => {
      if (!input.trim() || !currentDocumentId || isThinking) {
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

  // Group models by provider for the dropdown
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
        background: isDark 
          ? 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
          : 'linear-gradient(180deg, #fffdf7 0%, #f8fafc 55%, #eef2ff 100%)' 
      }}
    >
      <div 
        className="flex items-center justify-between px-6 py-4 backdrop-blur transition-colors duration-300"
        style={{ backgroundColor: `${dc.bgPrimary}CC`, borderBottom: `1px solid ${dc.borderPrimary}` }}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>DeepDocAI Chat</p>
          <p className="text-sm" style={{ color: dc.textMuted }}>Streaming answers with citations and PDF sync</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Provider badge */}
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${providerColors.bg} ${providerColors.text} ${providerColors.border} border`}>
            <span className={`h-1.5 w-1.5 rounded-full ${providerColors.dot}`} />
            {activeModelData?.provider?.name || 'Google AI Studio'}
          </span>

          {/* Model selector */}
          <div className="relative">
            <select
              value={activeModel}
              onChange={(event) => onModelChange?.(event.target.value)}
              disabled={isThinking}
              className="min-w-[220px] appearance-none rounded-xl px-3 py-2 pr-9 text-sm font-medium shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ 
                backgroundColor: dc.bgPrimary, 
                borderColor: dc.borderPrimary,
                color: dc.textSecondary,
                borderWidth: '1px'
              }}
            >
              {Object.entries(groupedModels).map(([slug, group]) => (
                <optgroup key={slug} label={group.name}>
                  {group.models.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.displayName || model.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" style={{ color: dc.textFaint }} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-5 py-8" ref={scrollerRef}>
        {!chatHistory.length ? (
          <div className="flex h-full items-center justify-center">
            <div 
              className="max-w-sm rounded-3xl px-8 py-10 text-center shadow-xl backdrop-blur transition-colors duration-300"
              style={{ backgroundColor: `${dc.bgPrimary}B3`, border: `1px solid ${dc.borderPrimary}`, boxShadow: dc.shadowCard }}
            >
              <div 
                className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full transition-colors duration-300"
                style={{ backgroundColor: isDark ? '#312e81' : '#eef2ff', color: '#6366f1' }}
              >
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: dc.textPrimary }}>Ask about your document</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: dc.textMuted }}>
                Stream answers live, inspect cited paragraphs, and jump straight to the source in the PDF.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl space-y-8 pb-4">
            {chatHistory.map((message, index) => {
              if (!message) return null;

              const isUser = (message.role || '').toLowerCase() === 'user';
              const isStreaming = message.isStreaming;

              return (
                <div key={message.id || index} className={`flex w-full items-start gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

                  {/* Avatar */}
                  <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm transition-colors duration-300 ${isUser
                      ? 'bg-slate-800 text-white'
                      : ''
                    }`}
                    style={{ 
                      backgroundColor: !isUser ? dc.bgPrimary : undefined,
                      border: !isUser ? `1px solid ${dc.borderPrimary}` : undefined,
                      color: !isUser ? '#6366f1' : undefined
                    }}
                  >
                    {isUser ? <User size={18} strokeWidth={2.5} /> : <Bot size={20} strokeWidth={2} className={`${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />}
                  </div>

                  {/* Message Bubble */}
                  <div 
                    className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-4.5 transition-colors duration-300 ${isUser
                      ? 'rounded-tr-sm bg-slate-800 text-white shadow-md'
                      : 'rounded-tl-sm shadow-xl backdrop-blur-sm'
                    }`}
                    style={{
                      backgroundColor: !isUser ? `${dc.bgPrimary}F2` : undefined,
                      border: !isUser ? `1px solid ${dc.borderPrimary}` : undefined,
                      color: !isUser ? dc.textPrimary : undefined,
                    }}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-normal">{message.content}</p>
                    ) : (
                      <div className="text-[15px] max-w-none">
                        {!message.content && !message.table && isStreaming ? (
                          <div className="flex items-center gap-3 py-2" style={{ color: dc.textMuted }}>
                            <Loader2 size={18} className="animate-spin text-indigo-500" />
                            <span className="animate-pulse">Analyzing document...</span>
                          </div>
                        ) : (
                          <AnswerCard
                            message={message}
                            onCitationClick={onCitationClick}
                            onRegenerate={() => {
                              // Find the closest preceding user message
                              const idx = chatHistory.findIndex(m => m.id === message.id);
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
                          <span className="ml-1 inline-block h-[1em] w-2 animate-pulse rounded-sm bg-indigo-400 align-middle shadow-sm" />
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

      <div 
        className="px-4 py-4 backdrop-blur transition-colors duration-300"
        style={{ borderTop: `1px solid ${dc.borderPrimary}`, backgroundColor: `${dc.bgPrimary}D9` }}
      >
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={!currentDocumentId || isThinking}
              placeholder={currentDocumentId ? 'Ask a question about this document...' : 'Upload a document first...'}
              className="w-full rounded-2xl px-4 py-3 pr-24 text-sm shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed"
              style={{
                backgroundColor: dc.bgInput,
                border: `1px solid ${dc.borderPrimary}`,
                color: dc.textPrimary,
              }}
            />

            {input.trim() ? (
              <button
                type="button"
                onClick={handleImproveText}
                disabled={isImproving || isThinking}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ color: isDark ? '#fbbf24' : '#b45309' }}
                title="Improve question"
              >
                {isImproving ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() =>
              runSingleSubmit(() => {
                if (!currentDocumentId || isThinking) {
                  return false;
                }

                return onSummarize?.();
              })
            }
            disabled={!currentDocumentId || isThinking}
            className="rounded-2xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50"
            style={{ 
              backgroundColor: isDark ? '#78350f' : '#fff7ed', 
              color: isDark ? '#fef3c7' : '#7c2d12',
              border: `1px solid ${isDark ? '#92400e' : '#fed7aa'}`
            }}
          >
            Summarize
          </button>

          <button
            type="submit"
            disabled={!currentDocumentId || !input.trim() || isThinking}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send size={16} />
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
