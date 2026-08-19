/**
 * SupabaseAssessmentSessionRepository — implementasi konkret
 * untuk persistence tabel `assessment_sessions` via Supabase.
 *
 * ADR-006 D3/D4:
 * - Concrete repository, bersama supabase-client.js, adalah satu-satunya
 *   lapisan yang tahu detail Supabase.
 * - Mewarisi contract `AssessmentSessionRepository` (independen dari
 *   core/repository.js).
 *
 * ── Error ownership (DIPUTUSKAN P-1, ADR-006 Non-Goals) ──
 *   - Write ops (create / updateStatus): THROW raw Supabase SDK error.
 *     TIDAK membungkus, menelan, atau menerjemahkan. Mapping ke
 *     domain/HTTP error adalah tanggung jawab Application Service (P-2).
 *   - Read ops (findById): "not found" (Supabase code PGRST116) → return
 *     null (hasil query normal, BUKAN error). Error lain → THROW raw.
 */
const supabase = require('./supabase-client');
const { AssessmentSessionRepository } = require('./assessment-session.repository');

const TABLE = 'assessment_sessions';

class SupabaseAssessmentSessionRepository extends AssessmentSessionRepository {
  /**
   * Insert session baru.
   *
   * NOTE (keputusan authority): default status='started' HANYA dijamin di
   * level JS — kolom `status` di DB TIDAK memiliki SQL DEFAULT. Caller yang
   * menginginkan nilai selain 'started' wajib mengirimnya eksplisit.
   */
  async create({ assessment_code, pack_id, status = 'started' }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ assessment_code, pack_id, status })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateStatus(id, status, completedAt = null) {
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

  async findById(id) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found = normal, bukan error
      throw error;
    }
    return data;
  }
}

module.exports = { SupabaseAssessmentSessionRepository };
