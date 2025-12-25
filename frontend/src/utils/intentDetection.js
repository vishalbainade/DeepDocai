/**
 * Intent Detection Utility
 * Detects user query intent for table-aware retrieval and response formatting
 */

/**
 * Detect query intent from user question
 * @param {string} question - User's question
 * @returns {string|null} - 'table', 'summary', or null for auto-detect
 */
export const detectQueryIntent = (question) => {
  if (!question || typeof question !== 'string') {
    return null;
  }

  const lowerQuestion = question.toLowerCase().trim();

  // Check for explicit table format requests
  const tableKeywords = [
    'tabular format',
    'table format',
    'in table',
    'as table',
    'in tabular',
    'show in table',
    'display in table',
    'present in table',
    'create a table',
    'make a table',
    'generate a table',
    'format as table',
    'output as table',
    'table of',
    'timeline',
    'events timeline',
    'facts table',
    'summary table',
    'comparison table',
    'list in table',
  ];

  for (const keyword of tableKeywords) {
    if (lowerQuestion.includes(keyword)) {
      console.log(`📊 Intent detected: TABLE (keyword: "${keyword}")`);
      return 'table';
    }
  }

  // Check for summary/overview requests (but not table format)
  const summaryKeywords = [
    'summarize',
    'summary',
    'summarise',
    'overview',
    'key points',
    'important points',
    'main points',
    'highlights',
    'brief',
    'tldr',
    'tl;dr',
  ];

  for (const keyword of summaryKeywords) {
    if (lowerQuestion.includes(keyword)) {
      // Don't override if table format was also requested
      if (!tableKeywords.some(tk => lowerQuestion.includes(tk))) {
        console.log(`📝 Intent detected: SUMMARY (keyword: "${keyword}")`);
        return 'summary';
      }
    }
  }

  // Auto-detect based on query structure
  // Short queries with formatting words might be table requests
  if (lowerQuestion.includes('tabular') || lowerQuestion.includes('structured')) {
    console.log(`📊 Intent detected: TABLE (contains formatting word)`);
    return 'table';
  }

  console.log(`🔍 Intent: AUTO-DETECT (no specific intent keywords found)`);
  return null;
};

/**
 * Determine if a response should be formatted as a table
 * @param {string} question - User's question
 * @param {string} response - AI response
 * @returns {boolean}
 */
export const shouldFormatAsTable = (question, response) => {
  const intent = detectQueryIntent(question);
  
  if (intent === 'table') {
    return true;
  }

  // Check if response contains table-like data
  if (response && typeof response === 'string') {
    const lines = response.split('\n');
    
    // Check for markdown table format
    if (lines.some(line => line.includes('|') && line.includes('---'))) {
      return true;
    }

    // Check for consistent structure that could be a table
    const structuredLines = lines.filter(line => 
      line.includes('\t') || 
      (line.match(/\|/g) || []).length >= 2 ||
      /^\s*-\s+\S+:\s+\S+/.test(line)
    );

    if (structuredLines.length >= 3) {
      return true;
    }
  }

  return false;
};

/**
 * Extract suggested column names based on query type
 * @param {string} question - User's question
 * @returns {string[]}
 */
export const getSuggestedColumns = (question) => {
  if (!question) {
    return ['Key Point', 'Description'];
  }

  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('timeline') || lowerQuestion.includes('events')) {
    return ['Date', 'Event', 'Description'];
  }

  if (lowerQuestion.includes('comparison') || lowerQuestion.includes('compare')) {
    return ['Aspect', 'Item 1', 'Item 2'];
  }

  if (lowerQuestion.includes('facts')) {
    return ['Fact', 'Source/Reference'];
  }

  if (lowerQuestion.includes('pros') && lowerQuestion.includes('cons')) {
    return ['Category', 'Pros', 'Cons'];
  }

  if (lowerQuestion.includes('summary') || lowerQuestion.includes('overview')) {
    return ['Topic', 'Summary'];
  }

  if (lowerQuestion.includes('key point') || lowerQuestion.includes('important')) {
    return ['Key Point', 'Details'];
  }

  return ['Key Point', 'Description'];
};

export default detectQueryIntent;
