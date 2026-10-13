import { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronDown, 
  Check, 
  Search, 
  Zap, 
  Brain, 
  Cpu, 
  Layers,
  Mic,
  Radio,
  Headphones,
  Image as ImageIcon
} from 'lucide-react';
import { useDarkColors, useIsDark } from '../utils/darkMode';

// Rich metadata for Google models from user quota list
const GOOGLE_MODEL_METADATA = {
  // ─── Live Audio & Dialog Models ────────────────────────────────
  'gemini-3.8-live-extended-thinking': {
    title: 'Gemini 3.8 Live Extended Thinking',
    tag: 'Live Audio + Thinking',
    tagColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'Real-time bidirectional voice dialog with extended deep chain-of-thought reasoning.',
    context: '65k Live',
    speed: 'Real-time',
    icon: Headphones,
    iconColor: 'text-amber-500',
    isLiveAudio: true,
  },
  'gemini-3.8-live': {
    title: 'Gemini 3.8 Live',
    tag: 'Live Audio',
    tagColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'Ultra-low latency live conversational voice and continuous speech dialog.',
    context: '65k Live',
    speed: 'Real-time',
    icon: Mic,
    iconColor: 'text-emerald-500',
    isLiveAudio: true,
  },
  'gemini-3-flash-live': {
    title: 'Gemini 3 Flash Live',
    tag: 'Live Audio',
    tagColor: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    description: 'Next-generation low-latency real-time voice streaming with natural pauses and cadence.',
    context: '65k Live',
    speed: 'Instant',
    icon: Radio,
    iconColor: 'text-cyan-500',
    isLiveAudio: true,
  },
  'gemini-2.5-flash-native-audio-dialog': {
    title: 'Gemini 2.5 Flash Native Audio Dialog',
    tag: 'Native Voice',
    tagColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    description: 'Native audio in/out dialog with end-to-end emotional prosody and interruption handling.',
    context: '1M Live',
    speed: 'Real-time',
    icon: Mic,
    iconColor: 'text-blue-500',
    isLiveAudio: true,
  },

  // ─── Text & Reasoning Models ───────────────────────────────────
  'gemini-3.8-flash': {
    title: 'Gemini 3.8 Flash',
    tag: 'Flagship SOTA',
    tagColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'Top-tier reasoning model with extended thinking budget and deep legal document synthesis.',
    context: '250k tokens',
    speed: 'Fast',
    icon: Sparkles,
    iconColor: 'text-amber-500',
  },
  'gemini-3.7-flash': {
    title: 'Gemini 3.7 Flash',
    tag: 'Hybrid Thinking',
    tagColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    description: 'Next-generation hybrid model that dynamically allocates reasoning tokens for complex clauses.',
    context: '250k tokens',
    speed: 'Fast',
    icon: Brain,
    iconColor: 'text-purple-500',
  },
  'gemini-3.6-flash': {
    title: 'Gemini 3.6 Flash',
    tag: 'High Intelligence',
    tagColor: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    description: 'High-speed reasoning engine for legal audit, compliance check, and contract drafting.',
    context: '250k tokens',
    speed: 'Fast',
    icon: Cpu,
    iconColor: 'text-indigo-500',
  },
  'gemini-3.5-flash-lite': {
    title: 'Gemini 3.5 Flash Lite',
    tag: 'Cost Effective',
    tagColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    description: 'High-throughput lightweight model optimized for high-volume document search and Q&A.',
    context: '250k tokens',
    speed: 'Very Fast',
    icon: Zap,
    iconColor: 'text-teal-500',
  },
  'gemini-3.1-flash-lite': {
    title: 'Gemini 3.1 Flash Lite',
    tag: 'Ultra Fast',
    tagColor: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
    description: 'Lowest latency text model for sub-second answers and instant clause lookups.',
    context: '250k tokens',
    speed: 'Ultra Fast',
    icon: Zap,
    iconColor: 'text-sky-500',
  },
  'nano-banana-2-lite': {
    title: 'Nano Banana 2 Lite (Gemini 3.1 Flash Lite Image)',
    tag: 'Vision & Multimodal',
    tagColor: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30',
    description: 'Specialized document OCR, diagram parsing, and multimodal visual agreement analysis.',
    context: 'Vision OCR',
    speed: 'Fast',
    icon: ImageIcon,
    iconColor: 'text-rose-500',
  },

  // ─── Gemma 4 Models ───────────────────────────────────────────
  'gemma-4-31b': {
    title: 'Gemma 4 31B',
    tag: 'Gemma 4 Heavy',
    tagColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    description: 'Google’s new generation 31B parameter model with state-of-the-art open reasoning.',
    context: '16k tokens',
    speed: 'Balanced',
    icon: Layers,
    iconColor: 'text-emerald-500',
  },
  'gemma-4-26b': {
    title: 'Gemma 4 26B',
    tag: 'Gemma 4 Fast',
    tagColor: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
    description: 'New Gemma 4 26B architecture optimized for fast inference and precise statutory extraction.',
    context: '16k tokens',
    speed: 'Fast',
    icon: Layers,
    iconColor: 'text-teal-500',
  },
};

