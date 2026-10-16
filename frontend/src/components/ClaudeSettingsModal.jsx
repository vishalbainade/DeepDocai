import { useState, useEffect } from 'react';
import { 
  X, User, Mail, Shield, Bell, Palette, Globe, Key, 
  ChevronRight, LogOut, Trash2, Moon, Sun, Monitor, Check, 
  Save, Loader2, Cpu, Brain, Sliders, Sparkles, Plus, 
  RefreshCw, Layers, FileText, CheckCircle2, AlertCircle, Database, HelpCircle,
  ExternalLink
} from 'lucide-react';
import { 
  getUser, 
  logout, 
  getUserPreferences, 
  updateUserPreferences,
  getUserMemories,
  addUserMemory,
  deleteUserMemory,
  clearUserMemories,
  extractUserMemories,
  getUsageSummary
} from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const TABS = [
  { id: 'general', label: 'General', icon: Palette },
  { id: 'personalization', label: 'Personalization', icon: Sliders },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'usage', label: 'Usage & Limits', icon: Cpu },
  { id: 'account', label: 'Account', icon: User },
];

const PERSONAS = [
  { id: 'legal_counsel', label: 'Senior Legal Counsel', desc: 'Statutory authority, liability limits, and contractual risk analysis.' },
  { id: 'contract_auditor', label: 'Contract & Risk Auditor', desc: 'Flags ambiguities, indemnities, breach thresholds, and missing terms.' },
  { id: 'plain_english', label: 'Plain-English Explainer', desc: 'Translates covenants into simple, actionable summaries without jargon.' },
  { id: 'executive_analyst', label: 'Executive Strategist', desc: 'Delivers bulleted bottom-line takeaways with commercial recommendations.' },
  { id: 'custom', label: 'Custom Persona', desc: 'Operates strictly according to your custom instructions.' },
];

const TONES = [
  { id: 'concise', label: 'Direct & Concise', desc: 'Bullet points and rapid takeaways without fluff.' },
  { id: 'analytical', label: 'In-Depth & Analytical', desc: 'Exhaustive cross-referencing and nuanced legal reasoning.' },
  { id: 'balanced', label: 'Balanced & Practical', desc: 'Pragmatic commercial view with clear action steps.' },
  { id: 'formal', label: 'Formal Legal', desc: 'Strict statutory phrasing and legal formality.' },
];

const JURISDICTIONS = [
  { id: 'general', label: 'General Commercial Law' },
  { id: 'us_corporate', label: 'US Corporate (Delaware / NY)' },
  { id: 'india_mca', label: 'Indian Law & MCA Companies Act' },
  { id: 'uk_common', label: 'UK & English Common Law' },
  { id: 'eu_gdpr', label: 'EU Framework & GDPR Compliance' },
];

