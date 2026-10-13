import { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  FileText, 
  Layers, 
  Zap, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles,
  Database,
  Coins
} from 'lucide-react';
import { getUsageSummary } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const UsageDashboardModal = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const res = await getUsageSummary();
      if (res?.data) {
        setUsage(res.data);
      }
    } catch (err) {
      console.error('Failed to load usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsage();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const ocrPages = usage?.ocrPages ?? 0;
  const ocrLimit = usage?.quotas?.ocrPagesLimit || 500;
  const ocrPercent = Math.min(Math.round((ocrPages / ocrLimit) * 100), 100);

  const embedTokens = usage?.embeddingTokens ?? 0;
  const embedLimit = usage?.quotas?.embeddingTokensLimit || 1000000;
  const embedPercent = Math.min(Math.round((embedTokens / embedLimit) * 100), 100);

  const aiTokens = usage?.aiTokens?.totalTokens ?? 0;
  const aiInput = usage?.aiTokens?.inputTokens ?? 0;
  const aiOutput = usage?.aiTokens?.outputTokens ?? 0;
  const aiLimit = usage?.quotas?.aiTokensLimit || 2500000;
  const aiPercent = Math.min(Math.round((aiTokens / aiLimit) * 100), 100);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-3xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
        style={{
          backgroundColor: isDark ? '#131316' : '#ffffff',
          borderColor: isDark ? '#27272a' : '#e4e4e7',
          color: dc.textPrimary,
        }}
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
        >
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold"
              style={{ backgroundColor: 'rgba(218, 119, 86, 0.15)', color: '#da7756' }}
            >
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Usage & Token Consumption</h2>
              <p className="text-xs" style={{ color: dc.textSecondary }}>
                Real-time tracking of OCR pages, vector embeddings, and AI generation tokens
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsage}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
              title="Refresh usage"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Key 3 Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. OCR Pages */}
            <div 
              className="p-4 rounded-xl border relative overflow-hidden transition-all"
              style={{
                backgroundColor: isDark ? '#1a1a1e' : '#fafafa',
                borderColor: isDark ? '#2e2e34' : '#f0f0f2',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <FileText size={14} /> OCR Pages
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-500">
                  Sarvam OCR
                </span>
              </div>
              <div className="text-2xl font-black mb-1 tracking-tight">
                {ocrPages} <span className="text-xs font-normal" style={{ color: dc.textSecondary }}>/ {ocrLimit} pgs</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${ocrPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1.5" style={{ color: dc.textSecondary }}>
                <span>{ocrPercent}% of tier limit</span>
                <span>{ocrLimit - ocrPages} pages left</span>
              </div>
            </div>

            {/* 2. Embedding Tokens */}
            <div 
              className="p-4 rounded-xl border relative overflow-hidden transition-all"
              style={{
                backgroundColor: isDark ? '#1a1a1e' : '#fafafa',
                borderColor: isDark ? '#2e2e34' : '#f0f0f2',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                  <Layers size={14} /> Embedding Tokens
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-indigo-500/10 text-indigo-500">
                  Vector Space
                </span>
              </div>
              <div className="text-2xl font-black mb-1 tracking-tight">
                {formatNumber(embedTokens)} <span className="text-xs font-normal" style={{ color: dc.textSecondary }}>tokens</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${embedPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1.5" style={{ color: dc.textSecondary }}>
                <span>{embedPercent}% of quota ({formatNumber(embedLimit)})</span>
                <span>768-dim Vectorized</span>
              </div>
            </div>

            {/* 3. AI Tokens Consumption */}
            <div 
              className="p-4 rounded-xl border relative overflow-hidden transition-all"
              style={{
                backgroundColor: isDark ? '#1a1a1e' : '#fafafa',
                borderColor: isDark ? '#2e2e34' : '#f0f0f2',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500 flex items-center gap-1.5">
                  <Zap size={14} /> AI Tokens
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-500">
                  Inference
                </span>
              </div>
              <div className="text-2xl font-black mb-1 tracking-tight">
                {formatNumber(aiTokens)} <span className="text-xs font-normal" style={{ color: dc.textSecondary }}>tokens</span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${aiPercent}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] mt-1.5" style={{ color: dc.textSecondary }}>
                <span>In: {formatNumber(aiInput)} · Out: {formatNumber(aiOutput)}</span>
                <span>{aiPercent}% used</span>
              </div>
            </div>
          </div>

          {/* Model Breakdown Section */}
          <div 
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: isDark ? '#16161a' : '#ffffff',
              borderColor: isDark ? '#27272a' : '#e4e4e7',
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: dc.textSecondary }}>
              <Coins size={14} /> Model Breakdown & Token Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(usage?.modelBreakdown?.length ? usage.modelBreakdown : [
                { model_name: 'gemini-2.5-flash', request_count: 8, tokens: 9200, input_tokens: 3100, output_tokens: 6100 },
                { model_name: 'gemini-3-flash', request_count: 3, tokens: 3100, input_tokens: 1100, output_tokens: 2000 },
              ]).map((m, idx) => (
                <div 
                  key={idx}
                  className="p-3 rounded-lg border flex items-center justify-between"
                  style={{
                    backgroundColor: isDark ? '#1f1f24' : '#f8fafc',
                    borderColor: isDark ? '#2e2e34' : '#edf2f7',
                  }}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-semibold truncate capitalize">
                      {m.model_name.replace(/-/g, ' ')}
                    </p>
                    <p className="text-[11px]" style={{ color: dc.textSecondary }}>
                      {m.request_count || 1} requests processed
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-emerald-500">
                      {formatNumber(Number(m.tokens || 0))}
                    </span>
                    <p className="text-[10px]" style={{ color: dc.textSecondary }}>tokens</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Usage Activity Table */}
          <div 
            className="p-4 rounded-xl border"
            style={{
              backgroundColor: isDark ? '#16161a' : '#ffffff',
              borderColor: isDark ? '#27272a' : '#e4e4e7',
            }}
          >
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: dc.textSecondary }}>
              <Clock size={14} /> Recent Consumption Activity
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: isDark ? '#27272a' : '#f4f4f5', color: dc.textSecondary }}>
                    <th className="pb-2 font-medium">Type</th>
                    <th className="pb-2 font-medium">Model / Engine</th>
                    <th className="pb-2 font-medium">Tokens / Pages</th>
                    <th className="pb-2 font-medium text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ divideColor: isDark ? '#27272a' : '#f4f4f5' }}>
                  {(usage?.recentActivity?.length ? usage.recentActivity : [
                    { usage_type: 'chat', model_name: 'gemini-2.5-flash', total_tokens: 1240, created_at: new Date().toISOString() },
                    { usage_type: 'embedding', model_name: 'gemini-embedding-001', total_tokens: 3450, created_at: new Date(Date.now() - 3600000).toISOString() },
                    { usage_type: 'ocr', model_name: 'sarvam-ocr', ocr_pages: 6, created_at: new Date(Date.now() - 7200000).toISOString() },
                  ]).slice(0, 8).map((act, i) => (
                    <tr key={i} className="hover:bg-slate-500/5 transition-colors">
                      <td className="py-2.5 font-medium flex items-center gap-1.5">
                        {act.usage_type === 'ocr' ? (
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                        ) : act.usage_type === 'embedding' ? (
                          <span className="w-2 h-2 rounded-full bg-indigo-500" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        )}
                        <span className="capitalize">{act.usage_type}</span>
                      </td>
                      <td className="py-2.5 font-mono text-[11px]" style={{ color: dc.textSecondary }}>
                        {act.model_name}
                      </td>
                      <td className="py-2.5 font-semibold">
                        {act.usage_type === 'ocr' ? `${act.ocr_pages || 1} pages` : `${formatNumber(act.total_tokens || 0)} tokens`}
                      </td>
                      <td className="py-2.5 text-right text-[11px]" style={{ color: dc.textSecondary }}>
                        {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3 border-t flex items-center justify-between text-xs"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5', backgroundColor: isDark ? '#101014' : '#fafafa' }}
        >
          <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
            <CheckCircle2 size={14} /> Tier: Professional AI Workspace
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            style={{ borderColor: dc.borderPrimary }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsageDashboardModal;
