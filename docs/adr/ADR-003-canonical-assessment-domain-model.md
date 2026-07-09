# ADR-003: Canonical Assessment Domain Model

| Metadata          | Value                                                      |
|-------------------|------------------------------------------------------------|
| **Status**        | **Proposed** (menunggu keputusan Product Owner, Sprint 5A.5) |
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

## Open Question

**Mana Canonical Domain Model untuk Leadership?**

| Option | Model | Dimensi | Evidence |
|--------|-------|---------|----------|
| **(A)** | `assessments/leadership/config.json` | 4: motivation, decision_making, delegation, feedback | Production: mvp/server.js, test suite, snapshots |
| **(B)** | `engines/recommendation/packs/leadership/` | 5: communication, decisiveness, strategic_thinking, people_development, execution | SPEC-001, Recommendation Engine test suite |

**Keputusan Product Owner dibutuhkan di Sprint 5A.5.**

---

## Consequences

### Jika Canonical Model (A) dipilih
- Recommendation Pack leadership harus di-align ke 4 dimensi (motivation, decision_making, delegation, feedback)
- SPEC-001 dan SPEC-002 tetap valid — hanya data domain pack yang berubah
- Core Engine, loader, resolver, registry tidak berubah

### Jika Canonical Model (B) dipilih
- `assessments/leadership/config.json` harus di-update ke 5 dimensi
- MVP application (`mvp/server.js`) dan test suite harus di-update
- Snapshots harus diregenerasi

### Sprint Impact

| Sprint | Deliverable | Status |
|--------|-------------|--------|
| **Sprint 5A** | Dokumentasi governance (artefak ini) | ✅ Current |
| **Sprint 5A.5** | Product Decision — PO memilih Canonical Model | ⏳ Waiting |
| **Sprint 5B** | Align Leadership Pack ke Canonical Model yang dipilih | ⏳ Blocked |
| **Sprint 5C** | Integration: Assessment → Resolver → Recommendation | ⏳ Blocked |
| **Sprint 5D** | Acceptance Test: end-to-end validation | ⏳ Blocked |

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
