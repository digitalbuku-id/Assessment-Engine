# Kerangka Kebijakan Privasi Asesmen HRDLOKAL (DRAFT)

**Status:** KERANGKA DRAFT v0.1, 20 Nov 2026 — untuk putaran cek konsultan hukum/praktisi UU PDP bersama dokumen 06. Bagian yang sudah diputuskan ditulis lengkap; bagian yang menunggu jawaban konsultan ditandai **[TANYA KONSULTAN]**. Bukan kebijakan final; jangan diterbitkan sebelum dicek konsultan.

---

## 1. Siapa kami

HRDLOKAL (hrdlokal.id) — PT Talenta Lokal Indonesia. Kontak: **hrdlokal.com@gmail.com**, WhatsApp **085183288803**.

Kebijakan ini khusus mengatur asesmen online HRDLOKAL (bukan seluruh situs).

## 2. Siapa yang bisa ikut

Asesmen hanya untuk peserta **berusia 18 tahun atau lebih**. Pilot ditujukan untuk mahasiswa dan karyawan. Peserta di bawah 18 tahun tidak bisa ikut.

**[TANYA KONSULTAN — pertanyaan 4]:** apakah centang "saya 18+" cukup sebagai dasar hukum, atau perlu verifikasi lain?

## 3. Data yang kami kumpulkan

- **Jawaban asesmenmu** (jawaban mentah atas pertanyaan asesmen).
- **Kode acak (UUID)** yang dibuat saat asesmen pertamamu dan disimpan di akun WordPress-mu — kode inilah yang melekat pada hasilmu.
- **Salinan persetujuan**: versi teks persetujuan, waktu persetujuan, dan tanda 18+.

Yang **tidak** kami simpan bersama hasil: nama, email, dan tanggal lahir. Nama dan email hanya ada di akun WordPress-mu. Tanggal lahir tidak dikumpulkan sama sekali.

**[TANYA KONSULTAN — pertanyaan 10]:** apakah hasil asesmen kepribadian/minat/psikometrik termasuk data pribadi spesifik, dengan kewajiban tambahan?

## 4. Untuk apa datamu dipakai

- Menghitung skor dan menampilkan hasil asesmenmu.
- Statistik gabungan (agregat) dari banyak peserta.

Dasar pemrosesan: persetujuanmu (lihat dokumen 07). Kamu bisa menarik persetujuan kapan saja — lihat bagian 8.

**[TANYA KONSULTAN — pertanyaan 11 dan 13]:** apakah pemrosesan ini mewajibkan penilaian dampak (DPIA) atau pejabat pelindung data (DPO)? Hak apa saja yang wajib dilayani di pilot (koreksi, keberatan atas pemrosesan otomatis/profiling, portabilitas)?

## 5. Penyedia layanan (pihak ketiga)

| Layanan | Peran | Data yang diproses |
|---|---|---|
| WordPress (hosting Hostinger) | Akun, login, tampilan hasil | Nama, email, akun |
| Supabase | Penyimpanan hasil | Hasil + jawaban (pseudonim UUID) |
| Vercel (Assessment API) | Menghitung skor | Memproses permintaan API (tanpa menyimpan hasil) |

**[TANYA KONSULTAN — pertanyaan 7 dan 8]:** lokasi server ketiga layanan diisi di dokumen 06 (awal Tahap 0); persyaratan transfer lintas negara dan perjanjian pemrosesan (DPA) menunggu jawaban konsultan.

## 6. Berapa lama data disimpan

- **Hasil asesmen:** dihapus atau dianonimkan setelah **24 bulan tanpa aktivitas** (usulan — **[TANYA KONSULTAN — pertanyaan 6]**).
- **Catatan permintaan penghapusan:** 2 tahun sejak tanggal permintaan, lalu dihapus otomatis (**[TANYA KONSULTAN — pertanyaan 1]**).
- **Backup:** retensi 90 hari (**[TANYA KONSULTAN — pertanyaan 3]** untuk pernyataan kejujuran backup).

## 7. Agregat

Agregat dihitung langsung dari data aktif. Peserta yang dihapus otomatis keluar dari statistik. **Kami tidak menjanjikan agregat yang bertahan setelah penghapusan.** Agregat hanya ditampilkan bila kelompoknya berisi minimal 5 peserta, berlaku juga untuk komplemen kelompok (total − kelompok) — **[TANYA KONSULTAN — pertanyaan 2]**.

## 8. Penghapusan dan hak-hakmu

Kamu berhak:
- **Melihat** datamu sendiri, termasuk jawaban mentahmu.
- **Meminta koreksi** bila ada yang salah.
- **Meminta penghapusan**: hanya hasil asesmenmu saja, atau hasil beserta akun WordPress-mu.
- **Menarik persetujuanmu** kapan saja — ditangani lewat alur penghapusan yang sama (**[TANYA KONSULTAN — pertanyaan 12]** untuk batas waktu tersendiri).
- **[TANYA KONSULTAN — pertanyaan 13]:** keberatan atas keputusan berbasis pemrosesan otomatis/profiling dan portabilitas — hak mana yang wajib dilayani di pilot?

Cara meminta: lewat akun WordPress-mu atau ke hrdlokal.com@gmail.com / WhatsApp 085183288803. **[TANYA KONSULTAN — pertanyaan 5]:** batas waktu menanggapi permintaan (saat ini nilai sementara 72 jam untuk peringatan admin).

**Kejujuran backup:** penghapusan terjadi di data aktif. Salinan cadangan (backup) masih memuat datamu sampai backup itu kedaluwarsa, paling lama 90 hari setelah penghapusan.

## 9. Keamanan

- Hasil hanya diakses lewat API server-ke-server (plugin WordPress → API → Supabase); browser tidak pernah menyentuh penyimpanan hasil langsung.
- Kunci API dipisah per fungsi (skoring, penghapusan, admin) dan dirotasi.
- Plugin tidak menyimpan hasil atau jawaban di WordPress (tanpa transient, cache, atau log debug); halaman hasil dikecualikan dari page cache dan CDN.

## 10. Kebocoran data

**[TANYA KONSULTAN — pertanyaan 9]:** kewajiban pemberitahuan bila terjadi kebocoran (kepada siapa, dalam waktu berapa lama, isi pemberitahuan apa saja) dan prosedur internal yang harus disiapkan.

## 11. Perubahan kebijakan

Bila kebijakan ini berubah, versi baru diterbitkan di halaman ini dengan tanggal berlakunya. Perubahan yang memengaruhi hakmu akan diberitahukan lewat akunmu.

## 12. Kontak

Pertanyaan tentang kebijakan ini atau datamu: **hrdlokal.com@gmail.com**, WhatsApp **085183288803**.
