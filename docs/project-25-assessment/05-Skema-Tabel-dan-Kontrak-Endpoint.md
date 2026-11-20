# 05 — Skema Tabel & Kontrak Endpoint (DRAFT)

**Status:** DRAFT, 20 Nov 2026. Perlu dicek terhadap ADR-001–006 (khususnya ADR-006) sebelum dipakai Tahap 0. Keputusan yang mendasarinya ada di `00-README` bagian "Arsitektur aplikasi" (identitas WordPress + UUID, penghapusan idempoten server-ke-server, retensi backup 90 hari, retensi log 2 tahun).

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
Log sengaja disimpan di sisi WordPress agar tetap utuh saat Supabase di-restore dari backup — log inilah yang dipakai memutar ulang penghapusan pasca-restore.

| Kolom | Tipe | Keterangan |
|---|---|---|
| `id` | bigint PK auto-increment | |
| `external_user_id` | char(36) NOT NULL, index | UUID peserta |
| `requested_at` | datetime NOT NULL | Tanggal permintaan — dasar hitung retensi |
| `status` | varchar(20) NOT NULL | `requested` / `completed` / `failed` |
| `expires_at` | datetime NOT NULL | `requested_at` + masa simpan (dihitung saat entri dibuat) |
| `completed_at` | datetime NULL | Waktu penghapusan selesai |

- `usermeta` terkait: `hrdlokal_assessment_uuid` (UUID), `hrdlokal_consent_text_version`, `hrdlokal_consent_at`, `hrdlokal_is_18_plus`.
- Retensi: 2 tahun dari `requested_at` (konfigurasi `ERASURE_LOG_RETENTION_DAYS=730`, bukan hardcode). Job terjadwal (harian, WP-Cron) menghapus entri dengan `expires_at < now()`.
- Angka 2 tahun + rumusan agregat dicek konsultan hukum/praktisi UU PDP dalam satu putaran (belum bisa dipastikan sebagai nasihat hukum sebelum dicek).

## Kontrak endpoint (Vercel Serverless Functions)
- **Auth:** header `x-api-key: <API_KEY>` — server-ke-server saja (plugin PHP). 401 bila kunci hilang/salah. Rate limit per kunci (mis. 100 req/menit, konfigurasi).
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
- Hanya server-ke-server (kunci rahasia); API tidak mempercayai `external_user_id` dari klien.
- Dipakai juga untuk memutar ulang penghapusan setelah restore backup.
- Error: 401, 429, 500.

### `GET /api/health`
- Sukses 200: `{ "status": "ok" }`.

## Catatan implementasi (untuk Tahap 0)
- ESM, Express/Fastify, Node 20/22. Tanpa `puppeteer` di jalur skoring. Tanpa penyimpanan file lokal/memori proses.
- Endpoint `DELETE` yang idempoten adalah yang memungkinkan prosedur pasca-restore — jangan diubah jadi non-idempoten.
