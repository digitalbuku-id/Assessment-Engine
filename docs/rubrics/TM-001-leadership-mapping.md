# TM-001: Language Mapping — RD-001 → Recommendation Engine Templates

| Metadata | Value |
|---|---|
| Status | Approved |
| Source | RD-001 (approved 2026-07-09) |
| Purpose | Audit trail: setiap kata di reasons.js dan actions.js dapat ditelusuri ke RD-001 |
| Dimensi | 4 (Canonical Model ADR-003) |

---

## Mapping Table

| # | RD-001 Source | RD-001 Section | Template Target | File | Result |
|---|---------------|----------------|-----------------|------|--------|
| 1 | High Interpretation | Motivation | `reasons.strengths.motivation` | `reasons.js` | Skor {score} mengindikasikan keyakinan bahwa Anda mampu mendorong semangat tim dan menjaga fokus pada pencapaian target. |
| 2 | Low Interpretation | Motivation | `reasons.weaknesses.motivation` | `reasons.js` | Skor {score} menunjukkan adanya ruang pengembangan dalam kemampuan memotivasi tim untuk tetap berfokus pada pencapaian target. |
| 3 | Recommendation Intent (Low) | Motivation | `actions.motivation` | `actions.js` | **action:** Membantu peserta mengembangkan cara memberikan dorongan, arah, dan penguatan kepada tim dalam konteks pencapaian target. **rationale:** Motivation adalah dimensi dengan skor terendah ({score}). |
| 4 | High Interpretation | Decision Making | `reasons.strengths.decision_making` | `reasons.js` | Skor {score} mengindikasikan keyakinan bahwa Anda mampu mengambil keputusan pada situasi yang menantang secara tepat waktu, termasuk ketika menghadapi tekanan atau ketidakpastian. |
| 5 | Low Interpretation | Decision Making | `reasons.weaknesses.decision_making` | `reasons.js` | Skor {score} menunjukkan adanya ruang pengembangan dalam membangun keyakinan dan ketepatan waktu saat mengambil keputusan pada situasi yang menantang. |
| 6 | Recommendation Intent (Low) | Decision Making | `actions.decision_making` | `actions.js` | **action:** Membantu peserta membangun kepercayaan diri dan kerangka berpikir untuk mempercepat pengambilan keputusan pada situasi yang menekan. **rationale:** Decision Making adalah dimensi dengan skor terendah ({score}). |
| 7 | High Interpretation | Delegation | `reasons.strengths.delegation` | `reasons.js` | Skor {score} mengindikasikan keyakinan bahwa Anda mampu mendelegasikan tugas atau tanggung jawab kepada anggota tim secara efektif sesuai dengan kebutuhan pekerjaan. |
| 8 | Low Interpretation | Delegation | `reasons.weaknesses.delegation` | `reasons.js` | Skor {score} menunjukkan adanya ruang pengembangan dalam membangun keyakinan dan efektivitas saat mendelegasikan tugas atau tanggung jawab kepada anggota tim. |
| 9 | Recommendation Intent (Low) | Delegation | `actions.delegation` | `actions.js` | **action:** Membantu peserta membangun kepercayaan dan kerangka kerja untuk mendistribusikan tugas secara lebih efektif kepada tim. **rationale:** Delegation adalah dimensi dengan skor terendah ({score}). |
| 10 | High Interpretation | Feedback | `reasons.strengths.feedback` | `reasons.js` | Skor {score} mengindikasikan keyakinan bahwa Anda mampu memberikan feedback yang konstruktif kepada anggota tim untuk mendukung perbaikan kinerja dan pengembangan kerja. |
| 11 | Low Interpretation | Feedback | `reasons.weaknesses.feedback` | `reasons.js` | Skor {score} menunjukkan adanya ruang pengembangan dalam membangun keyakinan dan efektivitas saat memberikan feedback yang konstruktif kepada anggota tim. |
| 12 | Recommendation Intent (Low) | Feedback | `actions.feedback` | `actions.js` | **action:** Membantu peserta membangun keyakinan dan kerangka praktis untuk menyampaikan feedback yang konstruktif secara lebih konsisten dalam mendukung perkembangan anggota tim. **rationale:** Feedback adalah dimensi dengan skor terendah ({score}). |

---

## Transformation Rules

| RD-001 Pattern | Template Pattern | Rationale |
|----------------|------------------|-----------|
| `Respons Anda mengindikasikan...` | `Skor {score} mengindikasikan...` | "Skor {score}" adalah pengganti mekanis "Respons Anda" — tidak mengubah makna, hanya menambahkan data skor |
| `Hasil pada dimensi ini menunjukkan...` | `Skor {score} menunjukkan...` | "Skor {score}" menggantikan "Hasil pada dimensi ini" — lebih spesifik tanpa mengubah tone |
| `Recommendation Intent (Low)` | `actions.<dim>.action` verbatim | Teks intent dipakai apa adanya sebagai action — tidak ada parafrase, tidak ada elaborasi |
| — | `actions.<dim>.rationale` | "`<Label>` adalah dimensi dengan skor terendah ({score})." — rationale teknis, bukan dari RD-001 |

---

## Design Decision: NBA selalu menggunakan Low Intent

`next_best_action` selalu memilih dimensi dengan skor **terendah**. Oleh karena itu:

- Semua entry `actions.<dimension>.action` menggunakan **Recommendation Intent (Low)**
- Dimensi dengan skor tinggi (strength) tidak pernah menjadi NBA, sehingga High Intent tidak diperlukan di action library untuk MVP
- Jika nanti engine mendukung `next_best_strength` (future feature), entry action bisa diperluas menjadi `{ high: ..., low: ... }`

---

## Notes

- `{score}` disisipkan dengan mengganti pembuka kalimat RD-001 ('Respons Anda' → 'Skor {score}', 'Hasil pada dimensi ini' → 'Skor {score}') — ini adalah penyesuaian teknis minimal
- Seluruh konten selain substitusi `{score}` dan pembuka kalimat berasal verbatim dari RD-001
- Confidence Note dari RD-001 TIDAK dimasukkan ke template — confidence note adalah metadata rubric, bukan bagian dari output rekomendasi
- Do Not Infer dari RD-001 TIDAK dimasukkan ke template — ini adalah constraint rubric designer, bukan konten yang ditampilkan ke user
