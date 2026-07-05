/**
 * Threshold Map — per tipe assessment.
 * Externalized agar bisa di-tuning tanpa deploy ulang.
 */
module.exports = {
  leadership: {
    strength_threshold: 80, // ≥ 80 → strength
    weakness_threshold: 55, // ≤ 55 → weakness
                             // 56–79 → neutral (tidak muncul)
    dimensions: [
      'communication',
      'decisiveness',
      'strategic_thinking',
      'people_development',
      'execution',
    ],
    labels: {
      communication: 'Communication',
      decisiveness: 'Decisiveness',
      strategic_thinking: 'Strategic Thinking',
      people_development: 'People Development',
      execution: 'Execution',
    },
  },
};
