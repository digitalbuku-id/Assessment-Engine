# 05 — Skema Tabel & Kontrak Endpoint (DRAFT)

**Status:** DRAFT, 20 Nov 2026 (revisi 5 — 20 Nov 2026, setelah cek 4 poin + 1 batasan). Perlu dicek terhadap ADR-001–006 (khususnya ADR-006) sebelum dipakai Tahap 0. Keputusan yang mendasarinya ada di `00-README` bagian "Arsitektur aplikasi", ADR-007 (Proposed), dan daftar pertanyaan konsultan di `06-Daftar-Pertanyaan-Konsultan.md`.

## Prinsip
- Supabase = satu-satunya sumber kebenaran hasil; WordPress bukan sumber data kedua.
- PII seminimal mungkin di Supabase: tanpa email/nama.
- `external_user_id` = UUID acak dari `usermeta` WordPress.
- Semua hasil berstempel versi (assessment, scoring, norm, interpretation).
- Aturan: retensi backup (90 hari) tidak boleh melebihi retensi log penghapusan (2 tahun).
- **Privasi URL:** tidak ada pengenal pribadi (UUID peserta, dsb.) di path ATAU query string URL — pengenal dikirim lewat body POST. Log infrastruktur (Vercel/proxy) tetap masuk cakupan kebijakan privasi.

## Tabel Supabase: `results`
Satu baris = satu kali pengerjaan (peserta boleh mengerjakan ulang — tanpa unique constraint user+assessment).

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | uuid PK, default `gen_random_uuid()` | ID hasil |
| `external_user_id` | uuid NOT NULL, index | UUID dari `usermeta` WP |
| `channel` | text NOT NULL, default `'hrdlokal.id'` | Saluran (untuk digitalbuku.id nanti) |
| `assessment_id` | text NOT NULL | Mis. `'disc-v1'` |
| `answers` | jsonb NOT NULL | Jawaban mentah |
| `result` | jsonb NOT NULL | Hasil + interpretasi teks tetap |
| `assessment_version` | text NOT NULL | Stempel versi |
| `scoring_version` | text NOT NULL | Stempel versi |
| `norm_version` | text NOT NULL | Stempel versi |
| `interpretation_version` | text NOT NULL | Stempel versi |
| `consent_text_version` | text NOT NULL | Versi teks persetujuan |
| `consent_at` | timestamptz NOT NULL | Waktu persetujuan |
| `is_18_plus` | boolean NOT NULL CHECK (`is_18_plus` = true) | Flag 18+ — tanpa default; database ikut menegakkan aturan |
| `created_at` | timestamptz NOT NULL, default `now()` | |
| `updated_at` | timestamptz NOT NULL, default `now()` | |

- Index tambahan: `(assessment_id, created_at)` untuk agregat.
- RLS: hanya `service_role` (API server-side). Tidak ada akses `anon`/`authenticated` — browser tidak pernah menyentuh Supabase langsung (ADR-006).

## Tabel WordPress: `wp_hrdlokal_erasure_log` (bukan di Supabase)
Log sengaja disimpan di sisi WordPress agar tetap utuh saat Supabase di-restore dari backup — log inilah yang dipakai memutar ulang penghapusan pasca-restore. Log harus lebih "awet" daripada data yang dihapusnya.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint PK auto-increment | |
| `external_user_id` | char(36) NOT NULL, index | UUID peserta |
| `request_type` | varchar(20) NOT NULL | `data_only` (hapus hasil saja) / `account` (hapus hasil + akun WP) — hanya di log WP, TIDAK dikirim ke API |
| `requested_at` | datetime NOT NULL | Tanggal permintaan — dasar hitung retensi |
| `status` | varchar(20) NOT NULL | Langkah terakhir yang BERHASIL: `pending` / `api_done` / `wp_done` — tidak ada status `failed` (lihat di bawah) |
| `api_done_at` | datetime NULL | Waktu API selesai menghapus — dasar replay pasca-restore Supabase |
| `expires_at` | datetime NOT NULL | `requested_at` + masa simpan (dihitung saat entri dibuat) |
| `completed_at` | datetime NULL | Waktu penghapusan selesai |
| `attempts` | int NOT NULL, default 0 | Jumlah percobaan |
| `last_error` | text NULL | Pesan error terakhir |
| `next_retry_at` | datetime NULL | Jadwal ulang berikutnya |