const ClaudeModelSelector = ({
  selectedModel,
  onModelChange,
  availableModels = [],
  disabled = false,
  placement = 'bottom-up', // 'bottom-up' (for prompt bar) or 'top-down' (for header)
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  // Find currently selected model object
  const activeModelObj = availableModels.find(
    (m) => m.id === selectedModel || m.modelName === selectedModel
  ) || availableModels[0] || {
    id: 'gemini-3.8-flash',
    modelName: 'gemini-3.8-flash',
    displayName: 'Gemini 3.8 Flash',
  };

  const activeModelKey = activeModelObj.modelName || activeModelObj.id || 'gemini-3.8-flash';
  const activeMeta = GOOGLE_MODEL_METADATA[activeModelKey] || {
    title: activeModelObj.displayName || activeModelObj.label || activeModelKey,
    tag: 'Google AI',
    tagColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    description: 'Google AI Studio model for legal analysis.',
    context: '1M tokens',
    speed: 'Fast',
    icon: Sparkles,
    iconColor: 'text-amber-500',
  };

  const ActiveIcon = activeMeta.icon;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filtered models
  const filteredModels = availableModels.filter((model) => {
    if (!searchQuery.trim()) return true;
    const name = (model.displayName || model.label || model.modelName || model.id || '').toLowerCase();
    const key = (model.modelName || model.id || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || key.includes(query);
  });

  const handleSelect = (model) => {
    onModelChange?.(model.id || model.modelName);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {/* Trigger Button - Claude Pill Style */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 rounded-xl border font-medium transition-all cursor-pointer select-none ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        } ${
          isOpen
            ? 'border-amber-500/50 ring-2 ring-amber-500/20'
            : 'hover:border-slate-300 dark:hover:border-slate-700'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        style={{
          backgroundColor: isDark ? '#1a1a1f' : '#ffffff',
          borderColor: isOpen ? '#f59e0b' : (isDark ? '#2a2a30' : '#e4e4e7'),
          color: dc.textPrimary,
        }}
        title="Select AI Model"
      >
        <span className="flex items-center gap-1.5">
          <ActiveIcon size={13} className={activeMeta.iconColor} />
          <span className="font-semibold truncate max-w-[140px] sm:max-w-[170px]">
            {activeMeta.title}
          </span>
        </span>

        {/* Small Tag Pill */}
        {activeMeta.tag && !compact && (
          <span className={`hidden sm:inline-flex px-1.5 py-0.2 rounded-md text-[10px] font-medium border ${activeMeta.tagColor}`}>
            {activeMeta.tag}
          </span>
        )}

        <ChevronDown 
          size={12} 
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Claude-style Popover Menu */}
      {isOpen && (
        <div
          className={`absolute z-50 w-72 sm:w-80 rounded-2xl border shadow-2xl backdrop-blur-md overflow-hidden transition-all duration-200 animate-in fade-in zoom-in-95 ${
            placement === 'bottom-up'
              ? 'bottom-full mb-2 left-0'
              : 'top-full mt-2 right-0'
          }`}
          style={{
            backgroundColor: isDark ? 'rgba(20, 20, 24, 0.96)' : 'rgba(255, 255, 255, 0.98)',
            borderColor: isDark ? '#2e2e36' : '#e2e8f0',
            boxShadow: isDark 
              ? '0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05)' 
              : '0 20px 40px -15px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header */}
          <div className="p-3 border-b" style={{ borderColor: isDark ? '#282830' : '#f1f5f9' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold tracking-tight" style={{ color: dc.textPrimary }}>
                Google AI Models
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400">
                Google AI Studio
              </span>
            </div>

            {/* Quick Search */}
            <div 
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs"
              style={{
                backgroundColor: isDark ? '#141418' : '#f8fafc',
                borderColor: isDark ? '#2e2e36' : '#e2e8f0',
              }}
            >
              <Search size={12} className="text-slate-400 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-transparent outline-none text-xs placeholder:text-slate-400"
                style={{ color: dc.textPrimary }}
              />
            </div>
          </div>

          {/* Model List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-1">
            {filteredModels.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No matching models found
              </div>
            ) : (
              filteredModels.map((model) => {
                const modelKey = model.modelName || model.id;
                const meta = GOOGLE_MODEL_METADATA[modelKey] || {
                  title: model.displayName || model.label || modelKey,
                  tag: 'Model',
                  tagColor: 'bg-slate-500/15 text-slate-500 border-slate-500/30',
                  description: 'Google AI Studio model',
                  context: '1M tokens',
                  speed: 'Fast',
                  icon: Sparkles,
                  iconColor: 'text-amber-500',
                };

                const IconComponent = meta.icon;
                const isSelected = activeModelObj.id === model.id || activeModelObj.modelName === model.modelName;

                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => handleSelect(model)}
                    className={`w-full text-left p-2.5 rounded-xl transition-all cursor-pointer flex items-start justify-between gap-2.5 group ${
                      isSelected
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'hover:bg-slate-500/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected 
                            ? 'bg-amber-500/20' 
                            : isDark ? 'bg-[#22222a]' : 'bg-slate-100'
                        }`}
                      >
                        <IconComponent size={14} className={meta.iconColor} />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span 
                            className={`text-xs font-semibold ${isSelected ? 'text-amber-600 dark:text-amber-400' : ''}`}
                            style={{ color: isSelected ? undefined : dc.textPrimary }}
                          >
                            {meta.title}
                          </span>
                          {meta.tag && (
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${meta.tagColor}`}>
                              {meta.tag}
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] leading-relaxed line-clamp-2 mt-0.5 text-slate-500 dark:text-slate-400">
                          {meta.description}
                        </p>

                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                          <span>{meta.context}</span>
                          <span>•</span>
                          <span>{meta.speed}</span>
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <Check size={11} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div 
            className="p-2 border-t text-[11px] flex items-center justify-between text-slate-400 font-mono"
            style={{ 
              borderColor: isDark ? '#282830' : '#f1f5f9',
              backgroundColor: isDark ? '#141418' : '#fafafa',
            }}
          >
            <span>Powered by Gemini API</span>
            <span className="text-amber-500 font-semibold">Extended Thinking Ready</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaudeModelSelector;
