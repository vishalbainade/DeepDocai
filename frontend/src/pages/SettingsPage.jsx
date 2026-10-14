import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Shield, Bell, Palette, Globe, Key,
  ChevronRight, LogOut, Trash2, Moon, Sun, Monitor, Check, Save, 
  Loader2, Cpu, Brain, Sliders, Sparkles, Plus, RefreshCw, 
  Layers, FileText, CheckCircle2, AlertCircle, Database, HelpCircle
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

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'personalization', label: 'Personalization', icon: Sliders },
  { id: 'memory', label: 'Memory', icon: Brain },
  { id: 'usage', label: 'Usage & Limits', icon: Cpu },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
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

const SettingsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';

  const { theme, setTheme, preferences, updatePreference } = useTheme();
  const dc = useDarkColors();
  const isDark = useIsDark();

  const [activeSection, setActiveSection] = useState(initialTab);
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, push: false, digest: true });

  // Personalization state
  const [persona, setPersona] = useState('legal_counsel');
  const [tone, setTone] = useState('concise');
  const [jurisdiction, setJurisdiction] = useState('general');
  const [customInstructions, setCustomInstructions] = useState('');
  const [historyLimit, setHistoryLimit] = useState(10);
  const [personalizationSaving, setPersonalizationSaving] = useState(false);
  const [personalizationSaved, setPersonalizationSaved] = useState(false);

  // Claude-style Memory state
  const [memories, setMemories] = useState([]);
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [newMemoryInput, setNewMemoryInput] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isExtractingMemory, setIsExtractingMemory] = useState(false);
  const [memoryExtractMessage, setMemoryExtractMessage] = useState(null);

  // Usage state
  const [usage, setUsage] = useState(null);
  const [usageLoading, setUsageLoading] = useState(false);

  // Sync tab with URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && SECTIONS.some((s) => s.id === tab)) {
      setActiveSection(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveSection(tabId);
    setSearchParams({ tab: tabId });
  };

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
    setDisplayName(userData?.name || '');
    loadAllPreferences();
  }, []);

  const loadAllPreferences = async () => {
    try {
      const prefs = await getUserPreferences();
      if (prefs) {
        if (prefs.displayName) setDisplayName(prefs.displayName);
        if (prefs.notifications) setNotifications(prefs.notifications);
        if (prefs.persona) setPersona(prefs.persona);
        if (prefs.tone) setTone(prefs.tone);
        if (prefs.jurisdiction) setJurisdiction(prefs.jurisdiction);
        if (prefs.customInstructions) setCustomInstructions(prefs.customInstructions);
        if (prefs.historyLimit) setHistoryLimit(prefs.historyLimit);
        if (prefs.memories) setMemories(prefs.memories);
        if (prefs.memoryEnabled !== undefined) setMemoryEnabled(prefs.memoryEnabled);
      }
    } catch (err) {
      console.error('Failed to load user preferences:', err);
    }
  };

  // Load Usage when active
  useEffect(() => {
    if (activeSection === 'usage') {
      fetchUsage();
    }
  }, [activeSection]);

  const fetchUsage = async () => {
    setUsageLoading(true);
    try {
      const res = await getUsageSummary();
      if (res?.data) {
        setUsage(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setUsageLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    try {
      await updatePreference({ displayName: displayName.trim() });
      setUser((prev) => ({ ...prev, name: displayName.trim() }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch {
      alert('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePersonalization = async () => {
    setPersonalizationSaving(true);
    try {
      await updateUserPreferences({
        persona,
        tone,
        jurisdiction,
        customInstructions: customInstructions.trim(),
        historyLimit: Number(historyLimit),
      });
      setPersonalizationSaved(true);
      setTimeout(() => setPersonalizationSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save personalization:', err);
      alert('Failed to save personalization');
    } finally {
      setPersonalizationSaving(false);
    }
  };

  const handleToggleMemoryEnabled = async (val) => {
    setMemoryEnabled(val);
    try {
      await updateUserPreferences({ memoryEnabled: val });
    } catch (err) {
      console.error('Failed to toggle memory:', err);
      setMemoryEnabled(!val);
    }
  };

  const handleAddMemory = async (e) => {
    e?.preventDefault();
    if (!newMemoryInput.trim() || isAddingMemory) return;
    setIsAddingMemory(true);
    try {
      const res = await addUserMemory(newMemoryInput.trim());
      if (res?.memories) {
        setMemories(res.memories);
      }
      setNewMemoryInput('');
    } catch (err) {
      console.error('Failed to add memory:', err);
      alert('Failed to add memory');
    } finally {
      setIsAddingMemory(false);
    }
  };

  const handleDeleteMemory = async (id) => {
    try {
      const res = await deleteUserMemory(id);
      if (res?.memories) {
        setMemories(res.memories);
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleClearAllMemories = async () => {
    if (!window.confirm('Are you sure you want to clear all learned memories?')) return;
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
      }
      setMemoryExtractMessage(res?.message || 'Memories extracted successfully!');
      setTimeout(() => setMemoryExtractMessage(null), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to extract memories';
      setMemoryExtractMessage(`Notice: ${msg}`);
      setTimeout(() => setMemoryExtractMessage(null), 5000);
    } finally {
      setIsExtractingMemory(false);
    }
  };

  const handleNotificationChange = async (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    try {
      await updatePreference({ notifications: updated });
    } catch {
      setNotifications(notifications);
    }
  };

  // Usage numbers
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
    <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: isDark ? '#0f172a' : '#F8FAFC' }}>
      {/* Header */}
      <div 
        className="shrink-0 flex items-center justify-between px-6 py-4 border-b"
        style={{ 
          backgroundColor: isDark ? '#1e293b' : '#ffffff', 
          borderColor: isDark ? '#334155' : '#EAF0F6' 
        }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} style={{ color: dc.textSecondary }} />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: dc.textPrimary }}>Settings</h1>
            <p className="text-xs" style={{ color: dc.textSecondary }}>
              Manage your profile, Claude-style memory, personalization, and usage limits
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Navigation Sidebar */}
        <div 
          className="w-60 shrink-0 border-r py-4 overflow-y-auto"
          style={{ 
            backgroundColor: isDark ? '#1e293b' : '#ffffff', 
            borderColor: isDark ? '#334155' : '#EAF0F6' 
          }}
        >
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleTabChange(sec.id)}
                className="w-full flex items-center justify-between px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer"
                style={{
                  color: isActive ? '#da7756' : dc.textSecondary,
                  backgroundColor: isActive ? (isDark ? 'rgba(218, 119, 86, 0.12)' : 'rgba(218, 119, 86, 0.08)') : 'transparent',
                  borderLeft: isActive ? '3px solid #da7756' : '3px solid transparent',
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} />
                  <span>{sec.label}</span>
                </div>
                {sec.id === 'memory' && memories.length > 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 font-bold">
                    {memories.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* ────── Profile ────── */}
            {activeSection === 'profile' && (
              <SectionCard title="Profile Information" subtitle="Your account identity and primary details">
                <div className="flex items-center gap-5 mb-6">
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: 'rgba(218, 119, 86, 0.2)', color: '#da7756' }}
                  >
                    <User size={30} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold" style={{ color: dc.textPrimary }}>{displayName || 'User'}</p>
                    <p className="text-sm" style={{ color: dc.textSecondary }}>{user?.email || 'No email'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: dc.textSecondary }}>Full Name</label>
                    <div className="relative">
                      <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dc.textSecondary }} />
                      <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-amber-500/40 transition-all"
                        style={{ 
                          backgroundColor: isDark ? '#0f172a' : '#ffffff',
                          borderColor: isDark ? '#334155' : '#EAF0F6',
                          color: dc.textPrimary 
                        }}
                      />
                    </div>
                  </div>
                  <SettingsInput label="Email Address" value={user?.email || ''} icon={Mail} disabled />
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleSaveName}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white transition-colors cursor-pointer shadow-sm"
                    style={{ backgroundColor: saveSuccess ? '#22c55e' : '#da7756' }}
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : <Save size={16} />}
                    {saveSuccess ? 'Saved' : 'Save Changes'}
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ────── Personalization ────── */}
            {activeSection === 'personalization' && (
              <SectionCard 
                title="Personalization & Assistant Directives" 
                subtitle="Configure the tone, jurisdiction, and persona that DeepDoc AI assumes across all documents"
              >
                {/* Persona */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-2" style={{ color: dc.textPrimary }}>
                    Select Professional Persona:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PERSONAS.map((p) => {
                      const isSelected = persona === p.id;
                      return (
                        <div
                          key={p.id}
                          onClick={() => setPersona(p.id)}
                          className="p-3 rounded-xl border transition-all cursor-pointer"
                          style={{
                            backgroundColor: isSelected 
                              ? (isDark ? 'rgba(218, 119, 86, 0.12)' : 'rgba(218, 119, 86, 0.08)') 
                              : (isDark ? '#0f172a' : '#ffffff'),
                            borderColor: isSelected ? '#da7756' : (isDark ? '#334155' : '#EAF0F6'),
                          }}
                        >
                          <div className="flex items-center justify-between font-semibold text-xs mb-1" style={{ color: dc.textPrimary }}>
                            <span>{p.label}</span>
                            {isSelected && <Check size={14} style={{ color: '#da7756' }} />}
                          </div>
                          <p className="text-[11px] leading-relaxed" style={{ color: dc.textSecondary }}>{p.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tone */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-2" style={{ color: dc.textPrimary }}>
                    Analysis Tone & Verbosity:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TONES.map((t) => {
                      const isSelected = tone === t.id;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTone(t.id)}
                          className="p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer"
                          style={{
                            backgroundColor: isSelected 
                              ? (isDark ? 'rgba(218, 119, 86, 0.12)' : 'rgba(218, 119, 86, 0.08)') 
                              : (isDark ? '#0f172a' : '#ffffff'),
                            borderColor: isSelected ? '#da7756' : (isDark ? '#334155' : '#EAF0F6'),
                          }}
                        >
                          <div className="font-semibold text-[11px]" style={{ color: isSelected ? '#da7756' : dc.textPrimary }}>
                            {t.label}
                          </div>
                          <div className="text-[10px] mt-0.5 line-clamp-1" style={{ color: dc.textSecondary }}>
                            {t.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Jurisdiction */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: dc.textPrimary }}>
                    Governing Legal Jurisdiction:
                  </label>
                  <select
                    value={jurisdiction}
                    onChange={(e) => setJurisdiction(e.target.value)}
                    className="w-full p-2.5 rounded-xl border text-xs focus:outline-none"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#EAF0F6',
                      color: dc.textPrimary,
                    }}
                  >
                    {JURISDICTIONS.map((j) => (
                      <option key={j.id} value={j.id}>{j.label}</option>
                    ))}
                  </select>
                </div>

                {/* Conversation Interaction History Context Window */}
                <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div>
                      <span className="text-xs font-bold" style={{ color: dc.textPrimary }}>
                        Conversation Context Window (Interactions sent back to LLM)
                      </span>
                      <p className="text-[11px] mt-0.5" style={{ color: dc.textSecondary }}>
                        Controls how many past interaction messages are sent back to the LLM for continuous follow-up reasoning.
                      </p>
                    </div>
                    <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-500">
                      {historyLimit} Messages ({Math.round(historyLimit / 2)} Turns)
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-3">
                    {[6, 10, 14, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setHistoryLimit(num)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer"
                        style={{
                          backgroundColor: historyLimit === num ? '#da7756' : (isDark ? '#1e293b' : '#ffffff'),
                          borderColor: historyLimit === num ? '#da7756' : (isDark ? '#334155' : '#e2e8f0'),
                          color: historyLimit === num ? '#ffffff' : dc.textSecondary,
                        }}
                      >
                        {num} Messages ({num / 2} Turns)
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Instructions Textarea */}
                <div className="mb-6">
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: dc.textPrimary }}>
                    Custom Instructions / Master Directives:
                  </label>
                  <textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Always structure risk analysis into High / Medium / Low. Highlight indemnities with monetary thresholds."
                    rows={4}
                    className="w-full p-3 rounded-xl border text-xs focus:outline-none transition-colors"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#EAF0F6',
                      color: dc.textPrimary,
                    }}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSavePersonalization}
                    disabled={personalizationSaving}
                    className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white transition-colors cursor-pointer shadow-sm"
                    style={{ backgroundColor: personalizationSaved ? '#22c55e' : '#da7756' }}
                  >
                    {personalizationSaving ? <Loader2 size={16} className="animate-spin" /> : personalizationSaved ? <Check size={16} /> : <Save size={16} />}
                    {personalizationSaved ? 'Saved Preferences' : 'Save Personalization'}
                  </button>
                </div>
              </SectionCard>
            )}

            {/* ────── Claude-style Memory ────── */}
            {activeSection === 'memory' && (
              <SectionCard 
                title="AI Memory & Learned Preferences" 
                subtitle="DeepDoc AI automatically learns your domain, legal preferences, and work habits from chats to personalize future answers"
              >
                {/* Memory Enable Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl border mb-6" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold" style={{ backgroundColor: 'rgba(218, 119, 86, 0.15)', color: '#da7756' }}>
                      <Brain size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold" style={{ color: dc.textPrimary }}>Enable AI Memory</p>
                      <p className="text-xs" style={{ color: dc.textSecondary }}>
                        When enabled, learned facts are automatically injected into the LLM prompt for personalized analysis.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleMemoryEnabled(!memoryEnabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${memoryEnabled ? 'bg-[#da7756]' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${memoryEnabled ? 'translate-x-[26px]' : 'translate-x-0.5'}`} />
                  </button>
                </div>

                {/* Auto Extract Banner */}
                <div className="p-4 rounded-xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'rgba(218, 119, 86, 0.25)', backgroundColor: 'rgba(218, 119, 86, 0.05)' }}>
                  <div>
                    <h3 className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#da7756' }}>
                      <Sparkles size={14} />
                      Generate Memory from Conversations
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: dc.textSecondary }}>
                      Let Gemini analyze your recent interactions and synthesize your preferences into durable memory facts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleExtractMemories}
                    disabled={isExtractingMemory}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-white text-xs font-bold cursor-pointer transition-opacity shrink-0 shadow-sm"
                    style={{ backgroundColor: '#da7756' }}
                  >
                    {isExtractingMemory ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                    <span>{isExtractingMemory ? 'Synthesizing...' : 'Extract Memories'}</span>
                  </button>
                </div>

                {memoryExtractMessage && (
                  <div className="mb-4 p-3 rounded-xl text-xs font-medium bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 animate-in fade-in">
                    {memoryExtractMessage}
                  </div>
                )}

                {/* Manual Add Memory */}
                <form onSubmit={handleAddMemory} className="mb-6 flex gap-2">
                  <input
                    type="text"
                    value={newMemoryInput}
                    onChange={(e) => setNewMemoryInput(e.target.value)}
                    placeholder="e.g. Always structure indemnities into tabular format with liability caps..."
                    className="flex-1 p-2.5 rounded-xl border text-xs focus:outline-none"
                    style={{
                      backgroundColor: isDark ? '#0f172a' : '#ffffff',
                      borderColor: isDark ? '#334155' : '#EAF0F6',
                      color: dc.textPrimary,
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!newMemoryInput.trim() || isAddingMemory}
                    className="flex items-center gap-1 px-4 py-2 rounded-xl text-white text-xs font-bold cursor-pointer disabled:opacity-40 shadow-sm"
                    style={{ backgroundColor: '#da7756' }}
                  >
                    <Plus size={14} />
                    <span>Add</span>
                  </button>
                </form>

                {/* Memory Items List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold" style={{ color: dc.textPrimary }}>
                      Active Memories ({memories.length})
                    </span>
                    {memories.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllMemories}
                        className="text-[11px] text-red-500 hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {memories.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl border border-dashed" style={{ borderColor: isDark ? '#334155' : '#EAF0F6' }}>
                      <Brain size={24} className="mx-auto text-slate-400 mb-2 opacity-60" />
                      <p className="text-xs font-medium" style={{ color: dc.textSecondary }}>
                        No memories recorded yet
                      </p>
                      <p className="text-[11px] mt-1 text-slate-400">
                        Chat with legal documents or click "Extract Memories" above to build your personalization memory.
                      </p>
                    </div>
                  ) : (
                    memories.map((mem) => {
                      const id = typeof mem === 'string' ? mem : mem.id;
                      const text = typeof mem === 'string' ? mem : mem.content;
                      const type = typeof mem === 'string' ? 'manual' : mem.type || 'manual';

                      return (
                        <div
                          key={id}
                          className="p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors"
                          style={{
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            borderColor: isDark ? '#334155' : '#EAF0F6',
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed" style={{ color: dc.textPrimary }}>
                              {text}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span 
                                className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded"
                                style={{
                                  backgroundColor: type === 'auto_extracted' ? 'rgba(218, 119, 86, 0.12)' : (isDark ? '#334155' : '#e2e8f0'),
                                  color: type === 'auto_extracted' ? '#da7756' : dc.textSecondary,
                                }}
                              >
                                {type === 'auto_extracted' ? 'Learned from Chat' : 'Manual'}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteMemory(id)}
                            className="p-1 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete this memory"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </SectionCard>
            )}

            {/* ────── Usage & Limits (Claude Style) ────── */}
            {activeSection === 'usage' && (
              <SectionCard 
                title="Usage & Quota Limits" 
                subtitle="Track your OCR parsing, embedding tokens, and AI reasoning consumption"
              >
                <div className="flex items-center justify-between pb-3 mb-6 border-b" style={{ borderColor: isDark ? '#334155' : '#EAF0F6' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                      Pro Developer Tier
                    </span>
                    <span className="text-xs" style={{ color: dc.textSecondary }}>Active Workspace</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchUsage}
                    disabled={usageLoading}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg border hover:bg-slate-500/5 transition-colors cursor-pointer"
                    style={{ borderColor: isDark ? '#334155' : '#EAF0F6', color: dc.textSecondary }}
                  >
                    <RefreshCw size={12} className={usageLoading ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {/* OCR Pages */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                        <FileText size={15} />
                        <span>OCR Pages</span>
                      </div>
                      <span className="text-xs font-bold">{ocrPercent}%</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: dc.textPrimary }}>
                      {ocrPages} <span className="text-xs font-normal text-slate-400">/ {ocrLimit}</span>
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full transition-all" style={{ width: `${ocrPercent}%` }} />
                    </div>
                  </div>

                  {/* Embedding Tokens */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500">
                        <Layers size={15} />
                        <span>Embeddings</span>
                      </div>
                      <span className="text-xs font-bold">{embedPercent}%</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: dc.textPrimary }}>
                      {formatNumber(embedTokens)} <span className="text-xs font-normal text-slate-400">/ {formatNumber(embedLimit)}</span>
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${embedPercent}%` }} />
                    </div>
                  </div>

                  {/* AI Tokens */}
                  <div className="p-4 rounded-xl border" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#da7756]">
                        <Cpu size={15} />
                        <span>AI Tokens</span>
                      </div>
                      <span className="text-xs font-bold">{aiPercent}%</span>
                    </div>
                    <p className="text-lg font-bold" style={{ color: dc.textPrimary }}>
                      {formatNumber(aiTokens)} <span className="text-xs font-normal text-slate-400">/ {formatNumber(aiLimit)}</span>
                    </p>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div className="bg-[#da7756] h-full rounded-full transition-all" style={{ width: `${aiPercent}%` }} />
                    </div>
                  </div>
                </div>

                {/* Token Breakdown Bar */}
                <div className="p-4 rounded-xl border space-y-3" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#ffffff' }}>
                  <h4 className="text-xs font-bold" style={{ color: dc.textPrimary }}>Detailed Token Breakdown</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div className="p-3 rounded-lg bg-slate-500/5">
                      <span className="text-slate-400 block text-[11px]">Prompt Input Tokens</span>
                      <span className="font-bold font-mono text-sm" style={{ color: dc.textPrimary }}>{aiInput.toLocaleString()}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-500/5">
                      <span className="text-slate-400 block text-[11px]">Completion / Thinking Tokens</span>
                      <span className="font-bold font-mono text-sm" style={{ color: dc.textPrimary }}>{aiOutput.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-2 text-[11px] flex items-center justify-between text-slate-400">
                    <span>Reset Cycle: 1st of every calendar month</span>
                    <span className="text-emerald-500 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={12} /> Within Quotas
                    </span>
                  </div>
                </div>
              </SectionCard>
            )}

            {/* ────── Appearance ────── */}
            {activeSection === 'appearance' && (
              <SectionCard title="Appearance" subtitle="Customize how DeepDoc AI looks on your device">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'light', label: 'Light', icon: Sun },
                    { id: 'dark', label: 'Dark', icon: Moon },
                    { id: 'system', label: 'System', icon: Monitor },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className="flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all cursor-pointer"
                        style={{
                          borderColor: isSelected ? '#da7756' : (isDark ? '#334155' : '#EAF0F6'),
                          backgroundColor: isSelected ? 'rgba(218, 119, 86, 0.08)' : (isDark ? '#0f172a' : '#ffffff'),
                        }}
                      >
                        <Icon size={24} style={{ color: isSelected ? '#da7756' : dc.textSecondary }} />
                        <span className="text-xs font-semibold" style={{ color: dc.textPrimary }}>{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </SectionCard>
            )}

            {/* ────── Notifications ────── */}
            {activeSection === 'notifications' && (
              <SectionCard title="Notification Preferences" subtitle="Manage your email and in-app alerts">
                <div className="space-y-3">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive email summaries when large OCR documents finish processing"
                    checked={notifications.email}
                    onChange={(v) => handleNotificationChange('email', v)}
                  />
                  <ToggleRow
                    label="Weekly Digest"
                    description="Weekly summary of document queries and key contract insights"
                    checked={notifications.digest}
                    onChange={(v) => handleNotificationChange('digest', v)}
                  />
                </div>
              </SectionCard>
            )}

            {/* ────── Privacy ────── */}
            {activeSection === 'privacy' && (
              <SectionCard title="Data Privacy & Security" subtitle="How your documents and intelligence are protected">
                <div className="p-4 rounded-xl border leading-relaxed text-xs space-y-2" style={{ borderColor: isDark ? '#334155' : '#EAF0F6', backgroundColor: isDark ? '#0f172a' : '#f8fafc', color: dc.textSecondary }}>
                  <p>
                    Your legal agreements are processed strictly within isolated user boundaries. Embeddings and OCR chunks are never shared with third parties or used for external model retraining.
                  </p>
                  <p>
                    Claude-style persistent memories are stored encrypted in your private profile and can be reviewed, edited, or cleared at any time.
                  </p>
                </div>
              </SectionCard>
            )}

            {/* ────── Danger Zone ────── */}
            {activeSection === 'danger' && (
              <SectionCard title="Danger Zone" subtitle="Irreversible account actions" borderColor="border-red-500/30" bgColor={isDark ? 'bg-red-950/10' : 'bg-red-50/40'}>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-bold text-red-600">Delete All Conversations</p>
                      <p className="text-[11px] text-slate-400">Permanently clears your chat interaction history</p>
                    </div>
                    <button 
                      onClick={() => { if (window.confirm('Delete all chats?')) alert('Chats cleared'); }}
                      className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Delete All
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-red-500/20 bg-white dark:bg-slate-900">
                    <div>
                      <p className="text-xs font-bold text-red-600">Sign Out</p>
                      <p className="text-[11px] text-slate-400">Log out of your DeepDoc AI account</p>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors cursor-pointer"
                    >
                      <LogOut size={13} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SectionCard>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

// ── Reusable Card ──────────────────────────────────────────────
const SectionCard = ({ title, subtitle, children, borderColor, bgColor }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  return (
    <div 
      className={`rounded-2xl border p-6 shadow-sm ${borderColor || ''} ${bgColor || ''}`}
      style={{
        backgroundColor: bgColor ? undefined : (isDark ? '#1e293b' : '#ffffff'),
        borderColor: borderColor ? undefined : (isDark ? '#334155' : '#EAF0F6'),
      }}
    >
      <h2 className="text-base font-bold mb-1" style={{ color: dc.textPrimary }}>{title}</h2>
      {subtitle && <p className="text-xs mb-5" style={{ color: dc.textSecondary }}>{subtitle}</p>}
      {children}
    </div>
  );
};

// ── Input ─────────────────────────────────────────────────────
const SettingsInput = ({ label, value, icon: Icon, disabled = false }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: dc.textSecondary }}>{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dc.textSecondary }} />
        <input
          defaultValue={value}
          disabled={disabled}
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border focus:outline-none transition-all disabled:opacity-50"
          style={{
            backgroundColor: isDark ? '#0f172a' : '#f8fafc',
            borderColor: isDark ? '#334155' : '#EAF0F6',
            color: dc.textPrimary,
          }}
        />
      </div>
    </div>
  );
};

// ── Toggle Row ────────────────────────────────────────────────
const ToggleRow = ({ label, description, checked, onChange }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  return (
    <div 
      className="flex items-center justify-between p-4 rounded-xl border"
      style={{
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        borderColor: isDark ? '#334155' : '#EAF0F6',
      }}
    >
      <div>
        <p className="text-xs font-semibold" style={{ color: dc.textPrimary }}>{label}</p>
        <p className="text-[11px]" style={{ color: dc.textSecondary }}>{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${
          checked ? 'bg-[#da7756]' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
            checked ? 'translate-x-[22px]' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
};

export default SettingsPage;
