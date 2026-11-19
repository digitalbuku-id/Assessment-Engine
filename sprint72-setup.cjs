const fs = require('fs');
const path = require('path');

// Create directory structure
const dirs = [
  'components/insight',
  'components/insight/templates',
  'components/insight/rules'
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created: ${dir}`);
  }
});

// 1. score-analyzer.js
fs.writeFileSync('components/insight/score-analyzer.js', `/**
 * Analyzes assessment scores and extracts key metrics.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} Analysis results
 */
export function analyzeScores(data) {
  const { participants = [], competencies = [], scores = {} } = data;
  
  // Calculate overall statistics
  let totalScore = 0;
  let scoreCount = 0;
  let minScore = Infinity;
  let maxScore = -Infinity;
  let topCompetency = null;
  let lowestCompetency = null;
  let topScore = -Infinity;
  let lowestScore = Infinity;
  
  const competencyAverages = {};
  
  // Analyze each competency
  competencies.forEach(comp => {
    let compTotal = 0;
    let compCount = 0;
    
    participants.forEach(participant => {
      const score = scores[participant.participantId]?.[comp.competencyId] ?? 0;
      compTotal += score;
      compCount++;
      totalScore += score;
      scoreCount++;
      
      // Track min/max
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
    
    competencyAverages[comp.competencyId] = {
      name: comp.name,
      average: compCount > 0 ? Math.round(compTotal / compCount) : 0
    };
  });
  
  const overallScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  
  // Determine category
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
  
  // Calculate data completeness
  const expectedDataPoints = participants.length * competencies.length;
  const actualDataPoints = scoreCount;
  const dataCompleteness = expectedDataPoints > 0 
    ? Math.round((actualDataPoints / expectedDataPoints) * 100) 
    : 0;
  
  // Determine confidence level
  let confidence = 'Low';
  if (dataCompleteness >= 95) confidence = 'High';
  else if (dataCompleteness >= 80) confidence = 'Medium';
  
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
    competencyAverages,
    dataCompleteness,
    confidence,
    participantCount: participants.length,
    competencyCount: competencies.length
  };
}

export default { analyzeScores };
`, 'utf8');

// 2. rule-engine.js
fs.writeFileSync('components/insight/rule-engine.js', `/**
 * Rule-based engine for generating insights and recommendations.
 * Rules are defined separately from logic for easy maintenance.
 */

// Rule definitions
const rules = [
  {
    id: 'excellent_overall',
    condition: (analysis) => analysis.category === 'Excellent',
    insight: (analysis) => 
      \`Berdasarkan hasil asesmen, overall competency score berada pada kategori **Excellent** dengan skor \${analysis.overallScore}. Peserta menunjukkan performa yang sangat baik dan konsisten di seluruh kompetensi yang dinilai.\`,
    recommendations: [
      'Pertahankan standar tinggi melalui continuous learning dan development',
      'Jadilah mentor atau role model bagi rekan kerja lainnya',
      'Pertimbangkan untuk mengambil tantangan yang lebih kompleks dan strategis'
    ]
  },
  {
    id: 'good_overall',
    condition: (analysis) => analysis.category === 'Good',
    insight: (analysis) => 
      \`Overall competency score berada pada kategori **Good** dengan skor \${analysis.overallScore}. Peserta menunjukkan kompetensi yang solid dengan ruang untuk peningkatan di beberapa area.\`,
    recommendations: [
      'Identifikasi area yang perlu ditingkatkan melalui self-assessment',
      'Ikuti training atau coaching untuk kompetensi yang masih di bawah target',
      'Tetapkan development plan yang terukur untuk 6-12 bulan ke depan'
    ]
  },
  {
    id: 'satisfactory_overall',
    condition: (analysis) => analysis.category === 'Satisfactory',
    insight: (analysis) => 
      \`Overall competency score berada pada kategori **Satisfactory** dengan skor \${analysis.overallScore}. Terdapat beberapa area yang memerlukan perhatian dan pengembangan lebih lanjut.\`,
    recommendations: [
      'Prioritaskan pengembangan kompetensi yang paling kritis untuk peran saat ini',
      'Cari mentor atau coach untuk percepatan development',
      'Ikuti training fundamental untuk memperkuat dasar kompetensi'
    ]
  },
  {
    id: 'needs_improvement',
    condition: (analysis) => analysis.category === 'Needs Improvement',
    insight: (analysis) => 
      \`Overall competency score berada pada kategori **Needs Improvement** dengan skor \${analysis.overallScore}. Diperlukan action plan yang intensif untuk peningkatan kompetensi.\`,
    recommendations: [
      'Segera buat development plan dengan target yang jelas dan terukur',
      'Ikuti program training intensif untuk kompetensi dasar',
      'Lakukan one-on-one coaching secara rutin dengan atasan atau mentor',
      'Evaluasi kesesuaian peran dengan kompetensi yang dimiliki'
    ]
  },
  {
    id: 'top_competency_strength',
    condition: (analysis) => analysis.topScore >= 85,
    insight: (analysis) => 
      analysis.topCompetency ? 
        \`Kekuatan utama peserta adalah pada **\${analysis.topCompetency}** dengan skor \${analysis.topScore}. Kompetensi ini dapat dijadikan competitive advantage dalam peran saat ini.\` : '',
    recommendations: [
      'Leverage kekuatan ini untuk memberikan impact yang lebih besar',
      'Bagikan best practices dengan tim atau rekan kerja',
      'Kembangkan keahlian ini ke level expert melalui advanced training'
    ]
  },
  {
    id: 'improvement_area',
    condition: (analysis) => analysis.lowestScore < 70 && analysis.lowestScore > 0,
    insight: (analysis) => 
      analysis.lowestCompetency ? 
        `Area yang memerlukan perhatian adalah **\${analysis.lowestCompetency}** dengan skor \${analysis.lowestScore}. Perlu ada fokus development pada area ini.` : '',
    recommendations: [
      'Identifikasi root cause dari gap kompetensi ini',
      'Cari learning resources yang sesuai (training, reading, mentoring)',
      'Praktikkan secara konsisten dalam pekerjaan sehari-hari'
    ]
  },
  {
    id: 'high_data_completeness',
    condition: (analysis) => analysis.dataCompleteness >= 95,
    insight: () => 
      'Data asesmen sangat lengkap dengan tingkat kelengkapan \${analysis.dataCompleteness}%, sehingga hasil analisis memiliki tingkat kepercayaan tinggi.',
    recommendations: []
  },
  {
    id: 'low_data_completeness',
    condition: (analysis) => analysis.dataCompleteness < 95,
    insight: (analysis) => 
      'Tingkat kelengkapan data adalah \${analysis.dataCompleteness}%. Disarankan untuk melengkapi data agar hasil analisis lebih akurat.',
    recommendations: [
      'Lengkapi data assessment yang masih missing',
      'Pastikan semua kompetensi telah dinilai'
    ]
  }
];

/**
 * Evaluate rules against analysis and generate insights/recommendations.
 * @param {Object} analysis - Score analysis results
 * @returns {Object} { insights: string[], recommendations: string[] }
 */
export function evaluateRules(analysis) {
  const insights = [];
  const recommendations = new Set(); // Use Set to avoid duplicates
  
  rules.forEach(rule => {
    if (rule.condition(analysis)) {
      const insight = rule.insight(analysis);
      if (insight) {
        insights.push(insight);
      }
      
      rule.recommendations.forEach(rec => recommendations.add(rec));
    }
  });
  
  return {
    insights,
    recommendations: Array.from(recommendations).slice(0, 5) // Max 5 recommendations
  };
}

export default { evaluateRules, rules };
`, 'utf8');

// 3. insight-generator.js
fs.writeFileSync('components/insight/insight-generator.js', `import { analyzeScores } from './score-analyzer.js';
import { evaluateRules } from './rule-engine.js';

/**
 * Generates narrative insights from assessment data.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} { summary: string, details: string[] }
 */
export function generateInsights(data) {
  // Analyze scores
  const analysis = analyzeScores(data);
  
  // Evaluate rules
  const { insights, recommendations } = evaluateRules(analysis);
  
  // Create summary
  const summary = insights.length > 0 
    ? insights.join(' ')
    : \`Assessment menunjukkan overall score \${analysis.overallScore} (\${analysis.category}).\`;
  
  return {
    summary,
    details: insights,
    recommendations,
    analysis
  };
}

export default { generateInsights };
`, 'utf8');

// 4. recommendation-generator.js
fs.writeFileSync('components/insight/recommendation-generator.js', `import { analyzeScores } from './score-analyzer.js';
import { evaluateRules } from './rule-engine.js';

/**
 * Generates contextual recommendations from assessment data.
 * @param {Object} data - Preprocessed assessment data
 * @returns {Object} { immediate: string[], development: string[], longterm: string[] }
 */
export function generateRecommendations(data) {
  const analysis = analyzeScores(data);
  const { recommendations } = evaluateRules(analysis);
  
  // Categorize recommendations
  const immediate = [];
  const development = [];
  const longterm = [];
  
  recommendations.forEach((rec, index) => {
    if (index === 0) immediate.push(rec);
    else if (index <= 3) development.push(rec);
    else longterm.push(rec);
  });
  
  // Add default recommendations if empty
  if (immediate.length === 0) {
    immediate.push('Review hasil assessment dengan atasan atau HR');
  }
  
  if (development.length === 0) {
    development.push('Ikuti training yang relevan dengan kompetensi yang perlu ditingkatkan');
  }
  
  return {
    immediate,
    development,
    longterm,
    all: recommendations
  };
}

export default { generateRecommendations };
`, 'utf8');

// 5. index.js (orchestrator)
fs.writeFileSync('components/insight/index.js', `import { generateInsights } from './insight-generator.js';
import { generateRecommendations } from './recommendation-generator.js';
import { analyzeScores } from './score-analyzer.js';

export {
  generateInsights,
  generateRecommendations,
  analyzeScores
};

export default {
  generateInsights,
  generateRecommendations,
  analyzeScores
};
`, 'utf8');

// 6. Update template-engine/index.js to use insight engine
const templateEngineContent = `import { renderHeader } from './header.js';
import { renderExecutiveSummary } from './executive-summary.js';
import { renderCompetencyTable } from './competency-table.js';
import { renderInsightSection } from './insight-section.js';
import { renderRecommendationSection } from './recommendation-section.js';
import { renderFooter } from './footer.js';
import { generateInsights, generateRecommendations } from '../insight/index.js';

/**
 * Render complete assessment report using modular components.
 * @param {Object} context - Preprocessed assessment data
 * @returns {string} Complete HTML document
 */
export function renderTemplate(context) {
  // Generate insights and recommendations
  const insights = generateInsights(context);
  const recommendations = generateRecommendations(context);
  
  // Merge generated insights with context
  const enrichedContext = {
    ...context,
    insights: {
      summary: insights.summary,
      details: insights.details
    },
    recommendations: recommendations.all
  };
  
  return \`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>\${enrichedContext.title || 'Assessment Report'}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .card { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .score-display { font-size: 3rem; font-weight: bold; }
    @media print {
      .no-print { display: none; }
      body { font-size: 12pt; }
    }
  </style>
</head>
<body>
  \${renderHeader(enrichedContext)}
  
  <main class="container">
    \${renderExecutiveSummary(enrichedContext)}
    \${renderCompetencyTable(enrichedContext)}
    \${renderInsightSection(enrichedContext)}
    \${renderRecommendationSection(enrichedContext)}
  </main>
  
  \${renderFooter()}
  
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>\`;
}

export default { renderTemplate };
`;

fs.writeFileSync('components/template-engine/index.js', templateEngineContent, 'utf8');

console.log('\\n✅ Sprint 7.2 Complete!');
console.log('📁 components/insight/');
console.log('   ├── score-analyzer.js');
console.log('   ├── rule-engine.js');
console.log('   ├── insight-generator.js');
console.log('   ├── recommendation-generator.js');
console.log('   └── index.js');
console.log('\\n🎯 Features:');
console.log('   ✅ Rule-based engine (easy to extend)');
console.log('   ✅ Formal professional tone');
console.log('   ✅ Auto-generated insights');
console.log('   ✅ Contextual recommendations (max 5)');
console.log('   ✅ Data completeness & confidence');
console.log('   ✅ Multi-layer analysis');
console.log('\\n🚀 Run: npm run build');
`;

fs.writeFileSync('sprint72-setup.cjs', content, 'utf8');
console.log('✅ Created: sprint72-setup.cjs');
console.log('Run: node sprint72-setup.cjs');