- `usermeta` terkait: `hrdlokal_assessment_uuid` (UUID), `hrdlokal_consent_text_version`, `hrdlokal_consent_at`, `hrdlokal_is_18_plus`.
- **Definisi "selesai" (dipakai di semua prosedur di bawah):** belum selesai = `pending`, ATAU `api_done` dengan `request_type = account`. Selesai = `wp_done`, ATAU `api_done` dengan `request_type = data_only`. Untuk `data_only`, status `api_done` sudah selesai — job ulang tidak melanjutkannya.
- Retensi: 2 tahun dari `requested_at` (konfigurasi `ERASURE_LOG_RETENTION_DAYS=730`, bukan hardcode). Job retensi harian menghapus entri yang SUDAH SELESAI (sesuai definisi di atas) dan `expires_at < now()`. Entri yang belum selesai tidak dihapus job retensi — ditandai untuk ditinjau manual.
- Angka 2 tahun + rumusan agregat dicek konsultan hukum/praktisi UU PDP dalam satu putaran (belum bisa dipastikan sebagai nasihat hukum sebelum dicek).

### Protokol penghapusan (per langkah)
1. Plugin menulis entri log berstatus `pending` **SEBELUM** memanggil API — supaya UUID tidak hilang dari WordPress (akun terhapus) sebelum log mencatat apa pun.
2. Plugin memanggil `POST /api/erasures` (server-ke-server, kunci hapus). API menghapus → balas sukses → plugin ubah status jadi `api_done`, isi `api_done_at`.
3. Hanya bila `request_type = account`: plugin menghapus akun WP → status jadi `wp_done`, isi `completed_at`. **Bila akun sudah tidak ada saat langkah ini berjalan, anggap langkah selesai (`wp_done`), bukan error.** Ini juga yang terjadi bila admin menghapus akun lewat wp-admin lalu API gagal di tengah — job ulang akan sampai di langkah 3 dan mendapati akun sudah hilang.
4. Bila gagal di langkah mana pun: status TETAP di langkah terakhir yang berhasil (tidak berubah jadi `failed`); `attempts` +1, isi `last_error` dan `next_retry_at` (backoff: 1 jam, lalu 4 jam, **dibatasi di 4 jam** — tidak tumbuh sampai 24 jam). **Job ulang berjalan tiap jam** (WP-Cron per jam; 15 menit juga boleh) dan melanjutkan entri yang **belum selesai** (sesuai definisi di atas) yang `next_retry_at`-nya sudah lewat. **Tidak ada batas percobaan tetap** — job terus mencoba sampai entri selesai atau ditangani manual. **Peringatan admin berbasis usia permintaan:** bila entri belum selesai lebih dari X jam sejak `requested_at`, beri tahu admin (X ditentukan dari jawaban konsultan atas batas waktu menanggapi permintaan subjek data — lihat 06; sampai ada jawaban dipakai 72 jam sebagai nilai sementara yang dicatat sebagai sementara).

### Prosedur pasca-restore Supabase
1. Catat **cap waktu backup** (waktu pembuatan backup Supabase) sebagai bagian dari langkah restore — jangan ditebak.
2. Sebelum sistem dibuka: jalankan ulang penghapusan untuk entri yang memenuhi SALAH SATU:
   - `api_done_at` LEBIH BARU dari (cap waktu backup − 1 jam) — margin 1 jam untuk beda jam plugin vs jam Supabase; berlebih sedikit aman karena idempoten — ATAU
   - status masih `pending` (API belum pernah menghapus — data ada di backup).
   Pakai endpoint batch (`POST /api/erasures/batch`).
