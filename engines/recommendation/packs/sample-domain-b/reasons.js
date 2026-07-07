/**
 * [TEST PACK — bukan untuk produksi]
 *
 * Sample Domain B — Reason Template Catalog
 *
 * Semua template menggunakan wording generik eksplisit bertanda [TEST PACK].
 *
 * @purpose ARCHITECTURE VALIDATION ONLY
 */
module.exports = {
  strengths: {
    dimension_alpha:
      '[TEST PACK] Skor {score} pada dimension_alpha menunjukkan performa di atas threshold. (Ini teks uji — bukan rekomendasi produksi.)',
    dimension_beta:
      '[TEST PACK] Skor {score} pada dimension_beta menunjukkan performa di atas threshold. (Ini teks uji — bukan rekomendasi produksi.)',
    dimension_gamma:
      '[TEST PACK] Skor {score} pada dimension_gamma menunjukkan performa di atas threshold. (Ini teks uji — bukan rekomendasi produksi.)',
  },
  weaknesses: {
    dimension_alpha:
      '[TEST PACK] Skor {score} pada dimension_alpha berada di bawah threshold. (Ini teks uji — bukan rekomendasi produksi.)',
    dimension_beta:
      '[TEST PACK] Skor {score} pada dimension_beta berada di bawah threshold. (Ini teks uji — bukan rekomendasi produksi.)',
    dimension_gamma:
      '[TEST PACK] Skor {score} pada dimension_gamma berada di bawah threshold. (Ini teks uji — bukan rekomendasi produksi.)',
  },
};
