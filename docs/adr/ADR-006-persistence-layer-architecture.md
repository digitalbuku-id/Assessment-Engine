# ADR-006: Persistence Layer Architecture

| Metadata          | Value                                                  |
|--------------------|---------------------------------------------------------|
| **Status**        | Proposed (menunggu PO approval)                          |
| **Date**          | 2026-07-30                                               |
| **Author**        | Hera (Chief Architect)                                   |
| **Extends**       | [ADR-001](./ADR-001-recommendation-framework.md) — Core Engine + Domain Pack |
| **Related**       | [ADR-004](./ADR-004-strategy-based-pack-contract.md), [ADR-005](./ADR-005-strategy-resolution-runtime-contract.md), [SPEC-002](../specs/SPEC-002-domain-pack-format.md) |

---

## Context

Sampai commit `7ee1955`, proyek punya dua bagian yang sudah matang tapi
**belum pernah terhubung**:

1. **Recommendation Layer** (`engines/recommendation/`) — Core Engine +
   Domain Pack, lengkap dengan strategy contract (ADR-004/005), sudah
   diverifikasi lewat 32 test case. Murni domain logic — tidak tahu
   apa-apa soal HTTP, database, atau I/O eksternal.
2. **Database schema** (`supabase/migrations/`) — tabel
   `assessment_sessions`, `assessment_results`, `assessment_reports`,
   `users`, `feedback`, `analytics_events`, `experiments`,
   `assessment_feedback` sudah ter-deploy ke Supabase remote.

Audit langsung (`git grep "supabase" -- "*.js" ":!supabase/*"`) mengonfirmasi
**tidak ada satu baris kode pun** yang menghubungkan keduanya. Tidak ada
persistence layer, tidak ada API endpoint, tidak ada service yang
memanggil engine lalu menyimpan hasilnya.

Sebelum menulis kode untuk menutup gap ini, perlu diputuskan dulu:

1. **Siapa yang boleh bicara langsung ke Supabase** — Recommendation
   Engine sendiri, sebuah layer terpisah, atau langsung dari browser?
2. **Kredensial mana yang dipakai** — `anon` key (browser-safe, tunduk
   RLS) atau `service_role` key (bypass RLS, harus tetap di server)?
3. **Di mana logic orkestrasi hidup** — "buat session → jalankan engine →
   simpan hasil → simpan report" itu tanggung jawab siapa?

## Decision

### D1. Recommendation Engine tetap murni domain logic

Engine (`loader.js`, `resolver.js`, `index.js`, seluruh `packs/`) **tidak
boleh** mengimpor client Supabase atau melakukan I/O eksternal apa pun.
Kontraknya tetap: terima input skor/respons → kembalikan hasil terstruktur
(object JS). Ini menjaga apa yang sudah dibangun di ADR-001 (Core Engine
type-agnostic) — engine bisa dites tanpa database, dan bisa dipakai ulang
kalau nanti ada backend/platform lain.

### D1.1. Dependency hanya boleh mengalir satu arah

```
Presentation (HTTP API)
      ↓
Application (AssessmentRunService)
      ↓
Domain (Recommendation Engine)
```

`Infrastructure` (persistence, Supabase client) diakses **oleh**
Application, **tidak pernah** dipanggil langsung oleh Domain. Secara
konkret: tidak boleh ada `require(...)` dari `engines/recommendation/`
menuju `src/infrastructure/` dalam bentuk apa pun — arah panah hanya
boleh sebaliknya (Infrastructure/Application memanggil Domain, bukan
Domain memanggil Infrastructure).

### D2. Persistence layer terpisah, di belakang backend Node

Arsitektur akses:

```
Browser
   |
   v
Assessment API (Node)
   |
   +--> Recommendation Engine  (domain logic, no I/O)
   |
   +--> Persistence Service --> Supabase
```

**Bukan** `Browser -> Supabase` langsung. Alasan:

- `service_role` key tidak pernah menyentuh browser — hanya dipegang
  server. Ini menghindari kelas risiko yang sama seperti insiden IDOR
  yang pernah dibahas (kasus Medvi) — akses data tidak boleh bergantung
  hanya pada RLS policy yang mungkin luput direview.
- Logic scoring/interpretasi tetap privat di server, tidak terekspos ke
  client-side JS yang bisa dibaca siapa pun.
- Observability (completion rate, error rate — metrik validasi yang
  sudah ditetapkan) lebih mudah diimplementasikan di satu titik masuk
  (API), dibanding tersebar di banyak call langsung dari browser.

### D3. Struktur folder (ilustratif — lokasi persis adalah keputusan implementasi)

Repository adalah **abstraksi/interface**, bukan sinonim untuk Supabase —
Application Service memanggil repository, repository yang tahu detail
Supabase (bukan sebaliknya dipanggil sebagai "Supabase" secara langsung):

```
AssessmentRunService (Application)
        |
        v
AssessmentSessionRepository (interface/kontrak)
        |
        v
SupabaseAssessmentSessionRepository (implementasi konkret)
```

Alasan: kalau nanti pindah dari Supabase ke Postgres biasa/Neon/provider
lain, yang berubah hanya implementasi repository — Application Service
dan Domain tidak tersentuh.

Mengikuti prinsip yang sama seperti ADR-005 D1 (lokasi file bukan
keputusan ADR, hanya polanya):

