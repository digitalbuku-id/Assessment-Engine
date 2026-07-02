import { analyzeScores } from './score-analyzer.js';

/**
 * Generates narrative insights from assessment data.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} { summary: string, details: string[], recommendations: string[] }
 */
export function generateInsights(data) {
  const analysis = analyzeScores(data);
  const insights = [];
  const recommendations = [];
  
  // Overall performance insight
  if (analysis.category === 'Excellent') {
    insights.push(
      `Berdasarkan hasil asesmen, overall competency score berada pada kategori **Excellent** dengan skor ${analysis.overallScore}. ` +
      `Peserta menunjukkan performa yang sangat baik dan konsisten di seluruh kompetensi yang dinilai.`
    );
    
    recommendations.push(
      'Pertahankan standar tinggi melalui continuous learning dan development',
      'Jadilah mentor atau role model bagi rekan kerja lainnya',
      'Pertimbangkan untuk mengambil tantangan yang lebih kompleks dan strategis'
    );
  } else if (analysis.category === 'Good') {
    insights.push(
      `Overall competency score berada pada kategori **Good** dengan skor ${analysis.overallScore}. ` +
      `Peserta menunjukkan kompetensi yang solid dengan ruang untuk peningkatan di beberapa area.`
    );
    
    recommendations.push(
      'Identifikasi area yang perlu ditingkatkan melalui self-assessment',
      'Ikuti training atau coaching untuk kompetensi yang masih di bawah target',
      'Tetapkan development plan yang terukur untuk 6-12 bulan ke depan'
    );
  } else if (analysis.category === 'Satisfactory') {
    insights.push(
      `Overall competency score berada pada kategori **Satisfactory** dengan skor ${analysis.overallScore}. ` +
      `Terdapat beberapa area yang memerlukan perhatian dan pengembangan lebih lanjut.`
    );
    
    recommendations.push(
      'Prioritaskan pengembangan kompetensi yang paling kritis untuk peran saat ini',
      'Cari mentor atau coach untuk percepatan development',
      'Ikuti training fundamental untuk memperkuat dasar kompetensi'
    );
  } else {
    insights.push(
      `Overall competency score berada pada kategori **Needs Improvement** dengan skor ${analysis.overallScore}. ` +
      `Diperlukan action plan yang intensif untuk peningkatan kompetensi.`
    );
    
    recommendations.push(
      'Segera buat development plan dengan target yang jelas dan terukur',
      'Ikuti program training intensif untuk kompetensi dasar',
      'Lakukan one-on-one coaching secara rutin dengan atasan atau mentor'
    );
  }
  
  // Top competency strength
  if (analysis.topCompetency && analysis.topScore >= 85) {
    insights.push(
      `Kekuatan utama peserta adalah pada **${analysis.topCompetency}** dengan skor ${analysis.topScore}. ` +
      `Kompetensi ini dapat dijadikan competitive advantage dalam peran saat ini.`
    );
  }
  
  // Improvement area
  if (analysis.lowestCompetency && analysis.lowestScore < 70 && analysis.lowestScore > 0) {
    insights.push(
      `Area yang memerlukan perhatian adalah **${analysis.lowestCompetency}** dengan skor ${analysis.lowestScore}. ` +
      `Perlu ada fokus development pada area ini.`
    );
    
    recommendations.push(
      `Tingkatkan kompetensi ${analysis.lowestCompetency} melalui training dan praktik konsisten`
    );
  }
  
  return {
    summary: insights.join(' '),
    details: insights,
    recommendations: recommendations.slice(0, 5)
  };
}

export default { generateInsights };