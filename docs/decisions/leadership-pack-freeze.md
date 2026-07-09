# Leadership Pack Domain Freeze

| Field | Value |
|-------|-------|
| **Status** | **Frozen** (domain structure only) |
| **Effective** | 8 Juli 2026 — Sprint 5A |
| **Reason** | Waiting Product Decision di Sprint 5A.5 |
| **Related** | [ADR-003](../adr/ADR-003-canonical-assessment-domain-model.md) |

---

## Scope — DIBEKUKAN

Tidak ada perubahan terhadap struktur domain Leadership:

- `dimensions[]` — daftar dimensi
- `thresholds` — strength_threshold, weakness_threshold
- `reasons` templates — semua reason text
- `actions` catalog — semua action + rationale
- `labels` — semua display label

---

## Scope — DIPERBOLEHKAN

Perubahan non-domain TETAP DIPERBOLEHKAN dengan constraint:
**No observable behaviour changes.**

| Kategori | Diperbolehkan | Tidak Diperbolehkan |
|----------|---------------|---------------------|
| Documentation | ✅ | — |
| Bug fix | ✅ (yang tidak mengubah output) | ❌ Mengubah output yang dihasilkan engine |
| Refactoring internal | ✅ | ❌ Mengubah struktur data yang terlihat dari luar |
| Internal optimization | ✅ | ❌ Mengubah hasil klasifikasi atau NBA |
| Test infrastructure | ✅ | ❌ Mengubah expected test output |
| Tooling | ✅ | — |
| Dimensi | — | ❌ Menambah/mengubah dimensi |
| Threshold | — | ❌ Mengubah strength_threshold / weakness_threshold |
| Reason/action text | — | ❌ Mengubah wording template |
| Output JSON | — | ❌ Mengubah output yang dihasilkan engine |

---

## Pencabutan Freeze

Freeze akan dicabut setelah:

1. **ADR-003 disetujui** oleh Product Owner (Proposed → Accepted)
2. **Sprint 5B (Domain Alignment)** dieksekusi

Setelah pencabutan, Recommendation Pack di-align ke Canonical Domain Model
yang dipilih Product Owner.
