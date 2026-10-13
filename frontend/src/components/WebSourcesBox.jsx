import { useState } from 'react';
import { Globe, ExternalLink, ChevronDown, ChevronRight, ShieldCheck } from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const WebSourcesBox = ({ sources = [] }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const dc = useDarkColors();
  const isDark = useIsDark();

  if (!sources || sources.length === 0) return null;

  return (
    <div className="my-2.5 rounded-xl overflow-hidden border transition-all duration-200"
      style={{
        borderColor: isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.2)',
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.5)' : 'rgba(239, 246, 255, 0.5)',
      }}
    >
      {/* Header bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3.5 py-2 flex items-center justify-between text-left select-none cursor-pointer transition-colors duration-150"
        style={{
          backgroundColor: isDark ? 'rgba(30, 41, 59, 0.4)' : 'rgba(219, 234, 254, 0.4)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-500">
            <Globe size={12} />
          </div>
          <span className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">
            Web Grounding: {sources.length} {sources.length === 1 ? 'source' : 'sources'} analyzed
          </span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-500/15 text-blue-600 dark:text-blue-300">
            Live Web
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-blue-600/70 dark:text-blue-400/70">
          <span className="text-[11px] font-medium">{isExpanded ? 'Hide Sources' : 'View Sources'}</span>
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </button>

      {/* Pill previews when collapsed */}
      {!isExpanded && (
        <div className="px-3.5 py-2 flex flex-wrap gap-1.5 items-center">
          {sources.slice(0, 4).map((source, idx) => {
            let domain = 'Web';
            try {
              domain = new URL(source.url).hostname.replace('www.', '');
            } catch {
              domain = source.source || 'Web Source';
            }
            return (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors hover:bg-blue-500/10"
                style={{
                  borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.25)',
                  color: isDark ? '#93c5fd' : '#2563eb',
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.3)' : '#ffffff',
                }}
              >
                <span className="truncate max-w-[130px]">{source.title || domain}</span>
                <ExternalLink size={10} className="shrink-0 opacity-60" />
              </a>
            );
          })}
        </div>
      )}

      {/* Expanded detailed cards */}
      {isExpanded && (
        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 border-t"
          style={{
            borderColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
            backgroundColor: isDark ? 'rgba(15, 23, 42, 0.7)' : '#ffffff',
          }}
        >
          {sources.map((source, idx) => {
            let domain = 'Web';
            try {
              domain = new URL(source.url).hostname.replace('www.', '');
            } catch {
              domain = source.source || 'Reference';
            }
            return (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg border transition-all duration-150 hover:shadow-sm hover:border-blue-400 group block"
                style={{
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : '#e2e8f0',
                  backgroundColor: isDark ? 'rgba(30, 41, 59, 0.5)' : '#f8fafc',
                }}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-semibold tracking-wider uppercase text-blue-500 truncate">
                    {domain}
                  </span>
                  <ExternalLink size={12} className="shrink-0 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <h4 className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {source.title || domain}
                </h4>
                {source.snippet && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {source.snippet}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default WebSourcesBox;
