/**
 * AssessmentReportRepository — contract (interface) untuk persistence
 * tabel `assessment_reports`.
 *
 * ADR-006 D3: repository adalah abstraksi/interface yang INDEPENDEN dari
 * `core/repository.js` (RepositoryInterface). Application Service (P-2)
 * bergantung pada contract ini, BUKAN pada implementasi Supabase konkret.
 *
 * Implementasi konkret: `supabase-assessment-report.repository.js`
 * (`SupabaseAssessmentReportRepository extends AssessmentReportRepository`).
 *
 * Error ownership (diputuskan P-1, ADR-006 Non-Goals) — lihat header
 * file concrete untuk kebijakan lengkapnya.
 */
class AssessmentReportRepository {
  /**
   * Buat report (snapshot output engine).
   *
   * @param {object} params
   * @param {string} params.session_id
   * @param {object} params.snapshot_json — full output engine.generate()
   * @param {string} [params.engine_version] — versi engine (opsional)
   * @returns {Promise<object>} row report yang dibuat
   */
  async create(params) { throw new Error('create() must be implemented'); }

  /**
   * Cari report untuk satu session.
   *
   * @param {string} sessionId
   * @returns {Promise<object|null>} row report, atau null jika tidak ada
   */
  async findBySessionId(sessionId) { throw new Error('findBySessionId() must be implemented'); }
}

module.exports = { AssessmentReportRepository };
