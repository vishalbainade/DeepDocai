import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Info, FileText } from 'lucide-react';
import ChatTable from './ChatTable';
import CitationBadge from './CitationBadge';
import AIMessageRenderer from './AIMessageRenderer';
import { formatAIResponse } from '../utils/responseFormatter';

const markdownComponents = {
  p: ({ children }) => <p className="mb-4 leading-[1.7] text-slate-700">{children}</p>,
  strong: ({ children }) => <strong className="font-[600] text-slate-900">{children}</strong>,
  ul: ({ children }) => <ul className="mb-4 ml-6 list-outside list-disc space-y-1.5 text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-outside list-decimal space-y-1.5 text-slate-700">{children}</ol>,
};

const AnswerCard = ({ message, onCitationClick, onRegenerate }) => {
  const [copied, setCopied] = useState(false);

  if (!message) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If the parsed JSON provides dynamic text sources, use those. Otherwise fallback to the backend properties.
  const parsedResponse = message.content ? formatAIResponse(message.content) : { sources: [] };
  const getUniqueCitations = (citationsArray) => {
    if (!citationsArray || !citationsArray.length) return [];
    const seen = new Set();
    const unique = [];
    citationsArray.forEach((cit) => {
      const key = `${cit.page}-${cit.chunkId}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cit);
      }
    });
    return unique.sort((a, b) => a.page - b.page);
  };
  
  // Natively mapped deduplicated sources from either backend or dynamically parsed LLM tokens
  const backendCitations = getUniqueCitations(message.citations || (message.paragraphCitations || []).flatMap((p) => p.citations || []));
  const dynamicSources = parsedResponse.sources.map(pg => ({ page: pg }));
  
  const uniqueCitations = dynamicSources.length > 0 ? dynamicSources : backendCitations;

  return (
    <div className="group relative transition-all duration-300">
      
      {/* Dynamic structured content */}
      <div className="text-slate-800">
        {message.answer_type === 'table' && message.table ? (
          <div className="mb-4 overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <ChatTable title={message.table.title} columns={message.table.columns} rows={message.table.rows} />
            {message.answer && (
              <div className="px-5 py-4 bg-white/50">
                <ReactMarkdown components={markdownComponents}>{message.answer}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <AIMessageRenderer 
            rawText={message.content} 
            paragraphCitations={message.paragraphCitations}
            citations={message.citations}
            onCitationClick={onCitationClick} 
          />
        )}
      </div>

      {/* Footer Meta: Actions & Deduplicated Sources */}
      <div className="mt-4 flex flex-wrap items-center justify-between border-t border-slate-200/60 pt-3">
        
        {/* Sources List & Model Badge */}
        <div className="flex-1 space-y-2">
          {uniqueCitations.length > 0 && (
            <div className="text-[13.5px] text-slate-500 font-medium">
              📚 Sources:{' '}
              <span className="text-slate-600">
                {uniqueCitations.map(c => `Pg. ${c.page}`).join(', ')}
              </span>
            </div>
          )}
          {message.modelUsed && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-400">
              <span className="text-slate-300">🤖</span> {message.modelUsed}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-lg border border-transparent p-1.5 text-slate-400 transition hover:bg-slate-100 hover:border-slate-200 hover:text-slate-700 hover:shadow-sm focus:outline-none"
            title="Copy"
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>
          <button
            onClick={() => {
              if (onRegenerate) onRegenerate();
            }}
            className="flex items-center justify-center rounded-lg border border-transparent p-1.5 text-slate-400 transition hover:bg-slate-100 hover:border-slate-200 hover:text-slate-700 hover:shadow-sm focus:outline-none"
            title="Regenerate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnswerCard;
