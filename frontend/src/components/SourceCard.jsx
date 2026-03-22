import { FileText } from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const SourceCard = ({ sources, onSourceClick }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source, index) => (
        <button
          key={index}
          onClick={() => onSourceClick && onSourceClick(source)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200 border"
          style={{ 
            backgroundColor: isDark ? dc.primaryBackground : dc.secondaryBackground, 
            color: dc.primary,
            borderColor: isDark ? dc.primaryBorder : dc.secondaryBorder
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? dc.primaryBackgroundHover : dc.secondaryBackgroundHover;
            e.currentTarget.style.borderColor = dc.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isDark ? dc.primaryBackground : dc.secondaryBackground;
            e.currentTarget.style.borderColor = isDark ? dc.primaryBorder : dc.secondaryBorder;
          }}
        >
          <FileText size={14} />
          <span>Chunk {source.chunkIndex + 1}</span>
        </button>
      ))}
    </div>
  );
};

export default SourceCard;

