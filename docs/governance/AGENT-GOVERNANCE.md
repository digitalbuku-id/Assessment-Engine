# AGENT-GOVERNANCE: Tata Kelola Perilaku Agent (Hermes/Hera)

**Status:** Draft — menunggu PO review
**Date:** 2026-07-15
**Latar belakang:** Disusun menyusul temuan bahwa mekanisme *background review*
Hermes Agent mem-patch file instruksi (`SKILL.md`) milik Hera secara otomatis,
di luar jalur ADR → SPEC → Implementation yang berlaku untuk source code
proyek Assessment-Engine (insiden TASK-025C-A, 2026-07-12).
**Cakupan dokumen:** Proyek Assessment-Engine dan seluruh agent yang bekerja
di atasnya (Hera, Ares, Zeus, WSL_bot), khusus untuk perubahan yang
memengaruhi *cara agent bekerja* — bukan perubahan pada codebase itu sendiri.
**Standar evidentiary:** Dokumen ini mengikuti [GOV-001 Evidence Standard](./GOV-001-evidence-standard.md).

---

## 0. Governance Boundary

Diagram ini menjelaskan kenapa audit ini diperlukan sejak awal — ada dua
sistem berbeda yang selama ini diperlakukan seolah satu:

```
Git Repository (Assessment-Engine)
|
+-- ADR             <- keputusan arsitektur, direview
+-- SPEC            <- kontrak format, direview
+-- Source Code     <- implementasi, diuji
+-- Tests           <- 22+ test case, harus PASS
|
|   Setiap perubahan: commit + diff + review + git log
|
========================================================
                 GOVERNANCE BOUNDARY
========================================================
|
|   Perubahan di bawah ini TIDAK melalui commit/diff/review
|
Hermes Runtime (~/.hermes/)
|
+-- Memory              <- auto-save berdasarkan nudge interval
+-- Skills (SKILL.md)   <- bisa di-patch oleh Background Review
+-- Background Review   <- fork otomatis per-turn, autonomous actor
+-- Curator             <- periodic sweep (7 hari), mekanisme TERPISAH
```

**Prinsip inti:** *runtime state != source repository.* Sebelum dokumen ini,
proyek memperlakukan `~/.hermes/skills/` seolah setara dengan `~/project/`
padahal keduanya punya audit trail yang sangat berbeda. Bagian 1-2 di bawah
(PART A) adalah fakta yang berlaku di kedua sisi boundary ini; Bagian 3
seterusnya (PART B) adalah kebijakan yang kita tetapkan untuk mengelola
sisi kanan boundary (Hermes Runtime).

---

# PART A -- AUDIT (Immutable Facts)

> Bagian ini adalah catatan hasil investigasi. **Tidak diedit ulang** kecuali
> ada bukti baru -- kalau ada revisi, tambahkan sebagai entri baru dengan
> tanggal, jangan menimpa entri lama. Kebijakan yang diambil berdasarkan
> bagian ini ada di PART B, dan PART B boleh berubah tanpa PART A ikut berubah.

## 1. Sumber Perubahan Perilaku Agent

| # | Jalur | Dipicu oleh | Ter-git? | Approval gate? | Confidence |
|---|---|---|---|---|---|
| A | Instruksi eksplisit PO dalam percakapan | User mengetik instruksi | Tidak (chat log saja) | N/A | HIGH |
| B | Foreground skill write (`skill_manage` atas permintaan user) | User minta agent ubah/buat skill | Tidak (`~/.hermes/`) | **Ya** -- `skills.write_approval: true` | HIGH |
| C | **Background review** (per-turn, otomatis) | Nudge interval tercapai | Tidak | **Tidak ada** -- dikecualikan by design | HIGH |

**Evidence:** `skill_manager_tool.py:281-297` -- *"Foreground agents may still
perform user-directed edits to external, bundled, or hub-installed skills.
The background review fork is different: it is autonomous lifecycle
maintenance..."*

