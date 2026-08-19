/**
 * AssessmentResultRepository — contract (interface) untuk persistence
 * tabel `assessment_results`.
 *
 * ADR-006 D3: repository adalah abstraksi/interface yang INDEPENDEN dari
 * `core/repository.js` (RepositoryInterface). Application Service (P-2)
 * bergantung pada contract ini, BUKAN pada implementasi Supabase konkret.
 *
 * Implementasi konkret: `supabase-assessment-result.repository.js`
 * (`SupabaseAssessmentResultRepository extends AssessmentResultRepository`).
 *
 * Error ownership (diputuskan P-1, ADR-006 Non-Goals) — lihat header
 * file concrete untuk kebijakan lengkapnya.
 */
class AssessmentResultRepository {
  /**
   * Insert banyak baris hasil untuk satu session (batch).
   *
   * @param {string} sessionId — uuid session
   * @param {Array<{dimension: string, raw_score: number, normalized_score: number}>} results
   * @returns {Promise<Array<object>>} row hasil yang di-insert
   */
  async createBatch(sessionId, results) { throw new Error('createBatch() must be implemented'); }

  /**
   * Cari semua hasil untuk satu session.
   *
   * @param {string} sessionId
   * @returns {Promise<Array<object>>} array row hasil
   */
  async findBySessionId(sessionId) { throw new Error('findBySessionId() must be implemented'); }
}

module.exports = { AssessmentResultRepository };
