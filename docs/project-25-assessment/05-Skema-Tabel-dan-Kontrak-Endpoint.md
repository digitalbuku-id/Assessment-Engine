# 05 — Skema Tabel & Kontrak Endpoint (DRAFT)

**Status:** DRAFT, 20 Nov 2026 (revisi 2 — 20 Nov 2026, setelah cek 9 poin). Perlu dicek terhadap ADR-001–006 (khususnya ADR-006) sebelum dipakai Tahap 0. Keputusan yang mendasarinya ada di `00-README` bagian "Arsitektur aplikasi" (identitas WordPress + UUID, penghapusan idempoten server-ke-server, retensi backup 90 hari, retensi log 2 tahun, sasaran pilot mahasiswa + karyawan 18+).

## Prinsip
- Supabase = satu-satunya sumber kebenaran hasil; WordPress bukan sumber data kedua.
- PII seminimal mungkin di Supabase: tanpa email/nama.
- `external_user_id` = UUID acak dari `usermeta` WordPress.
- Semua hasil berstempel versi (assessment, scoring, norm, interpretation).
- Aturan: retensi backup (90 hari) tidak boleh melebihi retensi log penghapusan (2 tahun).

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
| `is_18_plus` | boolean NOT NULL, default false | Flag 18+ |
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
| `request_type` | varchar(20) NOT NULL | `data_only` (hapus hasil saja) / `account` (hapus hasil + akun WP) |
| `requested_at` | datetime NOT NULL | Tanggal permintaan — dasar hitung retensi |
| `status` | varchar(20) NOT NULL | Langkah terakhir yang BERHASIL: `pending` / `api_done` / `wp_done` — tidak ada status `failed` (lihat di bawah) |
| `api_done_at` | datetime NULL | Waktu API selesai menghapus — dasar replay pasca-restore |
| `expires_at` | datetime NOT NULL | `requested_at` + masa simpan (dihitung saat entri dibuat) |
| `completed_at` | datetime NULL | Waktu penghapusan selesai |
| `attempts` | int NOT NULL, default 0 | Jumlah percobaan |
| `last_error` | text NULL | Pesan error terakhir |
| `next_retry_at` | datetime NULL | Jadwal ulang berikutnya |

- `usermeta` terkait: `hrdlokal_assessment_uuid` (UUID), `hrdlokal_consent_text_version`, `hrdlokal_consent_at`, `hrdlokal_is_18_plus`.
- Retensi: 2 tahun dari `requested_at` (konfigurasi `ERASURE_LOG_RETENTION_DAYS=730`, bukan hardcode). Job terjadwal (harian, WP-Cron) menghapus entri yang SUDAH SELESAI (`wp_done`, atau `api_done` bila `request_type = data_only`) dan `expires_at < now()`. Entri yang belum selesai tidak dihapus job retensi — ditandai untuk ditinjau manual.
- Angka 2 tahun + rumusan agregat dicek konsultan hukum/praktisi UU PDP dalam satu putaran (belum bisa dipastikan sebagai nasihat hukum sebelum dicek).

### Protokol penghapusan (per langkah)
1. Plugin menulis entri log berstatus `pending` **SEBELUM** memanggil API — supaya UUID tidak hilang dari WordPress (akun terhapus) sebelum log mencatat apa pun.
2. Plugin memanggil `POST /api/erasures` (server-ke-server, kunci hapus). API menghapus → balas sukses → plugin ubah status jadi `api_done`, isi `api_done_at`.
3. Hanya bila `request_type = account`: plugin menghapus akun WP → status jadi `wp_done`, isi `completed_at`. Bila `data_only`, penghapusan selesai di langkah 2 (`completed_at` = `api_done_at`).
4. Bila gagal di langkah mana pun: status TETAP di langkah terakhir yang berhasil (tidak berubah jadi `failed`); `attempts` +1, isi `last_error` dan `next_retry_at` (backoff: 1 jam, lalu 4 jam, lalu 24 jam). **Job ulang harian** melanjutkan entri dengan status `pending`/`api_done` yang `next_retry_at`-nya sudah lewat.

