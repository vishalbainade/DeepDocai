import { useState, useEffect, useRef } from 'react';
import { X, MoreVertical, Edit2, Trash2, MessageSquare, Clock } from 'lucide-react';
import { getChats, renameChat, deleteChat } from '../services/api';

const ChatHistoryDrawer = ({ 
  isOpen, 
  onClose, 
  currentChatId,
  currentDocumentId,
  onSelectChat,
  refreshTrigger // Optional prop to trigger refresh without reloading entire list
}) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);

  // Load chats when drawer opens - only reload when drawer opens/closes, not on document change
  // This preserves the chat list state when switching between conversations
  useEffect(() => {
    if (isOpen) {
      loadChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]); // Removed currentDocumentId dependency to prevent list from being filtered on chat selection

  // Refresh chat list when refreshTrigger changes (e.g., after sending a message)
  // This updates timestamps and new chats without disrupting the list
  useEffect(() => {
    if (isOpen && refreshTrigger !== undefined && refreshTrigger !== null && refreshTrigger > 0) {
      loadChats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, isOpen]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenChatId(null);
      }
    };

    if (menuOpenChatId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [menuOpenChatId]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  const loadChats = async () => {
    try {
      setLoading(true);
      const result = await getChats();
      // Show all chats - don't filter by document to preserve list state
      // Users can see all their conversations regardless of document
      let allChats = result?.chats || [];
      // Sort by updated_at descending (most recent first)
      // Add safety check for updatedAt to prevent crashes
      allChats.sort((a, b) => {
        const dateA = a?.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b?.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      });
      setChats(allChats);
    } catch (error) {
      console.error('Error loading chats:', error);
      // Set empty array on error to prevent crashes
      setChats([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRenameStart = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenChatId(null);
  };

  const handleRenameSave = async (chatId) => {
    const trimmedTitle = editTitle.trim();
    
    if (!trimmedTitle || trimmedTitle.length === 0) {
      // Cancel if empty
      setEditingChatId(null);
      setEditTitle('');
      return;
    }

    try {
      // Optimistically update UI
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId
            ? { ...chat, title: trimmedTitle }
            : chat
        )
      );

      // Call API
      await renameChat(chatId, trimmedTitle);
      
      setEditingChatId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
      // Revert on error
      loadChats();
      alert('Failed to rename chat. Please try again.');
    }
  };

  const handleRenameCancel = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleRenameKeyDown = (e, chatId) => {
    if (e.key === 'Enter') {
      handleRenameSave(chatId);
    } else if (e.key === 'Escape') {
      handleRenameCancel();
    }
  };

  const handleDelete = async (chatId) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      // Optimistically remove from UI
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      setMenuOpenChatId(null);

      // Call API
      await deleteChat(chatId);

      // If deleted chat was current, close drawer or handle navigation
      if (chatId === currentChatId) {
        onSelectChat(null);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      // Reload on error
      loadChats();
      alert('Failed to delete chat. Please try again.');
    }
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  // Close drawer on mobile when chat is selected
  const handleChatClick = (chat) => {
    onSelectChat(chat);
    // Close drawer on mobile (screen width < 768px)
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop overlay (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 shadow-lg flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Chat History</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close drawer"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 text-center text-slate-500">
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-4 text-center text-slate-500">
              <MessageSquare size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No chat history</p>
              <p className="text-xs mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className={`relative p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    currentChatId === chat.id
                      ? 'bg-indigo-50 border-2 border-indigo-200'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                  onClick={() => handleChatClick(chat)}
                  onMouseEnter={() => setHoveredChatId(chat.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                >
                  <div className="flex items-start gap-2 pr-8">
                    <MessageSquare
                      size={18}
                      className={`mt-0.5 flex-shrink-0 ${
                        currentChatId === chat.id ? 'text-indigo-600' : 'text-slate-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      {editingChatId === chat.id ? (
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          onBlur={() => handleRenameSave(chat.id)}
                          onKeyDown={(e) => handleRenameKeyDown(e, chat.id)}
                          className="w-full px-2 py-1 text-sm font-medium border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          maxLength={255}
                        />
                      ) : (
                        <p
                          className={`text-sm font-medium truncate ${
                            currentChatId === chat.id ? 'text-indigo-900' : 'text-slate-900'
                          }`}
                          title={chat.title}
                        >
                          {chat.title}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={12} />
                          <span>{formatDateTime(chat.updatedAt)}</span>
                        </div>
                        {chat.messageCount > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <span>{chat.messageCount} messages</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Three-dot menu */}
                  {hoveredChatId === chat.id && editingChatId !== chat.id && (
                    <div className="absolute top-2 right-2" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                        }}
                        className="p-1 rounded hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        aria-label="Chat options"
                      >
                        <MoreVertical size={16} className="text-slate-600" />
                      </button>

                      {/* Dropdown menu */}
                      {menuOpenChatId === chat.id && (
                        <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameStart(chat);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2 focus:outline-none focus:bg-gray-50"
                          >
                            <Edit2 size={14} />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(chat.id);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 focus:outline-none focus:bg-red-50"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {chats.length > 0 && (
          <div className="p-3 border-t border-gray-200 text-xs text-slate-500 text-center">
            <p>{chats.length} chat{chats.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatHistoryDrawer;

