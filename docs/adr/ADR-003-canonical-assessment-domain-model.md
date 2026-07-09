# ADR-003: Canonical Assessment Domain Model

| Metadata          | Value                                                      |
|-------------------|------------------------------------------------------------|
| **Status**        | **Accepted** (Product Owner decision, 9 Juli 2026)             |
| **Date**          | 2026-07-08                                                 |
| **Author**        | Hera (Chief Architect)                                     |
| **Stakeholders**  | Product Owner, Zeus (Audit TASK-010D), Ares, Rubric Designer |
| **Supersedes**    | None                                                       |
| **Superseded by** | None                                                       |

---

## Context

Audit TASK-010D (8 Juli 2026, oleh Zeus) menemukan dua model Leadership
Assessment berbeda dalam repo yang sama, **tanpa overlap dan tanpa mapping**:

| Model | Lokasi | Dimensi | Tanggal | Confidence |
|-------|--------|---------|---------|------------|
| Assessment Definition | `assessments/leadership/config.json` | 4: motivation, decision_making, delegation, feedback | 2 Juli 2026 | High (dipakai mvp/server.js, test suite, production snapshots) |
| Recommendation Pack | `engines/recommendation/packs/leadership/` | 5: communication, decisiveness, strategic_thinking, people_development, execution | 6 Juli 2026 | Medium (SPEC-001, tidak mereferensi assessments/) |

**Detail mapping (dari TASK-010D):**

| Assessment (4-dim) | Recommendation (5-dim) | Mapping |
|---------------------|------------------------|---------|
| Motivation | — | Unknown |
| Decision Making | — | Unknown |
| Delegation | — | Unknown |
| Feedback | — | Unknown |
| — | Communication | Unknown |
| — | Decisiveness | Unknown |
| — | Strategic Thinking | Unknown |
| — | People Development | Unknown |
| — | Execution | Unknown |

**9 dimensi total, 0 overlap.** Tidak ada dimensi yang muncul di kedua model.

---

## Decision

1. **Setiap assessment memiliki satu Canonical Domain Model.**
   Canonical Model adalah sumber kebenaran tunggal untuk struktur kompetensi
   suatu assessment (dimensi, bobot, formula, rules).

2. **Recommendation Pack HARUS KONSISTEN dengan Canonical Domain Model**
   yang telah disetujui Product Owner atau Subject Matter Expert (SME).

3. **Recommendation Pack BOLEH menambahkan interpretasi** (explanation,
   strengths, weaknesses, coaching, actions), tetapi **TIDAK BOLEH**
   mengubah struktur kompetensi tanpa perubahan pada Canonical Domain Model.

4. **Bila domain berubah, perubahan dimulai dari Canonical Model.**
   Recommendation Pack mengikuti, bukan sebaliknya.

5. **ADR-003 tidak mengikat lokasi file.** ADR-003 hanya mengikat bahwa
   setiap assessment memiliki tepat satu Canonical Domain Model yang
   menjadi sumber struktur kompetensi. Representasi Canonical Model
   hari ini adalah `assessments/leadership/config.json`, tetapi lokasi
   ini bisa berubah di masa depan tanpa melanggar prinsip ADR ini.

---

## Decision Evidence

### Business Evidence
MVP (`mvp/server.js`) menggunakan model 4-dimensi dari
`assessments/leadership/config.json` sebagai definition pipeline-nya
(Definition → Formula → Rule → Version → ExecutionGraph → Snapshot).
Model ini sudah menjadi bagian dari demo aplikasi yang berjalan.

### Technical Evidence
Model 4-dimensi dipakai oleh:
- **Assessment Engine** — pipeline definition loader
- **Version Engine** — versioning dan manifest
- **Snapshot Engine** — 6 production snapshots di `mvp/snapshots/`
- **Test Suite** — `test-formula-rule.js`, `test-tier-a-engines.js`

Semua artefak ini memiliki confidence **High** (berjalan di produksi/test).

### Governance Evidence
- [Domain Provenance Report](./domain-provenance.md) — mencatat timeline kedua model
- [Domain Traceability Matrix](./domain-traceability-matrix.md) — mapping 9 dimensi, 0 overlap
- [Repository Audit](../repository-audit.md) — finding Domain Model Divergence

### Rejected Alternative: Recommendation Pack (5 dimensi)

**Model:** `engines/recommendation/packs/leadership/`
(5 dimensi: communication, decisiveness, strategic_thinking, people_development, execution)

