import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  Menu,
  ChevronLeft,
  ChevronRight,
  User,
  Settings,
  Palette,
  HelpCircle,
  LogOut,
  Search
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { renameChat, deleteChat, logout, getUser } from '../services/api';
import DeepDocAILogo from './DeepDocAILogo';
import { useDarkColors } from '../utils/darkMode';

const Sidebar = () => {
  const navigate = useNavigate();
  const params = useParams();
  const chatId = params?.chatId || null;
  const dc = useDarkColors();
  const {
    chats,
    loading,
    sidebarCollapsed,
    setSidebarCollapsed,
    createNewChat,
    currentDocumentId,
    refreshChats,
    setCurrentDocumentId,
  } = useChat();

  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const editInputRef = useRef(null);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const [user, setUser] = useState(null);

  // Load user info
  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  // Filter chats by search query
  const filterChats = (chats) => {
    if (!searchQuery.trim()) {
      return chats;
    }
    const query = searchQuery.toLowerCase();
    return chats.filter((chat) =>
      chat.title.toLowerCase().includes(query)
    );
  };

  // Group chats by date
  const groupChatsByDate = (chats) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const groups = {
      today: [],
      yesterday: [],
      earlier: [],
    };

    chats.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt);
      const chatDateOnly = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

      if (chatDateOnly.getTime() === today.getTime()) {
        groups.today.push(chat);
      } else if (chatDateOnly.getTime() === yesterday.getTime()) {
        groups.yesterday.push(chat);
      } else {
        groups.earlier.push(chat);
      }
    });

    return groups;
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenChatId(null);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when editing starts
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // Separate mobile collapse state (for drawer behavior)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // On mobile, use drawer behavior; on desktop, use width collapse
  const isCollapsedOnDesktop = !isMobile && sidebarCollapsed;
  const isDrawerOpenOnMobile = isMobile && isMobileDrawerOpen;

  const handleNewChat = () => {
    navigate('/chat');
    setCurrentDocumentId(null);
    if (isMobile) {
      setIsMobileDrawerOpen(false);
    } else {
      setSidebarCollapsed(true);
    }
  };

  const handleChatClick = (chat) => {
    navigate(`/chat/${chat.id}`);
    setMenuOpenChatId(null);
    if (isMobile) {
      setIsMobileDrawerOpen(false);
    } else {
      setSidebarCollapsed(true);
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

  const handleDelete = async (chatIdToDelete) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteChat(chatIdToDelete);
      await refreshChats();
      setMenuOpenChatId(null);

      if (chatId === chatIdToDelete) {
        navigate('/chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Failed to delete chat. Please try again.');
      await refreshChats();
    }
  };

  const handleToggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleLogout = () => {
    logout();
  };

  const handleSettings = () => {
    setUserMenuOpen(false);
    navigate('/settings');
  };

  const handlePersonalization = () => {
    setUserMenuOpen(false);
    navigate('/settings');
  };

  const handleHelp = () => {
    setUserMenuOpen(false);
    navigate('/help');
  };

  const filteredChats = filterChats(chats);
  const groupedChats = groupChatsByDate(filteredChats);
  const hasChats = chats.length > 0;
  const hasFilteredChats = filteredChats.length > 0;

  return (
    <>
      {/* Mobile overlay */}
      {isDrawerOpenOnMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out flex flex-col ${isMobile
            ? `transform ${isDrawerOpenOnMobile ? 'translate-x-0' : '-translate-x-full'} shadow-lg w-80`
            : `flex-shrink-0 transition-[width] duration-300 ease-in-out ${isCollapsedOnDesktop ? 'w-[64px]' : 'w-[240px]'}`
          }`}
        style={{
          background: dc.bgPrimary,
          borderRadius: '18px',
          boxShadow: dc.shadowCard,
          border: `1px solid ${dc.borderPrimary}`,
          margin: isMobile ? '0' : '8px',
          height: isMobile ? '100%' : 'calc(100% - 16px)',
          transition: 'background-color 0.3s, border-color 0.3s',
        }}
      >
        {/* Header */}
        <div className={`p-4 flex items-center ${isCollapsedOnDesktop ? 'justify-center' : 'justify-between'}`} style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}>
          {!isCollapsedOnDesktop ? (
            <DeepDocAILogo size="small" />
          ) : (
            <DeepDocAILogo size="small" showText={false} />
          )}
          <button
            onClick={() => {
              if (isMobile) {
                setIsMobileDrawerOpen(false);
              } else {
                handleToggleSidebar();
              }
            }}
            className={`p-1.5 rounded-lg transition-all duration-250 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6C63FF] ${isCollapsedOnDesktop ? 'mx-auto' : ''
              }`}
            style={{
              color: dc.textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(142, 132, 184, 0.08)';
              e.currentTarget.style.color = '#8E84B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
            aria-label={isMobile ? 'Close sidebar' : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
          >
            {isMobile ? (
              <X size={20} />
            ) : (
              sidebarCollapsed ? (
                <ChevronRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )
            )}
          </button>
        </div>

        {/* New Chat Button */}
        <div className={`p-3 ${isCollapsedOnDesktop ? 'px-2' : ''}`} style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}>
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center ${isCollapsedOnDesktop ? 'justify-center' : 'gap-2'} px-3 py-2.5 rounded-lg transition-all duration-250 ease-in-out font-medium relative group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#6C63FF]`}
            style={{
              backgroundColor: '#8E84B8',
              border: '1px solid #8E84B8',
              color: '#FFFFFF',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#7A70A8';
              e.currentTarget.style.borderColor = '#7A70A8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#8E84B8';
              e.currentTarget.style.borderColor = '#8E84B8';
            }}
            aria-label={isCollapsedOnDesktop ? 'New Chat' : undefined}
          >
            <Plus size={18} style={{ color: '#FFFFFF' }} />
            {!isCollapsedOnDesktop && <span>New Chat</span>}
            {isCollapsedOnDesktop && (
              <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                New Chat
              </div>
            )}
          </button>
        </div>

        {/* Conversation History Section */}
        {!isCollapsedOnDesktop && (
          <div className="px-3 pt-3 pb-2" style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: dc.textPrimary }}>Conversation History</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: dc.textFaint }} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6C63FF] transition-all duration-250 ease-in-out sidebar-input"
                style={{
                  border: `1px solid ${dc.borderPrimary}`,
                  backgroundColor: dc.bgInput,
                  color: dc.textPrimary,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = dc.borderAccent;
                  e.currentTarget.style.backgroundColor = dc.bgPrimary;
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(142, 132, 184, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = dc.borderPrimary;
                  e.currentTarget.style.backgroundColor = dc.bgInput;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>
        )}

        {/* Chat History List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          {loading ? (
            <div className={`p-4 text-center ${isCollapsedOnDesktop ? 'px-2' : ''}`} style={{ color: '#94A3B8' }}>
              {!isCollapsedOnDesktop && <div className="animate-pulse">Loading...</div>}
            </div>
          ) : !hasChats ? (
            <div className={`p-4 text-center ${isCollapsedOnDesktop ? 'px-2' : ''}`} style={{ color: '#94A3B8' }}>
              {!isCollapsedOnDesktop && (
                <>
                  <MessageSquare size={48} className="mx-auto mb-2" style={{ opacity: 0.5, color: '#94A3B8' }} />
                  <p className="text-sm">No chat history</p>
                  <p className="text-xs mt-1">Start a conversation to see it here</p>
                </>
              )}
            </div>
          ) : !hasFilteredChats ? (
            <div className={`p-4 text-center ${isCollapsedOnDesktop ? 'px-2' : ''}`} style={{ color: '#94A3B8' }}>
              {!isCollapsedOnDesktop && (
                <>
                  <p className="text-sm">No conversations found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </>
              )}
            </div>
          ) : (
            <div className={`p-2 ${isCollapsedOnDesktop ? 'px-2' : ''}`}>
              {/* Today */}
              {groupedChats.today.length > 0 && !isCollapsedOnDesktop && (
                <div className="px-3 py-2 text-xs font-medium uppercase" style={{ color: '#94A3B8' }}>Today</div>
              )}
              {groupedChats.today.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chatId === chat.id}
                  isCollapsed={isCollapsedOnDesktop}
                  onChatClick={handleChatClick}
                  onRenameStart={handleRenameStart}
                  onRenameSave={handleRenameSave}
                  onRenameCancel={handleRenameCancel}
                  onRenameKeyDown={handleRenameKeyDown}
                  onDelete={handleDelete}
                  editingChatId={editingChatId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editInputRef={editInputRef}
                  hoveredChatId={hoveredChatId}
                  setHoveredChatId={setHoveredChatId}
                  menuOpenChatId={menuOpenChatId}
                  setMenuOpenChatId={setMenuOpenChatId}
                  menuRef={menuRef}
                />
              ))}

              {/* Yesterday */}
              {groupedChats.yesterday.length > 0 && !isCollapsedOnDesktop && (
                <div className="px-3 py-2 text-xs font-medium uppercase mt-2" style={{ color: '#94A3B8' }}>Yesterday</div>
              )}
              {groupedChats.yesterday.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chatId === chat.id}
                  isCollapsed={isCollapsedOnDesktop}
                  onChatClick={handleChatClick}
                  onRenameStart={handleRenameStart}
                  onRenameSave={handleRenameSave}
                  onRenameCancel={handleRenameCancel}
                  onRenameKeyDown={handleRenameKeyDown}
                  onDelete={handleDelete}
                  editingChatId={editingChatId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editInputRef={editInputRef}
                  hoveredChatId={hoveredChatId}
                  setHoveredChatId={setHoveredChatId}
                  menuOpenChatId={menuOpenChatId}
                  setMenuOpenChatId={setMenuOpenChatId}
                  menuRef={menuRef}
                />
              ))}

              {/* Earlier */}
              {groupedChats.earlier.length > 0 && !isCollapsedOnDesktop && (
                <div className="px-3 py-2 text-xs font-medium uppercase mt-2" style={{ color: '#94A3B8' }}>Earlier</div>
              )}
              {groupedChats.earlier.map((chat) => (
                <ChatItem
                  key={chat.id}
                  chat={chat}
                  isActive={chatId === chat.id}
                  isCollapsed={isCollapsedOnDesktop}
                  onChatClick={handleChatClick}
                  onRenameStart={handleRenameStart}
                  onRenameSave={handleRenameSave}
                  onRenameCancel={handleRenameCancel}
                  onRenameKeyDown={handleRenameKeyDown}
                  onDelete={handleDelete}
                  editingChatId={editingChatId}
                  editTitle={editTitle}
                  setEditTitle={setEditTitle}
                  editInputRef={editInputRef}
                  hoveredChatId={hoveredChatId}
                  setHoveredChatId={setHoveredChatId}
                  menuOpenChatId={menuOpenChatId}
                  setMenuOpenChatId={setMenuOpenChatId}
                  menuRef={menuRef}
                />
              ))}
            </div>
          )}
        </div>

        {/* User Avatar Menu */}
        <div className="p-3 relative" ref={userMenuRef} style={{ borderTop: `1px solid ${dc.borderPrimary}` }}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center ${isCollapsedOnDesktop ? 'justify-center' : 'gap-3'} p-2 rounded-lg transition-all duration-250 ease-in-out group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8E84B8]`}
            style={{
              color: dc.textSecondary,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(142, 132, 184, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-[#8E84B8] flex items-center justify-center flex-shrink-0">
              <User size={18} className="text-white" />
            </div>
            {!isCollapsedOnDesktop && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate transition-colors duration-250 ease-in-out" style={{ color: dc.textPrimary }}>
                  {user?.name || 'User'}
                </p>
                <p className="text-xs truncate transition-colors duration-250 ease-in-out" style={{ color: dc.textFaint }}>
                  {user?.email || ''}
                </p>
              </div>
            )}
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div className={`absolute ${isCollapsedOnDesktop ? 'left-full ml-2 bottom-0' : 'bottom-full mb-2 left-0 right-0'} w-56 rounded-lg shadow-lg z-50`} style={{ backgroundColor: dc.bgPrimary, border: `1px solid ${dc.borderPrimary}` }}>
              {!isCollapsedOnDesktop && (
                <div className="p-3" style={{ borderBottom: `1px solid ${dc.borderPrimary}` }}>
                  <p className="text-sm font-medium" style={{ color: dc.textPrimary }}>{user?.name || 'User'}</p>
                  <p className="text-xs truncate" style={{ color: dc.textFaint }}>{user?.email || ''}</p>
                </div>
              )}
              <div className="py-1">
                <button
                  onClick={handleSettings}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                  style={{ color: dc.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Settings size={16} />
                  Settings
                </button>
                <button
                  onClick={handlePersonalization}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                  style={{ color: dc.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Palette size={16} />
                  Personalization
                </button>
                <button
                  onClick={handleHelp}
                  className="w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors"
                  style={{ color: dc.textSecondary }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <HelpCircle size={16} />
                  Help
                </button>
                <div className="my-1" style={{ borderTop: `1px solid ${dc.borderPrimary}` }}></div>
                <button
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile hamburger button */}
      <button
        onClick={() => setIsMobileDrawerOpen(true)}
        className={`fixed top-4 left-4 z-50 md:hidden p-2 bg-white border border-gray-200 rounded-lg shadow-lg hover:bg-gray-50 transition-colors ${!isDrawerOpenOnMobile ? 'block' : 'hidden'
          }`}
        aria-label="Open sidebar"
      >
        <Menu size={20} className="text-slate-700" />
      </button>
    </>
  );
};

// Chat Item Component
const ChatItem = ({
  chat,
  isActive,
  isCollapsed,
  onChatClick,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onRenameKeyDown,
  onDelete,
  editingChatId,
  editTitle,
  setEditTitle,
  editInputRef,
  hoveredChatId,
  setHoveredChatId,
  menuOpenChatId,
  setMenuOpenChatId,
  menuRef,
}) => {
  const dc = useDarkColors();
  return (
    <div
      className={`relative mb-1 rounded-lg cursor-pointer transition-all duration-250 ease-in-out group ${isCollapsed ? 'p-2 flex justify-center' : 'p-2.5'
        }`}
      style={{
        backgroundColor: isActive ? 'rgba(142, 132, 184, 0.08)' : 'transparent',
        borderLeft: isActive ? '3px solid #8E84B8' : '3px solid transparent',
        boxShadow: isActive ? '0 0 6px rgba(142, 132, 184, 0.1)' : 'none',
      }}
      onClick={() => onChatClick(chat)}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'rgba(142, 132, 184, 0.06)';
        }
        setHoveredChatId(chat.id);
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
        setHoveredChatId(null);
      }}
    >
      {isCollapsed ? (
        <>
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isActive ? '#8E84B8' : '#CBD5E1',
            }}
          ></div>
          <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            {chat.title}
          </div>
        </>
      ) : (
        <div className="flex items-center gap-2.5 pr-8">
          <div
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{
              backgroundColor: isActive ? '#8E84B8' : '#CBD5E1',
            }}
          ></div>
          <div className="flex-1 min-w-0">
            {editingChatId === chat.id ? (
              <input
                ref={editInputRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => onRenameSave(chat.id)}
                onKeyDown={(e) => onRenameKeyDown(e, chat.id)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 text-sm font-medium rounded focus:outline-none focus:ring-2 transition-all duration-250 ease-in-out"
                style={{
                  border: '1px solid #8E84B8',
                  backgroundColor: dc.bgInput,
                  color: dc.textPrimary,
                }}
                maxLength={255}
              />
            ) : (
              <p
                className="text-sm font-medium truncate transition-colors duration-250 ease-in-out"
                style={{
                  color: isActive ? '#8E84B8' : dc.textSecondary,
                }}
                title={chat.title}
              >
                {chat.title}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Three-dot menu - only show when expanded */}
      {!isCollapsed && hoveredChatId === chat.id && editingChatId !== chat.id && (
        <div className="absolute top-2 right-2" ref={menuRef}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpenChatId(menuOpenChatId === chat.id ? null : chat.id);
            }}
            className="p-1 rounded transition-all duration-250 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#6C63FF] cursor-pointer"
            style={{
              color: dc.textMuted,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(142, 132, 184, 0.08)';
              e.currentTarget.style.color = '#8E84B8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
            aria-label="Chat options"
          >
            <MoreVertical size={16} />
          </button>

          {/* Dropdown menu */}
          {menuOpenChatId === chat.id && (
            <div className="absolute right-0 mt-1 w-40 rounded-lg shadow-lg z-10" style={{ backgroundColor: dc.bgPrimary, border: `1px solid ${dc.borderPrimary}` }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRenameStart(chat);
                }}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Edit2 size={14} />
                Rename
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(chat.id);
                }}
                className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
