# SPEC-001

> **Title:** Recommendation Framework — MVP Format Output (Leadership Domain Pack)
> **Author:** Hera (Chief Architect)
> **Assignee:** Ares
> **Priority:** High
> **Status:** OPEN
> **Parent Task:** TASK-001
> **Version:** 1.1.0
> **ADR:** [ADR-001](../docs/adr/ADR-001-recommendation-framework.md) — Core Engine + Domain Pack architecture

---

## Objective

Menentukan format DSL dan JSON output untuk **Recommendation Framework** —
arsitektur universal Core Engine + Domain Pack sebagaimana diputuskan di
[ADR-001](../docs/adr/ADR-001-recommendation-framework.md).

**Leadership adalah Domain Pack pertama** yang diimplementasikan dalam MVP ini.
Domain pack lain (Competency, DISC, Sales, CPNS, UTBK) akan ditambahkan
sebagai entry di file config tanpa mengubah kode Core Engine.

**Must-have properties:**
- **Deterministic** — input yang sama selalu menghasilkan output yang identik
- **Explainable** — setiap rekomendasi disertai reasoning yang bisa ditelusuri
- **Versioned** — output memiliki field `version` agar bisa evolve tanpa break existing client
- **Reusable** — engine tidak terikat ke satu tipe assessment; bisa dipakai ulang untuk tipe lain
- **No LLM as decision maker** — semua keputusan berbasis rule engine (threshold map + template lookup)

---

## Architecture

Recommendation Framework menggunakan arsitektur **Core Engine + Domain Pack**.
Core Engine berisi pipeline processing yang type-agnostic; Domain Pack berisi
semua domain knowledge (threshold, dimensi, label, reason template, action catalog).

```
 ┌──────────────────────────────────────────────────────────────┐
 │                   RECOMMENDATION FRAMEWORK                    │
 │                                                              │
 │  ┌─────────────────────┐                                     │
 │  │  Assessment Result   │                                     │
 │  │  (DTO JSON input)    │                                     │
 │  └──────────┬───────────┘                                     │
 │             │                                                 │
 │             ▼                                                 │
 │  ┌──────────────────────────────────────────────────────┐    │
 │  │                 CORE ENGINE                           │    │
 │  │  (type-agnostic — tidak pernah berubah per domain)    │    │
 │  │                                                       │    │
 │  │  ┌─────────────────┐   ┌────────────────────────┐    │    │
 │  │  │   Validation     │   │   Classification        │    │    │
 │  │  │  - score range   │   │  - strength / weakness  │    │    │
 │  │  │  - dimension     │   │  - neutral filtering    │    │    │
 │  │  │  - empty input   │   │                         │    │    │
 │  │  └────────┬────────┘   └───────────┬─────────────┘    │    │
 │  │           │                        │                   │    │
 │  │  ┌────────┴────────────────────────┴─────────────┐    │    │
 │  │  │   Threshold Evaluation + Reason Builder        │    │    │
 │  │  │  - lookup config via input.type                │    │    │
 │  │  │  - template substitution {score}               │    │    │
 │  │  └──────────────────────┬────────────────────────┘    │    │
 │  │                         │                              │    │
 │  │  ┌──────────────────────┴────────────────────────┐    │    │
 │  │  │   Next Best Action + Output Builder            │    │    │
 │  │  │  - dimensi terendah → action                   │    │    │
 │  │  │  - JSON assembly + versioning                  │    │    │
 │  │  └───────────────────────────────────────────────┘    │    │
 │  └──────────────────────────┬───────────────────────────┘    │
 │                              │                                │
 │                              ▼                                │
 │  ┌──────────────────────────────────────────────────────┐    │
 │  │                 DOMAIN PACK                            │    │
 │  │  (domain knowledge — bertambah tanpa ubah Core)       │    │
 │  │                                                       │    │
 │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │    │
 │  │  │  Leadership   │  │  Competency   │  │    DISC      │ │    │
 │  │  │  ✅ MVP       │  │  🔜 needed   │  │   future     │ │    │
 │  │  │               │  │               │  │              │ │    │
 │  │  │  thresholds   │  │  thresholds   │  │  thresholds  │ │    │
 │  │  │  reasons      │  │  reasons      │  │  reasons     │ │    │
 │  │  │  actions      │  │  actions      │  │  actions     │ │    │
 │  │  └──────────────┘  └──────────────┘  └─────────────┘ │    │
 │  │                                                       │    │
 │  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │    │
 │  │  │    Sales      │  │    CPNS       │  │    UTBK      │ │    │
 │  │  │   future      │  │   future      │  │   future     │ │    │
 │  │  └──────────────┘  └──────────────┘  └─────────────┘ │    │
 │  └──────────────────────────────────────────────────────┘    │
 └──────────────────────────────────────────────────────────────┘
```

