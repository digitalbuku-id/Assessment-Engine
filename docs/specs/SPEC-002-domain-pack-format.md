# SPEC-002: Domain Pack Format Specification

> **Title:** Domain Pack Structure, Registry, Resolver, and Loader
> **Author:** Hera (Chief Architect)
> **Assignee:** Ares
> **Priority:** High
> **Status:** OPEN
> **Sprint:** 3A — Specification only (no implementation, no migration, no data population)
> **Version:** 1.0.0
> **ADR:** [ADR-002](../adr/ADR-002-domain-pack-strategy.md) — Domain Pack Strategy
> **Depends on:** [ADR-001](../adr/ADR-001-recommendation-framework.md) — Core Engine + Domain Pack

---

## Objective

Mendefinisikan spesifikasi format untuk tiga komponen yang ditetapkan di ADR-002:

1. **Domain Pack** — struktur self-contained per assessment type
2. **Assessment Registry** — pemetaan `assessment_id` → `pack_id`
3. **Pack Resolver** — interface resolusi + error contract
4. **Loader** — mekanisme pemuatan pack ke Core Engine saat startup

Spesifikasi ini dirancang agar **kompatibel dengan struktur config Sprint 1**
(`engines/recommendation/config/thresholds.js`, `reasons.js`, `actions.js`)
— data yang sudah ada bisa dimigrasi tanpa mengubah isinya (migrasi = Sprint 3B).

---

## Decision: Format Penyimpanan

**Format: JavaScript (`.js`), di-load via `require()`.**

Alasan:

1. **Konsisten dengan Sprint 1.** SPEC-001 Design Notes #1 (DESIGN-1) menetapkan:
   > "Implementasi MVP menggunakan file JavaScript (thresholds.js, reasons.js,
   > actions.js) yang di-load via `require()`. Tidak ada dependency YAML parser."

   Berganti ke YAML atau JSON akan memperkenalkan dependency parser baru
   (`js-yaml`) tanpa manfaat yang sepadan untuk MVP.

2. **Tidak ada consumer non-developer saat ini.** YAML dipilih jika config
   dikelola oleh product manager atau rubric designer. Saat ini semua config
   diedit oleh developer — `.js` cukup dan tidak menambah friction.

3. **Hot-reload path tetap terbuka.** Jika nanti diperlukan hot-reload,
   `require()` bisa diganti dengan `fs.readFileSync` + `eval` (untuk `.js`)
   atau alternatif watch-based. Keputusan ini tidak menutup opsi tersebut.

> **Future consideration:** Jika rubric designer (non-developer) nanti perlu
> mengedit config secara langsung, migrasi ke YAML bisa di-revisit. Saat itu,
> perubahan hanya di loader — isi pack tidak berubah.

---

## 1. Domain Pack Structure

Setiap domain pack adalah **satu direktori** yang berisi file-file berikut:

```
engines/recommendation/packs/<pack_id>/
├── metadata.js       # Metadata pack (nama, versi, dimensi)
├── thresholds.js     # Threshold map untuk klasifikasi strength/weakness
├── reasons.js        # Reason template catalog (strength + weakness)
└── actions.js        # Action library (satu action per dimensi)
```

### 1a. `metadata.js` — Pack Metadata

File ini **baru** — tidak ada di Sprint 1. Mendefinisikan informasi identitas
pack yang sebelumnya tersirat di struktur config.

