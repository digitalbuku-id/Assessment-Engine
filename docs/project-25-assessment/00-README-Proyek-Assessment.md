# Proyek 25 Assessment HRDLOKAL — README

**Tujuan:** membangun 25 assessment dari data mentah di Google Drive menjadi aplikasi assessment di dalam WordPress di `hrdlokal.id` (halaman Assessment menjadi aplikasi interaktif; keputusan 19 Nov 2026 menggantikan rencana subdomain `assessment.hrdlokal.id`).

**Pemilik:** Agenth/Randy. **Pelaksana proyek:** William Sie Kapuk (tim IT dept hrdlokal.id).

**Data mentah:** folder Drive `ALAT TES Psikologi-25 item` — 25 folder instrumen bernomor + folder BONUS + 3 file lepas. Data mentah **tidak dipindah, tidak disalin, tidak diubah**. Pintu masuknya dari dalam proyek ini adalah folder `DATA-MENTAH/` (berisi shortcut ke semua folder/file asli). Semua kerja membaca dari sana dan menyimpan hasil di folder `ASSESSMENT` ini.

**Lokasi proyek (Drive):** `HRDLOKAL PROJECT / ASSESSMENT`
- `DATA-MENTAH/` — shortcut ke 25 folder instrumen + BONUS + 3 file lepas di `ALAT TES Psikologi-25 item`. Pintu masuk data mentah dari dalam proyek; bukan salinan.
- `TASK/` — folder tugas tiap agen. Setiap agen **wajib** memeriksa foldernya sendiri setiap kali bekerja (lihat `02-SOP-Cek-TASK.md`).
  - `TASK/CHATGPT/`, `TASK/GROK/`, `TASK/GEMINI/`, `TASK/META/`, `TASK/MANUS/`, `TASK/CLAUDE/`
- `OUTPUT/` — hasil per instrumen, satu folder per instrumen (`01-DISC/` sudah dibuat sebagai pilot; folder lain dibuat saat gelombangnya dimulai).
- Dokumen proyek ini (`00-README`, `01-Jadwal-dan-Peran`, `02-SOP`, `03-Register`, `04-Prompt`) tinggal di root folder `ASSESSMENT`.

## Aturan yang mengikat semua agen

1. **Peserta 18+.** Semua assessment hanya untuk 18+. Teks, contoh, dan syarat harus menyatakan itu.
2. **Refleksi, bukan label/diagnosis.** Hasil assessment adalah bahan refleksi, bukan label permanen, bukan diagnosis, tanpa janji hasil pasti.
3. **Jangan salin soal utuh.** Jangan mereproduksi butir soal, kunci jawaban, atau norma proprietary apa adanya. Yang ditulis adalah spesifikasi logika, alur, dan teks pengguna — dari audit, bukan dari menyalin isi tes.
4. **Lisensi dulu, bangun kemudian.** Instrumen berstatus BLOCKED (lisensi/kualifikasi belum terverifikasi — antara lain MMPI, MBTI, 16PF, CFIT) **tidak dibangun** sampai William memutuskan.
5. **Agen tidak menghapus.** Hanya owner yang boleh menghapus. Agen tidak mengubah status, tidak mencentang `Selesai?`, tidak memindah tugas agen lain, tidak mempublikasikan apa pun.
6. **Satu tugas, satu agen, satu jam.** Setiap agen bekerja hanya di jamnya (lihat `01-Jadwal-dan-Peran-Agen.md`), hanya di folder TASK-nya sendiri, dan menyimpan output dengan nama ber-tanggal.

## Arsitektur aplikasi (dikoreksi 19 Nov 2026 — menggantikan rencana skoring di browser)

Koreksi ini mengikuti ADR-006 repo Assessment-Engine (Accepted; persistence lewat backend Node + Supabase, engine murni domain logic). Rencana awal "skoring di JavaScript browser" **dibatalkan** karena melanggar ADR-006 D2.

