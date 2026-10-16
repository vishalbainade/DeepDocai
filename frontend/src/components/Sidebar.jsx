import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Plus,
  Folder,
  Layers,
  Code,
  Sliders,
  Settings,
  Globe,
  HelpCircle,
  LogOut,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  PanelLeft,
  MoreVertical,
  Edit2,
  Trash2,
  Search,
  ArrowUpDown,
  X,
  FileText,
  UploadCloud,
  Check,
  FolderPlus
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { renameChat, deleteChat, getProject, logout, getUser } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';
import deepDocLogo from '../assets/deepdoc-logo.png';



const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const chatId = params?.chatId || null;
  const dc = useDarkColors();
  const isDark = useIsDark();

  const {
    chats,
    loading,
    sidebarCollapsed,
    setSidebarCollapsed,
    createNewChat,
    currentDocumentId,
    refreshChats,
    setCurrentDocumentId,
    projects,
    activeProject,
    selectProject,
    setIsProjectsModalOpen,
    setProjectToEdit,
    setIsMultiUploadOpen,
    openSettings,
    setIsUsageModalOpen,
  } = useChat();

  const [editingChatId, setEditingChatId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [hoveredChatId, setHoveredChatId] = useState(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortAscending, setSortAscending] = useState(false);
  const [user, setUser] = useState(null);

  const editInputRef = useRef(null);
  const menuRef = useRef(null);
  const userMenuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Responsive mobile drawer
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const isCollapsed = !isMobile && sidebarCollapsed;

  // Load user
  useEffect(() => {
    setUser(getUser());
  }, []);

  // Close menus on outside click
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

  // Focus rename input
  useEffect(() => {
    if (editingChatId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingChatId]);

  // Focus search input
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchOpen]);

  // Filter & sort chats
  const filteredChats = chats
    .filter((c) => {
      if (!searchQuery.trim()) return true;
      return c.title.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.created_at).getTime();
      const timeB = new Date(b.updatedAt || b.created_at).getTime();
      return sortAscending ? timeA - timeB : timeB - timeA;
    });

  const handleNewChat = () => {
    navigate('/chat');
    setCurrentDocumentId(null);
    if (isMobile) setIsMobileDrawerOpen(false);
  };

  const handleChatClick = (chat) => {
    navigate(`/chat/${chat.id}`);
    setMenuOpenChatId(null);
    if (isMobile) setIsMobileDrawerOpen(false);
  };

  const handleRenameStart = (chat) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenChatId(null);
  };

  const handleRenameSave = async (chatId) => {
    const trimmed = editTitle.trim();
    if (!trimmed) {
      setEditingChatId(null);
      return;
    }
    try {
      await renameChat(chatId, trimmed);
      await refreshChats();
      setEditingChatId(null);
    } catch (err) {
      console.error('Failed to rename chat:', err);
      setEditingChatId(null);
    }
  };

  const handleDeleteChat = async (chatIdToDelete) => {
    if (!window.confirm('Delete this conversation?')) return;
    try {
      await deleteChat(chatIdToDelete);
      await refreshChats();
      setMenuOpenChatId(null);
      if (chatId === chatIdToDelete) {
        navigate('/chat');
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'V';
  const userDisplayName = user?.name ? user.name.split(' ')[0] : 'Vishal';
  const userEmail = user?.email || 'vishalbainade27@gmail.com';

  return (
    <>
      {/* Mobile Drawer Overlay */}
      {isMobile && isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Main Claude Sidebar Container */}
      <aside
        className={`fixed md:static top-0 left-0 h-screen z-50 flex flex-col transition-all duration-200 select-none ${
          isMobile
            ? `w-72 shadow-2xl transform ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`
            : isCollapsed
            ? 'w-[60px]'
            : 'w-[256px]'
        }`}
        style={{
          backgroundColor: isDark ? '#171715' : '#f5f4ef',
          borderRight: `1px solid ${isDark ? '#262522' : '#eae8e1'}`,
        }}
      >
        {/* Top Header matching Screenshot 2 */}
        <div className="h-13 px-3 flex items-center justify-between border-b"
          style={{ borderColor: isDark ? '#262522' : '#eae8e1' }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Sidebar Collapse Toggle Button */}
            <button
              onClick={() => {
                if (isMobile) setIsMobileDrawerOpen(false);
                else setSidebarCollapsed(!sidebarCollapsed);
              }}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200/60 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <PanelLeft size={18} />
            </button>

            {/* Brand Title: DeepDoc / Claude Serif Style */}
            {!isCollapsed && (
              <div 
                onClick={() => navigate('/chat')}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <img src={deepDocLogo} alt="DeepDoc AI" className="h-6 w-auto object-contain rounded" />
                <span className="font-serif text-[17px] font-medium tracking-tight"
                  style={{ color: isDark ? '#eceae6' : '#2d2b28' }}
                >
                  DeepDoc AI
                </span>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className={`p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors ${
                  searchOpen ? 'bg-neutral-200/60 dark:bg-neutral-800/60 text-neutral-900 dark:text-neutral-100' : ''
                }`}
                title="Search chats"
              >
                <Search size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Primary Action Button: + New Chat matching Claude Screenshot 2 */}
        <div className="p-2.5">
          <button
            onClick={handleNewChat}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-3 gap-2'} py-2 rounded-xl text-sm font-medium border shadow-xs transition-all cursor-pointer group`}
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383734' : '#e5e3da',
              color: isDark ? '#eceae6' : '#2d2b28',
            }}
            title={isCollapsed ? 'New Chat' : undefined}
          >
            <Plus size={16} className="text-neutral-500 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
            {!isCollapsed && <span>New</span>}
          </button>
        </div>

        {/* Primary Navigation Links matching Screenshot 2 */}
        <div className="px-2 space-y-0.5">
          {/* Projects Link */}
          <button
            onClick={() => {
              navigate('/projects');
              if (isMobile) setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'} py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              location.pathname.startsWith('/projects')
                ? 'bg-[#eae8e1] dark:bg-[#282724] text-[#2d2b28] dark:text-[#eceae6] font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-[#eeece5] dark:hover:bg-[#201f1c] hover:text-[#2d2b28] dark:hover:text-[#eceae6]'
            }`}
            title="Projects"
          >
            <Folder size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span className="truncate">Projects</span>
                {projects.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-300/50 dark:bg-neutral-800 text-neutral-500">
                    {projects.length}
                  </span>
                )}
              </div>
            )}
          </button>

          {/* Artifacts Link */}
          <button
            onClick={() => {
              navigate('/artifacts');
              if (isMobile) setIsMobileDrawerOpen(false);
            }}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'} py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              location.pathname.startsWith('/artifacts') || location.pathname.startsWith('/history')
                ? 'bg-[#eae8e1] dark:bg-[#282724] text-[#2d2b28] dark:text-[#eceae6] font-semibold'
                : 'text-neutral-600 dark:text-neutral-400 hover:bg-[#eeece5] dark:hover:bg-[#201f1c] hover:text-[#2d2b28] dark:hover:text-[#eceae6]'
            }`}
            title="Artifacts"
          >
            <Layers size={16} className="shrink-0 text-indigo-500" />
            {!isCollapsed && <span>Artifacts</span>}
          </button>

          {/* Code Link with Upgrade pill */}
          <button
            onClick={() => openSettings('usage')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'} py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-neutral-600 dark:text-neutral-400 hover:bg-[#eeece5] dark:hover:bg-[#201f1c] hover:text-[#2d2b28] dark:hover:text-[#eceae6]`}
            title="Code"
          >
            <Code size={16} className="shrink-0 text-neutral-500" />
            {!isCollapsed && (
              <div className="flex items-center justify-between flex-1 min-w-0">
                <span>Code</span>
              </div>
            )}
          </button>

          {/* Customize Link */}
          <button
            onClick={() => openSettings('personalization')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-2.5 gap-2.5'} py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer text-neutral-600 dark:text-neutral-400 hover:bg-[#eeece5] dark:hover:bg-[#201f1c] hover:text-[#2d2b28] dark:hover:text-[#eceae6]`}
            title="Customize"
          >
            <Sliders size={16} className="shrink-0 text-neutral-500" />
            {!isCollapsed && <span>Customize</span>}
          </button>
        </div>

        {/* Search Input Bar (when search icon toggled) */}
        {!isCollapsed && searchOpen && (
          <div className="px-3 pt-2 pb-1">
            <div className="relative flex items-center">
              <Search size={13} className="absolute left-2.5 text-neutral-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats..."
                className="w-full pl-7 pr-7 py-1 text-xs rounded-lg border bg-white dark:bg-[#201f1c] border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Active Project Banner */}
        {!isCollapsed && activeProject && (
          <div 
            className="mx-2 mb-2 p-2 rounded-xl border flex items-center justify-between text-xs animate-in fade-in"
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383734' : '#e5e3da',
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: activeProject.color || '#da7756' }} />
              <div className="flex flex-col min-w-0">
                <span className="font-semibold truncate" style={{ color: dc.textPrimary }}>{activeProject.name}</span>
                <span className="text-[10px] text-neutral-400">Project Workspace</span>
              </div>
            </div>
            <button
              onClick={() => selectProject(null)}
              className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 cursor-pointer"
              title="Exit project"
            >
              <X size={13} />
            </button>
          </div>
        )}

        {/* Section Header: Chats and tasks matching Screenshot 2 */}
        {!isCollapsed && (
          <div className="px-3 pt-3 pb-1.5 flex items-center justify-between text-neutral-400 dark:text-neutral-500">
            <span className="text-[11px] font-medium tracking-tight">Chats and tasks</span>
            <button
              onClick={() => setSortAscending(!sortAscending)}
              className="p-1 rounded hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
              title={sortAscending ? 'Sorted: Oldest first' : 'Sorted: Newest first'}
            >
              <ArrowUpDown size={12} />
            </button>
          </div>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
          {filteredChats.length === 0 ? (
            !isCollapsed && (
              <div className="px-3 py-6 text-center text-xs text-neutral-400">
                {searchQuery ? 'No matching chats' : 'No chats yet'}
              </div>
            )
          ) : (
            filteredChats.map((c) => {
              const isSelected = chatId === c.id;
              const isEditing = editingChatId === c.id;

              return (
                <div
                  key={c.id}
                  onMouseEnter={() => setHoveredChatId(c.id)}
                  onMouseLeave={() => setHoveredChatId(null)}
                  className="relative group"
                >
                  {isEditing ? (
                    <div className="px-2 py-1">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleRenameSave(c.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameSave(c.id);
                          if (e.key === 'Escape') setEditingChatId(null);
                        }}
                        className="w-full px-2 py-1 text-xs rounded border bg-white dark:bg-[#201f1c] border-amber-500 text-neutral-900 dark:text-neutral-100 outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={() => handleChatClick(c)}
                      className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'px-2.5'} py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                        isSelected
                          ? 'bg-[#eae8e1] dark:bg-[#282724] text-[#2d2b28] dark:text-[#eceae6] font-medium'
                          : 'text-neutral-600 dark:text-neutral-400 hover:bg-[#eeece5] dark:hover:bg-[#201f1c] hover:text-[#2d2b28] dark:hover:text-[#eceae6]'
                      }`}
                      title={c.title}
                    >
                      {/* Subtle Claude dot / radio icon */}
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 mr-2 ${isSelected ? 'bg-[#da7756]' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                      
                      {!isCollapsed && (
                        <div className="flex items-center justify-between flex-1 min-w-0 pr-4">
                          <span className="truncate">
                            {c.title || 'Untitled'}
                          </span>
                          {c.projectName && (
                            <span className="ml-1 text-[9px] px-1.5 py-0.2 rounded-md bg-neutral-200/60 dark:bg-neutral-800 text-neutral-500 shrink-0 font-medium truncate max-w-[70px]">
                              {c.projectName}
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  )}

                  {/* Context Menu dots (Rename / Delete) */}
                  {!isCollapsed && !isEditing && (hoveredChatId === c.id || menuOpenChatId === c.id) && (
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenChatId(menuOpenChatId === c.id ? null : c.id);
                        }}
                        className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-700/60 transition-colors"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {menuOpenChatId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 w-32 rounded-xl shadow-lg border bg-white dark:bg-[#201f1c] border-neutral-200 dark:border-neutral-700 py-1 z-50 animate-in fade-in zoom-in-95"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRenameStart(c);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                          >
                            <Edit2 size={12} />
                            <span>Rename</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(c.id);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          >
                            <Trash2 size={12} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom User Profile Footer matching Screenshot 2 & Screenshot 4 */}
        <div 
          className="relative p-2 border-t"
          style={{ borderColor: isDark ? '#262522' : '#eae8e1' }}
          ref={userMenuRef}
        >
          {/* User Pill Trigger */}
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center p-1.5' : 'px-2 py-1.5 justify-between'} rounded-xl hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Circular Avatar */}
              <div 
                className="w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs text-[#2d2b28] dark:text-[#eceae6] shrink-0 border"
                style={{ 
                  backgroundColor: isDark ? '#2e2d2a' : '#eae8e1',
                  borderColor: isDark ? '#3d3b37' : '#dad7cf'
                }}
              >
                {userInitial}
              </div>

              {!isCollapsed && (
                <div className="flex items-center gap-1.5 text-xs truncate">
                  <span className="font-medium text-[#2d2b28] dark:text-[#eceae6]">
                    {userDisplayName}
                  </span>
                  <ChevronDown size={12} className="text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-200 transition-colors ml-0.5" />
                </div>
              )}
            </div>

            {/* Right icons: ⊞ (keyboard / grid) and Q (search) matching Screenshot 2 */}
            {!isCollapsed && (
              <div className="flex items-center gap-1.5 text-neutral-400 text-xs">
                <span className="text-[11px] font-mono opacity-60">⊞</span>
                <span className="text-[11px] font-mono opacity-60">Q</span>
              </div>
            )}
          </button>

          {/* Claude User Menu Dropdown matching Screenshot 4 */}
          {userMenuOpen && (
            <div 
              className={`absolute bottom-full mb-2 ${isCollapsed ? 'left-full ml-2' : 'left-2 right-2'} rounded-2xl shadow-2xl border bg-white dark:bg-[#201f1c] border-neutral-200 dark:border-neutral-800 py-1.5 z-50 animate-in fade-in zoom-in-95 text-xs min-w-[240px]`}
              style={{
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* Email Header matching Screenshot 4 */}
              <div className="px-3.5 py-2 text-neutral-500 dark:text-neutral-400 text-[11px] font-normal truncate border-b border-neutral-100 dark:border-neutral-800/80">
                {userEmail}
              </div>

              {/* Settings (Ctrl+Shift+,) */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  openSettings('general');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Settings size={14} className="text-neutral-500" />
                  <span>Settings</span>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">Ctrl+Shift+,</span>
              </button>

              {/* Language */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  openSettings('general');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <Globe size={14} className="text-neutral-500" />
                <span>Language</span>
              </button>

              {/* Get help */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/help');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <HelpCircle size={14} className="text-neutral-500" />
                <span>Get help</span>
              </button>

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800/80" />

              {/* Get apps and extensions */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  alert('DeepDoc AI desktop companion & browser extension available soon.');
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <span className="text-xs font-mono text-neutral-500">⊞</span>
                <span>Get apps and extensions</span>
              </button>

              {/* Learn more */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  navigate('/help');
                }}
                className="w-full flex items-center justify-between px-3.5 py-2 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-serif text-neutral-500 italic">i</span>
                  <span>Learn more</span>
                </div>
                <ChevronRight size={13} className="text-neutral-400" />
              </button>

              <div className="my-1 border-t border-neutral-100 dark:border-neutral-800/80" />

              {/* Log out */}
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
              >
                <LogOut size={14} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
