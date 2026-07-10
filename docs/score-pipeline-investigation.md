# Score Pipeline Investigation

> **Date:** 2026-07-09
> **Author:** Hera
> **Status:** Investigated — normalization required

---

## 1. Dari Mana Skor Masuk ke Recommendation Engine?

```
Assessment Definition       Pipeline / Adapter        Recommendation Engine
─────────────────────       ─────────────────        ────────────────────
config.json (maxScale: 5)   ??? (gap identified)     validates 0-100
skor mentah: 1-5                                    expects 0-100
```

**Gap:** Tidak ada komponen yang mengkonversi skor 1-5 (assessment) ke 0-100 (engine).

---

## 2. Apakah Skor Sudah 0-100 atau Masih 1-5?

| Sumber | Skala | Evidence |
|--------|-------|----------|
| `assessments/leadership/config.json` | **1-5** | `"maxScale": 5` |
| `engines/recommendation/index.js` | **0-100** | Validasi: `score < 0 \|\| score > 100` → error |
| `tests/recommendation-engine.test.js` | **0-100** | Test pakai skor seperti 88, 48, 72 (sudah di-normalize manual) |
| `tests/recommendation-adapter.test.js` | **0-100** | Test pakai skor 0-100 (sudah di-normalize manual) |

**Kesimpulan:** Skor assessment mentah adalah 1-5. Test menggunakan skor yang sudah di-normalize secara manual. Tanpa normalization layer, skor 1-5 akan selalu diklasifikasikan sebagai weakness (semua ≤ 55).

---

## 3. Apakah Normalization Layer Diperlukan?

**Ya, diperlukan.**

Tanpa normalisasi:
- Skor 5 (max) → 5 ≤ 55 → WEAKNESS
- Skor 4 → 4 ≤ 55 → WEAKNESS
- Skor 3 → 3 ≤ 55 → WEAKNESS
- Semua skor jadi weakness — tidak ada strength, tidak ada neutral

Dengan normalisasi `(rawScore / maxScale) * 100`:
- Skor 5 → (5/5)*100 = 100 → STRENGTH (≥80)
- Skor 4 → (4/5)*100 = 80 → STRENGTH (≥80)
- Skor 3 → (3/5)*100 = 60 → NEUTRAL (56-79)
- Skor 2 → (2/5)*100 = 40 → WEAKNESS (≤55)
- Skor 1 → (1/5)*100 = 20 → WEAKNESS (≤55)

---

## 4. Formula yang Cocok

**Default:** `normalize(rawScore, scoringConfig) → (rawScore / scoringConfig.maxScale) * 100`

- Interface fleksibel — bisa di-override untuk formula lain di masa depan
- ScoringConfig diambil dari assessment definition (`config.json`)
- Hasil dikonversi ke integer (threshold classification tidak perlu float precision)

---

## 5. Decision

**Normalization layer DIPERLUKAN.** Implementasi di TASK-018 langkah C.
