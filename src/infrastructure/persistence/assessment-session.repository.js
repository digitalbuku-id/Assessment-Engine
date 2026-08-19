/**
 * AssessmentSessionRepository — contract (interface) untuk persistence
 * tabel `assessment_sessions`.
 *
 * ADR-006 D3: repository adalah abstraksi/interface yang INDEPENDEN dari
 * `core/repository.js` (RepositoryInterface). Application Service (P-2)
 * bergantung pada contract ini, BUKAN pada implementasi Supabase konkret.
 *
 * Implementasi konkret: `supabase-assessment-session.repository.js`
 * (`SupabaseAssessmentSessionRepository extends AssessmentSessionRepository`).
 *
 * Error ownership (diputuskan P-1, ADR-006 Non-Goals) — lihat header
 * file concrete untuk kebijakan lengkapnya.
 */
class AssessmentSessionRepository {
  /**
   * Buat session baru.
   *
   * @param {object} params
   * @param {string} params.assessment_code
   * @param {string} params.pack_id
   * @param {string} [params.status='started']
   * @returns {Promise<object>} row session yang dibuat (termasuk id uuid)
   */
  async create(params) { throw new Error('create() must be implemented'); }

  /**
   * Update status session (lifecycle transition).
   *
   * @param {string} id
   * @param {string} status — 'started' | 'completed' | 'abandoned' | 'expired'
   * @param {string|null} [completedAt=null] — ISO timestamp (set saat completed)
   * @returns {Promise<object>} row session yang sudah di-update
   */
  async updateStatus(id, status, completedAt = null) { throw new Error('updateStatus() must be implemented'); }

  /**
   * Cari session berdasarkan id.
   *
   * @param {string} id
   * @returns {Promise<object|null>} row session, atau null jika tidak ada
   */
  async findById(id) { throw new Error('findById() must be implemented'); }
}

module.exports = { AssessmentSessionRepository };