const ClaudeSettingsModal = ({ isOpen, onClose, initialTab = 'general' }) => {
  const { theme, setTheme } = useTheme();
  const dc = useDarkColors();
  const isDark = useIsDark();

  const [activeTab, setActiveTab] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Personalization
  const [persona, setPersona] = useState('legal_counsel');
  const [tone, setTone] = useState('concise');
  const [jurisdiction, setJurisdiction] = useState('general');
  const [customInstructions, setCustomInstructions] = useState('');
  const [historyLimit, setHistoryLimit] = useState(10);
  const [personalizationSaving, setPersonalizationSaving] = useState(false);
  const [personalizationSaved, setPersonalizationSaved] = useState(false);

  // Memory
  const [memories, setMemories] = useState([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isExtractingMemory, setIsExtractingMemory] = useState(false);
  const [memoryExtractMessage, setMemoryExtractMessage] = useState(null);

  // Usage
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const u = getUser();
    setUser(u);
    setDisplayName(u?.name || '');

    // Load preferences
    getUserPreferences().then((res) => {
      if (res?.preferences) {
        const p = res.preferences;
        setPersona(p.persona || 'legal_counsel');
        setTone(p.tone || 'concise');
        setJurisdiction(p.jurisdiction || 'general');
        setCustomInstructions(p.custom_instructions || '');
        setHistoryLimit(p.history_limit || 10);
        setMemoryEnabled(p.memory_enabled !== false);
      }
    }).catch(() => {});

    // Load memories
    getUserMemories().then((res) => {
      if (res?.memories) {
        setMemories(res.memories);
      }
    }).catch(() => {});

    // Load usage
    setUsageLoading(true);
    getUsageSummary().then((res) => {
      setUsage(res?.data || null);
    }).catch(() => {}).finally(() => setUsageLoading(false));
  }, [isOpen]);

  const handleSavePersonalization = async () => {
    setPersonalizationSaving(true);
    try {
      await updateUserPreferences({
        persona,
        tone,
        jurisdiction,
        customInstructions,
        historyLimit,
        memoryEnabled,
      });
      setPersonalizationSaved(true);
      setTimeout(() => setPersonalizationSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setPersonalizationSaving(false);
    }
  };

  const handleAddMemory = async (e) => {
    e?.preventDefault();
    if (!newMemoryInput.trim()) return;
    setIsAddingMemory(true);
    try {
      const res = await addUserMemory(newMemoryInput.trim(), 'manual');
      if (res?.memory) {
        setMemories((prev) => [res.memory, ...prev]);
        setNewMemoryInput('');
      }
    } catch (err) {
      console.error('Failed to add memory:', err);
    } finally {
      setIsAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      await deleteUserMemory(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearMemories = async () => {
    if (!window.confirm('Clear all learned memories?')) return;
    try {
      await clearUserMemories();
      setMemories([]);
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  const handleExtractMemories = async () => {
    setIsExtractingMemory(true);
    setMemoryExtractMessage(null);
    try {
      const res = await extractUserMemories();
      if (res?.memories) {
        setMemories(res.memories);
        setMemoryExtractMessage(`Successfully synced ${res.memories.length} preferences from your conversations!`);
      }
    } catch (err) {
      setMemoryExtractMessage('No new preferences detected in recent chats.');
    } finally {
      setIsExtractingMemory(false);
      setTimeout(() => setMemoryExtractMessage(null), 4000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-4xl h-[90vh] max-h-[760px] rounded-2xl flex flex-col shadow-2xl border overflow-hidden"
        style={{
          backgroundColor: isDark ? '#1f1e1d' : '#ffffff',
          borderColor: isDark ? '#383733' : '#e5e5df',
        }}
      >
        {/* Modal Header */}
        <div 
          className="flex items-center justify-between px-6 py-4 border-b shrink-0"
          style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}
        >
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-serif font-medium tracking-tight" style={{ color: dc.textPrimary }}>
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Tab List */}
          <div 
            className="w-52 shrink-0 p-3 border-r flex flex-col gap-1 overflow-y-auto"
            style={{ 
              backgroundColor: isDark ? '#171715' : '#fbfbfa',
              borderColor: isDark ? '#2e2d2a' : '#f0eee6' 
            }}
          >
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive 
                      ? 'bg-[#da7756]/10 text-[#da7756] font-semibold'
                      : 'hover:bg-black/5 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon size={15} className={isActive ? 'text-[#da7756]' : 'text-slate-400'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="mt-auto pt-4 border-t" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
              <button
                onClick={() => {
                  logout();
                  window.location.href = '/login';
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          </div>

          {/* Right Tab Content */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-base font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                    Appearance
                  </h3>
                  <p className="text-xs mb-3" style={{ color: dc.textSecondary }}>
                    Choose how DeepDoc AI looks on your device.
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'light', label: 'Light', icon: Sun, desc: 'Warm Claude cream' },
                      { id: 'dark', label: 'Dark', icon: Moon, desc: 'Warm Claude dark' },
                      { id: 'system', label: 'System', icon: Monitor, desc: 'Follow device' },
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = theme === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setTheme(opt.id)}
                          className={`p-3.5 rounded-xl border text-left flex flex-col gap-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'border-[#da7756] ring-2 ring-[#da7756]/20 bg-[#da7756]/5' 
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <Icon size={16} className={isSelected ? 'text-[#da7756]' : 'text-slate-400'} />
                            {isSelected && <Check size={14} className="text-[#da7756]" />}
                          </div>
                          <div>
                            <p className="text-xs font-semibold" style={{ color: dc.textPrimary }}>{opt.label}</p>
                            <p className="text-[10px] text-slate-400">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
                  <h3 className="text-base font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                    Language & Region
                  </h3>
                  <p className="text-xs mb-3" style={{ color: dc.textSecondary }}>
                    Primary response language for clause audits and reasoning.
                  </p>
                  <select 
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent outline-none focus:ring-2 focus:ring-[#da7756]/30"
                    style={{ borderColor: dc.borderPrimary, color: dc.textPrimary }}
                    defaultValue="en-US"
                  >
                    <option value="en-US">English (United States)</option>
                    <option value="en-GB">English (United Kingdom)</option>
                    <option value="en-IN">English (India)</option>
                  </select>
                </div>
              </div>
            )}

            {/* PERSONALIZATION TAB */}
            {activeTab === 'personalization' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-base font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                    Custom Instructions
                  </h3>
                  <p className="text-xs mb-2" style={{ color: dc.textSecondary }}>
                    What would you like DeepDoc AI to know about you to provide tailored legal analysis?
                  </p>
                  <textarea
                    rows={4}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. I advise early-stage venture tech companies. Always scrutinize limitation of liability, indemnification caps, and non-solicitation clauses..."
                    className="w-full p-3 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#da7756]/30 transition-all"
                    style={{
                      borderColor: dc.borderPrimary,
                      backgroundColor: isDark ? '#171715' : '#fbfbfa',
                      color: dc.textPrimary,
                    }}
                  />
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Legal Persona</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERSONAS.map((p) => {
                      const isSel = persona === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPersona(p.id)}
                          className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all ${
                            isSel ? 'border-[#da7756] bg-[#da7756]/5 ring-1 ring-[#da7756]/30' : 'hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                          style={{ borderColor: isSel ? '#da7756' : dc.borderPrimary }}
                        >
                          <p className="text-xs font-semibold" style={{ color: dc.textPrimary }}>{p.label}</p>
                          <p className="text-[11px] text-slate-400 leading-snug">{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Jurisdiction</h4>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent outline-none focus:ring-2 focus:ring-[#da7756]/30"
                    style={{ borderColor: dc.borderPrimary, color: dc.textPrimary }}
                  >
                    {JURISDICTIONS.map((j) => (
                      <option key={j.id} value={j.id}>{j.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={handleSavePersonalization}
                    disabled={personalizationSaving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#da7756] hover:bg-[#c96442] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {personalizationSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>{personalizationSaving ? 'Saving...' : personalizationSaved ? 'Saved!' : 'Save Directives'}</span>
                  </button>
                  {personalizationSaved && (
                    <span className="text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <Check size={13} /> Updated successfully
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* MEMORY TAB */}
            {activeTab === 'memory' && (
              <div className="space-y-6 max-w-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-serif font-medium" style={{ color: dc.textPrimary }}>
                      AI Memory
                    </h3>
                    <p className="text-xs" style={{ color: dc.textSecondary }}>
                      DeepDoc AI remembers key preferences and nuances across all your chats.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={memoryEnabled}
                      onChange={(e) => setMemoryEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#da7756]"></div>
                  </label>
                </div>

                {/* Add memory form */}
                <form onSubmit={handleAddMemory} className="flex gap-2">
                  <input
                    type="text"
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="Add a rule, e.g., 'Prefer Delaware corporate law by default'..."
                    className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none focus:ring-2 focus:ring-[#da7756]/30"
                    style={{ borderColor: dc.borderPrimary, backgroundColor: isDark ? '#171715' : '#fbfbfa', color: dc.textPrimary }}
                  />
                  <button
                    type="submit"
                    disabled={isAddingMemory || !newMemoryInput.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#da7756] text-white hover:bg-[#c96442] disabled:opacity-40 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <Plus size={14} /> Add
                  </button>
                </form>

                {/* Sync memories from chat */}
                <div className="flex items-center justify-between p-3 rounded-xl border text-xs" style={{ borderColor: dc.borderPrimary }}>
                  <div>
                    <p className="font-semibold" style={{ color: dc.textPrimary }}>Auto-Extract from Chat</p>
                    <p className="text-[11px] text-slate-400">Scan recent chat history to learn your common requirements.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExtractMemories}
                    disabled={isExtractingMemory}
                    className="px-2.5 py-1.5 rounded-lg border text-xs font-medium hover:bg-slate-500/5 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ borderColor: dc.borderPrimary, color: dc.textPrimary }}
                  >
                    <RefreshCw size={12} className={isExtractingMemory ? 'animate-spin' : ''} />
                    <span>{isExtractingMemory ? 'Scanning...' : 'Extract'}</span>
                  </button>
                </div>

                {memoryExtractMessage && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2 rounded-lg">
                    {memoryExtractMessage}
                  </p>
                )}

                {/* Memories list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Stored Memories ({memories.length})
                    </span>
                    {memories.length > 0 && (
                      <button
                        onClick={handleClearMemories}
                        className="text-[11px] text-red-500 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                      <Brain size={24} className="mx-auto text-slate-400 mb-1 opacity-50" />
                      <p className="text-xs text-slate-400">No memories stored yet. Add rules or start chatting!</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-56 overflow-y-auto">
                      {memories.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border group hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-xs"
                          style={{ borderColor: dc.borderPrimary, backgroundColor: isDark ? '#171715' : '#fbfbfa' }}
                        >
                          <span className="truncate pr-2" style={{ color: dc.textPrimary }}>{m.content}</span>
                          <button
                            onClick={() => handleDeleteMemory(m.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity cursor-pointer shrink-0"
                            title="Delete memory"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* USAGE TAB */}
            {activeTab === 'usage' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-base font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                    Usage & Limits
                  </h3>
                  <p className="text-xs mb-4" style={{ color: dc.textSecondary }}>
                    Monitor processed OCR layout pages, embedding tokens, and AI generation tokens.
                  </p>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="p-3.5 rounded-xl border text-left" style={{ borderColor: dc.borderPrimary, backgroundColor: isDark ? '#171715' : '#fbfbfa' }}>
                      <p className="text-[10px] uppercase font-bold text-slate-400">AI Chat Tokens</p>
                      <p className="text-lg font-mono font-bold mt-1 text-[#da7756]">
                        {Math.round((usage?.aiTokens?.totalTokens ?? 0) / 1000)}k
                      </p>
                      <p className="text-[10px] text-slate-400">Input + Output</p>
                    </div>

                    <div className="p-3.5 rounded-xl border text-left" style={{ borderColor: dc.borderPrimary, backgroundColor: isDark ? '#171715' : '#fbfbfa' }}>
                      <p className="text-[10px] uppercase font-bold text-slate-400">OCR Pages</p>
                      <p className="text-lg font-mono font-bold mt-1 text-amber-500">
                        {usage?.ocrPages ?? 0}
                      </p>
                      <p className="text-[10px] text-slate-400">High-Fidelity Layouts</p>
                    </div>

                    <div className="p-3.5 rounded-xl border text-left" style={{ borderColor: dc.borderPrimary, backgroundColor: isDark ? '#171715' : '#fbfbfa' }}>
                      <p className="text-[10px] uppercase font-bold text-slate-400">Embeddings</p>
                      <p className="text-lg font-mono font-bold mt-1 text-indigo-400">
                        {Math.round((usage?.embeddingTokens ?? 0) / 1000)}k
                      </p>
                      <p className="text-[10px] text-slate-400">Vector Storage</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border text-xs space-y-2" style={{ borderColor: dc.borderPrimary }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold" style={{ color: dc.textPrimary }}>Monthly Allocation</span>
                      <span className="font-mono text-emerald-500 font-semibold">Active Workspace</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-[#da7756] h-1.5 rounded-full" style={{ width: '18%' }}></div>
                    </div>
                    <p className="text-[11px] text-slate-400">18% of monthly API allocation used. Refreshes on 1st of month.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h3 className="text-base font-serif font-medium mb-1" style={{ color: dc.textPrimary }}>
                    Account Profile
                  </h3>
                  <div className="space-y-3 mt-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-400">Full Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-transparent outline-none focus:ring-2 focus:ring-[#da7756]/30"
                        style={{ borderColor: dc.borderPrimary, color: dc.textPrimary }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-slate-400">Email Address</label>
                      <input
                        type="text"
                        disabled
                        value={user?.email || ''}
                        className="w-full px-3 py-2 rounded-xl border text-xs bg-black/5 dark:bg-white/5 opacity-70 outline-none"
                        style={{ borderColor: dc.borderPrimary, color: dc.textPrimary }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
                  <h4 className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Danger Zone</h4>
                  <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-semibold text-red-500">Log out of all devices</p>
                      <p className="text-[11px] text-slate-400">End all active sessions on your account.</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        window.location.href = '/login';
                      }}
                      className="px-3 py-1.5 rounded-lg bg-red-500 text-white font-medium hover:bg-red-600 transition-colors cursor-pointer text-xs"
                    >
                      Log Out
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaudeSettingsModal;
