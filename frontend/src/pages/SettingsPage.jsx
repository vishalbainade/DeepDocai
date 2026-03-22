import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, User, Mail, Shield, Bell, Palette, Globe, Key,
  ChevronRight, LogOut, Trash2, Moon, Sun, Monitor, Check, Save, Loader2
} from 'lucide-react';
import { getUser, logout } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'danger', label: 'Danger Zone', icon: Trash2 },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { theme, setTheme, preferences, updatePreference } = useTheme();
  const [activeSection, setActiveSection] = useState('profile');
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, push: false, digest: true });

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
    setDisplayName(userData?.name || '');
  }, []);

  // Sync from backend preferences when loaded
  useEffect(() => {
    if (preferences) {
      if (preferences.displayName) setDisplayName(preferences.displayName);
      if (preferences.notifications) setNotifications(preferences.notifications);
    }
  }, [preferences]);

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

  const handleNotificationChange = async (key, value) => {
    const updated = { ...notifications, [key]: value };
    setNotifications(updated);
    try {
      await updatePreference({ notifications: updated });
    } catch {
      // Revert on failure
      setNotifications(notifications);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-4 px-6 py-4 bg-white border-b border-[#EAF0F6]">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-[rgba(142,132,184,0.08)] transition-colors"
        >
          <ArrowLeft size={20} style={{ color: '#64748B' }} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: '#1E293B' }}>Settings</h1>
          <p className="text-xs" style={{ color: '#94A3B8' }}>Manage your account and preferences</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Settings Nav */}
        <div className="w-56 shrink-0 bg-white border-r border-[#EAF0F6] py-4 overflow-y-auto">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id)}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition-all duration-200"
                style={{
                  color: isActive ? '#8E84B8' : '#64748B',
                  backgroundColor: isActive ? 'rgba(142,132,184,0.08)' : 'transparent',
                  borderLeft: isActive ? '3px solid #8E84B8' : '3px solid transparent',
                }}
              >
                <Icon size={18} />
                {sec.label}
              </button>
            );
          })}
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* ────── Profile ────── */}
            {activeSection === 'profile' && (
              <>
                <SectionCard title="Profile Information" subtitle="Your personal details">
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-16 h-16 rounded-full bg-[#8E84B8] flex items-center justify-center shadow-lg shadow-[rgba(142,132,184,0.3)]">
                      <User size={28} className="text-white" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold" style={{ color: '#1E293B' }}>{displayName || 'User'}</p>
                      <p className="text-sm" style={{ color: '#94A3B8' }}>{user?.email || 'No email'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>Full Name</label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
                        <input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#EAF0F6] focus:outline-none focus:ring-2 focus:ring-[#8E84B8] focus:border-[#8E84B8] transition-all bg-white"
                          style={{ color: '#1E293B' }}
                        />
                      </div>
                    </div>
                    <SettingsInput label="Email Address" value={user?.email || ''} icon={Mail} disabled />
                  </div>

                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleSaveName}
                      disabled={saving}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl text-white transition-colors"
                      style={{ backgroundColor: saveSuccess ? '#22c55e' : '#8E84B8' }}
                      onMouseEnter={(e) => !saveSuccess && (e.currentTarget.style.backgroundColor = '#7A70A8')}
                      onMouseLeave={(e) => !saveSuccess && (e.currentTarget.style.backgroundColor = '#8E84B8')}
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : <Save size={14} />}
                      {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                    </button>
                  </div>
                </SectionCard>

                <SectionCard title="Language & Region" subtitle="Set your preferred language">
                  <div className="grid grid-cols-2 gap-4">
                    <SettingsSelect label="Language" options={['English', 'Hindi', 'Spanish', 'French']} icon={Globe} />
                    <SettingsSelect label="Timezone" options={['IST (UTC+5:30)', 'UTC', 'EST', 'PST']} icon={Globe} />
                  </div>
                </SectionCard>
              </>
            )}

            {/* ────── Appearance ────── */}
            {activeSection === 'appearance' && (
              <SectionCard title="Theme" subtitle="Customize the look and feel">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', label: 'Light', icon: Sun, preview: 'bg-white border-slate-200' },
                    { id: 'dark', label: 'Dark', icon: Moon, preview: 'bg-slate-900 border-slate-700' },
                    { id: 'system', label: 'System', icon: Monitor, preview: 'bg-gradient-to-br from-white to-slate-900 border-slate-300' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all duration-200 ${
                        theme === t.id
                          ? 'border-[#8E84B8] bg-[rgba(142,132,184,0.06)] shadow-lg shadow-[rgba(142,132,184,0.15)]'
                          : 'border-[#EAF0F6] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {theme === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#8E84B8] flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                      <div className={`w-12 h-12 rounded-xl ${t.preview} border flex items-center justify-center`}>
                        <t.icon size={20} style={{ color: theme === t.id ? '#8E84B8' : '#94A3B8' }} />
                      </div>
                      <span className="text-sm font-semibold" style={{ color: theme === t.id ? '#8E84B8' : '#64748B' }}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs" style={{ color: '#94A3B8' }}>
                  {theme === 'system'
                    ? '🖥️ Theme follows your operating system preference and changes automatically.'
                    : theme === 'dark'
                    ? '🌙 Dark mode is active. Easier on the eyes in low-light environments.'
                    : '☀️ Light mode is active. Best for well-lit environments.'}
                </p>
              </SectionCard>
            )}

            {/* ────── Notifications ────── */}
            {activeSection === 'notifications' && (
              <SectionCard title="Notification Preferences" subtitle="Control how you receive updates">
                <div className="space-y-4">
                  <ToggleRow
                    label="Email Notifications"
                    description="Receive document processing updates via email"
                    checked={notifications.email}
                    onChange={(v) => handleNotificationChange('email', v)}
                  />
                  <ToggleRow
                    label="Push Notifications"
                    description="Get real-time browser push notifications"
                    checked={notifications.push}
                    onChange={(v) => handleNotificationChange('push', v)}
                  />
                  <ToggleRow
                    label="Weekly Digest"
                    description="Summary of your document activity every week"
                    checked={notifications.digest}
                    onChange={(v) => handleNotificationChange('digest', v)}
                  />
                </div>
              </SectionCard>
            )}

            {/* ────── Privacy ────── */}
            {activeSection === 'privacy' && (
              <>
                <SectionCard title="Security" subtitle="Keep your account safe">
                  <button className="w-full flex items-center justify-between p-4 rounded-xl border border-[#EAF0F6] hover:bg-[rgba(142,132,184,0.04)] transition-colors">
                    <div className="flex items-center gap-3">
                      <Key size={18} style={{ color: '#8E84B8' }} />
                      <div className="text-left">
                        <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Change Password</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>Update your login credentials</p>
                      </div>
                    </div>
                    <ChevronRight size={18} style={{ color: '#94A3B8' }} />
                  </button>
                </SectionCard>

                <SectionCard title="Data Privacy" subtitle="How your data is handled">
                  <div className="p-4 rounded-xl bg-[rgba(142,132,184,0.04)] border border-[#EAF0F6]">
                    <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                      Your documents are processed securely and stored encrypted. We use industry-standard
                      AES-256 encryption for all data at rest. Documents are only accessible by you and are
                      never shared with third parties. You can delete all your data at any time from the
                      Danger Zone section.
                    </p>
                  </div>
                </SectionCard>
              </>
            )}

            {/* ────── Danger Zone ────── */}
            {activeSection === 'danger' && (
              <SectionCard
                title="Danger Zone"
                subtitle="Irreversible actions"
                borderColor="border-red-200"
                bgColor="bg-red-50/30"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-white">
                    <div>
                      <p className="text-sm font-semibold text-red-700">Delete All Chat History</p>
                      <p className="text-xs text-red-400">Permanently remove all your conversations</p>
                    </div>
                    <button className="px-4 py-2 text-xs font-bold rounded-lg border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                      Delete All
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-white">
                    <div>
                      <p className="text-sm font-semibold text-red-700">Delete Account</p>
                      <p className="text-xs text-red-400">This will permanently delete your account and all data</p>
                    </div>
                    <button className="px-4 py-2 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors">
                      Delete Account
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl border border-[#EAF0F6] bg-white">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>Sign Out</p>
                      <p className="text-xs" style={{ color: '#94A3B8' }}>Log out of your account on this device</p>
                    </div>
                    <button
                      onClick={() => logout()}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
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
const SectionCard = ({ title, subtitle, children, borderColor = 'border-[#EAF0F6]', bgColor = 'bg-white' }) => (
  <div className={`rounded-2xl border ${borderColor} ${bgColor} p-6 shadow-sm`}>
    <h2 className="text-base font-bold mb-1" style={{ color: '#1E293B' }}>{title}</h2>
    {subtitle && <p className="text-xs mb-5" style={{ color: '#94A3B8' }}>{subtitle}</p>}
    {children}
  </div>
);

// ── Input ─────────────────────────────────────────────────────
const SettingsInput = ({ label, value, icon: Icon, disabled = false }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
      <input
        defaultValue={value}
        disabled={disabled}
        className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#EAF0F6] focus:outline-none focus:ring-2 focus:ring-[#8E84B8] focus:border-[#8E84B8] transition-all ${
          disabled ? 'bg-[#F8FAFC] text-slate-400 cursor-not-allowed' : 'bg-white'
        }`}
        style={{ color: disabled ? '#94A3B8' : '#1E293B' }}
      />
    </div>
  </div>
);

// ── Select ────────────────────────────────────────────────────
const SettingsSelect = ({ label, options, icon: Icon }) => (
  <div>
    <label className="block text-xs font-semibold mb-1.5" style={{ color: '#64748B' }}>{label}</label>
    <div className="relative">
      <Icon size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94A3B8' }} />
      <select
        className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-[#EAF0F6] bg-white focus:outline-none focus:ring-2 focus:ring-[#8E84B8] focus:border-[#8E84B8] transition-all appearance-none"
        style={{ color: '#1E293B' }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90" style={{ color: '#94A3B8' }} />
    </div>
  </div>
);

// ── Toggle Row ────────────────────────────────────────────────
const ToggleRow = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-[#EAF0F6] hover:bg-[rgba(142,132,184,0.02)] transition-colors">
    <div>
      <p className="text-sm font-semibold" style={{ color: '#1E293B' }}>{label}</p>
      <p className="text-xs" style={{ color: '#94A3B8' }}>{description}</p>
    </div>
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? 'bg-[#8E84B8]' : 'bg-slate-300'
      }`}
    >
      <div
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  </div>
);

export default SettingsPage;
