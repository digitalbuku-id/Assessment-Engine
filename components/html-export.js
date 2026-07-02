import fs from 'node:fs';
import path from 'node:path';
import { renderTemplate } from './template-engine/index.js';

/**
 * Transforms and preprocesses raw assessment data for the template engine.
 * @param {Object} data - Raw assessment data.
 * @returns {Object} Preprocessed data.
 */
export function preprocessAssessmentData(data) {
  const formattedDate = data.createdAt 
    ? new Date(data.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  const participants = (data.participants || []).map(p => {
    const participantScores = data.scores?.[p.participantId] || {};
    
    const competencyScores = (data.competencies || []).map(c => {
      const score = participantScores[c.competencyId] ?? 0;
      
      let status = 'Needs Improvement';
      let statusClass = 'score-danger';

      if (score >= 85) {
        status = 'Excellent';
        statusClass = 'score-excellent';
      } else if (score >= 70) {
        status = 'Good';
        statusClass = 'score-good';
      } else if (score >= 50) {
        status = 'Satisfactory';
        statusClass = 'score-satisfactory';
      }

      return {
        competencyId: c.competencyId,
        competencyName: c.name,
        competencyDescription: c.description || '',
        category: c.category || '',
        weight: c.weight ?? 1,
        indicators: c.indicators || [],
        score,
        status,
        statusClass
      };
    });

    return {
      ...p,
      competencyScores
    };
  });

  return {
    ...data,
    formattedDate,
    participants
  };
}

/**
 * Generates an HTML report from assessment JSON data and saves it to output path.
 * @param {Object|string} jsonDataOrPath - The raw assessment object or path to a JSON file.
 * @param {string} outputPath - Path where the final report.html should be saved.
 * @returns {Promise<string>} The generated HTML content.
 */
export async function exportHtmlReport(jsonDataOrPath, outputPath) {
  let data;
  
  // Load JSON data
  if (typeof jsonDataOrPath === 'string') {
    const rawContent = fs.readFileSync(jsonDataOrPath, 'utf-8');
    data = JSON.parse(rawContent);
  } else if (typeof jsonDataOrPath === 'object') {
    data = jsonDataOrPath;
  } else {
    throw new Error('jsonDataOrPath must be a file path (string) or object');
  }
  
  // Preprocess data
  const processedData = preprocessAssessmentData(data);
  
  // Render template
  const htmlContent = renderTemplate(processedData);
  
  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (outputDir && !fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Write HTML file
  fs.writeFileSync(outputPath, htmlContent, 'utf-8');
  
  return htmlContent;
}

// Create alias for compatibility
const exportToHTML = exportHtmlReport;

// Named export
export { exportToHTML };

export default {
  preprocessAssessmentData,
  exportHtmlReport,
  exportToHTML
};
