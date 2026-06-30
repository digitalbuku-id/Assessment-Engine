// components/score-engine.js
/**
 * Calculate scores from assessment data.
 * Currently stub: returns the scores as-is, but can add aggregation logic.
 */
export function calculateScores(validatedData) {
  // If scores already exist, return them
  if (validatedData.scores) {
    return validatedData.scores;
  }
  // Otherwise, compute from raw data (placeholder)
  const scores = {};
  const participants = validatedData.participants || [];
  const competencies = validatedData.competencies || [];
  participants.forEach(p => {
    scores[p.id] = {};
    competencies.forEach(c => {
      scores[p.id][c.id] = Math.floor(Math.random() * 100); // dummy
    });
  });
  return scores;
}