- **Plugin WordPress di `hrdlokal.id` adalah SALURAN, bukan mesin skoring.** Plugin hanya: menampilkan soal, menerima jawaban, login peserta, menampilkan hasil. **Tidak ada** logika skoring, rubrik, atau norma di JavaScript browser.
- **Skoring HANYA di server.** Jawaban mentah dikirim ke Assessment API (Node) → engine menghitung → hasil distempel versi (assessment, scoring, norm, interpretation) → disimpan di Supabase. Hasil yang dikirim browser tidak pernah dipercaya apa adanya.
- **Satu sumber kebenaran tetap engine + Supabase (ADR-006 TETAP berlaku, tidak dibatalkan).** WordPress tidak menjadi sumber data kedua. `digitalbuku.id` dan `hrdlokal.id` hanya beda saluran dengan engine yang sama.
- **Hasil diambil dari engine saat dibaca** (konfigurasi/paket terbaru), bukan dari paket data statis yang dibekukan di plugin.
- **Login dulu (keputusan 19 Nov 2026):** peserta login dengan email atau magic link. **Pintu 18+ dan persetujuan data WAJIB di awal** (sebelum soal pertama): konfirmasi usia 18+ + persetujuan pemrosesan data (UU PDP) — tanpa ini tes tidak dimulai. Untuk mengurangi friksi, pembuatan akun (email) boleh di akhir: peserta mengerjakan dulu, email diminta saat hasil ditampilkan, lalu jawaban diikat ke akun yang baru dibuat.
- **Plugin memanggil API dari sisi server (PHP), bukan dari browser.** Kunci API tidak pernah ada di JavaScript. API wajib punya pembatasan laju (rate limiting) agar kuota B2B tidak bisa dikuras.
- **Identitas (diputuskan 20 Nov 2026, William):** WordPress pemilik identitas. Setiap peserta punya UUID acak yang disimpan di `usermeta` WP dan dipakai sebagai `external_user_id` di Supabase (bukan `user_id` numerik — tahan terhadap restore database, migrasi, dan impor ulang user; lebih mudah dipetakan saat digitalbuku.id masuk). Baris hasil menyimpan: `channel`, `external_user_id` (UUID), dan salinan persetujuan (versi teks persetujuan + timestamp + flag 18+ — tanpa tanggal lahir; tanggal lahir tidak dikumpulkan). Supabase menyimpan PII seminimal mungkin (tanpa email/nama). `external_user_id` tetap data pribadi (pseudonim, bukan anonim, menurut UU PDP). **Penghapusan (UU PDP):** peserta meminta lewat WordPress → plugin memanggil endpoint hapus API (server-ke-server, kunci rahasia; API tidak mempercayai `external_user_id` dari klien — plugin menentukannya dari sesi WP yang sudah terautentikasi) → API menghapus dulu, endpoint idempoten (hapus dua kali tetap aman) → plugin menghapus akun WP setelah API membalas sukses. Permintaan penghapusan dicatat (tanggal, status, UUID — tanpa nama/email) sebagai bukti kepatuhan. Supabase termasuk cakupan penghapusan, termasuk backup — retensi backup diputuskan 20 Nov 2026: 90 hari (perlu dicek terhadap paket Supabase yang dipakai — paket gratis mungkin tidak mendukung 90 hari); penghapusan dari backup terjadi saat backup kedaluwarsa. Statistik agregat yang sudah tidak bisa ditautkan ke individu diusulkan boleh dipertahankan — masuk ke kebijakan privasi, dengan rumusan yang dicek konsultan hukum/praktisi UU PDP sebelum terbit dan batas "tidak bisa ditautkan" yang didefinisikan konkret (mis. ambang minimum jumlah peserta per kelompok statistik). **Restore backup:** pemulihan dari backup lama bisa menghidupkan lagi data yang sudah dihapus. Prosedur: setelah restore apa pun, semua penghapusan di log yang lebih baru dari backup dijalankan ulang sebelum sistem dibuka — aman karena endpoint idempoten. **Retensi log penghapusan:** diputuskan 20 Nov 2026: 2 tahun, dihitung dari tanggal permintaan penghapusan (setiap entri punya tanggal kedaluwarsa yang pasti); dihapus otomatis oleh job terjadwal (harian/mingguan); masa simpan disimpan sebagai konfigurasi, bukan hardcode di kode. Angka 2 tahun + rumusan agregat dicek konsultan hukum/praktisi UU PDP dalam satu putaran (belum bisa dipastikan sebagai nasihat hukum sebelum dicek). Aturan: retensi backup (90 hari) tidak boleh melebihi retensi log (2 tahun), supaya tidak ada backup yang memuat peserta terhapus tanpa log pendampingnya.
- **Tanpa `interpretation_policy` di pilot DISC.** Konsep itu tidak ada di repo. Pilot memakai keluaran berstempel versi + satu aturan teks tetap. Kebijakan live dirancang setelah ada kode yang bisa diuji.
- **Prasyarat yang belum ada:** Assessment API (`AssessmentRunService` + endpoint HTTP sesuai ADR-006 D5) **belum dibangun** — `src/application/` belum ada di repo. API ini harus dibangun dulu sebelum plugin bisa menghitung skor. **Hosting API diputuskan 19 Nov 2026 (William): Serverless, provider Vercel** (dipilih Loka atas delegasi William — Node, deploy dari GitHub, paket gratis; engine sudah di GitHub). Brief Tahap 0 untuk Claude: `TASK/CLAUDE/TUGAS-TAHAP-0-API.md`. **Kecocokan dengan repo (diperiksa 19 Nov):** `mvp/server.js` tidak bisa dipakai apa adanya — CommonJS di paket ESM, `express` tidak ada di dependencies, snapshot disimpan di file lokal + memori (tidak cocok untuk serverless), dan `puppeteer` (PDF) tidak muat di serverless functions standar — jalur skoring harus bebas puppeteer; pembuatan PDF dipisah/ditunda. **Terperiksa via hPanel:** hrdlokal.id memakai Hostinger Premium Web Hosting (Rp49.900/bln) — tidak mendukung Node.js, jadi API memang tidak bisa jalan di hosting sekarang.

