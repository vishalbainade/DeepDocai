import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import UsageDashboardModal from './UsageDashboardModal';
import PersonalizationModal from './PersonalizationModal';
import ProjectsModal from './ProjectsModal';
import MultiFileUploadModal from './MultiFileUploadModal';
import LiveAudioModal from './LiveAudioModal';
import ClaudeSettingsModal from './ClaudeSettingsModal';
import { useChat } from '../contexts/ChatContext';
import { useIsDark } from '../utils/darkMode';

const Layout = () => {
  const { 
    sidebarCollapsed,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settingsInitialTab,
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
    userDocuments,
    loadProjects,
    loadUserDocuments,
    loadUsageSummary,
    activeProject,
    selectProject,
  } = useChat();
  const isDark = useIsDark();

  return (
    <div
      className="h-screen w-screen flex overflow-hidden"
      style={{ backgroundColor: isDark ? '#1f1e1d' : '#faf9f5' }}
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
        existingDocuments={userDocuments}
        onClose={() => {
          setIsProjectsModalOpen(false);
          setProjectToEdit(null);
        }}
        onProjectSaved={(project) => {
          loadProjects();
          if (project?.deleted && activeProject?.id === project.id) {
            selectProject(null);
          } else if (project?.id && activeProject?.id === project.id) {
            selectProject(project).catch(() => {});
          }
        }}
      />

      <MultiFileUploadModal
        isOpen={isMultiUploadOpen}
        projects={projects}
        selectedProjectId={activeProject?.id || null}
        onClose={() => setIsMultiUploadOpen(false)}
        onUploadComplete={async () => {
          await Promise.all([loadProjects(), loadUserDocuments(), loadUsageSummary()]);
          if (activeProject?.id) {
            selectProject(activeProject).catch(() => {});
          }
        }}
      />

      <LiveAudioModal
        isOpen={isLiveAudioOpen}
        onClose={() => setIsLiveAudioOpen(false)}
      />

      <ClaudeSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
      />
    </div>
  );
};

export default Layout;