**Alur kerja:**
1. Engine menerima DTO hasil assessment (skor per dimensi).
2. Validation layer memeriksa range skor (0–100), dimensi yang dikenal, dan input kosong — menggunakan config dari Domain Pack yang sesuai dengan `input.type`.
3. Core Engine mengklasifikasikan setiap skor berdasarkan **threshold map** dari Domain Pack.
4. Untuk setiap klasifikasi, Core Engine menarik **reason template** dari Domain Pack dan melakukan substitusi variable `{score}`.
5. `next_best_action` dipilih dari **action library** Domain Pack berdasarkan dimensi dengan skor terendah.
6. Output dikemas dengan field `version` mengikuti semver.

**Tidak ada randomness, tidak ada AI/LLM call, tidak ada dependency eksternal runtime.** Murni lookup table + template substitution.

**Pipeline tidak melakukan crosswalk semantik apapun.** Pipeline hanya mengirim `type` dan `scores`; semua domain knowledge (threshold, dimensi valid, template alasan, katalog aksi) berada di Domain Pack. Lihat [ADR-001](../docs/adr/ADR-001-recommendation-framework.md) untuk detail arsitektur.

---

## Input JSON

```json
{
  "assessment_id": "asmt_4f8a2c",
  "user_id": "user_901",
  "type": "leadership",
  "completed_at": "2026-07-05T10:30:00Z",
  "scores": {
    "communication": 72,
    "decisiveness": 65,
    "strategic_thinking": 81,
    "people_development": 48,
    "execution": 70
  }
}
```

### Field Specification

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `assessment_id` | string | yes | ID unik assessment, untuk tracing dan audit |
| `user_id` | string | yes | ID user yang di-assess |
| `type` | string | yes | Tipe assessment. MVP: `"leadership"` |
| `completed_at` | string (ISO 8601) | no | Timestamp penyelesaian assessment |
| `scores` | object | yes | Map dimensi → skor integer (0–100) |

### Dimensi Leadership (MVP)

| Key | Label (display) |
|-----|-----------------|
| `communication` | Communication |
| `decisiveness` | Decisiveness |
| `strategic_thinking` | Strategic Thinking |
| `people_development` | People Development |
| `execution` | Execution |

---

## Output JSON

```json
{
  "version": "1.0.0",
  "generated_at": "2026-07-05T10:30:01Z",
  "assessment_id": "asmt_4f8a2c",
  "type": "leadership",
  "strengths": [
    {
      "dimension": "strategic_thinking",
      "score": 81,
      "label": "Strategic Thinking",
      "reason": "Skor 81 menunjukkan kamu mampu melihat gambaran besar dan menyusun rencana jangka panjang dengan baik. Ini adalah fondasi penting dalam peran leadership."
    }
  ],
  "weaknesses": [
    {
      "dimension": "people_development",
      "score": 48,
      "label": "People Development",
      "reason": "Skor 48 berada di bawah threshold pengembangan tim. Ini bisa menjadi penghambat dalam membangun tim yang mandiri dan resilient."
    },
    {
      "dimension": "decisiveness",
      "score": 65,
      "label": "Decisiveness",
      "reason": "Skor 65 masih dalam zona menengah — ada ruang untuk meningkatkan kecepatan dan ketegasan dalam mengambil keputusan."
    }
  ],
  "next_best_action": {
    "focus_dimension": "people_development",
    "label": "People Development",
    "action": "Jadwalkan sesi 1-on-1 mingguan dengan 3 direct report untuk mendiskusikan growth plan mereka. Target: dalam 4 minggu pertama.",
    "rationale": "People Development adalah dimensi terendah (48). Membangun kebiasaan coaching rutin adalah langkah konkret pertama yang bisa langsung dijalankan."
  }
}
```

### Output Field Specification

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Semver format output (`1.0.0`). Client wajib membaca ini sebelum parse. |
| `generated_at` | string (ISO 8601) | Timestamp saat rekomendasi di-generate |
| `assessment_id` | string | ID assessment (echo dari input) |
| `type` | string | Tipe assessment (echo dari input) |
| `strengths[]` | array | Dimensi yang skor-nya ≥ strength_threshold |
| `weaknesses[]` | array | Dimensi yang skor-nya ≤ weakness_threshold |
| `next_best_action` | object | Satu aksi prioritas untuk dimensi terendah. `null` jika input kosong. |

### Strength/Weakness Item

| Field | Type | Description |
|-------|------|-------------|
| `dimension` | string | Key dimensi (dari input) |
| `score` | integer | Skor asli dari input |
| `label` | string | Label display dimensi |
| `reason` | string | Penjelasan dari template catalog yang sudah di-substitusi |

