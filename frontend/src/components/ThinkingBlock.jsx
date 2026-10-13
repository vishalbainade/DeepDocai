import { useState } from 'react';
import { Brain, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const ThinkingBlock = ({ content, isStreaming = false, durationSeconds = null }) => {
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  const dc = useDarkColors();
  const isDark = useIsDark();

  if (!content && !isStreaming) return null;

  return (
    <div className="my-3 rounded-xl overflow-hidden border transition-all duration-200"
      style={{
        borderColor: isDark ? 'rgba(217, 119, 6, 0.25)' : 'rgba(217, 119, 6, 0.2)',
        backgroundColor: isDark ? 'rgba(30, 27, 24, 0.65)' : 'rgba(254, 243, 199, 0.25)'
      }}
    >
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-left transition-colors duration-150 select-none cursor-pointer"
        style={{
          backgroundColor: isDark ? 'rgba(40, 32, 24, 0.5)' : 'rgba(254, 243, 199, 0.45)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : 'rgba(217, 119, 6, 0.15)',
              color: '#d97706'
            }}
          >
            {isStreaming ? (
              <Sparkles size={12} className="animate-spin text-amber-500" />
            ) : (
              <Brain size={12} className="text-amber-600 dark:text-amber-400" />
            )}
          </div>
          <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: isDark ? '#fbbf24' : '#b45309' }}>
            {isStreaming ? 'Thinking...' : `Thinking Process ${durationSeconds ? `(${durationSeconds}s)` : ''}`}
          </span>
          {isStreaming && (
            <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-1" />
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-amber-600/70 dark:text-amber-400/70">
          <span className="text-[11px] font-medium">{isExpanded ? 'Collapse' : 'Expand'}</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Expandable thought content */}
      {isExpanded && (
        <div className="px-4 py-3 text-xs leading-relaxed font-mono whitespace-pre-wrap max-h-96 overflow-y-auto border-t"
          style={{
            borderColor: isDark ? 'rgba(217, 119, 6, 0.15)' : 'rgba(217, 119, 6, 0.1)',
            color: isDark ? '#d1d5db' : '#4b5563',
            backgroundColor: isDark ? 'rgba(20, 18, 16, 0.8)' : 'rgba(255, 255, 255, 0.6)'
          }}
        >
          {content || (
            <div className="flex items-center gap-2 text-amber-500 italic font-sans py-1">
              <span className="animate-pulse">Evaluating document clauses and cross-referencing legal context...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
