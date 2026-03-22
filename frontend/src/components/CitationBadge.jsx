import { useDarkColors, useIsDark } from '../utils/darkMode';

const CitationBadge = ({ citation, onClick }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();
  if (!citation) {
    return null;
  }

  // Define colors using dc palette for better dark mode refinement
  // Using amber for light mode, and a refined amber/purple for dark mode as per instruction
  const bgColor = isDark ? dc.accentBackground : dc.amber50; // Dark: a refined accent background, Light: amber-50
  const textColor = isDark ? dc.accentText : dc.amber800; // Dark: a refined accent text, Light: amber-800
  const borderColor = isDark ? dc.accentBorder : dc.amber200; // Dark: a refined accent border, Light: amber-200

  const hoverBgColor = isDark ? dc.accentHoverBackground : dc.amber100; // Dark: hover accent background, Light: amber-100
  const hoverBorderColor = isDark ? dc.accentHoverBorder : dc.amber300; // Dark: hover accent border, Light: amber-300

  return (
    <button
      type="button"
      onClick={() => onClick?.(citation)}
      title={citation.preview || `Open page ${citation.page}`}
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200"
      style={{
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBgColor;
        e.currentTarget.style.borderColor = hoverBorderColor;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = isDark ? '#78350f' : '#fff7ed';
        e.currentTarget.style.borderColor = isDark ? '#92400e' : '#fed7aa';
      }}
    >
      {`Page ${citation.page}`}
    </button>
  );
};

export default CitationBadge;
