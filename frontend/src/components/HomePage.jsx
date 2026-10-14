import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FolderPlus, 
  FolderUp, 
  Folder, 
  Brain, 
  Globe, 
  ArrowUp, 
  Cpu, 
  Sliders, 
  Sparkles, 
  FileText, 
  Layers, 
  Zap, 
  ChevronRight,
  Plus,
  Mic,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { uploadDocument, getUser, getAvailableModels } from '../services/api';
import ClaudeModelSelector from './ClaudeModelSelector';
import ReconstructedOCRModal from './ReconstructedOCRModal';
import { useChat } from '../contexts/ChatContext';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const QUICK_STARTERS = [
  { icon: '⚖️', label: 'Indemnity & Liabilities', prompt: 'Audit all indemnity, limitation of liability, and warranty clauses across my documents.' },
  { icon: '📜', label: 'Termination & Breaches', prompt: 'Summarize the breach conditions, notice periods, and termination procedures.' },
  { icon: '🛡️', label: 'Compliance & Regulatory', prompt: 'Check compliance risks against statutory data protection and governing law standards.' },
  { icon: '📊', label: 'Extract Clause Matrix', prompt: 'Create a structured comparative table of parties, payment terms, and key covenants.' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { 
    createNewChat, 
    setCurrentDocumentId,
    currentDocumentId,
    userDocuments = [],
    loadUserDocuments,
    projects,
    activeProject,
    setActiveProject,
    setIsProjectsModalOpen,
    setProjectToEdit,
    setIsMultiUploadOpen,
    setIsUsageModalOpen,
    setIsPersonalizationModalOpen,
    usageSummary,
    thinkingMode,
    setThinkingMode,
    webMode,
    setWebMode,
    setIsLiveAudioOpen,
  } = useChat();

  const [promptInput, setPromptInput] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [viewingOCRDoc, setViewingOCRDoc] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [availableModels, setAvailableModels] = useState([
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
    { id: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite' },
  ]);
  const [user, setUser] = useState(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  useEffect(() => {
    setUser(getUser());
    getAvailableModels().then((res) => {
      if (res?.models?.length) {
        setAvailableModels(res.models);
      }
    }).catch(() => {});
  }, []);

  // Sync selectedDocId when documents load
  useEffect(() => {
    if (!selectedDocId && userDocuments.length > 0) {
      setSelectedDocId(userDocuments[0].id);
    }
  }, [userDocuments, selectedDocId]);

  const handleStartPrompt = async (textToSend) => {
    const q = textToSend || promptInput;
    if (!q.trim()) return;

    // Save prompt & model into session storage so ChatPage automatically executes it
    sessionStorage.setItem('initial_user_prompt', q.trim());
    sessionStorage.setItem('initial_model', selectedModel);

    // Pick target document: explicitly selected -> activeProject document -> first uploaded doc -> null
    const docId = selectedDocId || activeProject?.documents?.[0]?.id || userDocuments?.[0]?.id || null;
    if (docId) {
      setCurrentDocumentId(docId);
    }

    try {
      const newChat = await createNewChat(docId, activeProject?.id || null);
      if (newChat) {
        navigate(`/chat/${newChat.id}`);
      } else {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
      // Navigate to chat anyway rather than opening upload popup
      navigate('/chat');
    }
  };

  return (
    <div 
      className="h-full w-full overflow-y-auto transition-colors duration-300"
      style={{ backgroundColor: isDark ? '#101013' : '#fcfcfc' }}
    >
      <div className="max-w-4xl mx-auto px-6 py-10 flex flex-col items-center">
        
        {/* Top Status Bar (Claude-style subtle pills) */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3 mb-8 text-xs">
          {/* Active Project Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:bg-slate-500/5 cursor-pointer font-medium"
              style={{
                borderColor: activeProject ? activeProject.color : (isDark ? '#27272a' : '#e4e4e7'),
                backgroundColor: activeProject ? `${activeProject.color}15` : (isDark ? '#18181b' : '#ffffff'),
                color: activeProject ? activeProject.color : dc.textPrimary,
              }}
            >
              <Folder size={13} style={{ color: activeProject?.color || '#da7756' }} />
              <span>{activeProject ? `Project: ${activeProject.name}` : 'All Projects & Files'}</span>
              <ChevronRight size={12} className="opacity-50" />
            </button>
          </div>

          {/* Quick Metrics & Personalization Pill */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsUsageModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono transition-all hover:border-amber-500/50 cursor-pointer text-[11px]"
              style={{
                borderColor: isDark ? '#27272a' : '#e4e4e7',
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                color: dc.textPrimary,
              }}
              title="Click to view detailed usage and quotas"
            >
              <Zap size={13} className="text-emerald-500" />
              <span>{Math.round((usageSummary?.aiTokens?.totalTokens ?? 12300) / 1000)}k AI</span>
              <span className="opacity-40">•</span>
              <FileText size={12} className="text-amber-500" />
              <span>{usageSummary?.ocrPages ?? 12} OCR pgs</span>
              <span className="opacity-40">•</span>
              <Layers size={12} className="text-indigo-400" />
              <span>{Math.round((usageSummary?.embeddingTokens ?? 18450) / 1000)}k Embed</span>
            </button>

            <button
              onClick={() => setIsPersonalizationModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all hover:bg-slate-500/5 cursor-pointer"
              style={{
                borderColor: isDark ? '#27272a' : '#e4e4e7',
                backgroundColor: isDark ? '#18181b' : '#ffffff',
                color: dc.textPrimary,
              }}
            >
              <Sliders size={13} className="text-amber-500" />
              <span className="font-medium">Personalize</span>
            </button>
          </div>
        </div>

        {/* Claude Greeting Header */}
        <div className="text-center max-w-xl mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3 shadow-sm"
            style={{ backgroundColor: 'rgba(218, 119, 86, 0.15)', color: '#da7756' }}
          >
            <Sparkles size={24} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2" style={{ color: dc.textPrimary }}>
            Welcome, {user?.name || 'Counsel'}
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: dc.textSecondary }}>
            Analyze multi-party legal agreements, search statutes with real-time web grounding, and organize case files in Claude-style projects.
          </p>
        </div>

        {/* Claude-style Uploaded Documents & Knowledge Pills */}
        {userDocuments.length > 0 && (
          <div className="w-full mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: dc.textSecondary }}>
                <FileText size={13} className="text-amber-500" />
                <span>Uploaded Files & OCR Knowledge ({userDocuments.length})</span>
              </span>
              <span className="text-[10px] text-amber-500/90 font-medium">
                Click any file to open Reconstructed OCR View
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
              {userDocuments.map((doc) => {
                const isSelected = selectedDocId === doc.id || (!selectedDocId && userDocuments[0]?.id === doc.id);
                return (
                  <div
                    key={doc.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all cursor-pointer group shrink-0 ${
                      isSelected 
                        ? 'border-amber-500/80 bg-amber-500/10 shadow-sm' 
                        : 'hover:border-slate-400 bg-white dark:bg-[#18181b]'
                    }`}
                    style={{
                      borderColor: isSelected ? '#da7756' : (isDark ? '#2e2e34' : '#e4e4e7'),
                    }}
                    onClick={() => {
                      setViewingOCRDoc(doc);
                    }}
                    title="Click to open Reconstructed OCR View"
                  >
                    <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                      <FileText size={12} />
                    </div>

                    <div className="flex flex-col min-w-0 max-w-[170px]">
                      <span className="text-xs font-semibold truncate group-hover:text-amber-500 transition-colors" style={{ color: dc.textPrimary }}>
                        {doc.fileName || doc.file_name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                        <span className="text-emerald-500 font-medium">OCR Ready</span>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                          <Eye size={10} /> View OCR
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocId(doc.id);
                        setCurrentDocumentId(doc.id);
                      }}
                      className={`ml-1 text-[10px] px-1.5 py-0.5 rounded font-medium transition-all ${
                        isSelected 
                          ? 'bg-amber-500 text-white' 
                          : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }`}
                      title="Target this document for analysis"
                    >
                      {isSelected ? 'Active' : 'Target'}
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => setIsMultiUploadOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-xs font-medium hover:bg-slate-500/5 transition-colors shrink-0 cursor-pointer"
                style={{ borderColor: isDark ? '#2e2e34' : '#cbd5e1', color: dc.textSecondary }}
              >
                <Upload size={12} className="text-amber-500" />
                <span>+ Upload More</span>
              </button>
            </div>
          </div>
        )}

        {/* Claude-style Centered Prompt Box */}
        <div 
          className="w-full rounded-2xl border shadow-xl p-3.5 mb-8 transition-all relative focus-within:ring-2 focus-within:ring-amber-500/40"
          style={{
            backgroundColor: isDark ? '#18181b' : '#ffffff',
            borderColor: isDark ? '#2e2e34' : '#e4e4e7',
          }}
        >
          <textarea
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleStartPrompt();
              }
            }}
            placeholder="Ask anything about your contracts, verify clauses, or search legal precedents..."
            rows={3}
            className="w-full bg-transparent resize-none text-sm outline-none leading-relaxed placeholder:text-slate-400"
            style={{ color: dc.textPrimary }}
          />

          {/* Controls Bar inside the input box */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t mt-2"
            style={{ borderColor: isDark ? '#27272a' : '#f4f4f5' }}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Multi-File Upload button */}
              <button
                type="button"
                onClick={() => setIsMultiUploadOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border hover:bg-slate-500/5 transition-colors"
                style={{ borderColor: isDark ? '#27272a' : '#e4e4e7', color: dc.textSecondary }}
                title="Upload multiple files or folders"
              >
                <Upload size={13} className="text-amber-500" />
                <span>Upload Files</span>
              </button>

              {/* Target Document Indicator Pill */}
              {selectedDocId && (
                <div 
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 cursor-pointer"
                  onClick={() => {
                    const doc = userDocuments.find(d => d.id === selectedDocId);
                    if (doc) setViewingOCRDoc(doc);
                  }}
                  title="Click to view reconstructed OCR for targeted document"
                >
                  <FileText size={12} className="text-amber-500" />
                  <span className="truncate max-w-[130px]">
                    {userDocuments.find(d => d.id === selectedDocId)?.fileName || userDocuments.find(d => d.id === selectedDocId)?.file_name || 'Active Document'}
                  </span>
                  <Eye size={11} className="opacity-70" />
                </div>
              )}

              {/* Thinking Mode Toggle */}
              <button
                type="button"
                onClick={() => setThinkingMode(!thinkingMode)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  thinkingMode 
                    ? 'border-amber-500 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold' 
                    : 'border-transparent text-slate-500 hover:bg-slate-500/5'
                }`}
                title="Extended Deep Reasoning trace before answers"
              >
                <Brain size={13} className={thinkingMode ? 'text-amber-500' : 'text-slate-400'} />
                <span>Thinking: {thinkingMode ? 'ON' : 'OFF'}</span>
              </button>

              {/* Web Mode Toggle */}
              <button
                type="button"
                onClick={() => setWebMode(!webMode)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  webMode 
                    ? 'border-blue-500 bg-blue-500/15 text-blue-600 dark:text-blue-400 font-semibold' 
                    : 'border-transparent text-slate-500 hover:bg-slate-500/5'
                }`}
                title="Real-time Web Search Grounding for live legal intelligence"
              >
                <Globe size={13} className={webMode ? 'text-blue-500' : 'text-slate-400'} />
                <span>Web: {webMode ? 'ON' : 'OFF'}</span>
              </button>

              {/* Claude Model Selector */}
              <ClaudeModelSelector
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                availableModels={availableModels}
                placement="bottom-up"
                compact={false}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Gemini Live Button */}
              <button
                type="button"
                onClick={() => setIsLiveAudioOpen(true)}
                className="h-8 px-2.5 rounded-xl flex items-center gap-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:opacity-90 text-white font-medium text-xs shadow-sm transition-all cursor-pointer group"
                title="Open Gemini Live Voice Session"
              >
                <div className="flex items-center gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-white rounded-full group-hover:h-3 transition-all animate-pulse" />
                  <span className="w-0.5 h-3 bg-white rounded-full group-hover:h-3.5 transition-all animate-pulse delay-75" />
                  <span className="w-0.5 h-2.5 bg-white rounded-full group-hover:h-3 transition-all animate-pulse delay-150" />
                  <span className="w-0.5 h-1.5 bg-white rounded-full group-hover:h-2.5 transition-all animate-pulse delay-200" />
                </div>
                <span className="font-semibold tracking-tight text-[11px]">Live</span>
              </button>

              {/* Send Button */}
              <button
                onClick={() => handleStartPrompt()}
                disabled={!promptInput.trim()}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-40 cursor-pointer shadow"
                style={{ backgroundColor: '#da7756' }}
              >
                <ArrowUp size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Starters (Claude Prompts) */}
        <div className="w-full mb-10">
          <span className="text-[11px] font-bold uppercase tracking-wider block mb-3" style={{ color: dc.textSecondary }}>
            Recommended Analysis Prompts
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {QUICK_STARTERS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleStartPrompt(s.prompt)}
                className="p-3.5 rounded-xl border text-left transition-all hover:border-amber-500/50 hover:shadow-sm group cursor-pointer"
                style={{
                  backgroundColor: isDark ? '#141417' : '#ffffff',
                  borderColor: isDark ? '#232328' : '#e4e4e7',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-amber-500 transition-colors">
                    {s.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                  {s.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Projects Folders Grid */}
        <div className="w-full mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: dc.textSecondary }}>
              Projects Knowledge Folders
            </span>
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectsModalOpen(true);
              }}
              className="text-xs font-medium text-amber-500 hover:underline flex items-center gap-1"
            >
              <Plus size={13} /> New Project Folder
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Create Project Card */}
            <div
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectsModalOpen(true);
              }}
              className="p-4 rounded-xl border border-dashed flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-500/5 transition-all min-h-[110px]"
              style={{ borderColor: isDark ? '#2e2e34' : '#cbd5e1' }}
            >
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-2">
                <FolderPlus size={16} />
              </div>
              <p className="text-xs font-semibold">New Project Folder</p>
              <p className="text-[10px] text-slate-400">Scoped system prompt & files</p>
            </div>

            {/* Existing Projects */}
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              return (
                <div
                  key={proj.id}
                  onClick={() => setActiveProject(isActive ? null : proj)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                    isActive ? 'ring-2 ring-amber-500 shadow-md' : 'hover:border-slate-400'
                  }`}
                  style={{
                    backgroundColor: isDark ? '#141417' : '#ffffff',
                    borderColor: isDark ? '#232328' : '#e4e4e7',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: proj.color || '#da7756' }}
                      />
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-slate-500/10 text-slate-400">
                        {proj.document_count || 0} files
                      </span>
                    </div>
                    <h3 className="text-xs font-bold line-clamp-1 mb-1">{proj.name}</h3>
                    {proj.description && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                        {proj.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2 border-t flex items-center justify-between text-[10px] text-slate-400"
                    style={{ borderColor: isDark ? '#232328' : '#f4f4f5' }}
                  >
                    <span>{isActive ? 'Active Folder' : 'Click to select'}</span>
                    <ChevronRight size={12} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Direct Ingestion Action Card */}
        <div 
          className="w-full p-5 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{
            backgroundColor: isDark ? '#16161a' : '#f8fafc',
            borderColor: isDark ? '#26262b' : '#e2e8f0',
          }}
        >
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <FolderUp size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Batch Upload Legal Contracts & Entire Folders
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Multi-page Sarvam OCR, 768-dim vector embeddings, and digital layout reconstruction.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsMultiUploadOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white shrink-0 flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            style={{ backgroundColor: '#da7756' }}
          >
            <Upload size={14} /> Ingest Files / Folder
          </button>
        </div>

        {/* Reconstructed OCR View Modal */}
        <ReconstructedOCRModal
          isOpen={!!viewingOCRDoc}
          documentId={viewingOCRDoc?.id}
          fileName={viewingOCRDoc?.fileName || viewingOCRDoc?.file_name}
          onClose={() => setViewingOCRDoc(null)}
          onSelectForChat={async (docId) => {
            setSelectedDocId(docId);
            setCurrentDocumentId(docId);
            try {
              const newChat = await createNewChat(docId, activeProject?.id || null);
              if (newChat) {
                navigate(`/chat/${newChat.id}`);
              }
            } catch (err) {
              console.error('Failed to create chat from OCR modal:', err);
            }
          }}
        />

      </div>
    </div>
  );
};

export default HomePage;