```js
// packs/<pack_id>/metadata.js
module.exports = {
  // ── REQUIRED ──────────────────────────────────────────
  pack_id: 'leadership',          // unique identifier (digunakan oleh registry)
  display_name: 'Leadership Assessment',  // nama untuk UI/dashboard
  version: '1.0.0',               // semver pack (bukan engine version)
  dimensions: [                    // daftar dimensi dalam urutan yang diharapkan
    'communication',
    'decisiveness',
    'strategic_thinking',
    'people_development',
    'execution',
  ],

  // ── OPTIONAL ──────────────────────────────────────────
  description: '5-dimensi leadership assessment untuk mid-level manager',
  rubric_version: '2026-Q3',       // versi rubric yang digunakan
  locale: 'id',                    // bahasa default (default: 'id')

  // ── STRATEGY (ADR-004) ─────────────────────────────────
  pack_type: 'threshold',          // label kategori/deskriptif
  scoring_strategy: 'threshold',   // strategi scoring (lihat daftar nilai valid)
  graph_strategy: 'none',          // strategi visualisasi (lihat daftar nilai valid)
  interpretation_strategy: 'threshold', // strategi interpretasi (lihat daftar nilai valid)

  // ── DISPLAY ───────────────────────────────────────────
  labels: {                        // display label per dimensi (wajib — dari Sprint 1)
    communication: 'Communication',
    decisiveness: 'Decisiveness',
    strategic_thinking: 'Strategic Thinking',
    people_development: 'People Development',
    execution: 'Execution',
  },
};
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `pack_id` | string | **yes** | Unique identifier, digunakan sebagai key di registry |
| `display_name` | string | **yes** | Nama untuk UI/dashboard/logging |
| `version` | string | **yes** | Semver pack. Bump rules: MAJOR jika dimensi berubah, MINOR jika threshold berubah, PATCH jika wording template diupdate |
| `dimensions` | string[] | **yes** | Daftar dimension key, dalam insertion order. Digunakan untuk validasi `UNKNOWN_DIMENSION` |
| `labels` | object | **yes** | Map `dimension_key → display_label`. Semua dimension key wajib punya label |
| `description` | string | no | Deskripsi singkat untuk dokumentasi |
| `rubric_version` | string | no | Versi rubric yang digunakan (untuk traceability) |
| `locale` | string | no | Kode bahasa ISO 639-1. Default: `'id'` |
| `pack_type` | string | no | Label kategori/deskriptif (ADR-004). Default: `'threshold'`. Untuk dokumentasi dan filtering — bukan sumber kebenaran perilaku engine. |
| `scoring_strategy` | string | no | Strategi scoring (ADR-004). Default: `'threshold'`. Nilai valid: `'threshold'`, `'disc_dual_profile'`. |
| `graph_strategy` | string | no | Strategi visualisasi (ADR-004). Default: `'none'`. Nilai valid: `'none'`, `'disc_profile'`. |
| `interpretation_strategy` | string | no | Strategi interpretasi (ADR-004). Default: `'threshold'`. Nilai valid: `'threshold'`, `'disc_profile'`. |

### 1b. `thresholds.js` — Threshold Map

Struktur **identik dengan Sprint 1**, tetapi sekarang tanpa wrapper key per type
(karena setiap pack sudah self-contained dalam direktorinya sendiri).

```js
// packs/<pack_id>/thresholds.js
module.exports = {
  strength_threshold: 80,          // ≥ threshold ini → STRENGTH  (0–100)
  weakness_threshold: 55,          // ≤ threshold ini → WEAKNESS  (0–100)
                                   // di antaranya → NEUTRAL (tidak muncul di output)
};
```

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `strength_threshold` | number | **yes** | 0–100 | Skor ≥ nilai ini diklasifikasikan sebagai strength |
| `weakness_threshold` | number | **yes** | 0–100 | Skor ≤ nilai ini diklasifikasikan sebagai weakness |

**Constraint:** `strength_threshold` HARUS > `weakness_threshold`. Jika tidak,
tidak ada zona neutral — setiap skor akan jadi strength ATAU weakness, yang
mungkin tidak diinginkan. Validasi ini dilakukan saat loader membaca pack.

### 1c. `reasons.js` — Reason Template Catalog

Struktur **identik dengan Sprint 1**, tanpa wrapper key per type.

```js
// packs/<pack_id>/reasons.js
module.exports = {
  strengths: {
    communication:
      'Skor {score} menunjukkan kamu komunikator yang efektif — mampu menyampaikan ide dengan jelas dan didengarkan oleh tim.',
    decisiveness:
      'Skor {score} menunjukkan kamu mampu mengambil keputusan dengan cepat dan tepat, bahkan dalam situasi penuh tekanan.',
    // ... satu entry per dimensi
  },
  weaknesses: {
    communication:
      'Skor {score} menunjukkan ada ruang untuk meningkatkan kejelasan komunikasi, terutama dalam menyampaikan visi ke tim.',
    // ... satu entry per dimensi
  },
};
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `strengths` | object | **yes** | Map `dimension_key → template_string`. Setiap dimensi di `metadata.dimensions` wajib punya entry |
| `weaknesses` | object | **yes** | Map `dimension_key → template_string`. Setiap dimensi di `metadata.dimensions` wajib punya entry |
| Template string | string | — | Mengandung placeholder `{score}` yang di-substitusi saat runtime |

