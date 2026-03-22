import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useChat } from '../contexts/ChatContext';
import { useIsDark } from '../utils/darkMode';

const Layout = () => {
  const { sidebarCollapsed } = useChat();
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
    </div>
  );
};

export default Layout;
