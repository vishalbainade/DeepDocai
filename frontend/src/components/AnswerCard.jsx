import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { Copy, Check, Info, FileText } from 'lucide-react';
import ChatTable from './ChatTable';
import CitationBadge from './CitationBadge';
import AIMessageRenderer from './AIMessageRenderer';
import { formatAIResponse } from '../utils/responseFormatter';

// ── Streaming Smoother (Typewriter Queue) ──
function useSmoothedText(rawText, isStreaming) {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(rawText);
      return;
    }

    if (rawText.length > displayedText.length) {
      const remainingBytes = rawText.length - displayedText.length;
      let addChars = 1;
      
      if (remainingBytes > 300) addChars = 35; 
      else if (remainingBytes > 100) addChars = 12;
      else if (remainingBytes > 50) addChars = 5;
      else if (remainingBytes > 10) addChars = 2;
      
      const timer = setTimeout(() => {
        setDisplayedText(rawText.substring(0, displayedText.length + addChars));
      }, 10);
      
      return () => clearTimeout(timer);
    }
  }, [rawText, displayedText, isStreaming]);

  return displayedText;
}

const getMarkdownComponents = (onCitationClick) => ({
  p: ({ children }) => <p className="mb-4 leading-[1.7] text-slate-700">{children}</p>,
  strong: ({ children }) => <strong className="font-[600] text-slate-900">{children}</strong>,
  ul: ({ children }) => <ul className="mb-4 ml-6 list-outside list-disc space-y-1.5 text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-outside list-decimal space-y-1.5 text-slate-700">{children}</ol>,
  h3: ({ children }) => <h3 className="font-semibold text-[17px] text-gray-900 mb-3 tracking-tight border-b border-slate-100 pb-2">{children}</h3>,
  citation: (props) => (
    <span
      className="ml-1 px-2 py-0.5 text-xs bg-indigo-100/80 hover:bg-indigo-200 text-indigo-700 font-medium rounded-md cursor-pointer transition-colors shadow-sm inline-block translate-y-[-1px]"
      onClick={(e) => {
        e.stopPropagation();
        if (onCitationClick) {
          onCitationClick({ page: parseInt(props.page, 10) });
        }
      }}
      title={`Go to Page ${props.page}`}
    >
      [Pg. {props.page}]
    </span>
  )
});

const AnswerCard = ({ message, onCitationClick, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const smoothedContent = useSmoothedText(message?.content || '', message?.isStreaming);

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
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={getMarkdownComponents(onCitationClick)}>{message.answer}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[15px] space-y-4">
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]} 
              rehypePlugins={[rehypeRaw]} 
              components={getMarkdownComponents(onCitationClick)}
            >
              {smoothedContent.replace(/\[Pg\.\s*(\d+)\]/g, '<citation page="$1"></citation>')}
            </ReactMarkdown>
          </div>
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
