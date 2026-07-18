# ADR-005: Strategy Resolution and Runtime Contract

| Metadata          | Value                                                |
|--------------------|-------------------------------------------------------|
| **Status**        | Proposed (menunggu PO approval)                       |
| **Date**          | 2026-07-15                                            |
| **Author**        | Hera (Chief Architect)                                |
| **Extends**       | [ADR-004](./ADR-004-strategy-based-pack-contract.md) — Strategy-Based Pack Contract |
| **Depends on**    | [SPEC-002](../specs/SPEC-002-domain-pack-format.md) §1e, §2, §3 |
| **Related**       | `engines/recommendation/{loader,resolver,registry}.js`, `tests/loader-resolver.test.js` |

> **Catatan format:** ADR ini mengikuti format tabel metadata sesuai
> konvensi awal proyek (lihat ADR-002). ADR-004 sebelumnya memakai format
> bullet-list yang sedikit menyimpang dari konvensi ini — tidak perlu
> direvisi retroaktif, tapi ADR selanjutnya sebaiknya kembali ke format
> tabel supaya konsisten.

---

## Context

ADR-004 (Accepted) memperkenalkan 4 field strategy di pack metadata
(`pack_type`, `scoring_strategy`, `graph_strategy`, `interpretation_strategy`)
tapi secara eksplisit **tidak** memutuskan bagaimana engine menemukan,
memvalidasi, dan menjalankan strategy tersebut — itu didokumentasikan
sebagai scope ADR-005 (lihat ADR-004 §Future Work) dan sebagai Q5 di
SPEC-002 (§Open Questions).

Audit langsung terhadap implementasi yang sudah berjalan
(`engines/recommendation/{loader,resolver}.js` dan
`tests/loader-resolver.test.js`) menemukan tiga hal yang perlu
diformalkan sebelum DISC (atau pack non-threshold lainnya) dapat
diimplementasikan dengan aman:

1. **Tidak ada validasi apa pun untuk strategy field saat ini.**
   `_validateCompleteness()` di `loader.js` hanya memvalidasi struktur
   lama (pack_id, dimensions, threshold, labels/reasons/actions).
   SPEC-002 (hasil TASK-025C-A) sudah mendokumentasikan aturan validasi
   strategy field, tapi **kode belum mengimplementasikannya** — SPEC dan
   implementasi sudah tidak selaras.

2. **Pola error handling sudah ada, tapi implisit dan satu titik
   inkonsisten.** Test suite menunjukkan pola dua-tingkat yang sudah
   berjalan: *throw* untuk kegagalan level konfigurasi/load-time
   (`INVALID_PACK_CONFIG`, `UNRESOLVED_PACK` via `preloadAll()`), dan
   *return object* untuk kegagalan level request/runtime
   (`UNKNOWN_ASSESSMENT`, `VERSION_MISMATCH`, `UNRESOLVED_PACK` via
   `resolve()`). `UNRESOLVED_PACK` ditangani **berbeda** tergantung jalur
   pemanggilan — belum pernah didokumentasikan sebagai keputusan sadar.

3. **Struktur file pack (metadata/thresholds/reasons/actions) masih
   seragam untuk semua pack**, terlepas dari `scoring_strategy`-nya.
   Belum ada keputusan apakah pack dengan `scoring_strategy:
   disc_dual_profile` tetap wajib menyediakan `thresholds.js` (yang
   secara konseptual tidak relevan untuk DISC).

## Decision

ADR ini memutuskan lima hal berikut.

### D1. Strategy Registry

Daftar strategy yang didukung tetap seperti yang ditetapkan ADR-004,
didefinisikan sebagai satu sumber kebenaran (constant) di level engine
— bukan config yang bisa diubah tanpa deploy. Ilustrasi bentuknya
(nama modul/lokasi file adalah keputusan implementasi, bukan keputusan
ADR ini):

```js
// Ilustrasi bentuk — lokasi/nama file persis diputuskan saat implementasi
const SUPPORTED_STRATEGIES = {
  scoring_strategy: ['threshold', 'disc_dual_profile'],
  graph_strategy: ['none', 'disc_profile'],
  interpretation_strategy: ['threshold', 'disc_profile'],
};
```

Extensibility: menambah strategy baru = menambah entri ke daftar ini
+ menyediakan implementasi konkretnya (lihat D5) + PR review — bukan
perubahan yang butuh ADR baru untuk setiap strategy individual, selama
polanya (registry → resolution → validation) tidak berubah. ADR baru
hanya diperlukan kalau pola dasarnya sendiri berubah.

### D2. Strategy Resolution

Resolusi strategy terjadi **di `loader.js`, saat load-time** (bukan
per-request di `resolver.js`), dan hasilnya ikut di-cache bersama pack
config:

```js
// Di dalam loadPack(), setelah require() metadata:
const merged = {
  ...metadata,
  scoring_strategy: metadata.scoring_strategy || 'threshold',
  graph_strategy: metadata.graph_strategy || 'none',
  interpretation_strategy: metadata.interpretation_strategy || 'threshold',
  // ...field lain seperti sekarang
};
```

**Rationale:** strategy adalah properti pack yang tidak berubah antar
request (sama seperti `dimensions` atau `threshold`), jadi resolusinya
sekali di load-time, konsisten dengan model cache yang sudah ada
(SPEC-002 §4 — startup load, bukan hot-reload).

### D3. Runtime Validation

Tambahkan ke `_validateCompleteness()` di `loader.js`:

```
FOR EACH strategy_field IN [scoring_strategy, graph_strategy, interpretation_strategy]:
  value = metadata[strategy_field] OR default (threshold/none/threshold)
  IF value NOT IN SUPPORTED_STRATEGIES[strategy_field]:
    _fail(packId, `${strategy_field} '${value}' is not a supported strategy`)
```

Ini **throw** `INVALID_PACK_CONFIG` — konsisten dengan seluruh validasi
completeness lain di fungsi yang sama (lihat D4 untuk alasan kenapa ini
masuk kategori throw, bukan return).

### D4. Runtime Error Contract

**Pola dua-tingkat yang sudah berjalan diformalkan, bukan diseragamkan
paksa** — karena menyeragamkan akan jadi breaking change terhadap 3 test
yang sudah ada (`UNKNOWN_ASSESSMENT`, `VERSION_MISMATCH`,
`resolve()` sukses check `config.error`), sementara pola yang sudah ada
sebenarnya masuk akal:

| Kategori | Perilaku | Contoh | Alasan |
|---|---|---|---|
| **Load-time / config error** | `throw` dengan `err.code` | `INVALID_PACK_CONFIG`, `UNRESOLVED_PACK` (via `preloadAll`) | Ini bug developer/deployment — sebaiknya crash saat startup, bukan lolos ke production |
| **Request-time / runtime error** | `return { error, message }` | `UNKNOWN_ASSESSMENT`, `VERSION_MISMATCH`, `UNRESOLVED_PACK` (via `resolve`), `INVALID_SCORE_RANGE`, `UNKNOWN_DIMENSION` | Ini bagian dari alur normal yang harus diteruskan sebagai response API, bukan meng-crash proses |

**Keputusan eksplisit soal `UNRESOLVED_PACK`:** perbedaan penanganan
berdasarkan jalur pemanggilan (`preloadAll` = throw, `resolve` = return)
**dipertahankan sebagai desain yang disengaja**, bukan bug — alasannya
konsisten dengan tabel di atas: `preloadAll()` dipanggil saat startup
(load-time), `resolve()` dipanggil per-request (request-time).

**Perbaikan wajib:** JSDoc di `resolver.js` saat ini salah — menyatakan
keempat error sebagai `@throws`, padahal tiga di antaranya (`UNKNOWN_ASSESSMENT`,
`UNRESOLVED_PACK` via resolve, `VERSION_MISMATCH`) adalah `return`, bukan
`throw`. JSDoc harus diperbaiki agar sesuai perilaku aktual:

```js
/**
 * @returns {object} merged pack config, ATAU object error:
 *   { error: 'UNKNOWN_ASSESSMENT', message }
 *   { error: 'UNRESOLVED_PACK', message }
 *   { error: 'VERSION_MISMATCH', message }
 * @throws {INVALID_PACK_CONFIG} — dilempar oleh loader.loadPack(),
 *   diteruskan tanpa ditangkap (bukan error request-time)
 */
```

### D5. Strategy-specific Pack Contract

**Boundary Principle (inti keputusan D5):**

> Strategy Registry menentukan **bagaimana engine menemukan implementasi
> strategy**, tetapi **tidak menentukan isi maupun struktur internal
> artefak milik setiap strategy**. Itu didelegasikan ke spesifikasi
> strategy masing-masing — yang untuk strategy baru manapun (termasuk
> `disc_dual_profile`) harus melalui review PO secara eksplisit sebelum
> implementasi dimulai, bukan diasumsikan oleh agent.

```
threshold strategy
 +-- thresholds.js
 +-- reasons.js
 +-- actions.js

disc_dual_profile strategy
 +-- (ditentukan oleh spesifikasi strategy tersebut — belum ada)

future strategy
 +-- (bebas selama memenuhi contract registry)
```

