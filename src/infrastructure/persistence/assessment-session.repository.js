/**
 * Assessment Session Repository
 *
 * Pure CRUD untuk tabel assessment_sessions.
 * Tidak mengandung business logic, scoring, atau orchestration.
 *
 * ADR-006 D3: client diperoleh dari supabase-client.js (satu-satunya
 * titik import SDK Supabase), bukan membuat client sendiri.
 */

const supabase = require('./supabase-client');

const TABLE = 'assessment_sessions';

/**
 * Create a new assessment session.
 *
 * @param {object} params
 * @param {string} params.assessment_code
 * @param {string} params.pack_id
 * @param {string} [params.status='started']
 * @returns {Promise<object>} the created session row
 */
async function create({ assessment_code, pack_id, status = 'started' }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({ assessment_code, pack_id, status })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Find a session by its UUID.
 *
 * @param {string} id
 * @returns {Promise<object|null>} the session row, or null if not found
 */
async function findById(id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    // Supabase returns an error for "no rows" with .single()
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Update session status (and optionally completed_at).
 *
 * @param {string} id
 * @param {string} status — 'started' | 'completed' | 'abandoned' | 'expired'
 * @param {string|null} [completedAt=null] — ISO timestamp, set when status=completed
 * @returns {Promise<object>} the updated session row
 */
async function updateStatus(id, status, completedAt = null) {
  const updates = { status };
  if (completedAt) updates.completed_at = completedAt;

  const { data, error } = await supabase
    .from(TABLE)
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { create, findById, updateStatus };