3. Sistem baru dibuka setelah replay selesai.

### Prosedur pasca-restore WordPress
Restore database WP bisa menghidupkan kembali akun yang sudah dihapus. Sumber kebenarannya adalah salinan append-only (di bawah), karena tabel log WP sendiri ikut mundur saat restore.
1. Catat cap waktu backup WP sebagai bagian dari langkah restore.
2. Dari salinan append-only, ambil entri dengan **`event_at` (waktu perubahan status terakhir) lebih baru dari (cap waktu backup WP − 1 jam)**. Yang menentukan adalah kapan akun dihapus, bukan kapan permintaan masuk — permintaan yang masuk sebelum backup tetapi akunnya baru terhapus sesudahnya tetap harus terpilih.
   - status `wp_done` → hapus lagi akun WP-nya (hasil di Supabase sudah terhapus dan Supabase tidak di-restore — tidak perlu diulang).
   - status `api_done` dengan `request_type = account` → buat ulang entri log di WP dengan `requested_at`, `request_type`, dan `event_at` yang asli, **dengan `attempts` direset ke 0** (salinan tidak memuat `attempts`), lalu biarkan job ulang menyelesaikannya (API dipanggil lagi — idempoten — lalu akun dihapus).
   - status `api_done` dengan `request_type = data_only` → **cukup dibuat ulang sebagai baris log selesai, tanpa memicu pemanggilan API** (hasil di Supabase sudah terhapus; akun memang tidak pernah dimaksudkan untuk dihapus).
   - status `pending` → buat ulang entri log dan biarkan job ulang menyelesaikannya.
3. Sistem baru dibuka setelah langkah 2 selesai.

### Salinan append-only (cermin log)
- Isi: UUID + `requested_at` + status + **`request_type`** + **`event_at`** (waktu perubahan status terakhir — dipakai prosedur restore WP). Tanpa `request_type`, entri yang dibuat ulang tidak bisa diselesaikan dengan benar (plugin tidak tahu apakah akun harus dihapus).
- **Retensi sama dengan log: 2 tahun.** Disimpan satu file per bulan; **file dibuang hanya bila seluruh isinya sudah lewat 2 tahun** — jadi sebagian entri tersimpan sampai sebulan lebih lama. Ini kebijakan yang disengaja, bukan pelanggaran retensi.
- **Akses terbatas:** disimpan di lokasi dengan akses terbatas (bukan folder Drive proyek bersama yang terlalu longgar) — mis. folder khusus yang hanya dibagikan ke admin/owner, atau bucket terpisah dengan kontrol akses.
- **Ditulis per peristiwa** (append setiap kali entri log dibuat/diubah) + rekonsiliasi harian. Bila dipakai ekspor batch harian, catat jedanya: ada jendela sampai 24 jam yang bisa hilang bila WordPress di-restore sebelum ekspor berjalan.

### Kejujuran backup
Penghapusan hanya terjadi di data aktif; backup 90 hari masih memuat data sampai kedaluwarsa. Pernyataan ini harus masuk kebijakan privasi (putaran cek konsultan). Angka 90 hari adalah target kebijakan — retensi aktual backup bawaan Supabase bergantung paket (paket gratis 7 hari, tidak selalu bisa diatur); verifikasi saat Tahap 0, bila paket tidak mendukung 90 hari putuskan naik paket atau sesuaikan angka dan catat di kebijakan privasi.