### Next Best Action Item

| Field | Type | Description |
|-------|------|-------------|
| `focus_dimension` | string | Key dimensi yang jadi fokus |
| `label` | string | Label display dimensi |
| `action` | string | Aksi konkret yang direkomendasikan |
| `rationale` | string | Alasan pemilihan aksi ini |

---

## Processing Flow

### Step 1: Validate Input
```
IF scores is empty → return empty output
IF any score < 0 OR score > 100 → raise INVALID_SCORE_RANGE
IF any dimension key NOT in allowed_dimensions → raise UNKNOWN_DIMENSION
```

### Step 2: Classify Each Dimension
```
FOR EACH (dimension, score) IN scores:
    IF score >= STRENGTH_THRESHOLD   → classify as STRENGTH
    ELSE IF score <= WEAKNESS_THRESHOLD → classify as WEAKNESS
    ELSE                              → classify as NEUTRAL (don't include in output)
```

### Step 3: Build Strengths & Weaknesses Arrays
```
FOR EACH STRENGTH:
    lookup reason_template = catalog.strength_reasons[dimension]
    apply substitution: {score} → score value
    append to strengths[]

FOR EACH WEAKNESS:
    lookup reason_template = catalog.weakness_reasons[dimension]
    apply substitution: {score} → score value
    append to weaknesses[]
```

### Step 4: Select Next Best Action
```
IF scores is empty → next_best_action = null
ELSE:
    min_dimension = dimension with lowest score
    (tie-break: first in input order — deterministic)
    lookup action = catalog.actions[min_dimension]
    apply substitution: {score} → score value
    set next_best_action
```

### Step 5: Build & Return Output
```
assemble final JSON with version, generated_at, assessment_id, type,
strengths, weaknesses, next_best_action
```

---

## Design Notes

### 1. Threshold Configuration (Externalized)

Threshold **tidak hardcode di kode**. Disimpan di file konfigurasi terpisah agar
bisa di-tuning tanpa deploy ulang.

**Implementasi MVP menggunakan file JavaScript** (`thresholds.js`, `reasons.js`, `actions.js`)
yang di-load via `require()`. Tidak ada dependency YAML parser.

Struktur konfigurasi (dalam JavaScript):

```js
// config/thresholds.js
module.exports = {
  leadership: {
    strength_threshold: 80,    // ≥ 80 → strength
    weakness_threshold: 55,    // ≤ 55 → weakness
                               // 56–79 → neutral (tidak muncul)
    dimensions: ['communication', 'decisiveness', 'strategic_thinking', 'people_development', 'execution'],
    labels: { communication: 'Communication', /* ... */ },
  },
};
```

> **Future enhancement:** Migrasi ke YAML apabila konfigurasi nanti dikelola oleh
> non-developer (misal: product manager atau rubric designer). Saat ini `.js` cukup
> karena config hanya diedit oleh developer.

### 2. Reason Template Catalog (Externalized)

Setiap dimensi memiliki minimal 2 template: satu untuk strength, satu untuk weakness.
Template menggunakan placeholder `{score}` yang di-substitusi saat runtime.

**MVP: File JavaScript** (`reasons.js`) — sama seperti thresholds, di-load via `require()`.

```js
// config/reasons.js
module.exports = {
  leadership: {
    strengths: {
      communication: "Skor {score} menunjukkan kamu komunikator yang efektif — mampu menyampaikan ide dengan jelas dan didengarkan oleh tim.",
      // ... per dimensi
    },
    weaknesses: {
      communication: "Skor {score} menunjukkan ada ruang untuk meningkatkan kejelasan komunikasi, terutama dalam menyampaikan visi ke tim.",
      // ... per dimensi
    },
  },
};
```

### 3. Action Library (Externalized)

Setiap dimensi memiliki **1 action default** untuk MVP. Action dipilih berdasarkan
dimensi dengan skor terendah.

**MVP: File JavaScript** (`actions.js`) — di-load via `require()`.

```js
// config/actions.js
module.exports = {
  leadership: {
    communication: {
      action: "Mulai praktikkan active listening: dalam 2 minggu ke depan, di setiap meeting tim, paraphrase balik apa yang disampaikan anggota tim sebelum memberi respons.",
      rationale: "Communication adalah dimensi terendah ({score}). Meningkatkan kualitas mendengar adalah langkah pertama yang paling fundamental.",
    },
    // ... per dimensi
  },
};
```

### 4. Determinism Guarantee

- Tidak ada `random()`, `Math.random()`, atau randomness source apapun.
- Tidak ada AI/LLM API call.
- Tidak ada timestamp yang dijadikan seed.
- Tidak ada dependency eksternal runtime (no DB query selain baca config, no HTTP call).
- Tie-break untuk next_best_action: urutan pertama dalam input iteration order (deterministic by spec).
- **Unit test harus bisa assert: input A → output B, selalu identik.**

