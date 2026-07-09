# Domain Provenance Report

> **Purpose:** Traceability historis untuk menjawab "Kenapa kita memilih model domain ini?"
> **Created:** Sprint 5A — TASK-011A
> **Related:** [ADR-003](./adr/ADR-003-canonical-assessment-domain-model.md)

---

## Artefacts

| Artefact | Purpose | Status | Evidence | Confidence |
|----------|---------|--------|----------|------------|
| `assessments/leadership/config.json` | Assessment Definition | Candidate Canonical | Dipakai oleh `mvp/server.js`, `test-formula-rule.js`, `test-tier-a-engines.js`, `versions/`, `snapshots/` | **High** |
| `mvp/server.js` | Demo Application | Active Prototype | Memakai Pipeline arsitektur v2 (Definition → Formula → Rule → Version → ExecutionGraph → Snapshot) | **High** |
| `engines/recommendation/packs/leadership/` | Recommendation Layer | Pending Review | Berasal dari SPEC-001 (commit `f35df7c`, 6 Juli 2026), tidak mereferensi `assessments/` | **Medium** |

---

## Confidence Levels

| Level | Definition |
|-------|------------|
| **High** | Digunakan oleh engine produksi, test suite, atau aplikasi yang berjalan |
| **Medium** | Berasal dari specification, belum divalidasi di produksi |
| **Low** | Prototype, eksperimen, atau artefak yang tidak terdokumentasi |

---

## Timeline

| Tanggal | Event | Commit | Detail |
|---------|-------|--------|--------|
| 2 Juli 2026 | `assessments/leadership/config.json` dibuat | — | 4 dimensi: motivation, decision_making, delegation, feedback |
| 2 Juli 2026 | MVP prototype aktif | `858cfd8` | Tier A RC1 — `mvp/server.js` menggunakan assessment config |
| 6 Juli 2026 | SPEC-001 dibuat oleh Hera | `f35df7c` | 5 dimensi: communication, decisiveness, strategic_thinking, people_development, execution |
| 6 Juli 2026 | Ares implementasi Recommendation Engine | `31bcc18` | 5 dimensi (mengikuti SPEC-001) |
| 8 Juli 2026 | Audit TASK-010D menemukan divergence | oleh Zeus | Kedua model tidak memiliki overlap |
| 8 Juli 2026 | Sprint 5A — ADR-003 (Proposed) | — | Menunggu keputusan Product Owner |

---

## Domain Divergence Summary

| | Assessment Definition | Recommendation Pack |
|---|---|---|
| **Lokasi** | `assessments/leadership/config.json` | `engines/recommendation/packs/leadership/` |
| **Dimensi** | motivation, decision_making, delegation, feedback | communication, decisiveness, strategic_thinking, people_development, execution |
| **Jumlah** | 4 | 5 |
| **Overlap** | 0 dari 9 total dimensi | 0 dari 9 total dimensi |
| **Confidence** | High (production) | Medium (spec-derived) |
| **Dependency** | `mvp/server.js`, test suite, snapshots | SPEC-001, loader-resolver tests |

---

## Notes

Dokumen ini untuk traceability historis — menjawab "Kenapa kita memilih model
domain ini?" di masa depan. Timeline di atas menunjukkan bahwa kedua model
dibuat pada waktu yang berbeda oleh pihak yang berbeda, tanpa koordinasi
cross-model. ADR-003 dan Sprint 5A.5 bertujuan menyelesaikan divergence ini.
