import { useMemo } from 'react';
import { useDarkColors } from '../utils/darkMode';
import { formatAIResponse } from '../utils/responseFormatter';

// Inline tags mapped inside text
function renderWithCitations(text, onCitationClick, dc, citations = []) {
  if (!text) return null;
  
  // Track how many times each page has been mentioned in THIS block of text
  // However, citations are usually global to the message.
  // A better way is to have a global counter or a more specific mapping.
  // For now, let's try to match them.
  
  const fullTextContext = text;
  let pageCounters = {};

  // Split by [Pg. X] or [Pg.X]
  return text.split(/(\[Pg\.\s*\d+\])/g).map((part, i) => {
    const match = part.match(/\[Pg\.\s*(\d+)\]/);
    if (match) {
      const pageStr = match[1];
      const pageNum = parseInt(pageStr, 10);
      
      // Update counter for this page
      pageCounters[pageNum] = (pageCounters[pageNum] || 0) + 1;
      const occurrence = pageCounters[pageNum];

      // Find the corresponding citation in the provided citations array
      // Match by page and occurrence index
      const pageCitations = citations.filter(c => parseInt(c.page) === pageNum);
      const realCitation = pageCitations[occurrence - 1] || pageCitations[0] || { page: pageNum };

      return (
        <span
          key={i}
          className="ml-1 px-2 py-0.5 text-xs font-medium rounded-md cursor-pointer transition-colors shadow-sm inline-block translate-y-[-1px]"
          style={{ 
            backgroundColor: 'rgba(99, 102, 241, 0.15)', 
            color: '#6366f1',
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.25)'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.15)'}
          onClick={(e) => {
            e.stopPropagation();
            if (onCitationClick) {
              // Pass the REAL citation object if found, otherwise the dummy with page
              onCitationClick(realCitation);
            }
          }}
          title={`Go to Page ${pageNum}`}
        >
          {part}
        </span>
      );
    }
    
    let cleanedText = part.replace(/\*\*(.*?)\*\*/g, '$1');
    return <span key={i} className="min-w-0 break-words">{cleanedText}</span>;
  });
}

const AIMessageRenderer = ({ rawText, onCitationClick, citations = [], paragraphCitations = [] }) => {
  const dc = useDarkColors();
  const { sections } = useMemo(() => formatAIResponse(rawText), [rawText]);

  // Combine all citations for mapping
  const allCitations = useMemo(() => {
    const seen = new Set();
    const combined = [...(citations || [])];
    
    (paragraphCitations || []).forEach(p => {
       (p.citations || []).forEach(c => {
         const key = `${c.page}-${JSON.stringify(c.bbox)}`;
         if (!seen.has(key)) {
           seen.add(key);
           combined.push(c);
         }
       });
    });
    
    return combined;
  }, [citations, paragraphCitations]);

  return (
    <div className="space-y-5">
      {sections.map((sec, i) => (
        <div key={i} className={i !== 0 && sec.title ? "mt-6" : ""}>
          {sec.title && (
            <h3 
              className="font-semibold text-[17px] mb-3 flex items-center tracking-tight pb-2 transition-colors duration-300" 
              style={{ color: dc.textPrimary, borderBottom: `1px solid ${dc.borderPrimary}` }}
            >
              {sec.title}
            </h3>
          )}
          
          <ul className="space-y-2.5">
            {sec.points.map((p, j) => (
                <li key={j} className="text-[15px] leading-relaxed flex items-start break-words overflow-hidden transition-colors duration-300" style={{ color: dc.textSecondary }}>
                  {sec.points.length > 1 && !sec.title ? null : (
                    <span className="mr-2.5 mt-[6px] block h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300" style={{ backgroundColor: dc.borderPrimary }}></span>
                  )}
                  <span className="flex-1 min-w-0 break-words whitespace-pre-wrap">{renderWithCitations(p, onCitationClick, dc, allCitations)}</span>
                </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default AIMessageRenderer;
