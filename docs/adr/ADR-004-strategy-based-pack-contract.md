# ADR-004: Strategy-Based Pack Contract

Status: Accepted (2026-07-12, PO approval)
Date: 2026-07-12
Related: [ADR-003](./ADR-003-canonical-assessment-domain-model.md), [SPEC-002](../specs/SPEC-002-domain-pack-format.md) — *(catatan: SPEC-002 berlokasi di docs/specs/, berbeda dari SPEC-001 yang di root specs/; belum diselaraskan, lihat item cleanup terpisah)*
Konteks proyek: Assessment-Engine, menyusul temuan dari implementasi DISC Domain Pack

---

## Context

Leadership Pack saat ini mengasumsikan satu pipeline tetap untuk semua assessment:

score → threshold → strength/weakness → next_best_action

DISC tidak cocok dengan pipeline ini. DISC membutuhkan:
- Dua profil terpisah (Most/Least), bukan satu skor tunggal
- Representasi visual (graph) sebagai bagian dari hasil, bukan sekadar dekorasi
- Interpretasi berbasis bentuk profil, bukan strength/weakness per dimensi

Tanpa mekanisme generik, setiap domain baru yang punya karakteristik berbeda (mis. DISC, dan kemungkinan besar Big Five atau instrumen lain di masa depan) akan memaksa perubahan pada core engine, atau — alternatif yang lebih buruk — dipaksa mengikuti pola threshold yang tidak sesuai secara konseptual.

Kita mempertimbangkan dua opsi:

1. "Assessment Family" terpisah — DISC diperlakukan sebagai kategori arsitektur baru di luar Domain Pack, dengan pipeline sendiri.
2. Strategy-based Pack Contract — Domain Pack tetap satu konsep, tapi kontraknya diperkaya dengan field yang mendeklarasikan strategi mana yang dipakai untuk scoring, graph, dan interpretation.

Opsi 2 dipilih karena lebih generik — tidak butuh membuat pengecualian arsitektural khusus untuk satu domain, dan tetap bisa mengakomodasi domain lain di masa depan yang punya kebutuhan serupa DISC.

## Decision

Pack contract (pack.json) diperkaya dengan 4 field baru:

{
  "pack_type": "behavioral",
  "scoring_strategy": "disc_dual_profile",
  "graph_strategy": "disc_profile",
  "interpretation_strategy": "disc_profile"
}

### Relasi antar field (definisi eksplisit)

Ini bagian yang sebelumnya ambigu di draft awal — didefinisikan sebagai berikut:

- `pack_type` adalah label kategori/deskriptif (untuk dokumentasi, filtering, dan default lookup), bukan sumber kebenaran untuk perilaku engine.
- `scoring_strategy`, `graph_strategy`, `interpretation_strategy` adalah field yang benar-benar dibaca engine untuk memilih implementasi. Field ini wajib eksplisit di setiap pack — tidak diturunkan otomatis dari pack_type.
- Engine tidak boleh menyimpulkan strategi dari pack_type (mis. pack_type: "behavioral" tidak otomatis berarti scoring_strategy: "disc_dual_profile"). Ini mencegah kombinasi implisit yang sulit dilacak saat debugging.
- Jika ada kombinasi yang secara logis tidak konsisten (mis. pack_type: "threshold" dengan scoring_strategy: "disc_dual_profile"), Pack Resolver bertugas memvalidasi kombinasi tersebut saat load time, terhadap daftar kombinasi yang didukung resmi oleh versi engine — bukan divalidasi secara implisit lewat asumsi field lain.
- Backward compatibility: pack tanpa field strategy (seperti Leadership Pack saat ini) di-treat sebagai scoring_strategy: "threshold", graph_strategy: "none", interpretation_strategy: "threshold" — default eksplisit di level engine, bukan inferensi dari pack_type yang mungkin juga tidak ada.

### Daftar strategi awal yang didukung

| Field | Nilai yang didukung di v1 |
|---|---|
| scoring_strategy | threshold, disc_dual_profile |
| graph_strategy | none, disc_profile |
| interpretation_strategy | threshold, disc_profile |

Nilai di luar daftar ini harus ditolak oleh Pack Resolver dengan error eksplisit saat load, bukan silent fallback.

## Consequences

Positive:
- Generik dan mudah diperluas — domain baru di masa depan (mis. Big Five, atau instrumen lain) bisa mendeklarasikan strategi sendiri tanpa mengubah core engine atau membuat kategori arsitektur baru.
- Tidak perlu membuat pengecualian ("Assessment Family") khusus per domain.
- Kombinasi field divalidasi eksplisit di satu tempat (Pack Resolver), bukan tersebar sebagai asumsi implisit di berbagai bagian kode.
Negative:
- Engine perlu diperbarui untuk mendukung strategy selection (kerja tambahan di Pack Resolver dan Recommendation Engine).
- Menambah satu lapis konfigurasi yang harus dipahami setiap kali menambah Domain Pack baru.

Risk:
- Kalau strategy field tidak terdefinisi dan tidak ada default eksplisit yang cocok, Pack Resolver harus menolak load pack tersebut (fail loudly) — bukan fallback diam-diam ke threshold, karena itu bisa menyembunyikan bug pada domain yang justru butuh strategi lain.

## Future Work

Mekanisme resolusi strategy sengaja tidak dibahas dalam ADR ini dan akan menjadi ruang lingkup ADR-005 (Strategy Registry and Resolution Framework).

ADR-004 menjawab "apa yang dideklarasikan oleh pack?" (kontrak metadata).

ADR-005 akan menjawab "bagaimana engine menemukan, memvalidasi, dan menjalankan strategy tersebut?" (mekanisme resolusi).

Desain registry sengaja ditunda ke ADR-005 agar ADR ini tetap berfokus pada kontrak metadata pack.

## Status

Accepted — TASK-025C (update SPEC-002) dan TASK-025D (implementasi
DISC) dapat dilanjutkan.
