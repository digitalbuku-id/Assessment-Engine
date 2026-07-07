/**
 * [TEST PACK — bukan untuk produksi]
 *
 * Sample Domain B — Action Library
 *
 * Semua action menggunakan wording generik eksplisit bertanda [TEST PACK].
 *
 * @purpose ARCHITECTURE VALIDATION ONLY
 */
module.exports = {
  dimension_alpha: {
    action:
      '[TEST PACK] Lakukan tindakan perbaikan untuk dimension_alpha. (Ini aksi uji — bukan rekomendasi produksi.)',
    rationale:
      '[TEST PACK] dimension_alpha adalah dimensi terendah ({score}). (Ini rationale uji — bukan rekomendasi produksi.)',
  },
  dimension_beta: {
    action:
      '[TEST PACK] Lakukan tindakan perbaikan untuk dimension_beta. (Ini aksi uji — bukan rekomendasi produksi.)',
    rationale:
      '[TEST PACK] dimension_beta adalah dimensi terendah ({score}). (Ini rationale uji — bukan rekomendasi produksi.)',
  },
  dimension_gamma: {
    action:
      '[TEST PACK] Lakukan tindakan perbaikan untuk dimension_gamma. (Ini aksi uji — bukan rekomendasi produksi.)',
    rationale:
      '[TEST PACK] dimension_gamma adalah dimensi terendah ({score}). (Ini rationale uji — bukan rekomendasi produksi.)',
  },
};
