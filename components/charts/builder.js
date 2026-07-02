/**
 * Transforms assessment data into Chart.js datasets.
 * This module only handles data transformation, no HTML generation.
 */

/**
 * Build chart datasets from assessment data.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object|null} Chart datasets or null if no data
 */
export function buildChartData(data) {
  const { participants = [], competencies = [], scores = {} } = data;
  
  if (competencies.length === 0 || participants.length === 0) {
    return null;
  }
  
  const labels = competencies.map(c => c.name);
  
  // Build radar datasets (one per participant)
  const radarDatasets = participants.map((p, idx) => {
    const chartData = competencies.map(c => 
      scores[p.participantId]?.[c.competencyId] ?? 0
    );
    
    const colors = [
      { bg: 'rgba(13, 110, 253, 0.2)', border: 'rgba(13, 110, 253, 1)' },
      { bg: 'rgba(25, 135, 84, 0.2)', border: 'rgba(25, 135, 84, 1)' },
      { bg: 'rgba(255, 193, 7, 0.2)', border: 'rgba(255, 193, 7, 1)' }
    ];
    
    const color = colors[idx % colors.length];
    
    return {
      label: p.name,
      data: chartData,
      backgroundColor: color.bg,
      borderColor: color.border,
      borderWidth: 2,
      pointBackgroundColor: color.border,
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: color.border
    };
  });
  
  // Build bar datasets (average scores per competency)
  const barData = competencies.map(c => {
    let total = 0;
    let count = 0;
    participants.forEach(p => {
      const score = scores[p.participantId]?.[c.competencyId];
      if (score !== undefined) {
        total += score;
        count++;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  });
  
  // Color bars based on score
  const barColors = barData.map(score => {
    if (score >= 85) return 'rgba(25, 135, 84, 0.8)';
    if (score >= 70) return 'rgba(13, 202, 240, 0.8)';
    if (score >= 50) return 'rgba(255, 193, 7, 0.8)';
    return 'rgba(220, 53, 69, 0.8)';
  });
  
  const barDatasets = [{
    label: 'Average Score',
    data: barData,
    backgroundColor: barColors,
    borderColor: barColors.map(c => c.replace('0.8', '1')),
    borderWidth: 1
  }];
  
  return {
    radar: {
      labels,
      datasets: radarDatasets
    },
    bar: {
      labels,
      datasets: barDatasets
    }
  };
}

export default { buildChartData };