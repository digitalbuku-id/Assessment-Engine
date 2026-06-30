/**
 * JSON Schema validation module for DigitalBuku Assessment Engine.
 * Uses AJV v8+ with JSON Schema Draft 2020-12.
 * Provides validation functions for assessment, participant, competency and report config objects.
 */

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Resolve directory of this module (ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Load a JSON schema from the schema directory */
function loadSchema(fileName) {
  const schemaPath = resolve(__dirname, '..', 'schema', fileName);
  return JSON.parse(readFileSync(schemaPath, 'utf-8'));
}

// Load all schemas
const assessmentSchema = loadSchema('assessment.schema.json');
const participantSchema = loadSchema('participant.schema.json');
const competencySchema = loadSchema('competency.schema.json');
const reportSchema = loadSchema('report.schema.json');

// Initialise AJV with Draft‑2020‑12 support
const ajv = new Ajv2020({ allErrors: true, strict: false, schemas: [assessmentSchema, participantSchema, competencySchema, reportSchema] });
addFormats(ajv);

/** Custom error class that aggregates AJV validation errors. */
export class ValidationError extends Error {
  /** @param {Array<Object>} errors AJV error objects */
  constructor(errors) {
    const message = errors.map(err => `${err.instancePath} ${err.message}`).join('; ');
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Compile validators (cached for reuse)
const assessmentValidator = ajv.compile(assessmentSchema);
const participantValidator = ajv.compile(participantSchema);
const competencyValidator = ajv.compile(competencySchema);
const reportValidator = ajv.compile(reportSchema);

/** Validate an assessment object. */
export function validateAssessment(data) {
  const valid = assessmentValidator(data);
  if (!valid) throw new ValidationError(assessmentValidator.errors);
  return true;
}

/** Validate a participant object. */
export function validateParticipant(data) {
  const valid = participantValidator(data);
  if (!valid) throw new ValidationError(participantValidator.errors);
  return true;
}

/** Validate a competency object. */
export function validateCompetency(data) {
  const valid = competencyValidator(data);
  if (!valid) throw new ValidationError(competencyValidator.errors);
  return true;
}

/** Validate a report configuration object. */
export function validateReport(data) {
  const valid = reportValidator(data);
  if (!valid) throw new ValidationError(reportValidator.errors);
  return true;
}

export default {
  validateAssessment,
  validateParticipant,
  validateCompetency,
  validateReport,
  ValidationError
};