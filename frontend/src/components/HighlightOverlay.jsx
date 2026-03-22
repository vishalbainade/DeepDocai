import { useDarkColors, useIsDark } from '../utils/darkMode';

const HighlightOverlay = ({ activeHighlight, pageMetrics }) => {
  const dc = useDarkColors();
  const isDark = useIsDark();

  try {
    if (!activeHighlight?.bbox || !pageMetrics) {
      return null;
    }

    const [x1, y1, x2, y2] = activeHighlight.bbox;
    const sourceWidth = activeHighlight.pageWidth || pageMetrics.sourceWidth;
    const sourceHeight = activeHighlight.pageHeight || pageMetrics.sourceHeight;

    if (!sourceWidth || !sourceHeight) {
      return null;
    }

    const scaleX = pageMetrics.viewportWidth / sourceWidth;
    const scaleY = pageMetrics.viewportHeight / sourceHeight;
    const left = x1 * scaleX;
    const top = y1 * scaleY;
    const width = (x2 - x1) * scaleX;
    const height = (y2 - y1) * scaleY;

    return (
      <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
        <div
          style={{
            position: 'absolute',
            left: `${left}px`,
            top: `${top}px`,
            width: `${width}px`,
            height: `${height}px`,
            background: isDark ? 'rgba(142, 132, 184, 0.2)' : 'rgba(255, 255, 0, 0.25)',
            boxShadow: isDark ? '0 0 10px rgba(142, 132, 184, 0.5)' : '0 0 0 2px rgba(245, 158, 11, 0.45)',
            border: isDark ? '1.5px solid #8E84B8' : 'none',
            borderRadius: '4px',
            transition: 'all 220ms ease',
          }}
        />
      </div>
    );
  } catch (error) {
    console.error('[ERROR][PDF] Highlight rendering error', error);
    return null;
  }
};

export default HighlightOverlay;
