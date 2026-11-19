# Proyek 25 Assessment HRDLOKAL — README

**Tujuan:** membangun 25 assessment dari data mentah di Google Drive menjadi aplikasi assessment di `assessment.hrdlokal.id` (subdomain terpisah, halaman WordPress Assessment tetap informatif saja).

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

## Cara kerja (urutan harian, Senin–Sabtu)

09:30 ChatGPT (koordinator) → 10:30 Grok (audit data mentah) → 11:30 Gemini (logika skoring) → 12:30 Meta AI (teks pengguna) → 13:30 Manus (pemeriksa berkas) → Claude on-demand (coding, hanya instrumen READY + paket lengkap). Viktor: on-demand asisten library alat tes di Slack + (diusulkan, menunggu persetujuan) pemeriksa status harian 14:30 WIB.

## Gelombang

- **Gelombang 0 — Audit (minggu 1):** audit kesiapan 25 instrumen, tanpa membangun. DISC diaudit pertama.
- **Gelombang 1 — Pilot DISC:** DISC end-to-end (audit → spesifikasi → naskah → periksa → kode oleh Claude).
- **Gelombang 2+ — Batch 4–5 instrumen READY** per gelombang. Instrumen BLOCKED menunggu keputusan William.

## Status proyek (19 Nov 2026)

- Struktur Drive selesai. Jadwal dan peran selesai (dokumen 01). Register 25 instrumen selesai (dokumen 03).
- **Belum dipasang:** jadwal di masing-masing AI (Grok, Manus, ChatGPT, Meta AI, Gemini) — William yang memasang dari prompt siap-pasang di dokumen 04, karena jadwal itu tinggal di akun AI masing-masing dan Loka tidak bisa memasangnya dari sini.
- Claude **tidak punya jadwal** — Claude tidak bisa bangun sendiri sesuai jadwal. Claude bekerja on-demand lewat William/Loka, mengambil tugas dari `TASK/CLAUDE/`.