### Data yatim di Supabase
Hasil tanpa pemilik bisa muncul dari jalur yang tidak melewati protokol penghapusan:
- **Hook `delete_user` di plugin:** penghapusan akun dari jalur mana pun (wp-admin, pembersihan spam) memicu alur penghapusan yang sama — tulis entri log `pending` dulu, lalu panggil API, lalu hapus akun (lihat protokol). Hook dipasang pada `delete_user` (SEBELUM akun dihapus) supaya UUID masih bisa dibaca dari `usermeta`. **Penjaga anti-pemicu-diri:** hook melewati UUID yang sudah punya entri log yang belum selesai, atau yang sedang diproses plugin sendiri (plugin menandai penghapusan yang dipicunya sendiri, mis. lewat transient/flag sementara, sebelum menghapus akun di langkah 3). Tanpa penjaga ini, langkah 3 protokol akan memicu hook, membuat entri log kedua, dan memanggil API lagi.
- **Job rekonsiliasi berkala (mingguan):** bandingkan UUID di Supabase (lewat `POST /api/results/uuids`) dengan UUID di `usermeta` WordPress. Job ini juga satu-satunya yang menangkap restore WP yang menghilangkan user baru beserta hasil-hasilnya. **Pengaman — job ini tidak boleh menjadi penghapus massal:**
  - Jangan hapus langsung. Tandai dulu sebagai kandidat yatim (dengan `first_seen_at`); hapus hanya setelah **masa tunggu 14 hari DAN terdeteksi di dua run berturut-turut**.
  - **Batalkan run dan beri tahu admin** bila jumlah yatim melebihi ambang (lebih dari 5% dari total UUID di Supabase atau lebih dari 50 — mana yang tercapai dulu), atau bila query `usermeta` gagal, atau bila jumlah UUID yang dikembalikan jauh lebih sedikit dari run sebelumnya. Tiga kondisi ini menandakan query rusak atau WordPress baru di-restore ke backup lama — bukan yatim sungguhan.
  - **Batasi jumlah penghapusan per run** (maks. 10 per run, konfigurasi).
  - Penghapusan kandidat yang lolos semua pengaman tetap lewat alur penghapusan yang sama (entri log → API). Karena akunnya sudah tidak ada, langkah 3 akan mendapati akun hilang dan menganggapnya selesai (lihat protokol).

### WordPress bukan salinan kedua hasil
Plugin **tidak menyimpan hasil atau jawaban di WordPress** — tidak di transient, tidak di object cache, tidak di log debug. Halaman hasil **dikecualikan dari page cache** (LiteSpeed Cache) **dan CDN**. Aturan ini makin penting karena `list` kini mengembalikan jawaban mentah — satu salinan jawaban di cache WP sudah melanggar prinsip "Supabase satu-satunya sumber kebenaran hasil".

### Race antara `run` dan penghapusan
Bila peserta menyelesaikan asesmen saat permintaan hapusnya masih berjalan, hasil baru bisa tertulis setelah penghapusan dan menjadi yatim. Aturan sederhana (ditegakkan plugin — API tidak mengenal log WP): **plugin menolak `run` selama ada entri penghapusan yang belum selesai untuk UUID itu** (sesuai definisi "belum selesai" di atas) — kembalikan error dan minta peserta menghubungi admin. Job rekonsiliasi tetap menjadi jaring pengaman bila ada yang lolos.
- **Batasan yang diketahui:** `run` yang sedang berjalan saat penghapusan `data_only` dimulai bisa menulis hasil baru sesudah penghapusan selesai. Rekonsiliasi tidak menangkapnya karena akunnya masih ada. Risikonya kecil (jendela hanya selama `run` itu berjalan), tetapi dicatat di sini sebagai batasan, bukan sebagai celah yang tertutup.