### Prosedur pasca-restore
1. Catat **cap waktu backup** (waktu pembuatan backup Supabase) sebagai bagian dari langkah restore — jangan ditebak.
2. Sebelum sistem dibuka: jalankan ulang penghapusan untuk entri yang memenuhi SALAH SATU:
   - `api_done_at` LEBIH BARU dari cap waktu backup (penghapusan dieksekusi API setelah backup dibuat — backup masih memuat datanya), ATAU
   - status masih `pending` (API belum pernah menghapus — data ada di backup).
   Idempoten — aman diulang. Pakai endpoint batch (`POST /api/erasures/batch`).
3. Sistem baru dibuka setelah replay selesai.

### Kejujuran backup
Penghapusan hanya terjadi di data aktif; backup 90 hari masih memuat data sampai kedaluwarsa. Pernyataan ini harus masuk kebijakan privasi (putaran cek konsultan). Angka 90 hari adalah target kebijakan — retensi aktual backup bawaan Supabase bergantung paket (paket gratis 7 hari, tidak selalu bisa diatur); verifikasi saat Tahap 0, bila paket tidak mendukung 90 hari putuskan naik paket atau sesuaikan angka dan catat di kebijakan privasi.

### Batas klaim "log tetap utuh"
Klaim itu hanya berlaku untuk restore Supabase. Kalau database WordPress yang di-restore, tabel log ikut mundur. Mitigasi: **salinan append-only** (UUID + `requested_at` + status) diekspor harian ke lokasi di luar database WordPress (mis. folder Drive proyek atau tabel mirror terpisah) — supaya restore WP tidak menghilangkan jejak penghapusan. Ekspor ini bagian dari tugas plugin (bukan API).

## Agregat (diputuskan 20 Nov 2026)
- **Dihitung langsung dari `results`** (live). Peserta yang dihapus otomatis keluar dari statistik. Ini yang paling sederhana.
- Konsekuensi yang harus tertulis di kebijakan privasi: **agregat TIDAK dijanjikan bertahan setelah penghapusan** — angka agregat bisa berubah saat ada peserta yang dihapus. (Menggantikan usulan sebelumnya "agregat boleh dipertahankan".)
- Aturan tampil: agregat hanya ditampilkan bila kelompoknya berisi **minimum 5 peserta** — supaya kelompok kecil tidak bisa dipakai menautkan kembali ke individu.
- Tabel snapshot agregat terpisah DITUNDA — baru dipertimbangkan bila laporan B2B butuh agregat yang bertahan setelah penghapusan.

## Kontrak endpoint (Vercel Serverless Functions)
- **Auth — kunci dipisah per fungsi:** `API_KEY_RUN` untuk `run`, `get result`, dan `list`; `API_KEY_DELETE` khusus untuk `erasures` dan `erasures/batch` (kunci berbeda — kebocoran satu kunci tidak membuka penghapusan massal). Header `x-api-key: <kunci>`, server-ke-server saja (plugin PHP). 401 bila kunci hilang/salah.
- **Rate limit:** `run`/`get`/`list` mis. 100 req/menit per kunci; `erasures` (satuan) 10 req/menit; `erasures/batch` 10 req/menit dengan maks. 100 UUID per panggilan (efektif sampai 1.000 UUID/menit untuk replay). Semua angka konfigurasi.
- **Format error:** `{ "error": { "code": "<kode>", "message": "<pesan>" } }`.
- **Privasi URL:** UUID peserta tidak pernah ditaruh di path URL (akan tercatat di log infrastruktur seperti Vercel/proxy) — penghapusan dan daftar memakai body POST. Log infrastruktur tetap masuk cakupan kebijakan privasi.

