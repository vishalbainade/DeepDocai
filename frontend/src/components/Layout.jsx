import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useChat } from '../contexts/ChatContext';

const Layout = () => {
  const { sidebarCollapsed } = useChat();

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-gray-50">
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

