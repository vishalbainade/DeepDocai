import { createContext, useContext, useState, useEffect } from 'react';
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
  const loadChats = async () => {
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
  };

  // Create new chat
  const createNewChat = async (documentId) => {
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
  };

  // Load chat messages
  const loadChatMessages = async (chatId) => {
    try {
      setLoading(true);
      const result = await getChatMessages(chatId);
      const formattedMessages = (result?.messages || []).map((msg, index) => {
        const normalizedRole = (msg?.role || 'user').toLowerCase();
        
        // Try to parse content as JSON if it's a table response
        let parsedContent = msg?.content || '';
        let answerType = 'text';
        let tableData = null;
        
        if (normalizedRole === 'ai' && parsedContent) {
          try {
            const parsed = JSON.parse(parsedContent);
            if (parsed.answer_type === 'table' && parsed.table) {
              answerType = 'table';
              tableData = parsed.table;
              parsedContent = parsed.answer || ''; // Use fallback text if available
            }
          } catch (e) {
            // Not JSON, treat as regular text
          }
        }
        
        return {
          id: msg?.id || `${normalizedRole}-${index}-${msg?.createdAt || Date.now()}`,
          role: normalizedRole,
          content: parsedContent,
          createdAt: msg?.createdAt || new Date().toISOString(),
          // Preserve table data if it exists
          answer_type: answerType,
          table: tableData,
          sources: msg?.sources,
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
  };





//////////////////////////////////////////////////////
// Update message in chat history
const updateMessage = (messageId, updates) => {
  setChatHistory((prev) =>
    prev.map((msg) => {
      if (msg.id === messageId) {
        // Support both object updates and function updates
        if (typeof updates === 'function') {
          return updates(msg);
        }
        return { ...msg, ...updates };
      }
      return msg;
    })
  );
};
/////////////////////////////////




  // Add message to current chat history
  const addMessage = (message) => {
    setChatHistory((prev) => [...prev, message]);
  };

  // Update message in chat history
  // const updateMessage = (messageId, updates) => {
  //   setChatHistory((prev) =>
  //     prev.map((msg) => (msg.id === messageId ? { ...msg, ...updates } : msg))
  //   );
  // };

  // Refresh chats list
  const refreshChats = () => {
    loadChats();
  };

  // Clear current chat
  const clearChat = () => {
    setCurrentChatId(null);
    setChatHistory([]);
  };

  // Load chats on mount (only if authenticated)
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      loadChats();
    }
  }, []);

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

