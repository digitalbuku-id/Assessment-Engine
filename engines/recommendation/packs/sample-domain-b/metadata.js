/**
 * [TEST PACK — bukan untuk produksi]
 *
 * Sample Domain B — Metadata
 *
 * Pack ini dibuat untuk validasi arsitektur multi-pack (SPEC-002, Sprint 3C).
 * Nama domain, dimensi, dan semua isi sengaja generik/fiktif agar tidak
 * tertukar dengan domain assessment nyata.
 *
 * @pack_id  sample-domain-b
 * @version  1.0.0
 * @purpose  ARCHITECTURE VALIDATION ONLY
 */
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: 'sample-domain-b',
  display_name: '[TEST] Sample Domain B — Architecture Validation',
  version: '1.0.0',
  dimensions: [
    'dimension_alpha',
    'dimension_beta',
    'dimension_gamma',
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: '[TEST PACK] Dibuat untuk memvalidasi bahwa loader/resolver/registry SPEC-002 bekerja untuk >1 pack tanpa konflik. BUKAN domain assessment nyata.',
  rubric_version: 'N/A (test only)',
  locale: 'id',

  // ── DISPLAY ───────────────────────────────────────────
  labels: {
    dimension_alpha: '[TEST] Dimension Alpha',
    dimension_beta: '[TEST] Dimension Beta',
    dimension_gamma: '[TEST] Dimension Gamma',
  },
};
