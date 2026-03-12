/**
 * Normalizes Sarvam OCR JSON bounds into distinct renderable blocks 
 * specifically tailored for top-down digital A4 reconstruction.
 */
export const parseLayoutBlocks = (ocrMetadataPages) => {
  const normalizedBlocks = [];

  ocrMetadataPages.forEach((page, pageIndex) => {
    if (!page || !page.blocks) return;
    
    // Sort blocks essentially top-to-bottom within the page
    const sortedBlocks = [...page.blocks].sort((a, b) => {
      const aY = a.coordinates ? Math.min(a.coordinates[1], a.coordinates[3]) : 0;
      const bY = b.coordinates ? Math.min(b.coordinates[1], b.coordinates[3]) : 0;
      return aY - bY;
    });

    sortedBlocks.forEach((block) => {
      if (!block.text) return;

      const rawType = (block.block_type || block.type || block.label || 'paragraph').toLowerCase();
      let normalizedType = 'paragraph';

      if (rawType.includes('heading') || rawType.includes('title')) normalizedType = 'heading';
      else if (rawType.includes('list')) normalizedType = 'list';
      else if (rawType.includes('table')) normalizedType = 'table';
      
      // Heuristic fallback: Sarvam sometimes labels raw HTML tables as 'paragraph' instead of 'table'
      if (normalizedType !== 'table' && block.text.trim().toLowerCase().startsWith('<table')) {
        normalizedType = 'table';
      }

      normalizedBlocks.push({
        type: normalizedType,
        text: block.text.trim(),
        originalPage: page.page_num || pageIndex + 1,
        // Carry block confidence/bounds for future advanced layout
        bounds: block.coordinates || null 
      });
    });
  });

  console.log(`[LAYOUT PARSER] Parsed ${normalizedBlocks.length} total blocks.`);
  const stats = normalizedBlocks.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + 1;
    return acc;
  }, {});
  console.log(`[LAYOUT PARSER] Breakdown:`, stats);

  return normalizedBlocks;
};
