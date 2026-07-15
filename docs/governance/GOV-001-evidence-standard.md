# GOV-001: Evidence Standard

**Status:** Proposed
**Date:** 2026-07-15
**Cakupan:** Standar ini berlaku untuk **siapa pun yang menghasilkan atau
mengevaluasi klaim faktual tentang state repo/sistem** dalam proyek ini —
baik itu output dari Hera, Ares, Zeus, model AI apa pun (termasuk yang
menyusun dokumen ini), maupun developer manusia. Ini bukan instruksi yang
ditujukan ke sistem AI eksternal manapun secara langsung — ini adalah
standar bagi **Product Owner dan tim** dalam menilai dan meminta
pertanggungjawaban atas klaim yang diterima dari sumber apa pun.

**Latar belakang:** Disarikan dari pola berulang selama audit mekanisme
background review Hermes (2026-07-15), di mana beberapa klaim awal —
baik dari agent maupun dari analisis lanjutan — keliru sampai diverifikasi
ulang terhadap bukti langsung.

---

## Prinsip

1. **Klaim faktual harus disertai bukti yang bisa diverifikasi ulang.**
   "Commit ini ada" harus disertai `git show <hash>`, bukan diasumsikan.
   "File ini berisi X" harus disertai isi file yang benar-benar dibaca,
   bukan diingat dari ringkasan sebelumnya.

2. **Ringkasan dari sesi/sumber lain adalah hipotesis, bukan laporan
   final.** Kalau sebuah klaim berasal dari sesi percakapan lain, chat
   log terpisah, atau laporan pihak ketiga — perlakukan sebagai sesuatu
   yang perlu diverifikasi ulang terhadap repo/sistem yang sebenarnya,
   bukan diterima sebagai fakta yang sudah pasti.

3. **Bedakan fakta dari inferensi secara eksplisit.** Kata seperti
   "kemungkinan", "sepertinya", "diduga" harus benar-benar dipakai untuk
   dugaan — bukan disamarkan sebagai temuan pasti dengan menghilangkan
   kata itu di kalimat kesimpulan.

4. **Tandai tingkat keyakinan (Confidence) secara eksplisit** untuk
   setiap kesimpulan penting:

   | Level | Arti |
   |---|---|
   | **HIGH** | Dibuktikan langsung — source code/git/log yang dikutip persis, bisa diverifikasi ulang oleh siapa pun |
   | **MEDIUM** | Dibuktikan sebagian — ada bukti pendukung, tapi ada celah/asumsi yang belum tertutup |
   | **LOW** | Dugaan berdasarkan pola/konteks, belum ada bukti langsung |
   | **UNKNOWN** | Belum cukup bukti untuk menyimpulkan apa pun — nyatakan ini secara eksplisit, jangan diam-diam diisi dengan asumsi |

5. **Kalau tidak bisa dipastikan, katakan itu secara eksplisit.**
   "Tidak dapat dipastikan dari data yang tersedia" adalah jawaban yang
   sah dan diharapkan — lebih baik daripada mengisi kekosongan dengan
   kesimpulan yang terdengar masuk akal tapi tidak berbukti.

6. **Koreksi terbuka dihargai, bukan dihindari.** Kalau klaim sebelumnya
   (dari siapa pun, termasuk dari dokumen governance ini sendiri) terbukti
   salah setelah verifikasi baru, koreksi itu dicatat secara eksplisit —
   bukan diam-diam diganti tanpa jejak.

---

## Format Pelaporan yang Direkomendasikan

Untuk klaim yang cukup penting untuk memengaruhi keputusan, gunakan format:

```
Klaim: <pernyataan>

Apa yang diketahui: <fakta yang didukung bukti>
Apa yang TIDAK diketahui: <celah, hal yang belum terverifikasi>
Bukti: <kutipan source/log/command output yang bisa diverifikasi ulang>
Confidence: HIGH / MEDIUM / LOW / UNKNOWN
```

---

## Contoh Penerapan (dari Audit 2026-07-15)

**Klaim yang benar sejak awal (HIGH confidence dipertahankan):**
> "SPEC-002 ada di repo, di path `docs/specs/SPEC-002-domain-pack-format.md`"
— diverifikasi via `git show f02ee85 --stat`, commit ditemukan persis
sesuai klaim.

**Klaim yang salah dan dikoreksi (turun dari asumsi ke UNKNOWN, lalu ke
HIGH setelah verifikasi ulang):**
> "`curator.enabled` adalah kontrol yang tepat untuk mematikan background
> review" — awalnya diasumsikan, ternyata **salah** setelah audit source
> code menunjukkan `curator.enabled` hanya mengontrol periodic sweep
> 7-harian, mekanisme terpisah dari background review per-turn.

Perbedaan antara dua contoh ini adalah verifikasi langsung terhadap
sumber — bukan kepercayaan pada kesimpulan sebelumnya, betapa pun masuk
akal kelihatannya.

---

## References

- Diturunkan dari praktik yang dijalankan selama audit
  `docs/governance/AGENT-GOVERNANCE.md` dan
  `docs/governance/AGENT-GOVERNANCE-audit-2026-07-15.md`.
