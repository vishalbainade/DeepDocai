import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, Info, FileText, Zap } from 'lucide-react';
import ChatTable from './ChatTable';
import CitationBadge from './CitationBadge';
import AIMessageRenderer from './AIMessageRenderer';
import ThinkingBlock from './ThinkingBlock';
import WebSourcesBox from './WebSourcesBox';
import { formatAIResponse } from '../utils/responseFormatter';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const MarkdownComponents = ({ resolvedTheme, dc }) => ({
  p: ({ children }) => <p className="mb-4 leading-[1.7] transition-colors duration-300" style={{ color: dc.textSecondary }}>{children}</p>,
  strong: ({ children }) => <strong className="font-[600] transition-colors duration-300" style={{ color: dc.textPrimary }}>{children}</strong>,
  ul: ({ children }) => <ul className="mb-4 ml-6 list-outside list-disc space-y-1.5 transition-colors duration-300" style={{ color: dc.textSecondary }}>{children}</ul>,
  ol: ({ children }) => <ol className="mb-4 ml-6 list-outside list-decimal space-y-1.5 transition-colors duration-300" style={{ color: dc.textSecondary }}>{children}</ol>,
});

const AnswerCard = ({ message, onCitationClick, onRegenerate }) => {
  const [copied, setCopied] = useState(false);
  const dc = useDarkColors();
  const isDark = useIsDark();
  const markdownComponents = MarkdownComponents({ dc });

  if (!message) return null;

  // Extract thinking tags if present
  let rawContent = message.content || '';
  let thoughtContent = message.thoughtContent || null;
  let cleanContent = rawContent;

  const thoughtMatch = rawContent.match(/<thought>([\s\S]*?)<\/thought>/);
  if (thoughtMatch) {
    thoughtContent = thoughtMatch[1].trim();
    cleanContent = rawContent.replace(/<thought>[\s\S]*?<\/thought>/, '').trim();
  } else if (rawContent.includes('<thought>') && !rawContent.includes('</thought>')) {
    // Currently streaming thought
    thoughtContent = rawContent.replace('<thought>', '').trim();
    cleanContent = '';
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanContent || message.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // If the parsed JSON provides dynamic text sources, use those. Otherwise fallback to the backend properties.
  const parsedResponse = cleanContent ? formatAIResponse(cleanContent) : { sources: [] };
  const normalizeCitationList = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input.filter((item) => item && typeof item === 'object');
    if (typeof input === 'object') {
      if ('page' in input || 'text' in input || 'chunkId' in input) return [input];
      try {
        const flattened = Object.values(input).flat();
        return Array.isArray(flattened) ? flattened.filter((item) => item && typeof item === 'object') : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const getUniqueCitations = (citationsArray) => {
    if (!Array.isArray(citationsArray) || !citationsArray.length) return [];
    const seen = new Set();
    const unique = [];
    citationsArray.forEach((cit) => {
      if (!cit || typeof cit !== 'object') return;
      const key = `${cit.page || 1}-${cit.chunkId || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(cit);
      }
    });
    return unique.sort((a, b) => (Number(a.page) || 0) - (Number(b.page) || 0));
  };

  // Natively mapped deduplicated sources from either backend or dynamically parsed LLM tokens
  const safeMessageCitations = normalizeCitationList(message.citations);
  const safeParagraphCitations = Array.isArray(message.paragraphCitations)
    ? message.paragraphCitations.flatMap((p) => normalizeCitationList(p?.citations || p))
    : [];

  const backendCitations = getUniqueCitations(
    safeMessageCitations.length > 0 ? safeMessageCitations : safeParagraphCitations
  );
  const dynamicSources = Array.isArray(parsedResponse?.sources)
    ? parsedResponse.sources.map((pg) => ({ page: pg }))
    : [];
  const uniqueCitations = dynamicSources.length > 0 ? dynamicSources : backendCitations;

  const webSources = message.webSources || [];
  const tokenCount = message.usage?.totalTokens || message.totalTokens;

  return (
    <div className="group relative transition-all duration-300">

      {/* Claude-style Expandable Thinking Block */}
      {thoughtContent && (
        <ThinkingBlock 
          content={thoughtContent} 
          isStreaming={message.isStreaming && !cleanContent} 
        />
      )}

      {/* Claude-style Real-time Web Sources Grounding */}
      {webSources.length > 0 && (
        <WebSourcesBox sources={webSources} />
      )}

      {/* Dynamic structured content */}
      <div className="transition-colors duration-300" style={{ color: dc.textPrimary }}>
        {/* Real-time Streaming Processing Indicator (before first token) */}
        {message.isStreaming && !cleanContent && !thoughtContent && (
          <div className="flex items-center gap-2 py-3 px-1 animate-in fade-in duration-200">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-[#da7756] animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="inline-block w-2 h-2 rounded-full bg-[#da7756] animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="inline-block w-2 h-2 rounded-full bg-[#da7756] animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs font-serif italic text-neutral-400 dark:text-neutral-500 animate-pulse">
              Thinking...
            </span>
          </div>
        )}

        {message.answer_type === 'table' && message.table ? (
          <div className="mb-4 overflow-hidden rounded-2xl shadow-sm transition-colors duration-300" style={{ border: `1px solid ${dc.borderPrimary}` }}>
            <ChatTable title={message.table.title} columns={message.table.columns} rows={message.table.rows} />
            {message.answer && (
              <div className="px-5 py-4 transition-colors duration-300" style={{ backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.5)' }}>
                <ReactMarkdown components={markdownComponents}>{message.answer}</ReactMarkdown>
              </div>
            )}
          </div>
        ) : (
          <AIMessageRenderer
            rawText={cleanContent}
            paragraphCitations={message.paragraphCitations}
            citations={message.citations}
            onCitationClick={onCitationClick}
            isStreaming={message.isStreaming}
          />
        )}
      </div>

      {/* Footer Meta: Actions & Deduplicated Sources */}
      <div className="mt-4 flex flex-wrap items-center justify-between pt-3 transition-colors duration-300" style={{ borderTop: `1px solid ${dc.borderPrimary}99` }}>

        {/* Sources List & Model & Token Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {uniqueCitations.length > 0 && (
            <div className="text-[13px] font-medium transition-colors duration-300 mr-2" style={{ color: dc.textMuted }}>
              📚 Sources:{' '}
              <span style={{ color: dc.textSecondary }}>
                {uniqueCitations.map(c => `Pg. ${c.page}`).join(', ')}
              </span>
            </div>
          )}

          {message.modelUsed && (
            <div 
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-wide transition-colors duration-300"
              style={{ backgroundColor: dc.bgSecondary, border: `1px solid ${dc.borderPrimary}`, color: dc.textFaint }}
            >
              <span>🤖</span> {message.modelUsed}
            </div>
          )}

          {tokenCount && (
            <div 
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium"
              style={{ backgroundColor: 'rgba(16, 185, 129, 0.08)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
            >
              <Zap size={10} /> {tokenCount.toLocaleString()} tokens
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex shrink-0 items-center space-x-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity self-end">
          <button
            onClick={handleCopy}
            className="flex items-center justify-center rounded-lg border border-transparent p-1.5 transition duration-200 focus:outline-none"
            style={{ color: dc.textFaint }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = dc.bgHover;
              e.currentTarget.style.color = dc.textSecondary;
              e.currentTarget.style.borderColor = dc.borderPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = dc.textFaint;
              e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Copy"
          >
            {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
          </button>
          <button
            onClick={() => {
              if (onRegenerate) onRegenerate();
            }}
            className="flex items-center justify-center rounded-lg border border-transparent p-1.5 transition duration-200 focus:outline-none"
            style={{ color: dc.textFaint }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = dc.bgHover;
              e.currentTarget.style.color = dc.textSecondary;
              e.currentTarget.style.borderColor = dc.borderPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = dc.textFaint;
              e.currentTarget.style.borderColor = 'transparent';
            }}
            title="Regenerate"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnswerCard;