## 2. Hasil Audit Mekanisme Background Review (2026-07-15)

| Pertanyaan | Kesimpulan | Confidence | Evidence |
|---|---|---|---|
| Backup otomatis sebelum patch? | Tidak ada -- `atomic_replace()` menimpa langsung | **HIGH** | `utils.py:91-111`; pencarian filesystem 0 hasil `.bak`/`.old`/`.orig` |
| Rollback per-file? | Tidak ada -- hanya *curator snapshot* mingguan (bulk restore) | **HIGH** | `.curator_backups/`, interval 7 hari (`curator.py:219-241`) |
| Proposal-only untuk background review? | Tidak tersedia -- `write_approval` hanya untuk foreground | **HIGH** | `skill_manager_tool.py:281-297`, pencarian config 0 hasil key alternatif |
| Target patch terbatas satu file? | Tidak -- prioritas ke skill yang sedang di-load; bundled/hub/pinned dilindungi | **HIGH** | `background_review.py:198-231` |
| Isi before/after patch (TASK-025C-A) bisa direkonstruksi? | Tidak -- field `_change` tidak dipersist | **HIGH** (untuk ketidaktahuan ini sendiri) / **UNKNOWN** (untuk isi aslinya) | `agent.log:3203,3215`; `state.db` session terkompresi, tanpa tool messages |
| Target patch ketiga (00:35:38, 389 char) | File sama dengan patch kedua: `digitalbuku-architecture/SKILL.md` | **HIGH** | Triangulasi: `agent.log` + filesystem mtime + `.usage.json.last_patched_at`, ketiganya konvergen ke detik yang sama |
| Config untuk mematikan background review per-turn? | `skills.creation_nudge_interval: 0` + `memory.nudge_interval: 0`. **`curator.enabled` BUKAN kontrol yang tepat** (mekanisme terpisah, periodic sweep 7 hari) | **HIGH** | `turn_finalizer.py:454-472`; `agent_init.py:1329-1334`; pola gate identik dengan yang sudah dibuktikan untuk memory review |

**Insiden pemicu:** TASK-025C-A (2026-07-12, 00:34-00:35 SGT) -- background
review mem-patch `digitalbuku-architecture/SKILL.md` dua kali (548 char +
389 char) tanpa instruksi eksplisit PO.

**Baseline yang sudah diambil:**
- Path: `/home/ubuntu/.hermes/skills/software-development/digitalbuku-architecture/SKILL.md`
- SHA-256: `3e446a723292b2d24a245a423f243955cf6e4939deda02e057ffbb6b25b15a1a`
- Modified: 2026-07-13 00:35:38 SGT
- Ukuran: 10,795 bytes
- Isi lengkap: lihat `docs/governance/AGENT-GOVERNANCE-audit-2026-07-15.md`

**Yang TIDAK terbukti (jangan dianggap fakta):**
- Apakah aturan verifikasi commit hash di `SKILL.md` saat ini berasal dari
  patch background review TASK-025C-A, atau sudah ada sebelumnya.
  Confidence: **UNKNOWN** -- tidak ada diff before/after untuk memastikan.

---

# PART B -- POLICY (Editable)

> Bagian ini adalah keputusan PO, bukan fakta. Bisa berubah kapan saja
> tanpa memengaruhi validitas PART A di atas.

## 3. Klasifikasi: Wajib ADR vs Boleh Proses Ringan

**Wajib lewat ADR (atau PO approval eksplisit):**
- Perubahan kontrak/format lintas pack (mis. pack contract, scoring
  strategy, error code baru).