```
src/infrastructure/persistence/
  supabase-client.js                        # satu-satunya titik require('@supabase/supabase-js')
  supabase-assessment-session.repository.js # implementasi konkret
  supabase-assessment-result.repository.js
  supabase-assessment-report.repository.js

src/application/
  assessment-run.service.js        # orkestrasi: createSession -> runEngine -> saveResults -> saveReport
                                    # bergantung pada interface repository, bukan Supabase langsung
```

Hanya file `supabase-*.repository.js` dan `supabase-client.js` yang boleh
mengimpor SDK Supabase secara langsung. Application Service tidak pernah
mengimpor `@supabase/supabase-js`.

### D4. Kredensial: `service_role`, disimpan sebagai environment variable server-side

`SUPABASE_SERVICE_ROLE_KEY` **tidak pernah**:
- di-commit ke Git (termasuk tidak di `supabase/config.toml`)
- dikirim ke response API apa pun
- digunakan di kode yang bisa di-bundle ke frontend

### D5. Urutan implementasi (referensi untuk task berikutnya, bukan bagian dari keputusan arsitektur ini)

1. Persistence Adapter — repository murni CRUD, tanpa business logic.
2. Application Service — orkestrasi alur assessment→scoring→save.
3. HTTP API — expose sebagai endpoint yang dipanggil frontend.
4. Observability — analytics_events, error logging.

Detail per-sprint (nama function persis, shape response API, dll)
**bukan** bagian dari ADR ini — itu keputusan implementasi/task yang
menyusul, sama seperti ADR-005 D5 sengaja tidak menetapkan skema file
DISC secara rinci.

### D6. Migration Policy

Skema database **hanya** boleh berubah lewat `supabase/migrations/`
(file SQL ter-versi, sama seperti yang sudah berjalan sejak commit
`0808edc`/`7ee1955`). Application Service maupun Repository **tidak
boleh**:
- Menjalankan `CREATE TABLE`, `ALTER TABLE`, atau DDL apa pun saat runtime
- Membuat tabel secara implisit/otomatis berdasarkan kondisi kode

Ini mencegah schema drift yang tidak terlacak di Git — konsisten dengan
prinsip yang sama yang mendasari governance ADR/SPEC di proyek ini.

## Non-Goals

ADR ini **tidak** menentukan:

- Bentuk/kontrak REST API (path, verb, shape request-response) — itu
  keputusan Sprint P-3 (HTTP API)
- Skema tabel `analytics_events` secara rinci (event apa saja yang
  dicatat) — itu keputusan Sprint P-4 (Observability)
- RLS policy — bergantung pada apakah ada akses langsung dari browser
  di masa depan (saat ini tidak ada, karena D2 memilih backend-mediated)
- Retry mechanism atau transaction boundary untuk operasi multi-tabel
  (mis. apakah `saveResults` + `saveReport` harus atomik)
- Interface/nama fungsi persis di tiap repository — itu keputusan
  implementasi Sprint P-1

Kalau nanti ada kebutuhan yang menyentuh area di atas, itu diputuskan
lewat task/ADR terpisah, bukan diasumsikan dari ADR ini.

## Alternatives Considered

- **Browser langsung ke Supabase dengan `anon` key + RLS policy:**
  ditolak untuk MVP — menambah permukaan risiko (policy harus benar
  sejak awal, tidak ada titik audit terpusat), dan menunda observability
  terpusat. Bisa dipertimbangkan lagi nanti untuk fitur read-only
  tertentu (mis. status realtime), tapi bukan untuk write path utama.
- **Recommendation Engine langsung mengimpor Supabase client:**
  ditolak — melanggar separation of concerns yang sudah dibangun di
  ADR-001/004/005, membuat engine tidak bisa dites/dipakai ulang tanpa
  database.

## Consequences

**Positive:**
- Kredensial sensitif (`service_role`) terisolasi di satu tempat.
- Engine tetap portable dan mudah dites — tidak ada perubahan pada
  kontrak yang sudah Accepted di ADR-004/005.
- Titik audit tunggal untuk seluruh write path ke database.

**Negative:**
- Perlu server Node yang running (bukan cuma static frontend) — sedikit
  menambah kompleksitas deployment dibanding Supabase langsung dari
  browser.
- Empat sprint (D5) adalah pekerjaan baru yang belum pernah ada — ini
  bukan sekadar "menghubungkan yang sudah ada", tapi menulis modul baru.

**Risk:**
- Kalau `service_role` key bocor lewat kesalahan konfigurasi
  environment variable di deployment, dampaknya lebih besar daripada
  kebocoran `anon` key (bypass RLS sepenuhnya) — perlu kehati-hatian
  ekstra saat setup deployment (Sprint P-3/P-4).

## Status

**Proposed** — menunggu PO approval sebelum Sprint P-1 (Persistence
Adapter) dijalankan.

## References

- [ADR-001](./ADR-001-recommendation-framework.md) — Core Engine + Domain Pack architecture
- [ADR-004](./ADR-004-strategy-based-pack-contract.md) — Strategy-Based Pack Contract
- [ADR-005](./ADR-005-strategy-resolution-runtime-contract.md) — Strategy Resolution and Runtime Contract
- `supabase/migrations/` — schema yang sudah ter-deploy
- `engines/recommendation/` — Recommendation Layer, tidak berubah oleh ADR ini
- Audit `git grep "supabase" -- "*.js" ":!supabase/*"` (2026-07-30) — 0 hasil, konfirmasi belum ada kode integrasi sebelum ADR ini