**Constraint:** Setiap dimension key yang ada di `metadata.dimensions` HARUS
memiliki entry di `strengths` dan `weaknesses`. Loader memvalidasi ini.

### 1d. `actions.js` — Action Library

Struktur **identik dengan Sprint 1**, tanpa wrapper key per type.

```js
// packs/<pack_id>/actions.js
module.exports = {
  communication: {
    action:
      'Mulai praktikkan active listening: dalam 2 minggu ke depan, di setiap meeting tim, paraphrase balik apa yang disampaikan anggota tim sebelum memberi respons.',
    rationale:
      'Communication adalah dimensi terendah ({score}). Meningkatkan kualitas mendengar adalah langkah pertama yang paling fundamental.',
  },
  // ... satu entry per dimensi
};
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `<dimension_key>.action` | string | **yes** | Aksi konkret yang direkomendasikan. Boleh mengandung `{score}` placeholder |
| `<dimension_key>.rationale` | string | **yes** | Alasan pemilihan aksi. Boleh mengandung `{score}` placeholder |

**Constraint:** Setiap dimension key di `metadata.dimensions` HARUS punya entry
di action library. Loader memvalidasi ini.

### 1e. Pack Completeness Validation

Loader HARUS memvalidasi kelengkapan pack saat startup:

```
FOR EACH pack:
  assert pack_id ada di metadata
  assert dimensions tidak kosong
  assert strength_threshold > weakness_threshold
  FOR EACH dimension IN dimensions:
    assert dimension ada di labels
    assert dimension ada di reasons.strengths
    assert dimension ada di reasons.weaknesses
    assert dimension ada di actions
  // Strategy validation (ADR-004):
  // - If scoring_strategy/graph_strategy/interpretation_strategy are missing
  //   → use defaults: 'threshold' / 'none' / 'threshold' (backward compat)
  // - If present but value is NOT in the supported list → throw INVALID_PACK_CONFIG
  FOR EACH strategy IN [scoring_strategy, graph_strategy, interpretation_strategy]:
    IF strategy is set AND value NOT IN supported_values:
      throw INVALID_PACK_CONFIG: "Unsupported strategy '...' for field '...'"
```

Jika validasi gagal → throw `INVALID_PACK_CONFIG` dengan detail field yang
bermasalah. Engine TIDAK BOLEH start dengan pack yang tidak lengkap.

---

## 2. Assessment Registry

Registry adalah file tunggal yang memetakan `assessment_id` → `pack_id`.

### Format

**File:** `engines/recommendation/registry.js`

```js
// registry.js
module.exports = {
  // Format: "<assessment_id>": { pack: "<pack_id>", version: "<semver>" }
  'assessment-leadership-v2': {
    pack: 'leadership',
    version: '1.0.0',
  },
  'assessment-disc-v1': {
    pack: 'disc',
    version: '0.1.0',
  },
  'assessment-example-enterprise': {
    pack: 'example-custom-pack',
    version: '1.0.0',
  },
};
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Key | string | **yes** | `assessment_id` yang dikirim pipeline. Unique across seluruh registry |
| `pack` | string | **yes** | `pack_id` yang sesuai — harus cocok dengan `metadata.pack_id` dari pack yang ada di `packs/` |
| `version` | string | **yes** | Versi pack yang di-expected. **Wajib** — resolver memvalidasi kecocokan dengan `metadata.version`. |

