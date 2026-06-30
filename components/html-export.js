import fs from 'node:fs';
import path from 'node:path';
import { renderTemplate } from './template-engine.js';

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
      
      // Determine status and matching Bootstrap contextual classes
      let status = 'Needs Improvement';
      let statusClass = 'danger';

      if (score >= 85) {
        status = 'Excellent';
        statusClass = 'success';
      } else if (score >= 70) {
        status = 'Good';
        statusClass = 'info';
      } else if (score >= 50) {
        status = 'Satisfactory';
        statusClass = 'warning';
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
 * @param {Object|string} jsonDataOrPath - The raw assessment object or absolute/relative path to a JSON file.
 * @param {string} outputPath - Path where the final report.html should be saved.
 * @returns {Promise<string>} The generated HTML content.
 */
export async function exportHtmlReport(jsonDataOrPath, outputPath) {
  let rawData;
  if (typeof jsonDataOrPath === 'string') {
    const fullPath = path.resolve(jsonDataOrPath);
    rawData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } else {
    rawData = jsonDataOrPath;
  }

  // Preprocess/transform the data
  const preprocessed = preprocessAssessmentData(rawData);

  // Render templates
  const innerHtml = renderTemplate('report', preprocessed);
  const finalHtml = renderTemplate('layout', {
    ...preprocessed,
    content: innerHtml
  });

  // Write to output path
  if (outputPath) {
    const absoluteOutputPath = path.resolve(outputPath);
    const parentDir = path.dirname(absoluteOutputPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(absoluteOutputPath, finalHtml, 'utf-8');
  }

  return finalHtml;
}

export default {
  preprocessAssessmentData,
  exportHtmlReport
};
