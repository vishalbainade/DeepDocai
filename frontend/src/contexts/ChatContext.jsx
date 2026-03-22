import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getChats, getChatMessages, createChat } from '../services/api';

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
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  // Load sidebar collapse state from localStorage on mount
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    return saved === 'true';
  });

  // Persist sidebar collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Load currentDocumentId from localStorage on mount
  useEffect(() => {
    const savedDocId = localStorage.getItem('currentDocumentId');
    if (savedDocId) {
      setCurrentDocumentId(savedDocId);
    }
  }, []);

  // Save currentDocumentId to localStorage when it changes
  useEffect(() => {
    if (currentDocumentId) {
      localStorage.setItem('currentDocumentId', currentDocumentId);
    } else {
      localStorage.removeItem('currentDocumentId');
    }
  }, [currentDocumentId]);

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

  // Create new chat
  const createNewChat = useCallback(async (documentId) => {
    try {
      const result = await createChat(documentId);
      if (result?.chat) {
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
          } catch (e) {}
        }
        
        return {
          id: msg?.id || `${normalizedRole}-${index}-${msg?.createdAt || Date.now()}`,
          role: normalizedRole,
          content: parsedContent,
          createdAt: msg?.createdAt || new Date().toISOString(),
          answer_type: answerType,
          table: tableData,
          sources: msg?.sources,
          citations: msg?.citations || [],
          paragraphCitations: msg?.paragraphCitations || [],
        };
      });
      setChatHistory(formattedMessages);
      setCurrentChatId(chatId);
      setCurrentDocumentId(result?.chat?.documentId || null);
      return formattedMessages;
    } catch (error) {
      console.error('Error loading chat messages:', error);
      setChatHistory([]);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add message to current chat history
  const addMessage = useCallback((message) => {
    setChatHistory((prev) => [...prev, message]);
  }, []);

  // Update message in chat history
  const updateMessage = useCallback((messageId, updates) => {
    setChatHistory((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          if (typeof updates === 'function') {
            return updates(msg);
          }
          return { ...msg, ...updates };
        }
        return msg;
      })
    );
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

  // Load chats on mount (only if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadChats();
    }
  }, [loadChats]);

  const value = {
    chats,
    currentChatId,
    currentDocumentId,
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
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

