import { useState, useEffect } from 'react';
import { X, Sliders, Check, Sparkles, Shield, Compass, BookOpen, MessageSquareQuote, Loader2 } from 'lucide-react';
import { getUserPreferences, updateUserPreferences } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const PERSONAS = [
  { id: 'legal_counsel', label: 'Senior Legal Counsel', desc: 'Focuses on statutory authority, liability limits, and contractual obligations.' },
  { id: 'contract_auditor', label: 'Contract & Risk Auditor', desc: 'Meticulously flags ambiguities, indemnities, breach thresholds, and missing terms.' },
  { id: 'plain_english', label: 'Plain-English Explainer', desc: 'Translates dense legal covenants into clear, actionable executive summaries.' },
  { id: 'executive_analyst', label: 'Executive Strategist', desc: 'Delivers bulleted bottom-line takeaways with financial impact & recommendations.' },
  { id: 'custom', label: 'Custom Persona', desc: 'Tailored strictly according to your custom instructions below.' },
];

const TONES = [
  { id: 'concise', label: 'Direct & Concise', desc: 'Bullet points and rapid takeaways without fluff.' },
  { id: 'analytical', label: 'In-Depth & Analytical', desc: 'Exhaustive cross-referencing and nuanced reasoning.' },
  { id: 'balanced', label: 'Balanced & Practical', desc: 'Pragmatic commercial view with clear next steps.' },
  { id: 'formal', label: 'Formal Legal', desc: 'Strict legal phrasing and statutory references.' },
];

const JURISDICTIONS = [
  { id: 'general', label: 'General Commercial Law' },
  { id: 'us_corporate', label: 'US Corporate (Delaware / NY)' },
  { id: 'india_mca', label: 'Indian Law & MCA Companies Act' },
  { id: 'uk_common', label: 'UK & English Common Law' },
  { id: 'eu_gdpr', label: 'EU Framework & GDPR Compliance' },
];

const PersonalizationModal = ({ isOpen, onClose }) => {
  const [persona, setPersona] = useState('legal_counsel');
  const [tone, setTone] = useState('concise');
  const [jurisdiction, setJurisdiction] = useState('general');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const dc = useDarkColors();
  const isDark = useIsDark();

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const prefs = await getUserPreferences();
      if (prefs) {
        if (prefs.persona) setPersona(prefs.persona);
        if (prefs.tone) setTone(prefs.tone);
        if (prefs.jurisdiction) setJurisdiction(prefs.jurisdiction);
        if (prefs.customInstructions) setCustomInstructions(prefs.customInstructions);
      }
    } catch (err) {
      console.error('Failed to load personalization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserPreferences({
        persona,
        tone,
        jurisdiction,
        customInstructions: customInstructions.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to save personalization:', err);
      alert('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl border flex flex-col max-h-[90vh] overflow-hidden"
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
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(217, 119, 6, 0.15)', color: '#d97706' }}
            >
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold">Personalization & Style</h2>
              <p className="text-xs" style={{ color: dc.textSecondary }}>
                Customize how DeepDoc AI analyzes and formats answers for you
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-xs">Loading preferences...</p>
            </div>
          ) : (
            <>
              {/* Persona Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: dc.textSecondary }}>
                  AI Professional Persona
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PERSONAS.map((p) => {
                    const isSelected = persona === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPersona(p.id)}
                        className="p-3 rounded-xl border text-left transition-all relative cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#d97706' : (isDark ? '#27272a' : '#e4e4e7'),
                          backgroundColor: isSelected 
                            ? (isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(254, 243, 199, 0.4)')
                            : (isDark ? '#18181b' : '#fafafa'),
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: isSelected ? '#d97706' : dc.textPrimary }}>
                            {p.label}
                          </span>
                          {isSelected && <Check size={14} className="text-amber-500" />}
                        </div>
                        <p className="text-[11px] leading-tight" style={{ color: dc.textSecondary }}>
                          {p.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Response Tone */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: dc.textSecondary }}>
                  Response Tone & Depth
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TONES.map((t) => {
                    const isSelected = tone === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTone(t.id)}
                        className="p-2.5 rounded-xl border text-center transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#d97706' : (isDark ? '#27272a' : '#e4e4e7'),
                          backgroundColor: isSelected 
                            ? (isDark ? 'rgba(217, 119, 6, 0.12)' : 'rgba(254, 243, 199, 0.4)')
                            : (isDark ? '#18181b' : '#fafafa'),
                        }}
                      >
                        <div className="text-xs font-semibold mb-0.5" style={{ color: isSelected ? '#d97706' : dc.textPrimary }}>
                          {t.label}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Jurisdiction */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider block mb-2" style={{ color: dc.textSecondary }}>
                  Primary Legal Framework / Jurisdiction
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  style={{
                    backgroundColor: isDark ? '#18181b' : '#fafafa',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    color: dc.textPrimary,
                  }}
                >
                  {JURISDICTIONS.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Instructions (Claude System Prompt style) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: dc.textSecondary }}>
                    Custom System Instructions
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Applies to all documents & chat turns
                  </span>
                </div>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={4}
                  placeholder="e.g. Always highlight indemnity caps, flag missing jurisdiction clauses, include a 2-sentence executive summary before tabular comparisons..."
                  className="w-full p-3 rounded-xl text-xs border leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-y"
                  style={{
                    backgroundColor: isDark ? '#18181b' : '#fafafa',
                    borderColor: isDark ? '#27272a' : '#e4e4e7',
                    color: dc.textPrimary,
                  }}
                  maxLength={1500}
                />
                <div className="text-right text-[10px] text-slate-400 mt-1">
                  {customInstructions.length} / 1500 characters
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div 
          className="px-6 py-3 border-t flex items-center justify-between"
          style={{ borderColor: isDark ? '#27272a' : '#f4f4f5', backgroundColor: isDark ? '#101014' : '#fafafa' }}
        >
          <div className="text-xs text-slate-500">
            {savedSuccess ? (
              <span className="text-emerald-500 font-medium flex items-center gap-1">
                <Check size={14} /> Personalization saved!
              </span>
            ) : (
              'Changes sync immediately across all chats'
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              style={{ borderColor: dc.borderPrimary }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              style={{ backgroundColor: '#da7756' }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalizationModal;
