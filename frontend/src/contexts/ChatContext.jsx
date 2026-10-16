import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getChats, getChatMessages, createChat, getProjects, getProject, getUsageSummary, getDocuments } from '../services/api';

const ChatContext = createContext(null);

// Hook export - must be before component for Fast Refresh compatibility
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

// Component export - separate from hook for Fast Refresh compatibility
export function ChatProvider({ children }) {
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [currentDocumentId, setCurrentDocumentId] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Projects state
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);

  // Claude-style mode toggles (persisted in localStorage)
  const [thinkingMode, setThinkingModeState] = useState(() => {
    return localStorage.getItem('claude_thinking_mode') === 'true';
  });
  const [webMode, setWebModeState] = useState(() => {
    return localStorage.getItem('claude_web_mode') === 'true';
  });

  const setThinkingMode = (val) => {
    const nextVal = typeof val === 'function' ? val(thinkingMode) : val;
    setThinkingModeState(nextVal);
    localStorage.setItem('claude_thinking_mode', String(nextVal));
  };

  const setWebMode = (val) => {
    const nextVal = typeof val === 'function' ? val(webMode) : val;
    setWebModeState(nextVal);
    localStorage.setItem('claude_web_mode', String(nextVal));
  };

  // Usage summary state
  const [usageSummary, setUsageSummary] = useState(null);

  // Modals state
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('general');
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isPersonalizationModalOpen, setIsPersonalizationModalOpen] = useState(false);
  const [isProjectsModalOpen, setIsProjectsModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState(null);
  const [isMultiUploadOpen, setIsMultiUploadOpen] = useState(false);
  const [isLiveAudioOpen, setIsLiveAudioOpen] = useState(false);

  const openSettings = useCallback((tab = 'general') => {
    setSettingsInitialTab(tab);
    setIsSettingsModalOpen(true);
  }, []);

  // Global Claude shortcut: Ctrl+Shift+, toggles settings
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '<' || e.key === ',')) {
        e.preventDefault();
        setIsSettingsModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load sidebar collapse state from localStorage on mount
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Ensure document ID is never persisted globally in localStorage across sessions
  useEffect(() => {
    localStorage.removeItem('currentDocumentId');
  }, []);

  // Load chats list
  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getChats();
      const allChats = result?.chats || [];
      allChats.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      setChats(allChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load projects list
  const loadProjects = useCallback(async () => {
    try {
      const res = await getProjects();
      if (res?.projects) {
        setProjects(res.projects);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
    }
  }, []);

  // Load usage summary
  const loadUsageSummary = useCallback(async () => {
    try {
      const res = await getUsageSummary();
      if (res?.data) {
        setUsageSummary(res.data);
      }
    } catch (err) {
      console.error('Error loading usage summary:', err);
    }
  }, []);

  // Load user documents list
  const loadUserDocuments = useCallback(async () => {
    try {
      const res = await getDocuments();
      if (res?.documents) {
        setUserDocuments(res.documents);
      }
    } catch (err) {
      console.error('Error loading documents:', err);
    }
  }, []);

  // Create new chat
  const createNewChat = useCallback(async (documentId = null, projectId = null) => {
    try {
      const result = await createChat(documentId, projectId);
      if (result?.chat) {
        // A new route must never inherit the previous conversation's id or messages.
        // Without this, the first prompt of a new chat can be streamed into an older chat.
        setCurrentChatId(result.chat.id);
        setChatHistory([]);
        setCurrentDocumentId(result.chat.documentId || null);
        // Reload chats list
        await loadChats();
        return result.chat;
      }
      return null;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  }, [loadChats]);

  // Load chat messages
  const loadChatMessages = useCallback(async (chatId) => {
    try {
      setLoading(true);
      const result = await getChatMessages(chatId);
      const formattedMessages = (result?.messages || []).map((msg, index) => {
        const normalizedRole = (msg?.role || 'user').toLowerCase();
        
        let parsedContent = msg?.content || '';
        let answerType = 'text';
        let tableData = null;
        
        if (normalizedRole === 'ai' && parsedContent) {
          try {
            const parsed = JSON.parse(parsedContent);
            if (parsed.answer_type === 'table' && parsed.table) {
              answerType = 'table';
              tableData = parsed.table;
              parsedContent = parsed.answer || '';
            }
          } catch {
            // Not JSON
          }
        }

        return {
          id: msg?.id || `msg-${index}`,
          role: normalizedRole,
          content: parsedContent,
          answerType: answerType,
          tableData: tableData,
          timestamp: msg?.createdAt || new Date().toISOString(),
          citations: msg?.citations || [],
          paragraphCitations: msg?.paragraphCitations || [],
          webSources: msg?.webSources || [],
        };
      });

      setChatHistory(formattedMessages);
      setCurrentChatId(chatId);
      // The document belongs to this chat session. Clear any file retained
      // from the previous route when this is a fresh, unassigned chat.
      setCurrentDocumentId(result?.chat?.documentId || null);
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatHistory([]);
      setCurrentChatId(null);
      setCurrentDocumentId(null);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add message to chat history
  const addMessage = useCallback((message) => {
    setChatHistory((prev) => [...prev, message]);
  }, []);

  // Update existing message
  const updateMessage = useCallback((messageId, updates) => {
    setChatHistory((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, ...(typeof updates === 'function' ? updates(msg) : updates) }
          : msg
      )
    );
  }, []);

  // Project list rows intentionally stay lightweight. Load the selected project
  // before making it active so its document list is available everywhere.
  const selectProject = useCallback(async (project) => {
    if (!project?.id) {
      setActiveProject(null);
      return null;
    }

    const result = await getProject(project.id);
    const hydratedProject = result?.project || project;
    setActiveProject(hydratedProject);
    return hydratedProject;
  }, []);

  // Refresh chats list
  const refreshChats = useCallback(() => {
    loadChats();
  }, [loadChats]);

  // Clear current chat
  const clearChat = useCallback(() => {
    setCurrentChatId(null);
    setChatHistory([]);
  }, []);

  // Load initial data on mount (only if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadChats();
      loadProjects();
      loadUsageSummary();
      loadUserDocuments();
    }
  }, [loadChats, loadProjects, loadUsageSummary, loadUserDocuments]);

  const value = {
    chats,
    currentChatId,
    currentDocumentId,
    userDocuments,
    loadUserDocuments,
    chatHistory,
    loading,
    sidebarCollapsed,
    setSidebarCollapsed,
    loadChats,
    createNewChat,
    loadChatMessages,
    addMessage,
    updateMessage,
    refreshChats,
    clearChat,
    setCurrentChatId,
    setCurrentDocumentId,
    setChatHistory,
    // Projects
    projects,
    activeProject,
    setActiveProject,
    selectProject,
    loadProjects,
    // Thinking & Web Mode
    thinkingMode,
    setThinkingMode,
    webMode,
    setWebMode,
    // Usage
    usageSummary,
    loadUsageSummary,
    // Modals
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settingsInitialTab,
    setSettingsInitialTab,
    openSettings,
    isUsageModalOpen,
    setIsUsageModalOpen,
    isPersonalizationModalOpen,
    setIsPersonalizationModalOpen,
    isProjectsModalOpen,
    setIsProjectsModalOpen,
    projectToEdit,
    setProjectToEdit,
    isMultiUploadOpen,
    setIsMultiUploadOpen,
    isLiveAudioOpen,
    setIsLiveAudioOpen,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