### Runtime Behavior

```
pipeline mengirim: { assessment_id: "assessment-leadership-v2", scores: {...} }
                      │
                      ▼
registry[assessment_id] → { pack: "leadership", version: "1.0.0" }
                      │
                      ▼
loader.load("leadership") → merged pack config siap di-inject ke engine
```

### Error Cases

| Error Code | Kondisi | Response |
|------------|---------|----------|
| `UNKNOWN_ASSESSMENT` | `assessment_id` tidak ada di registry | `{ "error": "UNKNOWN_ASSESSMENT", "message": "Assessment '...' is not registered." }` |
| `UNRESOLVED_PACK` | `pack_id` dari registry tidak ada di `packs/` | `{ "error": "UNRESOLVED_PACK", "message": "Pack '...' referenced by assessment '...' does not exist." }` |
| `VERSION_MISMATCH` | `registry.version` ≠ `metadata.version` | `{ "error": "VERSION_MISMATCH", "message": "Registry expects pack '...' version X but metadata has version Y." }` |

> **Catatan:** `UNRESOLVED_PACK` seharusnya hanya terjadi saat development
> (registry entry menunjuk ke pack yang belum dibuat). Di production, ini
> adalah error konfigurasi yang harus dicegah oleh CI/CD.
>
> **Catatan:** `VERSION_MISMATCH` adalah validasi murah yang mencegah bug
> diam-diam — misalnya registry diupdate ke versi baru tapi pack belum
> di-deploy, atau sebaliknya. Engine TIDAK BOLEH start dengan version mismatch.

---

## 3. Pack Resolver Interface

Resolver adalah komponen yang menerima `assessment_id` dan mengembalikan
pack config yang sudah di-merge + divalidasi.

### Interface

```js
/**
 * Pack Resolver — resolves assessment_id → validated pack config.
 *
 * @param {string} assessmentId  — dari pipeline (registry key)
 * @returns {object}              — merged pack config (metadata + thresholds + reasons + actions)
 * @throws {UNKNOWN_ASSESSMENT}   — assessment_id tidak terdaftar di registry
 * @throws {UNRESOLVED_PACK}      — pack_id dari registry tidak ditemukan di packs/
 * @throws {VERSION_MISMATCH}     — registry.version ≠ metadata.version
 * @throws {INVALID_PACK_CONFIG}  — pack tidak lolos completeness validation (section 1e)
 */
function resolve(assessmentId) {
  // 1. lookup registry
  // 2. validate registry.version === metadata.version
  // 3. load pack files via loader
  // 4. validate completeness
  // 5. return merged config object
}
```

### Return Value Shape

```js
// Hasil resolve("assessment-leadership-v2"):
{
  // dari metadata.js
  pack_id: 'leadership',
  display_name: 'Leadership Assessment',
  version: '1.0.0',
  dimensions: ['communication', 'decisiveness', 'strategic_thinking', 'people_development', 'execution'],
  labels: { communication: 'Communication', ... },
  // (optional metadata fields ikut disertakan)

  // dari thresholds.js
  strength_threshold: 80,
  weakness_threshold: 55,

  // dari reasons.js
  reasons: {
    strengths: { communication: '...', ... },
    weaknesses: { communication: '...', ... },
  },

  // dari actions.js
  actions: {
    communication: { action: '...', rationale: '...' },
    ...
  },

  // dari metadata.js — strategy fields (ADR-004)
  pack_type: 'threshold',
  scoring_strategy: 'threshold',
  graph_strategy: 'none',
  interpretation_strategy: 'threshold',
}
```

