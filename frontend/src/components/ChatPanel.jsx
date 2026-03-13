import { useEffect, useRef, useState } from 'react';
import { Bot, ChevronDown, Loader2, MessageSquare, Send, Sparkles, User } from 'lucide-react';
import AnswerCard from './AnswerCard';

const DEFAULT_MODEL_OPTIONS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
  { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gemma-3-1b', label: 'Gemma 3 1B' },
  { id: 'gemma-3-4b', label: 'Gemma 3 4B' },
  { id: 'gemma-3-12b', label: 'Gemma 3 12B' },
  { id: 'gemma-3-27b', label: 'Gemma 3 27B' },
];

const ChatPanel = ({
  chatHistory,
  onSendMessage,
  onSummarize,
  isThinking,
  currentDocumentId,
  selectedModel,
  availableModels = [],
  onModelChange,
  onCitationClick,
}) => {
  const [input, setInput] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const scrollerRef = useRef(null);
  const endRef = useRef(null);
  const submitLockRef = useRef(false);
  const modelOptions = Array.isArray(availableModels) && availableModels.length > 0 ? availableModels : DEFAULT_MODEL_OPTIONS;
  const activeModel = modelOptions.some((model) => model.id === selectedModel) ? selectedModel : modelOptions[0]?.id || 'gemini-2.5-flash';

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

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(180deg,_#fffdf7_0%,_#f8fafc_55%,_#eef2ff_100%)]">
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-6 py-4 backdrop-blur">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-700">DeepDocAI Chat</p>
          <p className="text-sm text-slate-500">Streaming answers with citations and PDF sync</p>
        </div>

        <div className="relative">
          <select
            value={activeModel}
            onChange={(event) => onModelChange?.(event.target.value)}
            disabled={isThinking}
            className="min-w-[220px] appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-9 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {modelOptions.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div ref={scrollerRef} className="flex-1 overflow-y-auto px-5 py-6">
        {!chatHistory.length ? (
          <div className="flex h-full items-center justify-center">
            <div className="max-w-sm rounded-3xl border border-white/70 bg-white/70 px-8 py-10 text-center shadow-xl shadow-slate-200/70 backdrop-blur">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Ask about your document</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Stream answers live, inspect cited paragraphs, and jump straight to the source in the PDF.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {chatHistory.map((message, index) => {
              if (!message) {
                return null;
              }

              const isUser = (message.role || '').toLowerCase() === 'user';

              return (
                <div key={message.id || index} className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${isUser ? 'bg-slate-900 text-white' : 'bg-amber-100 text-amber-900'}`}>
                    {isUser ? <User size={17} /> : <Bot size={17} />}
                  </div>

                  <div className={`max-w-[82%] rounded-3xl px-5 py-4 shadow-sm ${isUser ? 'rounded-tr-md bg-slate-900 text-white' : 'rounded-tl-md border border-white/60 bg-white/85 text-slate-800 shadow-xl shadow-slate-200/50 backdrop-blur'}`}>
                    {isUser ? (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white">{message.content}</p>
                    ) : (
                      <div className="text-sm">
                        {!message.content && !message.table && message.isStreaming ? (
                          <div className="flex items-center gap-2 text-slate-500">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Generating answer...</span>
                          </div>
                        ) : (
                          <AnswerCard message={message} onCitationClick={onCitationClick} />
                        )}

                        {message.isStreaming ? (
                          <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-amber-500 align-middle" />
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={endRef} />
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
