# ADR-002: Domain Pack Strategy

| Metadata          | Value                                                                 |
|-------------------|-----------------------------------------------------------------------|
| **Status**        | Accepted                                                              |
| **Date**          | 2026-07-06                                                            |
| **Author**        | Hera (Chief Architect)                                                |
| **Stakeholders**  | Product Team, Ares (Sprint 2 Integration), Business Team              |
| **Supersedes**    | None                                                                  |
| **Superseded by** | None                                                                  |
| **Extends**       | [ADR-001](./ADR-001-recommendation-framework.md) — Core Engine + Domain Pack |

---

## Context

Sprint 2 integrasi Recommendation Engine menemukan blocking issue: pipeline
produksi menggunakan model competency generik (`type="competency"`, competency
ID/name bebas), sementara Recommendation Engine dirancang untuk 5 dimensi
leadership tetap.

Investigasi menunjukkan bahwa **missing layer-nya adalah Pack Resolver** —
engine perlu tahu pack mana yang digunakan, bukan menebak dari input.

Saat ini, engine membaca config langsung berdasarkan `input.type`:
```js
const typeConfig = thresholds[input.type];   // index.js:78
```
Ini bekerja untuk use case tunggal (`type="leadership"`), tapi tidak bisa
menangani skenario di mana satu assessment type bisa datang dari berbagai
sumber (built-in atau enterprise), atau di mana pipeline mengirim type yang
tidak dikenal engine.

---

## Decision

1. **DigitalBuku memiliki katalog assessment resmi (built-in packs) sebagai default (Model A).**
   Assessment yang sudah didefinisikan dan dikalibrasi oleh rubric designer internal.

2. **Enterprise dapat menyediakan custom packs tanpa mengubah Recommendation Engine (ekstensi Model B).**
   Client B2B dengan competency model proprietary bisa mendaftarkan pack mereka sendiri.

3. **Recommendation Engine hanya bergantung pada Pack Interface** (dimensi + skor + threshold),
   bukan jenis assessment. Engine tidak peduli apakah pack berasal dari leadership,
   DISC, atau enterprise — selama memenuhi interface yang sama.

4. **Assessment Builder generik untuk pengguna umum bukan bagian dari roadmap saat ini.**
   Platform bukan SaaS builder. Client memilih assessment dari katalog atau
   menyediakan pack melalui jalur enterprise.

5. **Semua assessment harus diregistrasikan melalui Assessment Registry**
   yang memetakan assessment ke pack. Registry adalah source of truth untuk
   resolusi "assessment mana → pack mana."

---

## Rationale

- **Memisahkan Assessment, Domain Pack, dan Recommendation Engine.**
  Tiga konsep ini saat ini tercampur: engine membaca `input.type` yang sekaligus
  menjadi key config. Dengan registry, pipeline mengirim `assessment_id`, registry
  meresolve ke `pack_id`, engine membaca config dari pack tersebut.

- **Engine tidak perlu tahu apakah pack berasal dari leadership, DISC, atau enterprise.**
  Engine hanya melihat Pack Interface: daftar dimensi, threshold, label, reason
  template, action catalog. Sumber pack tidak relevan bagi engine.

- **Menghindari hardcode assessment type di engine.**
  Saat ini `thresholds[input.type]` secara implisit mengasumsikan bahwa `input.type`
  adalah key yang valid di config. Dengan resolver, engine tidak perlu tahu
  tentang type sama sekali — ia hanya menerima resolved pack.

- **Mendukung skalabilitas ke banyak assessment type tanpa refactor.**
  Menambah assessment baru = menambah entry di registry, bukan mengubah engine.

---

## Architecture

