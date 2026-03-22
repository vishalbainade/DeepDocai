import { useMemo } from 'react';
import { formatAIResponse } from '../utils/responseFormatter';

// Inline tags mapped inside text
function renderWithCitations(text, onCitationClick) {
  if (!text) return null;
  
  const fullTextContext = text;

  // Split by [Pg. X] or [Pg.X]
  return text.split(/(\[Pg\.\s*\d+\])/g).map((part, i) => {
    if (part.match(/\[Pg\.\s*(\d+)\]/)) {
      const match = part.match(/\d+/);
      const page = match ? match[0] : '1';

      return (
        <span
          key={i}
          className="ml-1 px-2 py-0.5 text-xs bg-indigo-100/80 hover:bg-indigo-200 text-indigo-700 font-medium rounded-md cursor-pointer transition-colors shadow-sm inline-block translate-y-[-1px]"
          onClick={(e) => {
            e.stopPropagation();
            if (onCitationClick) {
              onCitationClick({ 
                page: parseInt(page, 10),
                text: fullTextContext.split('[Pg.')[0].trim() // Pass the text before the citation as visual context
              });
            }
          }}
          title={`Go to Page ${page}`}
        >
          {part}
        </span>
      );
    }
    
    let cleanedText = part.replace(/\*\*(.*?)\*\*/g, '$1');
    return <span key={i} className="min-w-0 break-words">{cleanedText}</span>;
  });
}

const AIMessageRenderer = ({ rawText, onCitationClick }) => {
  const { sections } = useMemo(() => formatAIResponse(rawText), [rawText]);

  return (
    <div className="space-y-5">
      {sections.map((sec, i) => (
        <div key={i} className={i !== 0 && sec.title ? "mt-6" : ""}>
          {sec.title && (
            <h3 className="font-semibold text-[17px] text-gray-900 mb-3 flex items-center tracking-tight border-b border-slate-100 pb-2">
              {sec.title}
            </h3>
          )}
          
          <ul className="space-y-2.5">
            {sec.points.map((p, j) => (
                <li key={j} className="text-gray-700 text-[15px] leading-relaxed flex items-start break-words overflow-hidden">
                  {sec.points.length > 1 && !sec.title ? null : (
                    <span className="mr-2.5 mt-[6px] block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300"></span>
                  )}
                  <span className="flex-1 min-w-0 break-words whitespace-pre-wrap">{renderWithCitations(p, onCitationClick)}</span>
                </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default AIMessageRenderer;
