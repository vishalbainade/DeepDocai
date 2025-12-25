import { Upload, Menu } from 'lucide-react';
import LexRayLogo from './LexRayLogo';

const Navbar = ({ onUploadClick, onMenuClick }) => {
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Toggle chat history menu"
            title="Chat History"
          >
            <Menu size={24} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <LexRayLogo size="default" showText={false} useOriginalLogo={true} />
            <span className="text-2xl font-serif font-bold text-slate-900">LexRay</span>
          </div>
        </div>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <Upload size={18} />
          Upload New
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