```
               ┌─────────────────────────┐
               │     Pipeline Produksi     │
               │  mengirim:                │
               │  - assessment_id          │
               │  - scores                 │
               └────────────┬──────────────┘
                            │
                            ▼
               ┌─────────────────────────┐
               │   ASSESSMENT REGISTRY    │  ← source of truth
               │                          │
               │  assessments:            │
               │    leadership-v2:        │
               │      pack: builtin/lead  │
               │    disc-v1:              │
               │      pack: builtin/disc  │
               │    custom-competency:    │
               │      pack: ent/custom    │
               └────────────┬─────────────┘
                            │
                            ▼  (resolved pack_id)
               ┌─────────────────────────┐
               │     PACK RESOLVER        │
               │  - lookup registry       │
               │  - load domain pack      │
               │  - inject ke engine      │
               └────────────┬─────────────┘
                            │
                            ▼  (pack config: dimensions, thresholds, reasons, actions)
               ┌─────────────────────────┐
               │   RECOMMENDATION ENGINE  │
               │   (Core Engine —         │
               │    type-agnostic)        │
               │                          │
               │  Validation              │
               │  Classification          │
               │  NBA Selection           │
               │  Output Builder          │
               └─────────────────────────┘
```

**Contoh ilustrasi Assessment Registry:**

```yaml
# Format final ditentukan di Sprint 3A (YAML/JSON/JS)
assessments:
  leadership-v2:
    pack: builtin/leadership
    version: "1.0.0"
  disc-v1:
    pack: builtin/disc
  custom-competency:
    pack: enterprise/custom-pack
    client: "acme-corp"
```

---

## Consequences

### Positif

- **Missing layer teridentifikasi dan akan diisi.** Pack Resolver adalah
  abstraksi yang selama ini tersirat (engine membaca `input.type`) tapi
  tidak pernah eksplisit sebagai komponen arsitektur.
- **Pipeline dan engine terdecouple sepenuhnya.** Pipeline tidak perlu
  tahu dimensi apa yang valid — ia hanya mengirim `assessment_id` + `scores`.
- **Enterprise pack menjadi first-class citizen.** Tidak ada perbedaan
  teknis antara built-in dan enterprise — hanya berbeda di registry entry.

### Negatif / Risiko

- **Butuh sprint tambahan.** Pack Resolver + Assessment Registry adalah
  komponen baru yang tidak ada di Sprint 1-2. Ini menambah scope sebelum
  integrasi produksi.
- **Migrasi Leadership Pack.** Domain pack leadership yang sudah ada
  (thresholds.js, reasons.js, actions.js) perlu di-migrasi ke format baru.
- **Registry sebagai single point of failure.** Jika registry error atau
  mapping不存在, engine tidak bisa meresolve pack. Perlu error handling
  yang jelas (`UNKNOWN_ASSESSMENT`, `UNRESOLVED_PACK`).

### Sprint Breakdown

| Sprint | Deliverable | Detail |
|--------|-------------|--------|
| **Sprint 3A** | Spesifikasi Domain Pack | Struktur pack, registry format, resolver interface, loader |
| **Sprint 3B** | Migrasi Leadership Pack | Pindahkan config leadership ke format pack baru, pastikan backward compat |
| **Sprint 3C** | Enterprise Pack pertama | Menggunakan data competency yang sudah ada di pipeline sebagai pack enterprise |
| **Sprint 4** | Integrasi pipeline | Hubungkan pipeline → registry → resolver → engine |

---

## Related

- **Extends:** [ADR-001](./ADR-001-recommendation-framework.md) — Recommendation Framework
- **Related to:** TASK-001 (SPEC-001)
- **Related to:** Sprint 2 Integration Investigation

---

## Notes

- Assessment Registry adalah **konsep konfigurasi**; format penyimpanan
  (YAML/JSON/JS) akan ditentukan di Sprint 3A.
- Pack Resolver di-load saat startup (bukan hot-reload untuk MVP).
- Contoh ilustrasi registry (format final TBD di Sprint 3A):

  ```yaml
  assessments:
    leadership-v2:
      pack: builtin/leadership
    disc-v1:
      pack: builtin/disc
    custom-competency:
      pack: enterprise/custom-pack
  ```

---

## References

- [ADR-001](./ADR-001-recommendation-framework.md) — Core Engine + Domain Pack
- `specs/SPEC-001.md` — Format DSL dan JSON output
- `engines/recommendation/index.js` — Core Engine implementation
- `engines/recommendation/config/thresholds.js` — Current threshold map
- `engines/recommendation/config/reasons.js` — Current reason catalog
- `engines/recommendation/config/actions.js` — Current action library
