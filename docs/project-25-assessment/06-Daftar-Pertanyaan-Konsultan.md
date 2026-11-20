# 06 — Daftar Pertanyaan Konsultan Hukum / Praktisi UU PDP (DRAFT)

**Status:** DRAFT, 20 Nov 2026. Satu putaran cek sebelum kebijakan privasi diterbitkan dan sebelum ADR-007 naik dari Proposed ke Accepted. Bukan nasihat hukum sampai dijawab konsultan.

**Konteks untuk konsultan:** HRDLOKAL (hrdlokal.id) menjalankan asesmen online untuk peserta 18+ (pilot: mahasiswa + karyawan). Login dan identitas dipegang WordPress (UUID acak per peserta sebagai pengenal, tanpa email/nama di sisi hasil); hasil dan jawaban mentah disimpan di Supabase dan diakses lewat Assessment API (Node, Vercel serverless) — keduanya servernya di luar Indonesia. Penghapusan bersifat API-dahulu dan idempoten, dicatat per langkah di log WordPress (retensi 2 tahun), backup 90 hari. Agregat dihitung langsung dari data aktif (tidak dijanjikan bertahan setelah penghapusan). Keputusan lengkap ada di `00-README` (bagian Arsitektur aplikasi), `05-Skema-Tabel-dan-Kontrak-Endpoint.md` (revisi 4), dan ADR-007 (Proposed).

## Pertanyaan

### 1. Retensi log penghapusan 2 tahun
**Yang kami lakukan sekarang:** log penghapusan disimpan 2 tahun sejak tanggal permintaan, lalu dihapus otomatis oleh job terjadwal; masa simpan disimpan sebagai konfigurasi.
**Yang perlu dikonfirmasi:** apakah UU PDP atau peraturan turunannya menetapkan masa simpan khusus untuk catatan penghapusan seperti ini? Apakah 2 tahun dari tanggal permintaan dapat diterima?

### 2. Rumusan agregat
**Yang kami lakukan sekarang:** agregat dihitung langsung dari data aktif — peserta yang dihapus otomatis keluar dari statistik; kebijakan privasi tidak menjanjikan agregat yang bertahan setelah penghapusan; agregat hanya ditampilkan bila kelompoknya berisi minimum 5 peserta, berlaku juga untuk komplemen kelompok (total − kelompok).
**Yang perlu dikonfirmasi:** apakah rumusan ini cukup? Apakah ambang 5 peserta per kelompok dan komplemennya memadai untuk mencegah penautan ulang ke individu?

### 3. Kejujuran backup
**Yang kami lakukan sekarang:** penghapusan hanya terjadi di data aktif; backup (retensi 90 hari) masih memuat data sampai kedaluwarsa. Kebijakan privasi akan menyatakan ini secara jujur.
**Yang perlu dikonfirmasi:** apakah pernyataan seperti itu memadai? Apakah ada kewajiban tambahan terkait data di backup?

### 4. Keabsahan centang 18+ swadeklarasi
**Yang kami lakukan sekarang:** peserta mencentang "saya 18+" dan menyetujui pemrosesan data sebelum pertanyaan pertama; tanggal lahir tidak dikumpulkan.
**Yang perlu dikonfirmasi:** apakah centang swadeklarasi cukup sebagai dasar hukum untuk memastikan peserta dewasa, atau perlu verifikasi lain? (Sasaran pilot — mahasiswa + karyawan — sudah diputuskan dan tidak ditanyakan; yang ditanyakan hanya keabsahan centangnya.)

### 5. Batas waktu menanggapi permintaan subjek data
**Yang kami lakukan sekarang:** permintaan penghapusan diproses segera lewat alur otomatis; bila macet, job ulang mencoba tiap jam (backoff dibatasi 4 jam) dan admin diberi tahu bila entri belum selesai lebih dari X jam sejak permintaan (sementara dipakai 72 jam sebagai nilai awal).
**Yang perlu dikonfirmasi:** apakah UU PDP dan peraturan turunannya menetapkan batas waktu menanggapi permintaan penghapusan/akses subjek data? Angka berapa yang harus dipakai sebagai X?

### 6. Retensi hasil asesmen
**Yang kami lakukan sekarang:** hasil dan jawaban mentah disimpan tanpa batas waktu otomatis — belum ada kebijakan retensi hasil.
**Yang perlu dikonfirmasi:** berapa lama hasil asesmen boleh disimpan? Apakah ada kewajiban menghapus hasil setelah jangka waktu tertentu, atau setelah peserta tidak aktif?

### 7. Transfer data ke luar negeri
**Yang kami lakukan sekarang:** Supabase dan Vercel dipakai sebagai penyimpanan dan hosting API; servernya berada di luar Indonesia.
**Yang perlu dikonfirmasi:** apa yang disyaratkan UU PDP untuk transfer data pribadi ke luar negeri (kecukupan perlindungan, persetujuan, pengamanan)? Apakah perlu langkah tambahan sebelum memakai layanan ini?

### 8. Perjanjian pemrosesan dengan Supabase dan Vercel
**Yang kami lakukan sekarang:** belum ada perjanjian pemrosesan data (DPA) dengan Supabase atau Vercel.
**Yang perlu dikonfirmasi:** apakah kami wajib memiliki perjanjian pemrosesan dengan keduanya sebagai pemroses? Apa yang harus dimuat perjanjian itu?

### 9. Kewajiban bila terjadi kebocoran data
**Yang kami lakukan sekarang:** belum ada prosedur tertulis untuk kebocoran data.
**Yang perlu dikonfirmasi:** apa kewajiban pemberitahuan bila terjadi kebocoran (kepada siapa, dalam waktu berapa lama, isi pemberitahuan apa saja)? Apa yang harus disiapkan terlebih dahulu (prosedur internal, pencatatan)?

## Setelah dijawab
- Jawaban dicatat di dokumen ini (tanggal + ringkasan + sumber).
- Keputusan yang berubah dimasukkan ke `00-README`, `05`, dan ADR-007; ADR-007 naik ke Accepted bila tidak ada perubahan yang tertunda.
