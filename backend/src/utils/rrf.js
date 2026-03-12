/**
 * Reciprocal Rank Fusion (RRF)
 * 
 * Merges multiple ranked arrays (e.g., Vector hits + Keyword hits) into a single 
 * normalized ranked list to drastically improve Hybrid Search accuracy.
 */

export const reciprocalRankFusion = (rankedLists, k = 60) => {
  const rrfScores = new Map();

  // Iterate over each algorithm's result list
  rankedLists.forEach((list) => {
    // Iterate over the hits in that list
    list.forEach((item, index) => {
      // The unique identifier for the result chunk
      const itemId = item.id;
      
      // RRF Score = 1 / (k + rank)
      const rank = index + 1; // 1-indexed
      const score = 1 / (k + rank);

      // Add to existing score or initialize
      if (rrfScores.has(itemId)) {
        const existing = rrfScores.get(itemId);
        existing.rrfScore += score;
      } else {
        rrfScores.set(itemId, {
          ...item,
          rrfScore: score
        });
      }
    });
  });

  // Convert the map back to an array
  const fusedResults = Array.from(rrfScores.values());

  // Sort by highest RRF score descending
  fusedResults.sort((a, b) => b.rrfScore - a.rrfScore);

  return fusedResults;
};
