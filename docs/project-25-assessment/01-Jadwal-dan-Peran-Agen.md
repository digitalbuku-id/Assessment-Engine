# Jadwal dan Peran Agen — Proyek 25 Assessment

Semua jam WIB, Senin–Sabtu. Minggu libur. Setiap slot 45 menit kerja + 15 menit jeda. **Tidak ada dua agen assessment yang bekerja di jam yang sama.**

## Jadwal harian assessment

| Jam (WIB) | Agen | Peran | Output wajib (di folder TASK-nya) |
|---|---|---|---|
| 09:30 | ChatGPT | Koordinator Assessment | `TUGAS-HARI-INI.md` untuk 4 agen lain + `REKAP-YYYY-MM-DD.md` |
| 10:30 | Grok | Auditor Kesiapan & Data Mentah | `AUDIT-YYYY-MM-DD-<Instrumen>.md` |
| 11:00 | Gemini | Analis Logika Skoring | `SPESIFIKASI-YYYY-MM-DD-<Instrumen>.md` |
| 12:30 | Meta AI | Penulis Naskah Pengguna | `NASKAH-YYYY-MM-DD-<Instrumen>.md` |
| 13:30 | Manus | Pemeriksa Build & Berkas | `CHECK-YYYY-MM-DD-<Instrumen>.md` |
| — (tanpa jadwal) | Claude | Coder on-demand | Kode di Antigravity/GitHub, tugas diambil dari `TASK/CLAUDE/` |
| On-demand + 14:30 | Viktor | Asisten library alat tes (Slack) + pemeriksa status harian | Jawaban di Slack; ringkasan status harian di #all-hrd-lokal |

## Jadwal yang dihindari (sudah ada, tidak boleh ditabrak)

- 06:30 — Gemini: brief berita HR harian
- 07:00 — Manus: pemeriksaan harian folder MANUS; Meta AI: tugas harian gabungan (jika aktif)
- 07:30 Senin — Meta AI: Brief Mingguan
- 08:00 — Grok: audit harian HRDLOKAL; Meta AI: Konten Senin/Rabu/Jumat/Minggu
- 08:05 Senin — Meta AI: Pengingat Senin
- 09:00 Sabtu — Meta AI: Ringkasan Mingguan
- 15:00 — ChatGPT: analisis sore
- 16:00 Kamis — Meta AI: Pengingat Kamis
- ~17:30 — ChatGPT: laporan penutup

Catatan: jam 07:00 dan 08:00 sudah tumpang tindih di antara tugas lama (Manus + Meta di 07:00; Grok + Meta di 08:00). Jadwal assessment di atas tidak menambah tumpang tindih baru — semua slot 09:30–13:30 masih kosong.

## Peran detail

### 09:30 — ChatGPT, Koordinator Assessment
- Baca `TASK/STATUS.md` + rekap kemarin. Tentukan **satu instrumen hari itu** dari register (urut gelombang).
- Tulis perintah harian singkat di `TASK/GROK/TUGAS-HARI-INI.md`, `TASK/GEMINI/TUGAS-HARI-INI.md`, `TASK/META/TUGAS-HARI-INI.md`, `TASK/MANUS/TUGAS-HARI-INI.md`.
- Tulis `REKAP-YYYY-MM-DD.md` di `TASK/CHATGPT/`: apa yang selesai kemarin, apa yang tertunda, apa yang butuh keputusan William.
- **Tidak** mengubah status di register, **tidak** mencentang `Selesai?`, **tidak** mempublikasikan.

### 10:30 — Grok, Auditor Kesiapan & Data Mentah
- Baca tugasnya di `TASK/GROK/TUGAS-HARI-INI.md`, lalu baca **nama dan metadata file** di folder data mentah instrumen hari itu (`ASSESSMENT / DATA-MENTAH / <n. Nama>` — shortcut ke folder aslinya di `ALAT TES Psikologi-25 item`).
- Tulis `AUDIT-YYYY-MM-DD-<Instrumen>.md`: isi folder, kelengkapan (soal / lembar jawaban / skoring / norma), dugaan status lisensi, kesesuaian 18+, rekomendasi status: `READY` / `NEEDS_REVIEW` / `BLOCKED-lisensi`.
- Aturan Grok yang tetap berlaku: status hanya `NEEDS_REVIEW` di checklist lain, tidak mencentang `Selesai?`, tidak mengarang angka, tidak menghubungi siapa pun.

