import { useState, useEffect, useRef } from 'react';
import { X, MoreVertical, Edit2, Trash2, MessageSquare, Clock } from 'lucide-react';
import { getChats, renameChat, deleteChat } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';

const ChatHistoryDrawer = ({ 
  isOpen, 
  onClose, 
  currentChatId,
  currentDocumentId,
  onSelectChat,
  refreshTrigger // Optional prop to trigger refresh without reloading entire list
}) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);

  // Load chats when drawer opens - only reload when drawer opens/closes, not on document change
  useEffect(() => {
    if (isOpen) {
      loadChats();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && refreshTrigger !== undefined && refreshTrigger !== null && refreshTrigger > 0) {
      loadChats();
    }
  }, [refreshTrigger, isOpen]);

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
      let allChats = result?.chats || [];
      allChats.sort((a, b) => {
        const dateA = a?.updatedAt ? new Date(a.updatedAt) : new Date(0);
        const dateB = b?.updatedAt ? new Date(b.updatedAt) : new Date(0);
        return dateB - dateA;
      });
      setChats(allChats);
    } catch (error) {
      console.error('Error loading chats:', error);
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
    if (!trimmedTitle) {
      setEditingChatId(null);
      setEditTitle('');
      return;
    }

    try {
      setChats(prevChats =>
        prevChats.map(chat =>
          chat.id === chatId ? { ...chat, title: trimmedTitle } : chat
        )
      );
      await renameChat(chatId, trimmedTitle);
      setEditingChatId(null);
      setEditTitle('');
    } catch (error) {
      console.error('Error renaming chat:', error);
      loadChats();
      alert('Failed to rename chat. Please try again.');
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
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      setMenuOpenChatId(null);
      await deleteChat(chatId);
      if (chatId === currentChatId) onSelectChat(null);
    } catch (error) {
      console.error('Error deleting chat:', error);
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

  const handleChatClick = (chat) => {
    onSelectChat(chat);
    if (window.innerWidth < 768) onClose();
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden transition-opacity duration-300"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={onClose}
        />
      )}

      <div
        className={`fixed top-0 left-0 h-full z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 shadow-lg flex flex-col transition-colors duration-300`}
        style={{ backgroundColor: dc.bgPrimary, borderRight: `1px solid ${dc.borderPrimary}` }}
      >
        <div 
          className="p-4 flex items-center justify-between transition-colors duration-300"
          style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}
        >
          <h2 className="text-lg font-semibold" style={{ color: dc.textPrimary }}>Chat History</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg transition-colors focus:outline-none"
            style={{ color: dc.textSecondary }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className="p-4 text-center" style={{ color: dc.textFaint }}>
              <div className="animate-pulse">Loading...</div>
            </div>
          ) : chats.length === 0 ? (
            <div className="p-8 text-center" style={{ color: dc.textFaint }}>
              <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm font-medium">No chat history</p>
              <p className="text-xs mt-1">Start a conversation to see it here</p>
            </div>
          ) : (
            <div className="p-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  className="relative p-3 mb-2 rounded-lg cursor-pointer transition-all duration-200 border-2"
                  style={{ 
                    backgroundColor: currentChatId === chat.id ? (isDark ? 'rgba(142, 132, 184, 0.15)' : '#f3f2f8') : 'transparent',
                    borderColor: currentChatId === chat.id ? dc.primary : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (currentChatId !== chat.id) e.currentTarget.style.backgroundColor = dc.bgHover;
                  }}
                  onMouseLeave={(e) => {
                    if (currentChatId !== chat.id) e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  onClick={() => handleChatClick(chat)}
                >
                  <div className="flex items-start gap-2 pr-8">
                    <MessageSquare
                      size={18}
                      className="mt-0.5 flex-shrink-0"
                      style={{ color: currentChatId === chat.id ? dc.primary : dc.textFaint }}
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
                          className="w-full px-2 py-1 text-sm font-medium rounded focus:outline-none transition-colors duration-300"
                          style={{ backgroundColor: dc.bgPrimary, color: dc.textPrimary, border: `1px solid ${dc.borderPrimary}` }}
                          maxLength={255}
                        />
                      ) : (
                        <p
                          className="text-sm font-medium truncate transition-colors duration-300"
                          style={{ color: currentChatId === chat.id ? dc.primary : dc.textPrimary }}
                        >
                          {chat.title}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <div className="flex items-center gap-1 text-xs" style={{ color: dc.textFaint }}>
                          <Clock size={12} />
                          <span>{formatDateTime(chat.updatedAt)}</span>
                        </div>
                        {chat.messageCount > 0 && (
                          <div className="flex items-center gap-1 text-xs" style={{ color: dc.textFaint }}>
                            <span>{chat.messageCount} messages</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {(hoveredChatId === chat.id || menuOpenChatId === chat.id) && editingChatId !== chat.id && (
                    <div className="absolute top-2 right-2" ref={menuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
                        }}
                        className="p-1 rounded transition-colors"
                        style={{ color: dc.textFaint }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {menuOpenChatId === chat.id && (
                        <div 
                          className="absolute right-0 mt-1 w-40 rounded-lg shadow-xl z-10 overflow-hidden border transition-colors duration-300"
                          style={{ backgroundColor: dc.bgPrimary, borderColor: dc.borderPrimary }}
                        >
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRenameStart(chat); }}
                            className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 focus:outline-none transition-colors"
                            style={{ color: dc.textPrimary }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Edit2 size={14} /> Rename
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(chat.id); }}
                            className="w-full px-3 py-2 text-left text-sm text-red-600 flex items-center gap-2 focus:outline-none transition-colors"
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          >
                            <Trash2 size={14} /> Delete
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

        {chats.length > 0 && (
          <div 
            className="p-3 text-xs text-center border-t transition-colors duration-300"
            style={{ borderColor: dc.borderPrimary, color: dc.textFaint }}
          >
            <p>{chats.length} chat{chats.length !== 1 ? 's' : ''}</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ChatHistoryDrawer;

