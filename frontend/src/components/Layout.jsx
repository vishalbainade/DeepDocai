import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import UsageDashboardModal from './UsageDashboardModal';
import PersonalizationModal from './PersonalizationModal';
import ProjectsModal from './ProjectsModal';
import MultiFileUploadModal from './MultiFileUploadModal';
import LiveAudioModal from './LiveAudioModal';
import { useChat } from '../contexts/ChatContext';
import { useIsDark } from '../utils/darkMode';

const Layout = () => {
  const { 
    sidebarCollapsed,
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
    projects,
    loadProjects,
    loadUsageSummary,
    activeProject,
  } = useChat();
  const isDark = useIsDark();

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ backgroundColor: isDark ? '#0f172a' : '#f8fafc' }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Outlet />
      </div>

      {/* Global Modals */}
      <UsageDashboardModal 
        isOpen={isUsageModalOpen} 
        onClose={() => setIsUsageModalOpen(false)} 
      />

      <PersonalizationModal 
        isOpen={isPersonalizationModalOpen} 
        onClose={() => setIsPersonalizationModalOpen(false)} 
      />

      <ProjectsModal 
        isOpen={isProjectsModalOpen} 
        projectToEdit={projectToEdit}
        onClose={() => {
          setIsProjectsModalOpen(false);
          setProjectToEdit(null);
        }}
        onProjectSaved={() => {
          loadProjects();
        }}
      />

      <MultiFileUploadModal
        isOpen={isMultiUploadOpen}
        projects={projects}
        selectedProjectId={activeProject?.id || null}
        onClose={() => setIsMultiUploadOpen(false)}
        onUploadComplete={() => {
          loadProjects();
          loadUsageSummary();
        }}
      />

      <LiveAudioModal
        isOpen={isLiveAudioOpen}
        onClose={() => setIsLiveAudioOpen(false)}
      />
    </div>
  );
};

export default Layout;
