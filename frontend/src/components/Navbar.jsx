import { Upload, Menu } from 'lucide-react';
import DeepDocAILogo from './DeepDocAILogo';
import { useDarkColors } from '../utils/darkMode';

const Navbar = ({ onUploadClick, onMenuClick }) => {
  const dc = useDarkColors();

  return (
    <nav 
      className="px-6 py-4 shadow-sm transition-colors duration-300"
      style={{ backgroundColor: dc.bgPrimary, borderBottom: `1px solid ${dc.borderPrimary}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu Button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            style={{ backgroundColor: 'transparent' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.bgHover}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            aria-label="Toggle chat history menu"
            title="Chat History"
          >
            <Menu size={24} style={{ color: dc.textPrimary }} />
          </button>
          <div className="flex items-center gap-2">
            <DeepDocAILogo size="default" showText={false} useOriginalLogo={true} />
            <span className="text-2xl font-serif font-bold transition-colors duration-300" style={{ color: dc.textPrimary }}>DeepDoc AI</span>
          </div>
        </div>
        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors duration-200 font-medium focus:outline-none focus:ring-offset-2"
          style={{ backgroundColor: dc.primary }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = dc.primaryLight}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = dc.primary}
        >
          <Upload size={18} />
          Upload New
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