### Contract dengan Core Engine

Core Engine **hanya bergantung pada return value resolver**, bukan pada
implementasi resolver. Ini berarti:

- Core Engine tidak tahu tentang registry
- Core Engine tidak tahu tentang file system
- Core Engine tidak tahu apakah pack berasal dari built-in atau enterprise
- Core Engine HANYA membaca object yang diberikan resolver

Dengan contract ini, resolver bisa di-reimplementasi (misal: load dari DB,
load dari remote API) tanpa mengubah Core Engine.

---

## 4. Loader Mechanism

### Startup Load (MVP)

Pack di-load **sekali saat engine startup**, menggunakan `require()`:

```
Application Start
       │
       ▼
Load registry.js          → map<string, {pack, version}>
       │
       ▼
For each unique pack_id in registry:
  require("./packs/{pack_id}/metadata.js")    → pack metadata
  require("./packs/{pack_id}/thresholds.js")  → threshold config
  require("./packs/{pack_id}/reasons.js")     → reason templates
  require("./packs/{pack_id}/actions.js")     → action library
  validate completeness (section 1e)
       │
       ▼
Build in-memory cache: Map<pack_id, merged config>
       │
       ▼
Engine ready — resolve() reads from cache
```

### Why Startup, Not Hot-Reload

ADR-002 Notes: "Pack Resolver di-load saat startup (bukan hot-reload untuk MVP)."

Alasan:
- **Kesederhanaan.** `require()` dan cache di memori — tidak ada file watcher,
  tidak ada invalidation logic, tidak ada race condition.
- **Determinisme.** SPEC-001 mensyaratkan determinisme. Hot-reload berarti
  threshold bisa berubah di tengah request — output untuk input yang sama
  bisa berbeda, melanggar kontrak determinisme.
- **Operasional.** Config assessment jarang berubah (orde minggu/bulan).
  Restart deploy untuk update config adalah trade-off yang bisa diterima.

### Future: Hot-Reload (Not in MVP)

Jika nanti diperlukan hot-reload (misal: rubric designer perlu iterasi cepat
tanpa deploy), loader bisa diupgrade dengan:

1. Ganti `require()` → `fs.readFileSync` + `vm.runInNewContext` (hindari
   `require.cache` yang tidak bisa di-invalidate)
2. Tambah file watcher (`fs.watch`) di direktori `packs/`
3. Invalidate cache per-pack saat file berubah
4. Re-validate completeness sebelum meng-update cache

Ini adalah future enhancement — **tidak diimplementasikan di Sprint 3.**

---

## Configuration Layout (Target State)

Setelah Sprint 3B (migrasi), struktur direktori target:

```
engines/recommendation/
├── index.js                    # Core Engine (type-agnostic, TIDAK berubah)
├── registry.js                 # Assessment Registry (BARU — Sprint 3A)
├── resolver.js                 # Pack Resolver (BARU — Sprint 3A)
├── loader.js                   # Pack Loader (BARU — Sprint 3A)
│
├── packs/                      # Domain Pack directory (BARU — Sprint 3B migrasi)
│   ├── leadership/             #   ← dimigrasi dari config/ lama
│   │   ├── metadata.js
│   │   ├── thresholds.js
│   │   ├── reasons.js
│   │   └── actions.js
│   ├── disc/                   #   ← baru, Sprint 3C+
│   │   └── ...
│   └── <enterprise-pack>/      #   ← baru, Sprint 3C+
│       └── ...
│
└── config/                     # (DEPRECATED setelah Sprint 3B)
    ├── thresholds.js           #   ← akan dihapus
    ├── reasons.js              #   ← akan dihapus
    └── actions.js              #   ← akan dihapus
```

---

