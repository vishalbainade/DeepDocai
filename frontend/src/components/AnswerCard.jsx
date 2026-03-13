import ReactMarkdown from 'react-markdown';
import ChatTable from './ChatTable';
import CitationBadge from './CitationBadge';
import { extractTableFromContent } from '../utils/tableParser';

const markdownComponents = {
  p: ({ children }) => <p className="mb-3 last:mb-0 leading-relaxed text-slate-700">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1.5 text-slate-700">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1.5 text-slate-700">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-amber-400 pl-4 italic text-slate-600">{children}</blockquote>,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{children}</code>,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">{children}</pre>,
};

const renderParagraphs = (message, onCitationClick) => {
  const paragraphGroups = Array.isArray(message.paragraphCitations) ? message.paragraphCitations : [];
  if (!paragraphGroups.length) {
    return null;
  }

  return (
    <div className="space-y-4">
      {paragraphGroups.map((paragraph) => (
        <div key={`paragraph-${paragraph.paragraphIndex}`} className="space-y-2">
          <ReactMarkdown components={markdownComponents}>{paragraph.text}</ReactMarkdown>
          {paragraph.citations?.length ? (
            <div className="flex flex-wrap gap-2">
              {paragraph.citations.map((citation, index) => (
                <CitationBadge
                  key={`${citation.chunkId || paragraph.paragraphIndex}-${index}`}
                  citation={citation}
                  onClick={onCitationClick}
                />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

const renderSources = (citations, onCitationClick) => {
  if (!Array.isArray(citations) || !citations.length) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-slate-200 pt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Sources</p>
      <div className="flex flex-wrap gap-2">
        {citations.map((citation, index) => (
          <CitationBadge key={`${citation.chunkId || citation.page}-${index}`} citation={citation} onClick={onCitationClick} />
        ))}
      </div>
    </div>
  );
};

const AnswerCard = ({ message, onCitationClick }) => {
  if (!message) {
    return null;
  }

  if (message.answer_type === 'table' && message.table) {
    return (
      <div>
        <ChatTable title={message.table.title} columns={message.table.columns} rows={message.table.rows} />
        {message.answer ? (
          <div className="mt-4">
            <ReactMarkdown components={markdownComponents}>{message.answer}</ReactMarkdown>
          </div>
        ) : null}
        {renderSources(message.citations, onCitationClick)}
      </div>
    );
  }

  const content = message.content || '';
  const paragraphRender = renderParagraphs(message, onCitationClick);

  if (paragraphRender) {
    return (
      <div>
        {paragraphRender}
        {renderSources(message.citations, onCitationClick)}
      </div>
    );
  }

  const extracted = extractTableFromContent(content);
  if (extracted.table) {
    return (
      <div>
        <ChatTable columns={extracted.table.columns} rows={extracted.table.rows} />
        {extracted.remainingContent ? (
          <div className="mt-4">
            <ReactMarkdown components={markdownComponents}>{extracted.remainingContent}</ReactMarkdown>
          </div>
        ) : null}
        {renderSources(message.citations, onCitationClick)}
      </div>
    );
  }

  return (
    <div>
      <ReactMarkdown components={markdownComponents}>{content || ''}</ReactMarkdown>
      {renderSources(message.citations, onCitationClick)}
    </div>
  );
};

export default AnswerCard;
