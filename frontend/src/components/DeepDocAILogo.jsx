import deepDocLogo from '../assets/deepdoc-logo.png';
import { useDarkColors } from '../utils/darkMode';

function DeepDocAILogo({ size = 'default', showText = true, className = '', useOriginalLogo = false }) {
  const dc = useDarkColors();
  const sizeClasses = {
    small: 'h-12',
    default: 'h-14',
    large: 'h-20',
  };

  const logoSource = deepDocLogo;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoSource}
        alt="DeepDoc AI - AI Legal Assistant"
        className={`${sizeClasses[size]} w-auto object-contain border-0 border-black rounded-lg`}
        style={{ borderWidth: '0px' }}
      />
      {showText && (
        <span className={`font-bold text-lg transition-colors duration-300`} style={{ color: dc.primary }}>
          DeepDoc AI
        </span>
      )}
    </div>
  );
}

export default DeepDocAILogo;
