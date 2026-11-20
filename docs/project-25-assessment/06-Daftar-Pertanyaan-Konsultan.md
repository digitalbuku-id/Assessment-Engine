# 06 — Daftar Pertanyaan Konsultan Hukum / Praktisi UU PDP (DRAFT)

**Status:** DRAFT, 20 Nov 2026 — siap dikirim setelah lokasi layanan diisi (awal Tahap 0, lihat bagian Lokasi layanan). Satu putaran cek sebelum kebijakan privasi diterbitkan dan sebelum ADR-007 naik dari Proposed ke Accepted. Bukan nasihat hukum sampai dijawab konsultan.

**Konteks untuk konsultan:** HRDLOKAL (hrdlokal.id) menjalankan asesmen online untuk peserta 18+ (pilot: mahasiswa + karyawan). Login dan identitas dipegang WordPress (hosting Hostinger; WordPress menyimpan nama dan email peserta). Hasil dan jawaban mentah disimpan di Supabase dan diakses lewat Assessment API (Node, Vercel serverless). Ketiganya menyimpan atau memproses data pribadi, jadi ketiganya masuk dalam pertanyaan transfer lintas negara (no. 7). Penghapusan bersifat API-dahulu dan idempoten, dicatat per langkah di log WordPress (retensi 2 tahun), backup 90 hari. Agregat dihitung langsung dari data aktif (tidak dijanjikan bertahan setelah penghapusan). Draf teks persetujuan (07) dan kerangka kebijakan privasi (08) dikirim bersama daftar ini, supaya konsultan menilai teks nyata, bukan hanya jawaban abstrak. Keputusan lengkap ada di `00-README` (bagian Arsitektur aplikasi), `05-Skema-Tabel-dan-Kontrak-Endpoint.md` (revisi 6), dan ADR-007 (Proposed).

## Lokasi layanan (diisi di awal Tahap 0 — sebelum dokumen ini dikirim)
| Layanan | Data yang disimpan/diproses | Lokasi server |
|---|---|---|
| WordPress (hosting Hostinger) | Nama, email, akun peserta | TBD — periksa di hPanel |
| Supabase | Hasil dan jawaban mentah (pseudonim UUID) | TBD — periksa opsi Indonesia saat proyek dibuat; bila tidak ada, Singapura |
| Vercel (Assessment API) | Memproses permintaan API (tanpa menyimpan hasil) | TBD — bawaan Amerika Serikat kecuali diatur; atur ke Singapura bila memungkinkan |

Region Supabase dipilih saat proyek dibuat — pindah belakangan berarti migrasi. Region fungsi Vercel biasanya bawaan Amerika Serikat kecuali diatur. Pilihan lokasi tetap bisa diubah bila konsultan menyarankan lain, selama masih sebelum ada data peserta.

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
**Usulan untuk dikonfirmasi:** hapus atau anonimkan hasil setelah 24 bulan tanpa aktivitas peserta. Apakah angka dan rumusan ini dapat diterima, atau ada kewajiban lain (mis. retensi minimum)?

### 7. Transfer data ke luar negeri
**Yang kami lakukan sekarang:** tiga layanan dipakai — WordPress (Hostinger), Supabase, dan Vercel — dan masing-masing menyimpan atau memproses data pribadi; lokasi server ketiganya dicatat di tabel Lokasi layanan di atas.
**Yang perlu dikonfirmasi:** apa yang disyaratkan UU PDP untuk transfer data pribadi ke luar negeri (kecukupan perlindungan, persetujuan, pengamanan)? Apakah perlu langkah tambahan sebelum memakai layanan-layanan ini?

### 8. Perjanjian pemrosesan dengan Supabase dan Vercel
**Yang kami lakukan sekarang:** belum ada perjanjian pemrosesan data (DPA) dengan Supabase atau Vercel (juga belum dengan Hostinger sebagai penyedia hosting WordPress).
**Yang perlu dikonfirmasi:** apakah kami wajib memiliki perjanjian pemrosesan dengan ketiganya sebagai pemroses? Apa yang harus dimuat perjanjian itu?

### 9. Kewajiban bila terjadi kebocoran data
**Yang kami lakukan sekarang:** belum ada prosedur tertulis untuk kebocoran data.
**Yang perlu dikonfirmasi:** apa kewajiban pemberitahuan bila terjadi kebocoran (kepada siapa, dalam waktu berapa lama, isi pemberitahuan apa saja)? Apa yang harus disiapkan terlebih dahulu (prosedur internal, pencatatan)?

### 10. Klasifikasi data hasil asesmen
**Yang kami lakukan sekarang:** hasil asesmen kepribadian, minat, dan psikometrik diperlakukan sebagai data pribadi biasa (pseudonim lewat UUID), dengan perlindungan standar di dokumen 05.
**Yang perlu dikonfirmasi:** apakah hasil asesmen seperti ini termasuk data pribadi spesifik menurut UU PDP, dengan kewajiban tambahan? Jawabannya mengubah banyak hal lain dalam spesifikasi ini, jadi perlu dijawab lebih dulu.

### 11. Penilaian dampak dan pejabat pelindung data
**Yang kami lakukan sekarang:** belum ada penilaian dampak pelindungan data (DPIA) dan belum ada pejabat pelindung data (DPO) yang ditunjuk.
**Yang perlu dikonfirmasi:** apakah pemrosesan ini mewajibkan penilaian dampak pelindungan data atau penunjukan pejabat pelindung data — baik pada skala pilot maupun skala penuh?

### 12. Penarikan persetujuan
**Yang kami lakukan sekarang:** penarikan persetujuan ditangani lewat alur penghapusan yang sama (permintaan lewat WordPress → API menghapus dulu → akun dihapus bila diminta); belum ada batas waktu tersendiri untuk penarikan.
**Yang perlu dikonfirmasi:** bagaimana kaitan penarikan persetujuan dengan penghapusan menurut UU PDP, dan adakah batas waktu tersendiri untuk menanggapinya?

### 13. Hak subjek data selain akses dan penghapusan
**Yang kami lakukan sekarang:** yang dilayani lewat alur otomatis baru akses data sendiri dan penghapusan; hak lain (koreksi, keberatan, portabilitas) belum diatur.
**Yang perlu dikonfirmasi:** UU PDP memberi hak lain — termasuk koreksi, keberatan atas keputusan berbasis pemrosesan otomatis termasuk profiling, dan portabilitas. Skoring asesmen berpotensi dianggap pemrosesan otomatis atau profiling. Hak mana yang wajib dilayani di pilot, dan mana yang cukup lewat permintaan manual ke admin?

## Setelah dijawab
- Jawaban dicatat di dokumen ini (tanggal + ringkasan + sumber).
- Keputusan yang berubah dimasukkan ke `00-README`, `05`, dan ADR-007; ADR-007 naik ke Accepted bila tidak ada perubahan yang tertunda.