- Perubahan pada aturan yang membatasi asumsi agent (mis. "Don't Fill
  Product Gaps").
- Apa pun yang mengubah hasil yang terlihat pengguna akhir.

**Boleh lewat proses ringan (instruksi langsung PO, direview setelahnya):**
- Penambahan catatan teknis/pitfall baru ke skill.
- Perbaikan kosmetik, penambahan referensi dokumentasi.

**Tidak boleh dibiarkan otomatis tanpa mitigasi (lihat Bagian 4):**
- Background review (Jalur C) -- sampai ada keputusan eksplisit di
  Bagian 4, dianggap berisiko meskipun perubahan historisnya tampak wajar.

## 4. Keputusan Kebijakan Background Review

| Mekanisme | Config key | Default | Untuk mematikan |
|---|---|---|---|
| Per-turn skill review | `skills.creation_nudge_interval` | `10` | `0` |
| Per-turn memory review | `memory.nudge_interval` | `10` | `0` |
| Curator periodic sweep | `curator.enabled` | `true` | `false` (tidak memengaruhi background review per-turn) |
| Foreground write approval | `skills.write_approval` | `false` | `true` untuk mengaktifkan (hanya foreground) |

**Keputusan (isi oleh PO):**

> _[ ] Opsi A -- Matikan background review sepenuhnya_
> _[ ] Opsi B -- Biarkan aktif, mitigasi manual (baseline berkala + git-track `.hermes/skills/`)_
> _[ ] Opsi C -- Hybrid (matikan skill review saja)_
>
> **Keputusan:** _____________
> **Tanggal:** _____________
> **Alasan:** _____________

## 5. Prosedur Baseline

**Kapan:** sebelum task governance-sensitive, setelah insiden patch tak
terduga, atau minimal sekali per sprint.

**Instruksi ke Hera:**
```
Baca file berikut tanpa mengubah apa pun: <path SKILL.md>
Laporkan: path, modified timestamp, ukuran, SHA-256, isi verbatim lengkap.
```

**Penyimpanan (dua artefak terpisah, ter-git):**
- `docs/governance/baselines/<skill>-<tanggal>.raw.md` -- verbatim + hash,
  tidak diedit.
- `docs/governance/baselines/<skill>-<tanggal>.note.md` -- kapan, kenapa,
  commit HEAD saat itu, observasi.

## 6. Prosedur Saat Ditemukan Patch Tak Terduga

1. Jangan langsung `curator rollback` -- itu bulk restore, bisa membatalkan
   perubahan sah lain sejak snapshot terakhir.
2. Ambil baseline SEKARANG (Bagian 5) sebelum bertindak lebih jauh.
3. Bandingkan hash dengan baseline sebelumnya.
4. Minta Hera merekonstruksi kronologi dari `agent.log` + `.usage.json`,
   dengan format Confidence + Evidence seperti PART A -- bukan ringkasan
   tanpa kutipan sumber.
5. Laporkan ke PO sebagai insiden baru di PART A (bukan menimpa entri lama).

## 7. Open Questions

| # | Question | Status |
|---|---|---|
| G1 | Apakah `.hermes/skills/` perlu dibawa ke git tracking terpisah? | Belum diputuskan |
| G2 | Kalau Opsi B/C dipilih, seberapa sering baseline rutin diambil? | Belum diputuskan |
| G3 | Asal-usul aturan verifikasi commit di SKILL.md saat ini | UNKNOWN -- lihat PART A |

---

## References

- [GOV-001 Evidence Standard](./GOV-001-evidence-standard.md) -- standar
  pembuktian lintas proyek, berlaku untuk semua agent/AI yang bekerja
  di proyek ini.
- `docs/governance/AGENT-GOVERNANCE-audit-2026-07-15.md` -- kompilasi
  lengkap Tahap 1 & 2 audit (log mentah, kutipan source code penuh).
- Insiden pemicu: TASK-025C-A (commit `9ca0b6b`, 2026-07-12).
- Source code diaudit: `agent/background_review.py`,
  `agent/turn_finalizer.py`, `agent/agent_init.py`,
  `skill_manager_tool.py`, `hermes_cli/config.py`.
