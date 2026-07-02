/**
 * Analyzes assessment scores and extracts key metrics.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} Analysis results
 */
export function analyzeScores(data) {
  const { participants = [], competencies = [], scores = {} } = data;
  
  let totalScore = 0;
  let scoreCount = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let topCompetency = null;
  let lowestCompetency = null;
  let topScore = -Infinity;
  let lowestScore = Infinity;
  
  competencies.forEach(comp => {
    let compTotal = 0;
    let compCount = 0;
    
    participants.forEach(participant => {
      const score = scores[participant.participantId]?.[comp.competencyId] ?? 0;
      compTotal += score;
      compCount++;
      totalScore += score;
      scoreCount++;
      
      if (score < minScore) {
        minScore = score;
        lowestCompetency = comp.name;
        lowestScore = score;
      }
      if (score > maxScore) {
        maxScore = score;
        topCompetency = comp.name;
        topScore = score;
      }
    });
  });
  
  const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  
  let category = 'Needs Improvement';
  let categoryClass = 'danger';
  
  if (overallScore >= 85) {
    category = 'Excellent';
    categoryClass = 'success';
  } else if (overallScore >= 70) {
    category = 'Good';
    categoryClass = 'info';
  } else if (overallScore >= 50) {
    category = 'Satisfactory';
    categoryClass = 'warning';
  }
  
  return {
    overallScore,
    category,
    categoryClass,
    minScore: minScore === Infinity ? 0 : minScore,
    maxScore: maxScore === -Infinity ? 0 : maxScore,
    topCompetency,
    topScore,
    lowestCompetency,
    lowestScore,
    participantCount: participants.length,
    competencyCount: competencies.length
  };
}

export default { analyzeScores };