import deepDocLogo from '../assets/deepdoc-logo.png';

function DeepDocAILogo({ size = 'default', showText = true, className = '', useOriginalLogo = false }) {
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
        <span className={`font-bold text-lg ${className.includes('text-') ? '' : 'text-[#8E84B8]'}`}>
          DeepDoc AI
        </span>
      )}
    </div>
  );
}

export default DeepDocAILogo;