## Migration Path (Sprint 3B — Out of Scope)

Untuk referensi, berikut ringkasan migrasi yang akan dilakukan di Sprint 3B
(bukan bagian dari deliverable Sprint 3A):

1. Buat `packs/leadership/` dengan 4 file dari section 1
2. Pindahkan data dari `config/thresholds.js[leadership]` → `packs/leadership/thresholds.js`
3. Pindahkan data dari `config/reasons.js[leadership]` → `packs/leadership/reasons.js`
4. Pindahkan data dari `config/actions.js[leadership]` → `packs/leadership/actions.js`
5. Buat `packs/leadership/metadata.js` (file baru, data diekstrak dari struktur lama + SPEC-001)
6. Buat `registry.js` dengan entry `assessment-leadership-v2` → `leadership`
7. Update `index.js` untuk menggunakan resolver, bukan baca `config/` langsung
8. Pastikan 22 test case existing tetap PASS
9. Hapus `config/` directory lama

---

## Non-Goals (Sprint 3A)

Spesifikasi ini **tidak mencakup**:

- ❌ Dimensi atau threshold konkret untuk Competency, DISC, atau pack lain (itu Sprint 3C — butuh rubric designer)
- ❌ Nama assessment/client yang menyerupai entitas nyata (gunakan placeholder generik)
- ❌ Implementasi kode resolver/loader/registry
- ❌ Migrasi data Leadership Pack dari format lama ke baru (Sprint 3B)
- ❌ Format hot-reload atau watch-based reload
- ❌ Keputusan terkait pricing, kontrak, atau model bisnis enterprise pack

---

## Open Questions

| # | Question | Context | Resolution |
|---|----------|---------|------------|
| **Q1** | ~~`calibrated_by` / `calibrated_at` di MVP?~~ | — | **Resolved:** Tunda. Dihapus dari spec. |
| **Q2** | ~~Field `deprecated` di registry?~~ | — | **Resolved:** Tunda untuk MVP. |
| **Q3** | ~~Validasi `registry.version` vs `metadata.version`?~~ | — | **Resolved:** Ya. Error `VERSION_MISMATCH` ditambahkan. |
| **Q4** | Apakah resolver perlu caching strategy selain in-memory Map? | MVP: in-memory cukup. Jika jumlah pack >100, bisa jadi bottleneck startup. | **Resolved:** Tunda. In-memory Map cukup untuk skala sekarang. |
| **Q5** | Apakah struktur file pack perlu bergantung pada scoring_strategy? | ADR-004 memperkenalkan pack_type, scoring_strategy, graph_strategy, dan interpretation_strategy, tetapi tidak mendefinisikan apakah setiap strategy memiliki kontrak file yang berbeda. SPEC-002 saat ini masih mendeskripsikan satu struktur file yang sama untuk seluruh pack. | Deferred — keputusan mengenai strategy-specific file contract akan dibahas pada ADR-005 (Strategy Registry and Resolution Framework) atau TASK-025C-B. |

---

## References

- [ADR-001](../adr/ADR-001-recommendation-framework.md) — Core Engine + Domain Pack architecture
- [ADR-002](../adr/ADR-002-domain-pack-strategy.md) — Domain Pack Strategy, Assessment Registry, Pack Resolver
- [ADR-004](../adr/ADR-004-strategy-based-pack-contract.md) — Strategy-Based Pack Contract
- [SPEC-001](../../specs/SPEC-001.md) — DSL dan JSON output format (DESIGN-1: .js config decision)
- `engines/recommendation/index.js` — Core Engine implementation (Sprint 1)
- `engines/recommendation/config/thresholds.js` — Current threshold map (pre-migration)
- `engines/recommendation/config/reasons.js` — Current reason catalog (pre-migration)
- `engines/recommendation/config/actions.js` — Current action library (pre-migration)
- `tests/recommendation-engine.test.js` — 22 test case (must remain passing post-migration)
