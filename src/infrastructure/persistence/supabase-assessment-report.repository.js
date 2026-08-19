/**
 * SupabaseAssessmentReportRepository — implementasi konkret
 * untuk persistence tabel `assessment_reports` via Supabase.
 *
 * ADR-006 D3/D4:
 * - Concrete repository, bersama supabase-client.js, adalah satu-satunya
 *   lapisan yang tahu detail Supabase.
 * - Mewarisi contract `AssessmentReportRepository` (independen dari
 *   core/repository.js).
 *
 * ── Error ownership (DIPUTUSKAN P-1, ADR-006 Non-Goals) ──
 *   - Write ops (create): THROW raw Supabase SDK error. Tidak
 *     membungkus/menelan/menerjemahkan (tanggung jawab P-2).
 *   - Read ops (findBySessionId): "not found" (Supabase code PGRST116) →
 *     return null (hasil query normal, BUKAN error). Error lain → THROW raw.
 */
const supabase = require('./supabase-client');
const { AssessmentReportRepository } = require('./assessment-report.repository');

const TABLE = 'assessment_reports';

class SupabaseAssessmentReportRepository extends AssessmentReportRepository {
  async create({ session_id, snapshot_json, engine_version }) {
    const { data, error } = await supabase
      .from(TABLE)
      .insert({ session_id, snapshot_json, engine_version })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findBySessionId(sessionId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found = normal, bukan error
      throw error;
    }
    return data;
  }
}

module.exports = { SupabaseAssessmentReportRepository };
