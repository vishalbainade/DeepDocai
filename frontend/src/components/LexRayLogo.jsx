import lexrayLogo from '../assets/lexray-logo.png';
import lexrayLogo1 from '../assets/lexray-logo1.png';

function LexRayLogo({ size = 'default', showText = true, className = '', useOriginalLogo = false }) {
  const sizeClasses = {
    small: 'h-12',
    default: 'h-14',
    large: 'h-20',
  };

  // Use original logo (lexray-logo.png) if useOriginalLogo is true, otherwise use lexray-logo1.png
  const logoSource = useOriginalLogo ? lexrayLogo : lexrayLogo1;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src={logoSource}
        alt="LexRay - AI Legal Assistant"
        className={`${sizeClasses[size]} w-auto object-contain border-0 border-black rounded-lg`}
        style={{ borderWidth: '0px' }}
      />
      {showText && (
        <span className={`font-bold text-lg ${className.includes('text-') ? '' : 'text-white'}`}>
          LexRay
        </span>
      )}
    </div>
  );
}

export default LexRayLogo;
