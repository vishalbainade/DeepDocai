import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import AnswerCard from './AnswerCard';

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
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_55%,_#eef2ff_100%)]">
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">DeepDocAI Chat</p>
          <p className="text-sm text-slate-500">Streaming answers with citations and PDF sync</p>
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
              className="min-w-[220px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
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
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>
        </div>
      </div>

          <div className="flex-1 overflow-y-auto px-2 sm:px-5 py-8" ref={scrollerRef}>
            {!chatHistory.length ? (
              <div className="flex h-full items-center justify-center">
                <div className="max-w-sm rounded-3xl border border-white/70 bg-white/70 px-8 py-10 text-center shadow-xl shadow-slate-200/70 backdrop-blur">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <MessageSquare size={24} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">Ask about your document</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
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
                    <div className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-sm ${
                        isUser 
                          ? 'bg-slate-800 text-white' 
                          : 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-100 via-white to-slate-100 border border-slate-200 text-indigo-700'
                      }`}
                    >
                      {isUser ? <User size={18} strokeWidth={2.5} /> : <Bot size={20} strokeWidth={2} className={`${isStreaming ? 'animate-pulse text-indigo-500' : ''}`} />}
                    </div>

                    {/* Message Bubble */}
                    <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl px-6 py-4.5 ${
                        isUser 
                          ? 'rounded-tr-sm bg-slate-800 text-white shadow-md' 
                          : 'rounded-tl-sm border border-slate-200/60 bg-white/95 text-slate-800 shadow-xl shadow-slate-200/40 backdrop-blur-sm'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed font-normal">{message.content}</p>
                      ) : (
                        <div className="text-[15px] max-w-none">
                          {!message.content && !message.table && isStreaming ? (
                            <div className="flex items-center gap-3 text-slate-500 py-2">
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

      <div className="border-t border-slate-200 bg-white/85 px-4 py-4 backdrop-blur">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={!currentDocumentId || isThinking}
              placeholder={currentDocumentId ? 'Ask a question about this document...' : 'Upload a document first...'}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-24 text-sm text-slate-800 shadow-sm transition focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
            />

            {input.trim() ? (
              <button
                type="button"
                onClick={handleImproveText}
                disabled={isImproving || isThinking}
                className="absolute right-12 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-amber-600 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
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