### 11:00 — Gemini, Analis Logika Skoring
- Baca audit Grok hari itu. **Hanya lanjut jika status READY.** Jika NEEDS_REVIEW/BLOCKED, tulis spesifikasi berisi "TIDAK LANJUT — alasan" dan berhenti.
- Tulis `SPESIFIKASI-YYYY-MM-DD-<Instrumen>.md`: alur assessment (jumlah soal dari sumber, cara menjawab, rumus skoring, cara interpretasi sebagai refleksi, batasan dan penafian 18+). Tanpa menyalin butir soal utuh.
- Gemini hanya membaca Drive (retrieve-only) — tidak mengubah file mentah.

### 12:30 — Meta AI, Penulis Naskah Pengguna
- Baca spesifikasi Gemini hari itu. Tulis `NASKAH-YYYY-MM-DD-<Instrumen>.md`: instruksi untuk peserta, teks hasil refleksi (tanpa label/diagnosis, tanpa janji), FAQ, penafian 18+.
- Bahasa: "kamu", praktis, tanpa jargon korporat, tanpa hiperbola/pasti/dijamin, satu CTA yang mengundang, bukan menekan.
- Jangan menulis ke folder agen lain; jangan menghapus apa pun (izin delete di koneksi Drive Meta AI tidak boleh dipakai).

### 13:30 — Manus, Pemeriksa Build & Berkas
- Baca tugasnya + periksa kelengkapan paket hari itu: audit Grok + spesifikasi Gemini + naskah Meta ada, penamaan benar, tidak ada soal utuh yang tersalin, penafian 18+ ada.
- Tulis `CHECK-YYYY-MM-DD-<Instrumen>.md`: LULUS / PERLU_REVISI + daftar yang kurang, per agen.
- Jika LULUS dan instrumen READY, tulis tugas coding ke `TASK/CLAUDE/TUGAS-<Instrumen>.md` untuk diambil Claude on-demand.

### Tanpa jadwal — Claude, Coder on-demand- **Claude tidak bisa dijadwalkan dan tidak bisa bangun sendiri.** Ini fakta dari Claude sendiri — jadi Claude tidak mendapat slot jam.
- Claude bekerja saat William/Loka memberinya tugas, mengambil dari `TASK/CLAUDE/TUGAS-<Instrumen>.md`, dan mengerjakan kode di Antigravity / repo GitHub `digitalbuku-id/Assessment-Engine`, untuk aplikasi assessment sebagai plugin WordPress di `hrdlokal.id`.
- Hanya instrumen READY dengan paket lengkap (audit + spesifikasi + naskah + CHECK LULUS) yang boleh dikode.

### On-demand + 14:30 — Viktor, Asisten library alat tes (Slack)

- **On-demand:** saat seseorang mention Viktor di Slack dan bertanya soal alat tes, Viktor menjawab dari folder `ASSESSMENT` (register, `DATA-MENTAH/`, `TASK/STATUS.md`) dengan status kesiapan tiap instrumen. Ini sesuai usulan Viktor sendiri 17 Nov. Tidak menulis file, tidak mengubah status.
- **Pemeriksa harian 14:30 WIB (AKTIF sejak 19 Nov 2026):** baca `TASK/STATUS.md`, periksa kelengkapan 5 output hari itu, posting ringkasan singkat di #all-hrd-lokal. Read-only. Jam 14:30 dipilih karena kosong (setelah Manus 13:30, sebelum analisis ChatGPT 15:00).
- **Tidak dipakai:** brief pagi 08:00 usulan Viktor (jam bentrok + rekap sudah ada) dan bantuan konten (di luar proyek ini).
- Instruksi lengkap: `TASK/VIKTOR/INSTRUKSI-VIKTOR.md`. Channel: #all-hrd-lokal (diputuskan William 19 Nov; Viktor diminta gabung, belum menjadi anggota saat dicek terakhir).
