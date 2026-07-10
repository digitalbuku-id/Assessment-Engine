# Normalization Formula

> **Status:** Implemented (TASK-018)
> **File:** `engines/recommendation/normalization.js`

---

## Default Formula

```
normalizedScore = ((rawScore - minScale + 1) / (maxScale - minScale + 1)) * 100
```

Disederhanakan untuk scale 1-5 (default):

```
normalizedScore = (rawScore / maxScale) * 100
```

---

## Contoh Konversi (1-5 → 0-100)

| Raw Score (1-5) | Normalized (0-100) | Classification |
|-----------------|-------------------|----------------|
| 5 | 100 | STRENGTH (≥80) |
| 4 | 80 | STRENGTH (≥80) |
| 3 | 60 | NEUTRAL (56-79) |
| 2 | 40 | WEAKNESS (≤55) |
| 1 | 20 | WEAKNESS (≤55) |

---

## Kenapa Normalisasi Diperlukan

- Assessment Definition (`config.json`) menggunakan skala 1-5 (`maxScale: 5`)
- Recommendation Engine memvalidasi dan mengklasifikasikan skor 0-100
- Tanpa normalisasi, SEMUA skor mentah 1-5 akan ≤ 55 → selalu WEAKNESS
- Normalisasi dilakukan di dalam engine, setelah config resolution, sebelum validation

---

## Backward Compatibility

- Jika `packConfig.maxScale` tidak ada atau = 100 → normalisasi **tidak dijalankan**
- Skor dianggap sudah dalam range 0-100
- Semua test existing tetap PASS tanpa perubahan

---

## Extensibility

Formula default bisa di-override dengan custom `scoringConfig`:

```js
normalize(rawScore, { maxScale: 7, minScale: 0 })   // skala 0-7
normalize(rawScore, { maxScale: 10 })                 // skala 1-10
normalize(rawScore, { maxScale: 100 })                // no-op (skala 0-100)
```

Interface normalization.js menerima `scoringConfig` object — cukup tambah
custom formula di masa depan tanpa mengubah signature.

---

## Implementation Notes

- Normalisasi terjadi **sebelum** validation — skor yang sudah di-normalize kemudian divalidasi 0-100
- `maxScale` disimpan di pack `metadata.js` sebagai bagian dari domain knowledge
- Engine membaca `maxScale` dari resolved pack config — tidak ada hardcode
