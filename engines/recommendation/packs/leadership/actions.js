/**
 * Leadership Domain Pack — Action Library
 *
 * Bersumber dari RD-001 (approved 2026-07-09). Setiap wording dapat
 * ditelusuri ke RD-001 — lihat TM-001 untuk mapping lengkap.
 *
 * Aligned to Canonical Domain Model (ADR-003): 4 dimensi.
 *
 * NBA (next_best_action) selalu memilih dimensi dengan skor terendah,
 * sehingga semua action menggunakan Recommendation Intent (Low) dari RD-001.
 *
 * @source   RD-001 (Rubric Definition — Leadership Assessment)
 * @mapping  TM-001 (Language Mapping)
 */
module.exports = {
  motivation: {
    action:
      'Membantu peserta membangun strategi dan kepercayaan diri untuk memotivasi tim secara lebih konsisten.',
    rationale:
      'Motivation adalah dimensi dengan skor terendah ({score}).',
  },
  decision_making: {
    action:
      'Membantu peserta membangun kepercayaan diri dan kerangka berpikir untuk mempercepat pengambilan keputusan pada situasi yang menekan.',
    rationale:
      'Decision Making adalah dimensi dengan skor terendah ({score}).',
  },
  delegation: {
    action:
      'Membantu peserta membangun kepercayaan dan kerangka kerja untuk mendistribusikan tugas secara lebih efektif kepada tim.',
    rationale:
      'Delegation adalah dimensi dengan skor terendah ({score}).',
  },
  feedback: {
    action:
      'Membantu peserta membangun keyakinan dan kerangka praktis untuk menyampaikan feedback yang konstruktif secara lebih konsisten dalam mendukung perkembangan anggota tim.',
    rationale:
      'Feedback adalah dimensi dengan skor terendah ({score}).',
  },
};
