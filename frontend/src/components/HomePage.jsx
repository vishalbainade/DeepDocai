import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  FolderPlus, 
  Folder, 
  Brain, 
  Globe, 
  ArrowUp, 
  Sliders, 
  Sparkles, 
  FileText, 
  Layers, 
  ChevronRight,
  Plus,
  Mic,
  Eye,
  CheckCircle2,
  X,
  Paperclip,
  Check,
  ChevronDown
} from 'lucide-react';
import { uploadDocument, getUser, getAvailableModels } from '../services/api';
import ClaudeModelSelector, { DEFAULT_TEXT_MODELS } from './ClaudeModelSelector';
import ReconstructedOCRModal from './ReconstructedOCRModal';
import { useChat } from '../contexts/ChatContext';
import { useDarkColors, useIsDark } from '../utils/darkMode';
import deepDocLogo from '../assets/deepdoc-logo.png';

const QUICK_STARTERS = [
  { icon: '</>', label: 'Clauses', prompt: 'Audit all indemnity, limitation of liability, and warranty clauses across my documents.' },
  { icon: '✏️', label: 'Summarize', prompt: 'Summarize key covenants, parties, payment schedules, and breach penalties.' },
  { icon: '🎓', label: 'Precedents', prompt: 'Check statutory compliance and legal precedents relevant to these agreements.' },
  { icon: '⚖️', label: 'Liabilities', prompt: 'Highlight high-risk liability clauses, uncapped exposure, and dispute resolution venues.' },
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
    selectProject,
    setIsProjectsModalOpen,
    setProjectToEdit,
    setIsMultiUploadOpen,
    openSettings,
    thinkingMode,
    setThinkingMode,
    webMode,
    setWebMode,
    setIsLiveAudioOpen,
  } = useChat();

  const [promptInput, setPromptInput] = useState('');
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [viewingOCRDoc, setViewingOCRDoc] = useState(null);
  const [selectedModel, setSelectedModel] = useState('gemini-3.8-flash');
  const [availableModels, setAvailableModels] = useState(DEFAULT_TEXT_MODELS);
  const [chatMode, setChatMode] = useState('chat'); // default to 'chat'
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  const fileInputRef = useRef(null);
  const attachMenuRef = useRef(null);
  const textareaRef = useRef(null);
  const dc = useDarkColors();
  const isDark = useIsDark();

  const workspaceDocuments = Array.isArray(activeProject?.documents) && activeProject.documents.length > 0
    ? activeProject.documents
    : userDocuments;

  // Ensure new chats start completely clean with NO document pre-attached
  useEffect(() => {
    setSelectedDocId(null);
    setCurrentDocumentId(null);
  }, [setCurrentDocumentId]);

  // Time-aware greeting
  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Morning thoughts';
    if (hour >= 12 && hour < 17) return 'Afternoon thoughts';
    if (hour >= 17 && hour < 22) return 'Evening thoughts';
    return 'Night thoughts';
  };

  useEffect(() => {
    setUser(getUser());
    getAvailableModels().then((res) => {
      if (res?.models?.length) {
        setAvailableModels(res.models);
      }
    }).catch(() => {
      setAvailableModels(DEFAULT_TEXT_MODELS);
    });
  }, []);

  // Close attach menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target)) {
        setAttachMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-resize textarea
  const handleTextareaChange = (e) => {
    setPromptInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 220)}px`;
    }
  };

  // Find currently selected document
  const activeDocument = workspaceDocuments.find((d) => d.id === selectedDocId) || null;

  const handleModeChange = (mode) => {
    setChatMode(mode);
    if (mode === 'cowork') {
      if (!selectedDocId) {
        setAttachMenuOpen(true);
      }
    }
  };

  const handleStartPrompt = async (textToSend) => {
    const q = textToSend || promptInput;
    if (!q.trim() || isSubmitting) return;

    let targetDocId = null;

    if (chatMode === 'cowork') {
      // Legal RAG mode requires an active document
      targetDocId = selectedDocId || null;
      if (!targetDocId) {
        alert('Please attach or upload a document for Legal RAG analysis, or continue in Chat mode.');
        setAttachMenuOpen(true);
        return;
      }
      setSelectedDocId(targetDocId);
      setCurrentDocumentId(targetDocId);
    } else {
      // General Chat mode
      targetDocId = selectedDocId || null;
      if (targetDocId) {
        setCurrentDocumentId(targetDocId);
      }
    }

    try {
      setIsSubmitting(true);
      const newChat = await createNewChat(targetDocId, activeProject?.id || null);
      if (newChat) {
        navigate(`/chat/${newChat.id}`, {
          state: {
            initialPrompt: q.trim(),
            initialModel: selectedModel,
            intent: chatMode === 'cowork' ? 'legal_rag' : 'general',
          },
        });
      } else {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to create chat:', err);
      navigate('/chat');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartPrompt();
    }
  };

  // Handle direct file upload from the + button
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setAttachMenuOpen(false);
      const res = await uploadDocument(file, activeProject?.id || null);
      await loadUserDocuments();
      if (res?.document?.id) {
        setSelectedDocId(res.document.id);
        setCurrentDocumentId(res.document.id);
        setChatMode('cowork');
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('File upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'V';

  return (
    <div 
      className="h-full w-full overflow-y-auto flex flex-col justify-between transition-colors duration-200"
      style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
    >
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Top Bar: Clean User Avatar */}
      <div className="w-full px-6 pt-5 pb-2 flex items-center justify-end shrink-0">
        <button
          onClick={() => openSettings('account')}
          className="w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs text-[#2d2b28] dark:text-[#eceae6] border hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
          style={{
            backgroundColor: isDark ? '#2e2d2a' : '#eae8e1',
            borderColor: isDark ? '#3d3b37' : '#dad7cf',
          }}
          title={user?.email || 'Settings'}
        >
          {userInitial}
        </button>
      </div>

      {/* Center Container */}
      <div className="w-full max-w-2xl mx-auto px-4 py-8 flex-1 flex flex-col items-center justify-center">
        
        {/* Active Project Banner if in a Project Context */}
        {activeProject && (
          <div 
            className="mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-xs"
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383733' : '#e5e3da',
              color: dc.textPrimary,
            }}
          >
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeProject.color || '#da7756' }} />
            <span className="font-semibold">{activeProject.name}</span>
            <span className="text-neutral-400">• Active Project</span>
            <button
              type="button"
              onClick={() => selectProject(null)}
              className="p-0.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors ml-1 cursor-pointer"
              title="Exit project"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {/* DeepDoc AI Logo & Time-aware Greeting Header */}
        <div className="flex items-center gap-3.5 mb-8 select-none">
          <img 
            src={deepDocLogo} 
            alt="DeepDoc AI Logo" 
            className="w-10 h-10 object-contain rounded-xl shadow-xs" 
          />
          <h1 
            className="text-3xl sm:text-4xl font-serif font-normal tracking-tight"
            style={{ color: isDark ? '#f3f1ec' : '#2d2b28' }}
          >
            {getTimeGreeting()}
          </h1>
        </div>

        {/* Rounded Prompt Box */}
        <div className="w-full relative">
          <div 
            className="w-full rounded-3xl border shadow-sm transition-all focus-within:shadow-md p-3.5 sm:p-4 flex flex-col justify-between min-h-[140px]"
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383734' : '#e5e3da',
            }}
          >
            {/* Attached File Chip inside Prompt Box */}
            {activeDocument && (
              <div className="mb-2 flex items-center gap-2">
                <div 
                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs border transition-all"
                  style={{
                    backgroundColor: isDark ? '#1f1e1d' : '#f5f4ef',
                    borderColor: isDark ? '#3d3b37' : '#eae8e1',
                    color: isDark ? '#eceae6' : '#2d2b28',
                  }}
                >
                  <FileText size={13} className="text-amber-500 shrink-0" />
                  <span className="font-medium truncate max-w-[170px] sm:max-w-[240px]">
                    {activeDocument.fileName || activeDocument.file_name}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-medium">
                    OCR Ready
                  </span>
                  
                  {/* Click to Open Reconstructed OCR Modal */}
                  <button
                    type="button"
                    onClick={() => setViewingOCRDoc(activeDocument)}
                    className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer ml-1"
                    title="View Reconstructed Sarvam OCR"
                  >
                    <Eye size={11} />
                    <span>OCR View</span>
                  </button>

                  {/* Detach document */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDocId(null);
                      setCurrentDocumentId(null);
                    }}
                    className="p-0.5 rounded-full hover:bg-neutral-300/50 dark:hover:bg-neutral-700/50 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                    title="Detach document"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Uploading Status */}
            {isUploading && (
              <div className="mb-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                <span>Running Sarvam OCR & chunking document...</span>
              </div>
            )}

            {/* Main Prompt Textarea */}
            <textarea
              ref={textareaRef}
              value={promptInput}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={2}
              placeholder={
                chatMode === 'cowork'
                  ? (activeDocument ? `Ask anything about ${activeDocument.fileName || activeDocument.file_name} with Legal RAG...` : 'Attach a contract or case file for Legal RAG analysis...')
                  : 'Ask any legal or contract question, or type / for skills...'
              }
              className="w-full bg-transparent resize-none border-none outline-none text-[15px] sm:text-base leading-relaxed placeholder:text-neutral-400 select-text"
              style={{ color: isDark ? '#f3f1ec' : '#2d2b28' }}
            />

            {/* Bottom Controls Row inside Prompt Box */}
            <div className="flex items-center justify-between gap-2 pt-2 mt-1">
              {/* Left group: + Attachment button & Chat / Legal RAG pills */}
              <div className="flex items-center gap-2 relative" ref={attachMenuRef}>
                {/* + Attachment Button */}
                <button
                  type="button"
                  onClick={() => setAttachMenuOpen(!attachMenuOpen)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                  title="Attach file or knowledge"
                >
                  <Plus size={18} />
                </button>

                {/* Attachment Dropdown Popover */}
                {attachMenuOpen && (
                  <div 
                    className="absolute bottom-full left-0 mb-2 w-64 rounded-2xl shadow-xl border bg-white dark:bg-[#262522] border-neutral-200 dark:border-neutral-800 py-1.5 z-50 text-xs animate-in fade-in zoom-in-95"
                  >
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer text-left"
                    >
                      <Upload size={14} className="text-[#da7756]" />
                      <div className="flex flex-col">
                        <span className="font-medium">Upload Document</span>
                        <span className="text-[10px] text-neutral-400">PDF, DOCX with OCR auto-reconstruction</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setAttachMenuOpen(false);
                        setIsMultiUploadOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer text-left"
                    >
                      <FolderPlus size={14} className="text-amber-500" />
                      <div className="flex flex-col">
                        <span className="font-medium">Ingest Folder / Batch</span>
                        <span className="text-[10px] text-neutral-400">Process multi-document folder</span>
                      </div>
                    </button>

                    {workspaceDocuments.length > 0 && (
                      <>
                        <div className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
                          Attach from Knowledge Base
                        </div>
                        <div className="max-h-40 overflow-y-auto">
                          {workspaceDocuments.map((doc) => {
                            const isAttached = selectedDocId === doc.id;
                            return (
                              <button
                                key={doc.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDocId(isAttached ? null : doc.id);
                                  setCurrentDocumentId(isAttached ? null : doc.id);
                                  if (!isAttached) setChatMode('cowork');
                                  setAttachMenuOpen(false);
                                }}
                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors text-left"
                              >
                                <span className="truncate text-neutral-700 dark:text-neutral-300 pr-2">
                                  {doc.fileName || doc.file_name}
                                </span>
                                {isAttached && <Check size={12} className="text-emerald-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Mode Segmented Controls: Chat & Legal RAG */}
                <div 
                  className="flex items-center p-0.5 rounded-xl border text-xs"
                  style={{
                    backgroundColor: isDark ? '#1f1e1d' : '#f5f4ef',
                    borderColor: isDark ? '#383734' : '#e5e3da',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleModeChange('chat')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      chatMode === 'chat'
                        ? 'bg-white dark:bg-[#262522] text-[#2d2b28] dark:text-[#eceae6] shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                  >
                    Chat
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModeChange('cowork')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                      chatMode === 'cowork'
                        ? 'bg-white dark:bg-[#262522] text-[#2d2b28] dark:text-[#eceae6] shadow-xs font-semibold'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100'
                    }`}
                    title="Legal RAG with statutory search and citation grounding"
                  >
                    Legal RAG
                  </button>
                </div>

                {/* Web Search Grounding Toggle */}
                <button
                  type="button"
                  onClick={() => setWebMode(!webMode)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    webMode 
                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 font-semibold' 
                      : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
                  }`}
                  title="Toggle real-time Google Web Search Grounding"
                >
                  <Globe size={13} className={webMode ? 'text-blue-500' : 'text-neutral-400'} />
                  <span>Web: {webMode ? 'ON' : 'OFF'}</span>
                </button>
              </div>

              {/* Right group: Model selector, Mic, Live audio, Circular Send arrow */}
              <div className="flex items-center gap-2">
                {/* Claude Model Selector Dropdown */}
                <ClaudeModelSelector
                  selectedModel={selectedModel}
                  onModelChange={setSelectedModel}
                  availableModels={availableModels}
                  placement="bottom-up"
                  compact={true}
                />

                {/* Mic Icon Button */}
                <button
                  type="button"
                  onClick={() => alert('Voice dictation active. Speak clearly into your microphone.')}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                  title="Voice input"
                >
                  <Mic size={16} />
                </button>

                {/* Live Voice Audio Waveform Button */}
                <button
                  type="button"
                  onClick={() => setIsLiveAudioOpen(true)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer flex items-center gap-0.5"
                  title="Open Gemini Live Voice Session"
                >
                  <span className="w-0.5 h-3 bg-neutral-400 rounded-full" />
                  <span className="w-0.5 h-4 bg-[#da7756] rounded-full" />
                  <span className="w-0.5 h-2.5 bg-neutral-400 rounded-full" />
                </button>

                {/* Circular Send Arrow */}
                <button
                  type="button"
                  onClick={() => handleStartPrompt()}
                  disabled={!promptInput.trim()}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                    promptInput.trim()
                      ? 'bg-[#da7756] text-white hover:opacity-90 shadow-sm'
                      : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-50'
                  }`}
                  title="Send message"
                >
                  <ArrowUp size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick starter chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
          {QUICK_STARTERS.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleStartPrompt(s.prompt)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all hover:bg-neutral-200/40 dark:hover:bg-neutral-800/40 cursor-pointer shadow-xs"
              style={{
                backgroundColor: isDark ? '#262522' : '#ffffff',
                borderColor: isDark ? '#383734' : '#e5e3da',
                color: isDark ? '#eceae6' : '#2d2b28',
              }}
            >
              <span>{s.icon}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* OCR Reconstruction Viewer Modal */}
      <ReconstructedOCRModal
        isOpen={!!viewingOCRDoc}
        document={viewingOCRDoc}
        onClose={() => setViewingOCRDoc(null)}
      />
    </div>
  );
};

export default HomePage;
