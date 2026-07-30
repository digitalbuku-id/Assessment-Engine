module.exports = {
  pack_id: 'disc_dual_profile',
  version: '1.0.0',
  name: 'DISC Dual Profile Assessment',
  description: 'Profil kepribadian berbasis 4 dimensi DISC dengan pemisahan skor Most dan Least.',
  // KUNCI: Mengaktifkan mode kondisional di loader.js
  scoring_strategy: 'disc_dual_profile',
  graph_strategy: 'disc_profile',
  interpretation_strategy: 'disc_profile',
  // Dimensi persis sesuai RD-DISC-001 (Conscientiousness, BUKAN Compliance)
  dimensions: ['dominance', 'influence', 'steadiness', 'conscientiousness'],
  labels: {
    dominance: 'Dominance (D)',
    influence: 'Influence (I)',
    steadiness: 'Steadiness (S)',
    conscientiousness: 'Conscientiousness (C)'
  }
};