### `POST /api/assessments/:id/run`
- Body: `{ "external_user_id": "<uuid>", "answers": {…}, "consent": { "text_version": "<versi>", "at": "<ISO-8601>", "is_18_plus": true } }`.
- Validasi: `consent` wajib + `is_18_plus` true, bila tidak → 400. `external_user_id` ditentukan plugin dari sesi WP — JANGAN pernah dari klien.
- Sukses 201: `{ "result_id": "<uuid>", "versions": { "assessment": "…", "scoring": "…", "norm": "…", "interpretation": "…" } }`.
- Error: 400 validasi, 401 auth, 429 rate limit, 500.

### `GET /api/results/:id?external_user_id=<uuid>`
- `external_user_id` WAJIB sebagai query parameter. API mengembalikan **404 bila hasil tidak ditemukan ATAU `external_user_id`-nya tidak cocok** — kunci API hanya membuktikan pemanggilnya plugin, bukan bahwa hasil itu milik peserta yang sedang login.
- Plugin WAJIB juga memverifikasi di sisinya bahwa hasil yang ditampilkan milik peserta yang sedang login (pertahanan berlapis).
- Sukses 200: `{ "result_id": "<uuid>", "external_user_id": "<uuid>", "assessment_id": "disc-v1", "result": {…}, "versions": {…}, "created_at": "<ISO-8601>" }`.
- Error: 400 bila parameter hilang, 404 tidak ditemukan/tidak cocok, 401, 429, 500.

### `POST /api/results/list`
- Body: `{ "external_user_id": "<uuid>", "assessment_id": "<opsional>" }` — POST (bukan GET) supaya UUID tidak tercatat di log infrastruktur.
- Mengembalikan semua hasil peserta itu (mendukung pengerjaan ulang + hak akses data sendiri menurut UU PDP), terbaru dulu.
- Sukses 200: `{ "results": [ { "result_id": "…", "assessment_id": "…", "result": {…}, "versions": {…}, "created_at": "…" }, … ] }`.
- Error: 400 validasi, 401, 429, 500.

### `POST /api/erasures`
- Body: `{ "external_user_id": "<uuid>", "request_type": "data_only" | "account" }`.
- Menghapus SEMUA hasil peserta itu. **Idempoten:** mengembalikan 200 `{ "deleted_count": <n> }` bahkan bila `n = 0` (sudah terhapus).
- Hanya server-ke-server dengan `API_KEY_DELETE`; API tidak mempercayai `external_user_id` dari klien.
- Dipakai juga untuk memutar ulang penghapusan setelah restore backup (bersama endpoint batch).
- Error: 400 validasi, 401, 429, 500.

### `POST /api/erasures/batch`
- Body: `{ "external_user_ids": ["<uuid>", …] }`, maks. 100 UUID per panggilan.
- Menghapus hasil untuk semua UUID yang diminta (untuk replay pasca-restore). Idempoten per UUID.
- Sukses 200: `{ "results": [ { "external_user_id": "<uuid>", "deleted_count": <n> }, … ] }`.
- Hanya server-ke-server dengan `API_KEY_DELETE`. Rate limit 10 req/menit.
- Error: 400 validasi (termasuk bila > 100 UUID), 401, 429, 500.

### `GET /api/health`
- Sukses 200: `{ "status": "ok" }`.

## Catatan implementasi (untuk Tahap 0)
- ESM, Express/Fastify, Node 20/22. Tanpa `puppeteer` di jalur skoring. Tanpa penyimpanan file lokal/memori proses.
- Endpoint penghapusan yang idempoten adalah yang memungkinkan prosedur pasca-restore — jangan diubah jadi non-idempoten.
- Log penghapusan, job ulang, job retensi, dan ekspor append-only adalah tugas plugin WordPress (bukan API) — API hanya menyediakan endpoint idempoten + `api_done_at` lewat responsnya.

## Keputusan sasaran pilot (diputuskan 20 Nov 2026, William)
- **Pilot: mahasiswa + karyawan saja (18+).** Siswa SMA di bawah 18 tidak bisa ikut (UU PDP mengatur data anak secara khusus — persetujuan orang tua/wali — di luar cakupan pilot); siswa 18+ (lulusan SMA/SMK) tidak termasuk pilot. Pertanyaan ini tertutup — tidak perlu masuk daftar pertanyaan konsultan.