**Keputusan: struktur file TIDAK diseragamkan paksa untuk semua strategy
di v1** — tapi implementasi konkret file apa saja yang dibutuhkan untuk
`scoring_strategy: disc_dual_profile` **belum diputuskan di ADR ini**,
karena itu akan berarti menetapkan nama file/skema data untuk DISC yang
belum pernah direview PO secara spesifik (melanggar prinsip "Don't Fill
Product Gaps") — berbeda dengan D4, di mana pola error sudah terobservasi
dan terverifikasi lewat test yang sungguhan berjalan (lihat catatan
evidentiary di akhir bagian ini).

Yang diputuskan di sini adalah **pola/kontraknya**, bukan detail DISC:

```
loader.js akan memeriksa metadata.scoring_strategy SEBELUM memutuskan
file mana yang wajib di-require():

IF scoring_strategy === 'threshold':
  wajib: metadata.js, thresholds.js, reasons.js, actions.js
  (seperti sekarang, tidak berubah)

IF scoring_strategy === 'disc_dual_profile':
  wajib: metadata.js + [file set TBD — akan diputuskan di ADR/task
  terpisah saat DISC benar-benar diimplementasikan, dengan nama file
  dan skema data yang direview PO secara eksplisit]
```

**Yang WAJIB ada di ADR/task lanjutan (TASK-025D atau ADR terpisah)
sebelum DISC coding dimulai:** nama file pack untuk `disc_dual_profile`
(mis. apakah `items.js` menggantikan `reasons.js`+`actions.js`, atau
struktur lain), dan skema data persis di dalamnya. Ini **bukan** celah
yang boleh diisi Ares/Hera secara mandiri saat implementasi.

**Catatan evidentiary — kenapa D5 dibiarkan terbuka sementara D4 tidak:**
Prinsip "Don't Fill Product Gaps" berlaku ketika **tidak ada bukti/data**
yang bisa dijadikan dasar keputusan (D5 — struktur file DISC belum pernah
direview PO, tidak ada implementasi maupun requirement untuk dirujuk).
Ini berbeda dari D4, di mana pola error **sudah ada dan terverifikasi**
lewat 3 test yang sungguhan berjalan di `tests/loader-resolver.test.js`
— itu bukan gap yang perlu diisi, melainkan pola nyata yang tinggal
diformalkan. ADR yang mendokumentasikan pola yang sudah terobservasi
secara evidence-based bukan pelanggaran prinsip yang sama.

## Alternatives Considered

- **Menyeragamkan semua error jadi `throw`:** ditolak, breaking change
  tanpa manfaat yang sepadan (lihat D4).
- **Memaksa semua pack (termasuk DISC) tetap punya `thresholds.js`
  dummy:** ditolak sesuai temuan audit sebelumnya (SPEC-002 Q5) — code
  smell, kontrak jadi menyesatkan.
- **Resolusi strategy per-request (di `resolver.js`, bukan `loader.js`):**
  ditolak — strategy adalah properti pack yang statis per load, tidak
  ada alasan menghitungnya ulang tiap request.

## Consequences

**Positive:**
- SPEC-002 dan implementasi kembali selaras setelah D3 diimplementasikan.
- Pola error yang sudah berjalan diam-diam sekarang eksplisit dan
  terdokumentasi, bisa jadi acuan untuk pack/engine lain.
- Jalan untuk DISC (dan pack non-threshold lain) terbuka tanpa
  memaksakan struktur yang tidak relevan — tapi tetap dengan pagar
  (nama file harus direview PO, bukan diasumsikan agent).

**Negative:**
- `loader.js` perlu perubahan kode nyata (bukan cuma dokumentasi) —
  scope TASK-025C-B/implementasi terpisah dari ADR ini.
- Menunda keputusan detail file DISC berarti TASK-025D belum bisa mulai
  coding sampai ada task/ADR tambahan yang spesifik untuk itu.

**Risk:**
- Kalau task lanjutan (nama file DISC) tidak dikerjakan dengan disiplin
  yang sama (audit dulu, baru putuskan), risiko provenance/asumsi salah
  yang sudah beberapa kali terjadi di sesi ini bisa terulang.

## Status

**Proposed** — menunggu PO approval sebelum TASK-025C-B (implementasi
D2–D4 di `loader.js`/`resolver.js`) dijalankan.

## References

- [ADR-004](./ADR-004-strategy-based-pack-contract.md) — Strategy-Based Pack Contract
- [SPEC-002](../specs/SPEC-002-domain-pack-format.md) §1e, §2, §3, Open Questions Q5
- `engines/recommendation/loader.js`, `resolver.js`, `registry.js`
- `tests/loader-resolver.test.js` — 3 test case yang membuktikan pola
  error dua-tingkat sudah berjalan (`UNKNOWN_ASSESSMENT`,
  `VERSION_MISMATCH`, resolve success-path check)