## Agregat (diputuskan 20 Nov 2026)
- **Dihitung langsung dari `results`** (live). Peserta yang dihapus otomatis keluar dari statistik. Ini yang paling sederhana.
- Konsekuensi yang harus tertulis di kebijakan privasi: **agregat TIDAK dijanjikan bertahan setelah penghapusan** — angka agregat bisa berubah saat ada peserta yang dihapus. (Menggantikan usulan sebelumnya "agregat boleh dipertahankan".)
- Aturan tampil: agregat hanya ditampilkan bila kelompoknya berisi **minimum 5 peserta** — dan ambang yang sama berlaku untuk **komplemen kelompok** (total − kelompok). Kelompok 6 orang dari total 7 membuka identitas kelompok sisanya yang berisi 1 orang, jadi kelompok itu tidak ditampilkan.
- Tabel snapshot agregat terpisah DITUNDA — baru dipertimbangkan bila laporan B2B butuh agregat yang bertahan setelah penghapusan.

## Kontrak endpoint (Vercel Serverless Functions)
- **Auth — kunci dipisah per fungsi:** `API_KEY_RUN` untuk `run`, `get`, dan `list`; `API_KEY_DELETE` khusus untuk `erasures` dan `erasures/batch`; **`API_KEY_ADMIN` khusus untuk `results/uuids`** (kunci ketiga — endpoint ini membuka daftar seluruh peserta, jadi tidak boleh memakai kunci lain). Header `x-api-key: <kunci>`, server-ke-server saja (plugin PHP). 401 bila kunci hilang/salah.
- **Rotasi kunci:** dukung dua kunci aktif bersamaan (kunci berjalan + kunci sebelumnya) dengan masa tumpang tindih, supaya rotasi tidak memutus plugin. Berlaku untuk ketiga kunci.
- **Rate limit — butuh penyimpanan bersama** (Vercel KV / Upstash Redis / Vercel WAF), BUKAN hitungan di memori proses — tiap invokasi serverless terpisah. `run`/`get`/`list` mis. 100 req/menit per kunci; `erasures` (satuan) 10 req/menit; `erasures/batch` 10 req/menit dengan maks. 100 UUID per panggilan (efektif sampai 1.000 UUID/menit untuk replay); `results/uuids` 10 req/menit. Semua angka konfigurasi.
- **Format error:** `{ "error": { "code": "<kode>", "message": "<pesan>" } }`.

### `POST /api/assessments/:id/run`
- Body: `{ "external_user_id": "<uuid>", "answers": {…}, "consent": { "text_version": "<versi>", "at": "<ISO-8601>", "is_18_plus": true } }`.
- Validasi: `consent` wajib + `is_18_plus` true, bila tidak → 400. `external_user_id` ditentukan plugin dari sesi WP — JANGAN pernah dari klien.
- Sukses 201: `{ "result_id": "<uuid>", "versions": { "assessment": "…", "scoring": "…", "norm": "…", "interpretation": "…" } }`.
- Error: 400 validasi, 401 auth, 429 rate limit, 500.

### `POST /api/results/get`
- Body: `{ "result_id": "<uuid>", "external_user_id": "<uuid>" }` — POST (bukan GET) supaya UUID tidak tercatat di log infrastruktur.
- API mengembalikan **404 bila hasil tidak ditemukan ATAU `external_user_id`-nya tidak cocok** — kunci API hanya membuktikan pemanggilnya plugin, bukan bahwa hasil itu milik peserta yang sedang login.
- Plugin WAJIB juga memverifikasi di sisinya bahwa hasil yang ditampilkan milik peserta yang sedang login (pertahanan berlapis).
- Sukses 200: `{ "result_id": "<uuid>", "external_user_id": "<uuid>", "assessment_id": "disc-v1", "result": {…}, "versions": {…}, "created_at": "<ISO-8601>" }`.
- Error: 400 validasi, 404 tidak ditemukan/tidak cocok, 401, 429, 500.

### `POST /api/results/list`
- Body: `{ "external_user_id": "<uuid>", "assessment_id": "<opsional>" }` — POST (bukan GET) supaya UUID tidak tercatat di log infrastruktur.
- Mengembalikan semua hasil peserta itu (mendukung pengerjaan ulang + hak akses data sendiri menurut UU PDP), terbaru dulu.
- **Diputuskan:** jawaban mentah (`answers`) TERMASUK dalam hasil yang dikembalikan — jawaban adalah data pribadi peserta dan hak akses mencakup data sendiri.
- Sukses 200: `{ "results": [ { "result_id": "…", "assessment_id": "…", "answers": {…}, "result": {…}, "versions": {…}, "created_at": "…" }, … ] }`.
- Error: 400 validasi, 401, 429, 500.