## Cara kerja (urutan harian, Senin–Sabtu)

09:30 ChatGPT (koordinator) → 10:30 Grok (audit data mentah) → 11:00 Gemini (logika skoring) → 12:30 Meta AI (teks pengguna) → 13:30 Manus (pemeriksa berkas) → Claude on-demand (coding, hanya instrumen READY + paket lengkap). Viktor: on-demand asisten library alat tes di Slack + pemeriksa status harian 14:30 WIB (aktif sejak 19 Nov 2026).

## Gelombang

- **Gelombang 0 — Audit (minggu 1):** audit kesiapan 25 instrumen, tanpa membangun. DISC diaudit pertama — didukung bukti repo: roadmap menempatkan DISC sebagai domain pack berikutnya (Sprint 6) dan paket `disc_dual_profile` + acuan RD-DISC-001 sudah ada di engine.
- **Tahap 0 — Assessment API (sebelum pilot, tanpa slot harian):** bangun `AssessmentRunService` + endpoint HTTP (ADR-006 D5) dan putuskan hostingnya dulu. Tanpa API ini plugin tidak bisa menghitung skor. Dikerjakan Claude on-demand dipandu Loka/William. Jadwal harian agen TIDAK mencakup tahap ini — jadi estimasi gelombang pilot harus menghitung tahap 0 secara terpisah.
- **Gelombang 1 — Pilot DISC:** DISC end-to-end (audit → spesifikasi → naskah → periksa → kode oleh Claude).
- **Gelombang 2+ — Batch 4–5 instrumen READY** per gelombang. Instrumen BLOCKED menunggu keputusan William.

## Status proyek (19 Nov 2026)

- Struktur Drive selesai. Jadwal dan peran selesai (dokumen 01). Register 25 instrumen selesai (dokumen 03).
- **Belum dipasang:** jadwal di masing-masing AI (Grok, Manus, ChatGPT, Meta AI, Gemini) — William yang memasang dari prompt siap-pasang di dokumen 04, karena jadwal itu tinggal di akun AI masing-masing dan Loka tidak bisa memasangnya dari sini.
- Claude **tidak punya jadwal** — Claude tidak bisa bangun sendiri sesuai jadwal. Claude bekerja on-demand lewat William/Loka, mengambil tugas dari `TASK/CLAUDE/`.
