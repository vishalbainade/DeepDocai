import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Clock,
  ArrowLeft,
  Search
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { renameChat, deleteChat } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const ChatHistoryPage = () => {
  const navigate = useNavigate();
  const dc = useDarkColors();
  const isDark = useIsDark();
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
    setSidebarCollapsed(true);
  };

  const handleRenameStart = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenChatId(null);
  };

  const handleRenameSave = async (chatId) => {
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
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
    if (e.key === 'Enter') handleRenameSave(chatId);
    else if (e.key === 'Escape') handleRenameCancel();
  };

  const handleDelete = async (chatId) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) return;

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
    <div className="h-full w-full flex flex-col transition-colors duration-300" style={{ backgroundColor: dc.bgSecondary }}>
      {/* Header */}
      <div 
        className="px-6 py-6 transition-colors duration-300"
        style={{ backgroundColor: dc.bgPrimary, borderBottom: `1px solid ${dc.borderPrimary}` }}
      >
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl transition-all duration-200"
              style={{ backgroundColor: dc.bgHover, color: dc.textPrimary }}
              aria-label="Go back"
            >
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: dc.textPrimary }}>All Conversations</h1>
              <p className="mt-1 text-sm font-medium" style={{ color: dc.textFaint }}>Manage your document intelligence history</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div 
        className="px-6 py-4 shadow-sm transition-colors duration-300"
        style={{ backgroundColor: dc.bgPrimary, borderBottom: `1px solid ${dc.borderPrimary}` }}
      >
        <div className="max-w-4xl mx-auto relative group">
          <input
            type="text"
            placeholder="Search through your chat history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-300 shadow-sm"
            style={{ 
              backgroundColor: dc.bgSecondary, 
              color: dc.textPrimary, 
              borderColor: dc.borderPrimary
            }}
          />
          <Search
            size={20}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-300"
            style={{ color: dc.textFaint }}
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="text-center py-20" style={{ color: dc.textFaint }}>
              <div className="animate-pulse flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10" />
                <span className="font-medium">Curating your history...</span>
              </div>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="text-center py-20 rounded-3xl border-2 border-dashed" style={{ borderColor: dc.borderPrimary }}>
              <MessageSquare size={64} className="mx-auto mb-6 opacity-20" style={{ color: dc.primary }} />
              <p className="text-xl font-bold mb-2" style={{ color: dc.textPrimary }}>
                {searchQuery ? 'No matches found' : 'No history yet'}
              </p>
              <p className="text-sm max-w-xs mx-auto" style={{ color: dc.textFaint }}>
                {searchQuery ? 'Try a more general search term to find your conversation' : 'Upload your first document to begin your journey with DeepDoc AI'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className="relative rounded-2xl p-5 border-2 transition-all duration-300 cursor-pointer group hover:shadow-xl"
                  style={{ 
                    backgroundColor: dc.bgPrimary, 
                    borderColor: dc.borderPrimary,
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = dc.primary}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = dc.borderPrimary}
                  onClick={() => handleChatClick(chat)}
                >
                  <div className="flex items-start gap-4 pr-12">
                    <div 
                      className="p-3 rounded-xl transition-colors duration-300"
                      style={{ backgroundColor: dc.bgSecondary }}
                    >
                      <MessageSquare
                        size={24}
                        style={{ color: dc.primary }}
                      />
                    </div>
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
                          className="w-full px-3 py-2 text-lg font-bold rounded-lg focus:outline-none transition-all duration-300"
                          style={{ backgroundColor: dc.bgSecondary, color: dc.textPrimary, border: `2px solid ${dc.primary}` }}
                          maxLength={255}
                        />
                      ) : (
                        <h3 className="text-lg font-bold truncate transition-colors duration-300" style={{ color: dc.textPrimary }} title={chat.title}>
                          {chat.title}
                        </h3>
                      )}
                      <div className="flex items-center gap-6 mt-3">
                        <div className="flex items-center gap-2 text-sm" style={{ color: dc.textFaint }}>
                          <Clock size={16} />
                          <span>{formatDateTime(chat.updatedAt)}</span>
                        </div>
                        {chat.messageCount > 0 && (
                          <div 
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ backgroundColor: isDark ? 'rgba(142, 132, 184, 0.2)' : '#f3f2f8', color: dc.primary }}
                          >
                            {chat.messageCount} {chat.messageCount === 1 ? 'Message' : 'Messages'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="absolute top-5 right-5" ref={menuRef}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                      }}
                      className="p-2 rounded-xl transition-all duration-200"
                      style={{ color: dc.textFaint }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <MoreVertical size={20} />
                    </button>

                    {menuOpenChatId === chat.id && (
                      <div 
                        className="absolute right-0 mt-2 w-48 rounded-2xl shadow-2xl z-20 overflow-hidden border p-1.5 transition-colors duration-300"
                        style={{ backgroundColor: dc.bgPrimary, borderColor: dc.borderPrimary }}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRenameStart(chat); }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold flex items-center gap-3 rounded-xl transition-all duration-200"
                          style={{ color: dc.textPrimary }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Edit2 size={16} /> Rename Chat
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                          className="w-full px-4 py-3 text-left text-sm font-semibold text-red-500 flex items-center gap-3 rounded-xl transition-all duration-200"
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <Trash2 size={16} /> Delete Forever
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatHistoryPage;

