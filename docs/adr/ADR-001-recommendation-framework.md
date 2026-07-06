# ADR-001: Recommendation Framework Architecture — Core Engine + Domain Pack

| Metadata          | Value                                                                 |
|-------------------|-----------------------------------------------------------------------|
| **Status**        | Accepted                                                              |
| **Date**          | 2026-07-06                                                            |
| **Author**        | Hera (Chief Architect)                                                |
| **Stakeholders**  | Ares (Sprint 1 implementor), Product Team                             |
| **Supersedes**    | None                                                                  |
| **Superseded by** | None                                                                  |

---

## Context

### Masalah yang Ditemukan Ares

Sprint 1 menghasilkan `RecommendationEngine` dengan use case tunggal `type: "leadership"`.
Engine ini sudah berfungsi, teruji (`tests/recommendation-engine.test.js`: 22 test case, 22 passing),
dan config-nya sudah di-key per assessment type (`thresholds.js`, `reasons.js`, `actions.js`).

Namun, pipeline produksi membutuhkan dukungan untuk `type: "competency"`. Ares mengidentifikasi
dua masalah fundamental:

1. **Tidak ada crosswalk semantik antara pipeline type dan engine type.** Pipeline
   mengirim `type="competency"`, sementara engine hanya mengenali `type="leadership"`.
   Tidak ada mekanisme untuk memetakan dimensi competency ke threshold/rules yang valid.

2. **Tidak ada keputusan arsitektur tentang model ekstensibilitas.** Apakah engine ini
   akan menjadi generik penuh (satu set threshold/reason/action untuk semua type),
   atau memiliki konfigurasi terpisah per type?

Tanpa ADR yang eksplisit, setiap penambahan assessment type baru akan memicu diskusi
arsitektur ulang — boros waktu dan berisiko inkonsistensi.

### Kondisi Config Saat Ini

Config Sprint 1 (`engines/recommendation/config/`) sudah menggunakan struktur key-per-type:

```js
// thresholds.js
module.exports = {
  leadership: { strength_threshold: 80, weakness_threshold: 55, dimensions: [...], labels: {...} },
};

// reasons.js
module.exports = {
  leadership: { strengths: {...}, weaknesses: {...} },
};

// actions.js
module.exports = {
  leadership: { communication: { action: "...", rationale: "..." }, ... },
};
```

Engine membaca config berdasarkan `input.type` — sepenuhnya type-agnostic:
```js
const typeConfig = thresholds[input.type];   // line 78
const reasonCatalog = reasons[input.type];    // line 131
const actionCatalog = actions[input.type];    // line 170
```

**Fondasi domain-pack sudah ada di level key, tapi belum ada keputusan arsitektur formal
dan struktur direktori belum mencerminkan pemisahan domain.**

---

## Decision

**Recommendation Engine akan menjadi "Recommendation Framework" universal dengan
arsitektur Core Engine + Domain Pack.**

```
Recommendation Framework
│
├── Core Engine (engines/recommendation/index.js)
│   ├── Validation           — validasi input (score range, known dimensions, empty input)
│   ├── Classification       — klasifikasi skor → strength / weakness / neutral
│   ├── Threshold Evaluation — evaluasi terhadap threshold domain pack
│   ├── Next Best Action     — pemilihan aksi berdasarkan dimensi terendah
│   ├── Explanation Builder  — template substitution dengan konteks domain
│   └── JSON Output          — assembly output dengan versioning
│
└── Domain Pack (engines/recommendation/config/)
    ├── Leadership   (Sprint 1 — sudah ada, produksi)
    │   ├── thresholds, reasons, actions
    │   └── 5 dimensi: communication, decisiveness, strategic_thinking,
    │       people_development, execution
    │
    ├── Competency   (dibutuhkan pipeline produksi sekarang)
    │   └── dimensi dan threshold menunggu definisi rubric designer
    │
    ├── DISC         (masa depan)
    ├── Sales        (masa depan)
    ├── CPNS         (masa depan)
    └── UTBK         (masa depan)
```

### Prinsip Desain

1. **Core Engine tidak pernah berubah saat domain pack baru ditambahkan.**
   Engine hanya membaca config berdasarkan `input.type` — behavior-nya identik
   untuk semua domain. Menambah domain baru = menambah entry di file config,
   bukan mengubah kode engine.

2. **Domain pack adalah sumber kebenaran untuk domain knowledge.**
   Threshold, dimensi yang dikenal, label, template alasan, dan katalog aksi
   semuanya didefinisikan di domain pack. Pipeline TIDAK melakukan crosswalk
   semantik apapun — pipeline hanya mengirim `type` dan `scores`, engine
   membaca domain pack yang sesuai.

