import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderPlus, Folder, Search, ArrowUpDown, Plus, 
  FileText, MessageSquare, ChevronRight, Edit3, Trash2, 
  ExternalLink, Layers, Sparkles, ArrowLeft, Clock, Eye, 
  UploadCloud, X, CheckCircle2 
} from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { getProject, deleteProject } from '../services/api';
import { useDarkColors, useIsDark } from '../utils/darkMode';
import ReconstructedOCRModal from '../components/ReconstructedOCRModal';

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { 
    projects, 
    loadProjects, 
    selectProject, 
    activeProject, 
    setIsProjectsModalOpen, 
    setProjectToEdit,
    createNewChat,
    userDocuments,
    setIsMultiUploadOpen
  } = useChat();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'name' | 'documents'
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectLoading, setProjectLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'documents'
  const [viewingOCRDoc, setViewingOCRDoc] = useState(null);

  const dc = useDarkColors();
  const isDark = useIsDark();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // If there's an activeProject from context, sync it if viewing details
  useEffect(() => {
    if (activeProject && !selectedProject) {
      loadProjectDetails(activeProject.id);
    }
  }, [activeProject]);

  const loadProjectDetails = async (projectId) => {
    setProjectLoading(true);
    try {
      const res = await getProject(projectId);
      if (res?.project) {
        setSelectedProject(res.project);
      }
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setProjectLoading(false);
    }
  };

  // Filter & sort projects
  const filteredProjects = projects
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'documents') return (b.document_count || 0) - (a.document_count || 0);
      return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
    });

  const handleOpenProjectCard = async (project) => {
    await selectProject(project);
    await loadProjectDetails(project.id);
  };

  const handleStartNewChatInProject = async () => {
    if (!selectedProject) return;
    await selectProject(selectedProject);
    navigate('/chat');
  };

  const handleOpenChatSession = async (chatId) => {
    if (selectedProject) {
      await selectProject(selectedProject);
    }
    navigate(`/chat/${chatId}`);
  };

  const handleEditProject = async (e, project) => {
    e.stopPropagation();
    try {
      const full = await getProject(project.id);
      setProjectToEdit(full?.project || project);
    } catch {
      setProjectToEdit(project);
    }
    setIsProjectsModalOpen(true);
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await deleteProject(projectId);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
        selectProject(null);
      }
      await loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // If viewing project detail workspace (Claude-style project with sessions and files)
  if (selectedProject) {
    const projectSessions = Array.isArray(selectedProject.chats) ? selectedProject.chats : [];
    const projectDocuments = Array.isArray(selectedProject.documents) ? selectedProject.documents : [];

    return (
      <div 
        className="h-full w-full overflow-y-auto transition-colors duration-300 flex flex-col"
        style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
      >
        <div className="max-w-5xl w-full mx-auto px-6 py-8 flex-1 flex flex-col">
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 mb-6 text-xs text-neutral-500">
            <button
              onClick={() => {
                setSelectedProject(null);
                selectProject(null);
              }}
              className="inline-flex items-center gap-1 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              <span>Projects</span>
            </button>
            <span>/</span>
            <span className="font-semibold" style={{ color: dc.textPrimary }}>
              {selectedProject.name}
            </span>
          </div>

          {/* Project Header Banner */}
          <div 
            className="p-6 rounded-3xl border shadow-sm mb-6 transition-all"
            style={{
              backgroundColor: isDark ? '#262522' : '#ffffff',
              borderColor: isDark ? '#383733' : '#e5e5df',
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-3.5 min-w-0">
                <span 
                  className="w-5 h-5 rounded-full shrink-0 mt-1 shadow-xs" 
                  style={{ backgroundColor: selectedProject.color || '#da7756' }} 
                />
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl font-serif font-medium tracking-tight" style={{ color: dc.textPrimary }}>
                    {selectedProject.name}
                  </h1>
                  {selectedProject.description && (
                    <p className="mt-1.5 text-xs text-slate-500 leading-relaxed max-w-2xl">
                      {selectedProject.description}
                    </p>
                  )}
                  {selectedProject.custom_instructions && (
                    <div className="mt-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/60 dark:border-neutral-700/60 text-xs text-neutral-600 dark:text-neutral-300 max-w-2xl">
                      <span className="font-bold text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 block mb-1">
                        Custom Instructions
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{selectedProject.custom_instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleStartNewChatInProject}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#da7756] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus size={15} />
                  <span>New chat in project</span>
                </button>

                <button
                  onClick={(e) => handleEditProject(e, selectedProject)}
                  className="p-2 rounded-xl border hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isDark ? '#383733' : '#e5e5df',
                  }}
                  title="Edit project"
                >
                  <Edit3 size={14} />
                </button>

                <button
                  onClick={(e) => handleDeleteProject(e, selectedProject.id)}
                  className="p-2 rounded-xl border hover:bg-rose-500/10 text-neutral-500 hover:text-rose-500 transition-colors cursor-pointer"
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isDark ? '#383733' : '#e5e5df',
                  }}
                  title="Delete project"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Claude Tabs: Chat Sessions vs Project Materials */}
          <div className="flex items-center gap-2 border-b mb-6 pb-2" style={{ borderColor: isDark ? '#2e2d2a' : '#eae7df' }}>
            <button
              onClick={() => setActiveTab('chats')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'chats'
                  ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <MessageSquare size={13} className="text-[#da7756]" />
              <span>Chat Sessions ({projectSessions.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
              }`}
            >
              <FileText size={13} className="text-amber-500" />
              <span>Project Materials ({projectDocuments.length})</span>
            </button>
          </div>

          {/* Tab 1: Project Chat Sessions */}
          {activeTab === 'chats' && (
            <div className="space-y-3">
              {projectSessions.length === 0 ? (
                <div 
                  className="p-10 rounded-3xl border text-center flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isDark ? '#383733' : '#e5e5df',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-[#da7756] flex items-center justify-center mb-3">
                    <MessageSquare size={22} />
                  </div>
                  <h3 className="font-serif font-medium text-base mb-1" style={{ color: dc.textPrimary }}>
                    No sessions in this project yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                    Conversations started inside this project utilize its knowledge base and custom instructions automatically.
                  </p>
                  <button
                    onClick={handleStartNewChatInProject}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#da7756] hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Start first session</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {projectSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => handleOpenChatSession(session.id)}
                      className="p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer group flex flex-col justify-between"
                      style={{
                        backgroundColor: isDark ? '#262522' : '#ffffff',
                        borderColor: isDark ? '#383733' : '#e5e5df',
                      }}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <MessageSquare size={14} className="text-[#da7756] shrink-0" />
                          <h4 className="font-medium text-xs truncate" style={{ color: dc.textPrimary }}>
                            {session.title || 'Untitled Session'}
                          </h4>
                        </div>
                        <span className="text-[11px] text-[#da7756] font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 shrink-0">
                          Open <ChevronRight size={11} />
                        </span>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-[11px] text-neutral-400" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{formatDate(session.updated_at || session.created_at)}</span>
                        </span>
                        <span>Session Active</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Project Materials / Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">
                  Files attached to this project are indexed for Legal RAG and Sarvam OCR analysis.
                </span>
                <button
                  onClick={() => setIsMultiUploadOpen(true)}
                  className="px-3 py-1.5 rounded-xl border text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isDark ? '#383733' : '#e5e5df',
                  }}
                >
                  <UploadCloud size={13} className="text-[#da7756]" />
                  <span>Upload Materials</span>
                </button>
              </div>

              {projectDocuments.length === 0 ? (
                <div 
                  className="p-10 rounded-3xl border text-center flex flex-col items-center justify-center"
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isDark ? '#383733' : '#e5e5df',
                  }}
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                    <FileText size={22} />
                  </div>
                  <h3 className="font-serif font-medium text-base mb-1" style={{ color: dc.textPrimary }}>
                    No materials attached yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mb-5 leading-relaxed">
                    Attach contracts, PDF agreements, or guidelines to ground all conversations in this project.
                  </p>
                  <button
                    onClick={() => setIsMultiUploadOpen(true)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <Plus size={14} />
                    <span>Attach document</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {projectDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="p-4 rounded-2xl border transition-all flex flex-col justify-between"
                      style={{
                        backgroundColor: isDark ? '#262522' : '#ffffff',
                        borderColor: isDark ? '#383733' : '#e5e5df',
                      }}
                    >
                      <div className="flex items-start gap-2.5 mb-3 min-w-0">
                        <FileText size={16} className="text-amber-500 shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <h4 className="font-medium text-xs truncate" style={{ color: dc.textPrimary }}>
                            {doc.file_name || doc.fileName}
                          </h4>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            OCR Ready • {doc.page_count || 1} pages
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
                        <button
                          type="button"
                          onClick={() => setViewingOCRDoc(doc)}
                          className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                        >
                          <Eye size={12} />
                          <span>OCR View</span>
                        </button>
                        <span className="text-[10px] text-neutral-400">Indexed</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* OCR Reconstructed Modal */}
          <ReconstructedOCRModal
            isOpen={!!viewingOCRDoc}
            document={viewingOCRDoc}
            onClose={() => setViewingOCRDoc(null)}
          />
        </div>
      </div>
    );
  }

  // All Projects Grid View (Matching Claude Screenshot 3)
  return (
    <div 
      className="h-full w-full overflow-y-auto transition-colors duration-300 flex flex-col"
      style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
    >
      <div className="max-w-6xl w-full mx-auto px-6 py-10 flex-1 flex flex-col">
        
        {/* Top Header matching Claude Screenshot 3 */}
        <div className="flex items-center justify-between pb-8 mb-8 border-b" style={{ borderColor: isDark ? '#2e2d2a' : '#eae7df' }}>
          <div>
            <h1 className="text-3xl font-serif font-normal tracking-tight" style={{ color: dc.textPrimary }}>
              Projects
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div 
              className="relative flex items-center px-3 py-1.5 rounded-xl border transition-all"
              style={{
                backgroundColor: isDark ? '#262522' : '#ffffff',
                borderColor: isDark ? '#383733' : '#e5e5df',
              }}
            >
              <Search size={14} className="text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="bg-transparent text-xs outline-none w-36 sm:w-48"
                style={{ color: dc.textPrimary }}
              />
            </div>

            {/* Sort Toggle */}
            <button
              onClick={() => {
                setSortBy((prev) => (prev === 'recent' ? 'name' : prev === 'name' ? 'documents' : 'recent'));
              }}
              className="p-2 rounded-xl border hover:bg-black/5 dark:hover:bg-white/5 text-slate-500 transition-colors cursor-pointer"
              style={{
                backgroundColor: isDark ? '#262522' : '#ffffff',
                borderColor: isDark ? '#383733' : '#e5e5df',
              }}
              title={`Sorting by: ${sortBy}`}
            >
              <ArrowUpDown size={15} />
            </button>

            {/* + New Project Button */}
            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectsModalOpen(true);
              }}
              className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus size={15} />
              <span>New project</span>
            </button>
          </div>
        </div>

        {/* Content State */}
        {filteredProjects.length === 0 && !searchQuery ? (
          /* Illustrated Empty State matching Claude Screenshot 3 */
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto my-auto">
            <div className="mb-6 opacity-75">
              <svg className="w-20 h-20 text-slate-700 dark:text-slate-300" viewBox="0 0 80 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="18" y="14" width="28" height="28" rx="3" />
                <line x1="18" y1="28" x2="46" y2="28" />
                <line x1="32" y1="14" x2="32" y2="42" />
                <rect x="34" y="30" width="30" height="30" rx="3" />
                <path d="M49 46v-8a2 2 0 0 1 4 0v8" />
                <path d="M53 42a2 2 0 0 1 4 0v4" />
                <path d="M57 44a2 2 0 0 1 4 0v4" />
                <path d="M45 42a2 2 0 0 1 4 0v8" />
              </svg>
            </div>

            <h2 className="text-xl font-serif font-medium mb-2" style={{ color: dc.textPrimary }}>
              Looking to start a project?
            </h2>
            <p className="text-xs leading-relaxed text-slate-500 mb-6 max-w-xs">
              Upload materials, set custom instructions, and organize conversations in one space.
            </p>

            <button
              onClick={() => {
                setProjectToEdit(null);
                setIsProjectsModalOpen(true);
              }}
              className="px-5 py-2.5 rounded-xl border text-xs font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-all cursor-pointer shadow-sm"
              style={{
                backgroundColor: isDark ? '#262522' : '#ffffff',
                borderColor: isDark ? '#383733' : '#e5e5df',
                color: dc.textPrimary,
              }}
            >
              New project
            </button>
          </div>
        ) : (
          /* Project Cards Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((project) => {
              const isActive = activeProject?.id === project.id;
              return (
                <div
                  key={project.id}
                  onClick={() => handleOpenProjectCard(project)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                    isActive 
                      ? 'ring-2 ring-[#da7756]/50 shadow-md' 
                      : 'hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  style={{
                    backgroundColor: isDark ? '#262522' : '#ffffff',
                    borderColor: isActive ? '#da7756' : (isDark ? '#383733' : '#e5e5df'),
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" 
                          style={{ backgroundColor: project.color || '#da7756' }} 
                        />
                        <h3 className="font-serif font-medium text-sm truncate" style={{ color: dc.textPrimary }}>
                          {project.name}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleEditProject(e, project)}
                          className="p-1 rounded-md hover:bg-slate-500/10 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Edit project"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={(e) => handleDeleteProject(e, project.id)}
                          className="p-1 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                          title="Delete project"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                      {project.description || project.custom_instructions || 'No custom instructions set for this project.'}
                    </p>
                  </div>

                  <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-400" style={{ borderColor: isDark ? '#2e2d2a' : '#f0eee6' }}>
                    <span className="flex items-center gap-1">
                      <FileText size={12} className="text-amber-500" />
                      <span>{project.document_count || 0} materials</span>
                    </span>

                    <span className="text-[11px] font-medium text-[#da7756] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Open Project <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectsPage;