### `POST /api/results/uuids`
- Body: `{ "page": <n>, "page_size": <n> }` (`page_size` maks. 1000).
- Mengembalikan UUID yang berbeda di `results`, berhalaman — dipakai job rekonsiliasi mingguan di plugin untuk membandingkan dengan UUID di `usermeta`.
- Hanya server-ke-server dengan `API_KEY_ADMIN` (kunci ketiga, terpisah). Rate limit 10 req/menit.
- Sukses 200: `{ "uuids": ["<uuid>", …], "page": <n>, "total_pages": <n>, "total_uuids": <n> }`.
- Error: 400 validasi, 401, 429, 500.

### `POST /api/erasures`
- Body: `{ "external_user_id": "<uuid>" }` — `request_type` TIDAK dikirim ke API (API menghapus hasil dengan cara yang sama untuk keduanya; tipe hanya disimpan di log WP, sesuai prinsip data minimal).
- Menghapus SEMUA hasil peserta itu. **Idempoten:** mengembalikan 200 `{ "deleted_count": <n> }` bahkan bila `n = 0` (sudah terhapus).
- Hanya server-ke-server dengan `API_KEY_DELETE`; API tidak mempercayai `external_user_id` dari klien.
- Dipakai juga untuk memutar ulang penghapusan setelah restore backup (bersama endpoint batch).
- Error: 400 validasi, 401, 429, 500.

### `POST /api/erasures/batch`
- Body: `{ "external_user_ids": ["<uuid>", …] }`, maks. 100 UUID per panggilan.
- Menghapus hasil untuk semua UUID yang diminta (untuk replay pasca-restore). Idempoten per UUID.
- Dikerjakan dalam **satu query** `DELETE ... WHERE external_user_id IN (...) RETURNING`, bukan loop.
- Sukses 200: `{ "results": [ { "external_user_id": "<uuid>", "deleted_count": <n> }, … ] }`.
- Hanya server-ke-server dengan `API_KEY_DELETE`. Rate limit 10 req/menit.
- Error: 400 validasi (termasuk bila > 100 UUID), 401, 429, 500.

### `GET /api/health`
- Sukses 200: `{ "status": "ok" }`.

## Catatan implementasi (untuk Tahap 0)
- ESM, Express/Fastify, Node 20/22. Tanpa `puppeteer` di jalur skoring. Tanpa penyimpanan file lokal/memori proses.
- Endpoint penghapusan yang idempoten adalah yang memungkinkan prosedur pasca-restore — jangan diubah jadi non-idempoten.
- Log penghapusan, job ulang (per jam), job retensi (harian), ekspor append-only, notifikasi admin, hook `delete_user` (dengan penjaga anti-pemicu-diri), job rekonsiliasi (mingguan, dengan pengaman), dan penolakan `run` saat penghapusan berjalan adalah tugas plugin WordPress (bukan API) — API hanya menyediakan endpoint idempoten + `api_done_at` lewat responsnya, ditambah `POST /api/results/uuids` untuk rekonsiliasi.

## Keputusan sasaran pilot (diputuskan 20 Nov 2026, William)
- **Pilot: mahasiswa + karyawan saja (18+).** Siswa SMA di bawah 18 tidak bisa ikut (UU PDP mengatur data anak secara khusus — persetujuan orang tua/wali — di luar cakupan pilot); siswa 18+ (lulusan SMA/SMK) tidak termasuk pilot. Sasaran pilot tertutup — tetapi **keabsahan centang 18+ sebagai dasar hukum tetap ditanyakan ke konsultan** (lihat 06).