### 5. Versioning Contract

Output selalu mengandung field `version` dengan format semver (`MAJOR.MINOR.PATCH`):

| Change Type | Bump | Example |
|-------------|------|---------|
| Field mandatory dihapus, tipe field berubah, field di-rename | MAJOR | `1.x.x` → `2.0.0` |
| Field optional baru ditambahkan | MINOR | `1.0.x` → `1.1.0` |
| Wording template diupdate (tidak ada perubahan struktur) | PATCH | `1.0.0` → `1.0.1` |

Client **wajib** memeriksa `version` sebelum melakukan parsing payload.

### 6. Reusability Design (Domain Pack Architecture)

Engine tidak terikat ke tipe `leadership`. Framework menggunakan arsitektur
**Core Engine + Domain Pack** sebagaimana diputuskan di
[ADR-001](../docs/adr/ADR-001-recommendation-framework.md).

Untuk menambah tipe assessment baru (misal: `competency`, `disc`), cukup:

1. Tambah entry di `thresholds.js` (threshold, dimensi, label per tipe)
2. Tambah entry di `reasons.js` (template strength + weakness per tipe + dimensi)
3. Tambah entry di `actions.js` (action + rationale per tipe + dimensi)

**Kode Core Engine tidak perlu diubah.** Hanya config Domain Pack yang bertambah.

### 7. Bahasa Output

Untuk MVP, semua reason text dan action text dalam **Bahasa Indonesia**.
Ke depannya, file config bisa di-split per locale (`reasons_id.js`, `reasons_en.js`).

---

## Error Handling

| Error Code | Kondisi | HTTP Status | Response |
|------------|---------|-------------|----------|
| `INVALID_SCORE_RANGE` | Ada skor < 0 atau > 100 | 422 | `{"error": "INVALID_SCORE_RANGE", "message": "Score for '{dimension}' is {value}. Must be 0–100."}` |
| `UNKNOWN_DIMENSION` | Dimensi tidak dikenal untuk tipe assessment | 422 | `{"error": "UNKNOWN_DIMENSION", "message": "Dimension '{dimension}' is not valid for assessment type '{type}'."}` |
| `EMPTY_SCORES` | `scores` object kosong (`{}`) | 200 | Output valid dengan `strengths: []`, `weaknesses: []`, `next_best_action: null` |
| `UNSUPPORTED_TYPE` | `type` belum dikonfigurasi | 422 | `{"error": "UNSUPPORTED_TYPE", "message": "Assessment type '{type}' is not supported yet."}` |

### Empty Input Behavior

```json
// INPUT
{ "assessment_id": "...", "user_id": "...", "type": "leadership", "scores": {} }

// OUTPUT
{
  "version": "1.0.0",
  "generated_at": "2026-07-05T10:30:01Z",
  "assessment_id": "...",
  "type": "leadership",
  "strengths": [],
  "weaknesses": [],
  "next_best_action": null
}
```

Empty input **bukan error**. Ini valid case yang harus di-handle dengan graceful degradation.

---

## Open Questions

| # | Question | Context / Options |
|---|----------|-------------------|
| **Q1** | Apakah threshold 80/55 sudah final? | Perlu validasi dengan data historis assessment Leadership. Bisa jadi perlu disesuaikan setelah lihat distribusi skor aktual. |
| **Q2** | Apakah `next_best_action` cukup 1, atau perlu top-N? | MVP pilih 1 (dimensi terendah). Kalau user research minta lebih, iterasi berikutnya bisa jadi array ranked. |
| **Q3** | Apakah perlu field `confidence` atau `severity` di weakness? | Berguna untuk dashboard visual, tapi menambah kompleksitas. Tunda untuk MVP. |
| **Q4** | Apakah 5 dimensi Leadership di atas sudah eksak sesuai rubrik assessment di platform? | Perlu konfirmasi ke tim product/rubric designer. Jangan sampai dimensi engine berbeda dengan UI assessment. |
| **Q5** | Deployment model: library dalam monolith, atau microservice REST? | Kalau monolith → cukup jadi package/module. Kalau microservice → perlu OpenAPI spec + endpoint definition. |
| **Q6** | Apakah config file (thresholds, reasons, actions) di-load saat startup atau hot-reload? | Startup load lebih sederhana untuk MVP. Hot-reload bisa ditambah nanti. |
| **Q7** | Apakah perlu persistence (menyimpan hasil rekomendasi ke DB)? | MVP: stateless, return JSON langsung. Kalau nanti perlu history/audit trail, bisa ditambah. |
