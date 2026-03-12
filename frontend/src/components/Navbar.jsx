import { Upload, Menu } from 'lucide-react';
import DeepDocAILogo from './DeepDocAILogo';

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
            <DeepDocAILogo size="default" showText={false} useOriginalLogo={true} />
            <span className="text-2xl font-serif font-bold text-slate-900">DeepDoc AI</span>
          </div>
        </div>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#8E84B8] text-white rounded-lg hover:bg-[#7A70A8] transition-colors duration-200 font-medium focus:outline-none focus:ring-2 focus:ring-[#8E84B8] focus:ring-offset-2"
        >
          <Upload size={18} />
          Upload New
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

