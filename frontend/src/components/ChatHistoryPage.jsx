import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { renameChat, deleteChat } from '../services/api';

const ChatHistoryPage = () => {
  const navigate = useNavigate();
  const {
    chats,
    loading,
    refreshChats,
    setSidebarCollapsed,
  } = useChat();

  const [searchQuery, setSearchQuery] = useState('');
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleChatClick = (chat) => {
    navigate(`/chat/${chat.id}`);
    setMenuOpenChatId(null);
    // Collapse sidebar when navigating to chat
    setSidebarCollapsed(true);
  };

  const handleRenameStart = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenChatId(null);
  };

  const handleRenameSave = async (chatId) => {
    const trimmedTitle = editTitle.trim();

    if (!trimmedTitle || trimmedTitle.length === 0) {
      setEditingChatId(null);
      setEditTitle('');
      return;
    }

    try {
      await renameChat(chatId, trimmedTitle);
      await refreshChats();
      setEditingChatId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
      alert('Failed to rename chat. Please try again.');
      await refreshChats();
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
      await deleteChat(chatId);
      await refreshChats();
      setMenuOpenChatId(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
      await refreshChats();
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

  return (
    <div className="h-full w-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <h1 className="text-2xl font-serif font-bold text-slate-900">Chat History</h1>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <MessageSquare
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="text-center text-slate-500 py-12">
            <div className="animate-pulse">Loading...</div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center text-slate-500 py-12">
            <MessageSquare size={48} className="mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery ? 'No chats found' : 'No chat history'}
            </p>
            <p className="text-sm">
              {searchQuery ? 'Try a different search term' : 'Start a conversation to see it here'}
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto grid gap-3">
            {filteredChats.map((chat) => (
              <div
                key={chat.id}
                className="relative bg-white border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                onClick={() => handleChatClick(chat)}
                onMouseEnter={() => setHoveredChatId(chat.id)}
                onMouseLeave={() => setHoveredChatId(null)}
              >
                <div className="flex items-start gap-3 pr-10">
                  <MessageSquare
                    size={20}
                    className="mt-0.5 flex-shrink-0 text-indigo-600"
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
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-2 py-1 text-base font-medium border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        maxLength={255}
                      />
                    ) : (
                      <p className="text-base font-medium text-slate-900 truncate" title={chat.title}>
                        {chat.title}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Clock size={14} />
                        <span>{formatDateTime(chat.updatedAt)}</span>
                      </div>
                      {chat.messageCount > 0 && (
                        <span className="text-sm text-slate-500">
                          {chat.messageCount} {chat.messageCount === 1 ? 'message' : 'messages'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Three-dot menu */}
                {hoveredChatId === chat.id && editingChatId !== chat.id && (
                  <div className="absolute top-4 right-4" ref={menuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                      }}
                      className="p-1.5 rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      aria-label="Chat options"
                    >
                      <MoreVertical size={18} className="text-slate-600" />
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
    </div>
  );
};

export default ChatHistoryPage;

