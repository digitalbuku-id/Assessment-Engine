/**
 * Assessment Report Repository
 *
 * Pure CRUD untuk tabel assessment_reports.
 * Tidak mengandung business logic, scoring, atau orchestration.
 */

const supabase = require('./supabase-client');

const TABLE = 'assessment_reports';

/**
 * Create an assessment report (snapshot of engine output).
 *
 * @param {object} params
 * @param {string} params.session_id
 * @param {object} params.snapshot_json — the full engine.generate() output
 * @param {string} [params.engine_version] — optional version string
 * @returns {Promise<object>} the created report row
 */
async function create({ session_id, snapshot_json, engine_version }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ session_id, snapshot_json, engine_version })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find a report by its UUID.
 *
 * @param {string} id
 * @returns {Promise<object|null>} the report row, or null if not found
 */
async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Find the report for a given session.
 *
 * @param {string} sessionId
 * @returns {Promise<object|null>}
 */
async function findBySessionId(sessionId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

module.exports = { create, findById, findBySessionId };
