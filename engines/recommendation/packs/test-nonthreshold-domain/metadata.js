module.exports = {
  pack_id: 'test-nonthreshold-domain',
  display_name: 'Test Non-Threshold Domain',
  version: '1.0.0',
  dimensions: ['dimension_x', 'dimension_y'],
  labels: { dimension_x: 'Dimension X', dimension_y: 'Dimension Y' },
  scoring_strategy: 'disc_dual_profile',
  graph_strategy: 'disc_profile',
  interpretation_strategy: 'disc_profile',
};
