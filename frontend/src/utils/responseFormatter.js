export const formatAIResponse = (rawText) => {
  if (!rawText) return { sections: [], sources: [] };

  const sections = [];
  const globalSources = new Set();
  
  // Clean up any weird token behaviors and split broadly by double linebreaks OR markdown headings
  const rawSections = rawText
    .replace(/^#+\s+/gm, '\n\n**') // Normalize "# Heading" to "**Heading" to catch it easily
    .split(/\n{2,}/);

  let currentTitle = '📄 Overview';
  let currentPoints = [];
  let currentCitations = new Set();

  const pushSection = () => {
    if (currentPoints.length > 0 || currentTitle !== '📄 Overview') {
      
      // Auto-emoji rules for standard text if not present
      let cleanTitle = currentTitle.replace(/\*\*/g, '').replace(/#/g, '').trim();
      const lowerTitle = cleanTitle.toLowerCase();
      
      const hasEmoji = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/.test(cleanTitle);

      if (!hasEmoji && cleanTitle) {
        if (lowerTitle.includes('overview') || lowerTitle.includes('summary')) cleanTitle = `📄 ${cleanTitle}`;
        else if (lowerTitle.includes('key point') || lowerTitle.includes('detail')) cleanTitle = `🔍 ${cleanTitle}`;
        else if (lowerTitle.includes('tech') || lowerTitle.includes('system')) cleanTitle = `⚙️ ${cleanTitle}`;
        else if (lowerTitle.includes('conclusion')) cleanTitle = `✅ ${cleanTitle}`;
        else cleanTitle = `🔸 ${cleanTitle}`;
      }

      sections.push({
        title: cleanTitle,
        points: [...currentPoints],
        citations: Array.from(currentCitations)
      });
    }
  };

  rawSections.forEach((block) => {
    let text = block.trim();
    if (!text) return;

    // Detect if this block is a header (like **Heading**)
    const isHeaderLine = text.startsWith('**') && !text.includes('\n');
    
    // Stop parsing if it reaches the hardcoded "Sources:" footer, which we handle natively anyway
    if (text.toLowerCase().includes('📚 sources:')) {
      return; 
    }

    if (isHeaderLine || (text.length < 50 && !text.includes('.') && !text.includes('[Pg.'))) {
      // Push old section and start new
      pushSection();
      currentTitle = text.replace(/\*\*/g, '').trim();
      currentPoints = [];
      currentCitations = new Set();
    } else {
      // Extract points
      const lines = text.split('\n');
      lines.forEach((line) => {
        let cleanLine = line.trim().replace(/^[-*•]/, '').trim(); // Remove raw markdown bullets
        if (!cleanLine) return;

        // Find citations in line
        const matches = cleanLine.match(/\[Pg\.\s*(\d+)\]/g);
        if (matches) {
           matches.forEach(m => {
             const pg = parseInt(m.match(/\d+/)[0], 10);
             currentCitations.add(pg);
             globalSources.add(pg);
           });
        }
        currentPoints.push(cleanLine);
      });
    }
  });

  pushSection(); // Finish last section

  return {
    sections,
    sources: Array.from(globalSources).sort((a,b) => a - b)
  };
};