**Reason for rejection:**
Tidak memiliki traceability terhadap Canonical Assessment Definition yang
tersedia di repository pada saat implementasi. Audit repository tidak
menemukan referensi eksplisit dari Recommendation Pack (`SPEC-001`,
`engines/recommendation/packs/leadership/`) ke
`assessments/leadership/config.json`.

SPEC-001 (6 Juli 2026) mendefinisikan 5 dimensi leadership secara independen
tanpa merujuk pada assessment definition yang sudah ada (2 Juli 2026).
Ini bukan kesalahan teknis, tetapi kesenjangan proses — Recommendation
Engine dikembangkan tanpa sinkronisasi dengan Canonical Model yang sudah
berjalan di MVP.

---

## Out of Scope

ADR ini TIDAK menentukan:

- Bagaimana Domain Pack disimpan (format YAML/JSON/JS) — sudah diputuskan di SPEC-002
- Struktur loader, resolver, registry — sudah diimplementasikan di Sprint 3B
- Implementasi assessment builder — tidak dalam roadmap (ADR-002)
- Detail teknis lainnya

Hal-hal tersebut sudah diputuskan pada ADR/SPEC sebelumnya atau akan
diputuskan pada ADR berikutnya bila diperlukan.

---

## Decision (Open Question Resolved)

**Canonical Domain Model untuk Leadership: Option (A)**

| Field | Value |
|-------|-------|
| **Model** | `assessments/leadership/config.json` |
| **Dimensi** | 4: motivation, decision_making, delegation, feedback |
| **Decision Date** | 9 Juli 2026 |
| **Decided By** | Product Owner |

Model 4-dimensi dipilih karena merupakan model yang sudah berjalan di
production pipeline (MVP) dan memiliki traceability penuh — digunakan
oleh Assessment Engine, Version Engine, Snapshot Engine, dan test suite.

Recommendation Pack (5 dimensi) akan di-align ke model ini di Sprint 5B.

---

## Consequences

Recommendation Pack leadership harus di-align ke 4 dimensi Canonical Model
(motivation, decision_making, delegation, feedback). SPEC-001 dan SPEC-002
tetap valid — hanya data domain pack yang berubah. Core Engine, loader,
resolver, registry tidak berubah.

### Sprint Impact

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| **Sprint 5A** | Dokumentasi governance (artefak ini) | ✅ Complete |
| **Sprint 5A.5** | Product Decision — PO memilih Option (A) | ✅ Complete (9 Juli 2026) |
| **Sprint 5B** | Align Leadership Pack ke Canonical Model (4 dimensi) | ⏳ Next |
| **Sprint 5C** | Integration: Assessment → Resolver → Recommendation | ⏳ Blocked |
| **Sprint 5D** | Acceptance Test: end-to-end validation | ⏳ Blocked |

---

## Decision Scope

ADR ini TIDAK menyatakan bahwa model 4 dimensi adalah model leadership
terbaik secara mutlak. ADR ini hanya menetapkan bahwa model tersebut
menjadi Canonical Domain Model untuk platform pada saat keputusan ini
dibuat (9 Juli 2026). Model dapat direvisi di masa depan (misal
Leadership v2, Leadership 360, dst) melalui ADR baru yang mensupersede
ADR ini — bukan dengan menyimpang diam-diam seperti yang terjadi
sebelumnya.

---

## Implementation Status

| Aspect | Status |
|--------|--------|
| Governance | ✅ Complete |
| Engineering Alignment | ⏳ Pending (Sprint 5B) |
| Recommendation Pack | 🔒 **Frozen** until alignment begins |

---

## References

- [TASK-010D Audit](../repository-audit.md) — Domain Model Divergence finding
- [Domain Provenance Report](./domain-provenance.md) — Traceability historis
- [Domain Traceability Matrix](./domain-traceability-matrix.md) — Mapping detail
- [Leadership Pack Domain Freeze](../decisions/leadership-pack-freeze.md) — Freeze selama review
- [ADR-001](./ADR-001-recommendation-framework.md) — Recommendation Framework
- [ADR-002](./ADR-002-domain-pack-strategy.md) — Domain Pack Strategy
- [SPEC-001](../../specs/SPEC-001.md) — Recommendation Engine DSL
- [SPEC-002](../../specs/SPEC-002-domain-pack-format.md) — Domain Pack Format
