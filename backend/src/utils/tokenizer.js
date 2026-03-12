/**
 * Simplified heuristic Tokenizer
 * 
 * Accurately estimates tokens rather than simple character limits.
 * In a production AI app, this mimics roughly 1 token = ~4 chars (English),
 * but handles edge cases tightly to prevent exceeding context windows.
 */

export const estimateTokens = (text) => {
  if (!text) return 0;
  // A standard heuristic: words + punctuation.
  // 1 token ~= 4 chars or 0.75 words.
  const wordCount = text.split(/[\s\P{P}]+/).length;
  // Fallback to character div 4
  const charTokens = Math.ceil(text.length / 4);
  
  // Return the higher bound to be safe and avoid hitting model limits
  return Math.max(Math.ceil(wordCount * 1.3), charTokens);
};

/**
 * Truncates text safely to a strict token limit without breaking mid-word.
 */
export const truncateToTokenLimit = (text, maxTokens = 400) => {
  if (!text) return '';
  
  let currentTokens = 0;
  const words = text.split(/(\s+)/); // Preserve whitespace when splitting
  let result = '';

  for (const word of words) {
    const wordTokens = estimateTokens(word);
    if (currentTokens + wordTokens > maxTokens) {
      break;
    }
    result += word;
    currentTokens += wordTokens;
  }
  
  return result.trim();
};
