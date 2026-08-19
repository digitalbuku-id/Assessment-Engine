/**
 * SupabaseAssessmentResultRepository — implementasi konkret
 * untuk persistence tabel `assessment_results` via Supabase.
 *
 * ADR-006 D3/D4:
 * - Concrete repository, bersama supabase-client.js, adalah satu-satunya
 *   lapisan yang tahu detail Supabase.
 * - Mewarisi contract `AssessmentResultRepository` (independen dari
 *   core/repository.js).
 *
 * ── Error ownership (DIPUTUSKAN P-1, ADR-006 Non-Goals) ──
 *   - Write ops (createBatch): THROW raw Supabase SDK error. Tidak
 *     membungkus/menelan/menerjemahkan (tanggung jawab P-2).
 *   - Read ops (findBySessionId): "not found" → return array kosong
 *     (bukan error, karena .select() tanpa .single() menghasilkan data
 *     array kosong). Error lain → THROW raw.
 */
const supabase = require('./supabase-client');
const { AssessmentResultRepository } = require('./assessment-result.repository');

const TABLE = 'assessment_results';

class SupabaseAssessmentResultRepository extends AssessmentResultRepository {
  async createBatch(sessionId, results) {
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

  async findBySessionId(sessionId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('session_id', sessionId);

    if (error) throw error;
    return data;
  }
}

module.exports = { SupabaseAssessmentResultRepository };
