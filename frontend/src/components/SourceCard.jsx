import { FileText } from 'lucide-react';

const SourceCard = ({ sources, onSourceClick }) => {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {sources.map((source, index) => (
        <button
          key={index}
          onClick={() => onSourceClick && onSourceClick(source)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-medium hover:bg-indigo-100 transition-colors border border-indigo-200"
        >
          <FileText size={14} />
          <span>Chunk {source.chunkIndex + 1}</span>
        </button>
      ))}
    </div>
  );
};

export default SourceCard;

