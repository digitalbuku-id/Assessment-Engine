/**
 * Assessment Result Repository
 *
 * Pure CRUD untuk tabel assessment_results.
 * Tidak mengandung business logic, scoring, atau orchestration.
 */

const supabase = require('./supabase-client');

const TABLE = 'assessment_results';

/**
 * Insert multiple assessment results for a session (batch insert).
 *
 * @param {string} sessionId
 * @param {Array<{dimension: string, raw_score: number, normalized_score: number}>} results
 * @returns {Promise<Array<object>>} the inserted rows
 */
async function createBatch(sessionId, results) {
  const rows = results.map((r) => ({
    session_id: sessionId,
    dimension: r.dimension,
    raw_score: r.raw_score,
    normalized_score: r.normalized_score,
  }));

  const { data, error } = await supabase
    .from(TABLE)
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

/**
 * Find all results for a given session.
 *
 * @param {string} sessionId
 * @returns {Promise<Array<object>>}
 */
async function findBySessionId(sessionId) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('session_id', sessionId);

  if (error) throw error;
  return data;
}

module.exports = { createBatch, findBySessionId };
