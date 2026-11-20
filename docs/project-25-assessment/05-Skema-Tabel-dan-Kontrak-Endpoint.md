# 05 — Skema Tabel & Kontrak Endpoint (DRAFT)

**Status:** DRAFT, 20 Nov 2026 (revisi 1 — 20 Nov 2026, setelah cek 4 poin). Perlu dicek terhadap ADR-001–006 (khususnya ADR-006) sebelum dipakai Tahap 0. Keputusan yang mendasarinya ada di `00-README` bagian "Arsitektur aplikasi" (identitas WordPress + UUID, penghapusan idempoten server-ke-server, retensi backup 90 hari, retensi log 2 tahun).

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
| `requested_at` | datetime NOT NULL | Tanggal permintaan — dasar hitung retensi |
| `status` | varchar(20) NOT NULL | `pending` / `api_done` / `wp_done` / `failed` — status PER LANGKAH (lihat protokol) |
| `expires_at` | datetime NOT NULL | `requested_at` + masa simpan (dihitung saat entri dibuat) |
| `completed_at` | datetime NULL | Waktu penghapusan selesai |
| `last_error` | text NULL | Pesan error terakhir (untuk job ulang) |

- `usermeta` terkait: `hrdlokal_assessment_uuid` (UUID), `hrdlokal_consent_text_version`, `hrdlokal_consent_at`, `hrdlokal_is_18_plus`.
- Retensi: 2 tahun dari `requested_at` (konfigurasi `ERASURE_LOG_RETENTION_DAYS=730`, bukan hardcode). Job terjadwal (harian, WP-Cron) menghapus entri dengan `expires_at < now()`.
- Angka 2 tahun + rumusan agregat dicek konsultan hukum/praktisi UU PDP dalam satu putaran (belum bisa dipastikan sebagai nasihat hukum sebelum dicek).

### Protokol penghapusan (per langkah)
1. Plugin menulis entri log berstatus `pending` **SEBELUM** memanggil API — supaya UUID tidak hilang dari WordPress (akun terhapus) sebelum log mencatat apa pun.
2. Plugin memanggil `DELETE /api/results/by-user/:uuid` (server-ke-server, kunci hapus). API menghapus → balas sukses → plugin ubah status jadi `api_done`.
3. Plugin menghapus akun WP → status jadi `wp_done`, isi `completed_at`.
4. Bila gagal di langkah mana pun → status `failed` + `last_error`; **job ulang harian** melanjutkan entri yang masih `pending` atau `api_done`.

### Prosedur pasca-restore
1. Catat **cap waktu backup** (waktu pembuatan backup Supabase) sebagai bagian dari langkah restore — jangan ditebak.
2. Sebelum sistem dibuka: jalankan ulang penghapusan untuk semua entri log dengan `requested_at` LEBIH BARU dari cap waktu backup (idempoten — aman diulang).
3. Sistem baru dibuka setelah replay selesai.

### Kejujuran backup
Penghapusan hanya terjadi di data aktif; backup 90 hari masih memuat data sampai kedaluwarsa. Pernyataan ini harus masuk kebijakan privasi (putaran cek konsultan).

## Kontrak endpoint (Vercel Serverless Functions)
- **Auth — kunci dipisah per fungsi:** `API_KEY_RUN` untuk `run` + `get result`; `API_KEY_DELETE` khusus untuk `delete by-user` (kunci berbeda — kebocoran satu kunci tidak membuka penghapusan massal). Header `x-api-key: <kunci>`, server-ke-server saja (plugin PHP). 401 bila kunci hilang/salah.
- **Rate limit:** `run`/`get` mis. 100 req/menit per kunci; `delete` jauh lebih ketat, mis. 10 req/menit (konfigurasi).
- **Format error:** `{ "error": { "code": "<kode>", "message": "<pesan>" } }`.

### `POST /api/assessments/:id/run`
- Body: `{ "external_user_id": "<uuid>", "answers": {…}, "consent": { "text_version": "<versi>", "at": "<ISO-8601>", "is_18_plus": true } }`.
- Validasi: `consent` wajib + `is_18_plus` true, bila tidak → 400. `external_user_id` ditentukan plugin dari sesi WP — JANGAN pernah dari klien.
- Sukses 201: `{ "result_id": "<uuid>", "versions": { "assessment": "…", "scoring": "…", "norm": "…", "interpretation": "…" } }`.
- Error: 400 validasi, 401 auth, 429 rate limit, 500.

### `GET /api/results/:id`
- Sukses 200: `{ "result_id": "<uuid>", "external_user_id": "<uuid>", "assessment_id": "disc-v1", "result": {…}, "versions": {…}, "created_at": "<ISO-8601>" }`.
- Error: 404 tidak ditemukan, 401, 429, 500.

### `DELETE /api/results/by-user/:external_uuid`
- Menghapus SEMUA hasil peserta itu. **Idempoten:** mengembalikan 200 `{ "deleted_count": <n> }` bahkan bila `n = 0` (sudah terhapus).
- Hanya server-ke-server dengan `API_KEY_DELETE`; API tidak mempercayai `external_user_id` dari klien.
- Dipakai juga untuk memutar ulang penghapusan setelah restore backup.
- Error: 401, 429, 500.

### `GET /api/health`
- Sukses 200: `{ "status": "ok" }`.

## Catatan implementasi (untuk Tahap 0)
- ESM, Express/Fastify, Node 20/22. Tanpa `puppeteer` di jalur skoring. Tanpa penyimpanan file lokal/memori proses.
- Endpoint `DELETE` yang idempoten adalah yang memungkinkan prosedur pasca-restore — jangan diubah jadi non-idempoten.

## Pertanyaan terbuka (bukan teknis)
- **Sasaran pilot vs gerbang 18+:** posisi HRDLOKAL menyasar siswa dan mahasiswa, sementara persetujuan berbasis flag 18+. UU PDP mengatur data anak secara khusus (persetujuan orang tua/wali); gerbang 18+ berarti siswa SMA di bawah 18 tidak bisa ikut. Perlu diputuskan sebelum teks persetujuan ditulis: apakah pilot hanya mahasiswa + karyawan (18+), atau termasuk siswa 18+ (lulusan SMA/SMK)? Masuk daftar pertanyaan untuk konsultan.