3. **Setiap domain pack bersifat self-contained.**
   Satu domain pack berisi semua yang dibutuhkan untuk satu assessment type:
   threshold, daftar dimensi, label, reason template, dan action catalog.

4. **Config di-load saat startup (bukan hot-reload).**
   MVP menggunakan `require()` — file JavaScript yang di-load sekali saat
   engine diinstansiasi. Hot-reload adalah future enhancement.

---

## Alternatives Considered

### Alternatif 1: Generic Engine Penuh (satu set threshold untuk semua type)

**Deskripsi:** Satu threshold universal (misal: ≥ 80 = strength, ≤ 55 = weakness),
satu set reason template generik (tanpa konteks domain), satu action library generik.

**Ditolak karena:**
- Kualitas rekomendasi turun drastis — tidak mungkin memberikan reason yang
  bermakna ("Skor komunikasi kamu 72") tanpa mengetahui bahwa dimensi itu adalah
  `communication` dalam konteks `leadership`, bukan `sales` atau `competency`.
- Tidak ada ruang untuk kalibrasi threshold per domain. Threshold yang valid
  untuk leadership (80/55) mungkin tidak valid untuk competency.
- Reason template generik ("Skor {score} perlu ditingkatkan") tidak memberikan
  nilai tambah dibandingkan tidak ada rekomendasi sama sekali.

### Alternatif 2: Engine Terpisah per Assessment Type

**Deskripsi:** Satu engine class per type (`LeadershipEngine`, `CompetencyEngine`,
`DISCEngine`, dst.), masing-masing dengan logic sendiri.

**Ditolak karena:**
- Duplikasi logic Sprint 1. Pipeline validasi, klasifikasi threshold,
  next-best-action selection, dan output builder akan diduplikasi di setiap engine.
- Setiap bug fix atau improvement harus di-port ke semua engine.
- Testing overhead: test case yang sama harus ditulis ulang per engine.
- Sprint 1 sudah membuktikan bahwa logic klasifikasi + threshold + NBA bersifat
  generik — yang berbeda hanya data-nya (config), bukan algoritmanya.

---

## Consequences

### Positif

- **Ekstensibilitas jelas.** Menambah assessment type baru = menambah entry di
  file config. Tidak ada perubahan kode engine.
- **Leadership menjadi domain pack pertama** — membuktikan bahwa arsitektur
  ini bekerja dengan data riil (5 dimensi, 22 test case).
- **Pipeline tetap sederhana.** Pipeline hanya perlu mengirim `type` dan
  `scores` — tidak ada logika crosswalk semantik di pipeline.
- **Domain knowledge terisolasi.** Kalibrasi threshold competency tidak akan
  mempengaruhi threshold leadership yang sudah production-stable.

### Negatif / Risiko

- **Competency pack belum ada.** Harus dibuat sebelum integrasi produksi.
  Dimensi competency dan threshold-nya harus didefinisikan oleh rubric designer
  — ini dependency eksternal yang bisa menjadi bottleneck.
- **Config saat ini flat (per-concern, bukan per-domain).** File `thresholds.js`
  saat ini berisi semua domain dalam satu file. Seiring bertambahnya domain,
  file ini akan membesar. Perlu refactor ringan ke struktur per-domain di
  iterasi berikutnya (tidak blocking untuk integrasi competency).
- **Belum ada validasi cross-domain.** Tidak ada mekanisme yang mencegah
  dimensi dengan nama sama tapi makna berbeda di dua domain (misal:
  `communication` di leadership vs `communication` di competency).

### Action Items

| # | Action                                          | Owner          | Priority |
|---|-------------------------------------------------|----------------|----------|
| 1 | Definisikan dimensi + threshold Competency pack | Rubric Designer | HIGH     |
| 2 | Tambah entry `competency` di thresholds.js, reasons.js, actions.js | Ares | HIGH |
| 3 | Tambah test case untuk type `competency`        | Ares           | HIGH     |
| 4 | Refactor struktur config ke per-domain directory (future) | Ares | LOW |

---

## References

- `specs/SPEC-001.md` — Format DSL dan JSON output yang sudah diselaraskan dengan ADR ini
- `engines/recommendation/index.js` — Implementasi Core Engine (type-agnostic)
- `engines/recommendation/config/thresholds.js` — Threshold map (keyed per type)
- `engines/recommendation/config/reasons.js` — Reason template catalog (keyed per type)
- `engines/recommendation/config/actions.js` — Action library (keyed per type)
- `tests/recommendation-engine.test.js` — 22 test case, mencakup validation, classification, NBA, determinism
- `tasks/TASK-001.md` — Task definition untuk Sprint 1
