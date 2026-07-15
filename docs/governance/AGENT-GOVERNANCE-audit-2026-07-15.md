# Audit Log: Background Review Mechanism — 2026-07-15

**Dokumen ini adalah kompilasi mentah** dari investigasi yang dijalankan
Hera terhadap mekanisme *background review* Hermes Agent, menyusul
insiden TASK-025C-A (patch otomatis ke `SKILL.md` tanpa instruksi PO).
Kesimpulan hasil audit ini dirangkum di `AGENT-GOVERNANCE.md` PART A;
dokumen ini adalah rujukan bukti mentahnya.

Standar pelaporan mengikuti [GOV-001](./GOV-001-evidence-standard.md).

---

## TAHAP 1 — Baseline Snapshot

**Path lengkap:**
`/home/ubuntu/.hermes/skills/software-development/digitalbuku-architecture/SKILL.md`

**Modified timestamp:** 2026-07-13 00:35:38 SGT (2026-07-12T16:35:38Z, epoch 1783874138)

**Ukuran file:** 10,795 bytes

**SHA-256:** `3e446a723292b2d24a245a423f243955cf6e4939deda02e057ffbb6b25b15a1a`

**Audit note:**
- Diambil: 2026-07-15
- Alasan: Baseline pra-kebijakan curator, menyusul temuan self-improvement
  patch tak teraudit pada TASK-025C-A
- Commit HEAD Assessment-Engine saat baseline diambil: `9ca0b6b`

**Isi lengkap (verbatim, 223 baris):**

```markdown
---
name: digitalbuku-architecture
description: Write ADRs and specs for the DigitalBuku Assessment Engine / Recommendation Framework project — follow Hera's conventions, don't invent product decisions, use Indonesian.
version: 1.1.0
platforms: [linux]
metadata:
  hermes:
    tags: [architecture, adr, spec, digitalbuku, recommendation-engine]
    related_skills: [plan]
---

# DigitalBuku Architecture — ADR & Spec Writing

Authoritative skill for authoring Architecture Decision Records (ADRs) and specification
documents (SPECs) in the DigitalBuku Assessment Engine project.

## Project Context

- **Repo:** `Assessment-Engine` (GitHub: `digitalbuku-id/Assessment-Engine`)
- **Persona:** Hera = Chief Architect. The user IS Hera. Address them accordingly.
- **Core system:** Recommendation Framework = Core Engine (type-agnostic) + Domain Pack
- **Existing docs:** `docs/adr/ADR-001`, `docs/adr/ADR-002`, `specs/SPEC-001`, `docs/specs/SPEC-002`
- **Working directory:** `~/project`
- **Language:** Indonesian (Bahasa Indonesia) for all documents and communication

## CRITICAL RULE: Don't Fill Product Gaps

This is the #1 pitfall. When the user gives a partial structure or an incomplete
instruction, **do NOT invent the missing pieces.** Specifically, never invent:

- Assessment dimension names or counts (e.g., "7 dimensi competency")
- Client/company names (e.g., "Kalbe", "Telkom", "Astra")
- Threshold values (unless explicitly stated as test data)
- Pricing or business model decisions
- Naming conventions (e.g., `{client}_{domain}`) without user direction
- Action items assigning work to real people

If the instruction intentionally leaves something open (marked "TBD", "future",
"nanti ditentukan", etc.), leave it open. If you're unsure whether something is a gap
to fill or a deliberate omission, **stop and ask** — don't guess.

## ADR Format

Every ADR follows this structure:

```markdown
# ADR-NNN: Title

| Metadata          | Value                  |
|-------------------|------------------------|
| **Status**        | Accepted / Proposed    |
| **Date**          | YYYY-MM-DD             |
| **Author**        | Hera (Chief Architect) |
| **Stakeholders**  | ...                    |

## Context
## Decision
## Rationale (or: Alternatives Considered)
## Consequences
## Related / References
```

Required sections: Context, Decision, Consequences. Include "Alternatives Considered"
when the decision has meaningful tradeoffs.

## SPEC Format

Specs define concrete formats, interfaces, or data contracts. Use:

```markdown
# SPEC-NNN: Title

> Metadata block with Author, Assignee, Status, Sprint, ADR references

## Objective
## Decision (if format choice is involved)
## Structure (with field tables, examples, constraints)
## Error Cases (if applicable)
## References
```

Always define fields with tables: `| Field | Type | Required | Description |`

## Before Writing

1. `cd ~/project && git pull`
2. Read existing ADRs and SPECs that are referenced in the instruction
3. Read the actual code/config files that the spec will cover
4. Check `docs/adr/` and `docs/specs/` for next available number

## After Writing

1. If instruction says to commit: `git add ... && git commit -m "hera: ..." && git push`
2. Always report: commit hash, key decisions made, open questions (if any)
3. Show raw output when asked — don't summarize unless explicitly told to

## Verification

- Run `npm test` from `~/project` after any code changes
- For recommendation engine: `node -e "require('./tests/loader-resolver.test.js')"`
- Existing tests must pass; pre-existing failures are NOT your problem (note them but don't fix)

## Common Pitfalls

1. Using placeholder names that sound real. Avoid. Use `sample-domain-b`,
   `dimension_alpha`, `test-assessment-v1`, `example-custom-pack`.
2. Switching format from `.js` to YAML/JSON. Sprint 1 decided `.js` via `require()`.
   Don't propose a format change without explicit user direction.
3. Framing your own work as something the user saw/approved. If you created content
   that the user hasn't seen, say so explicitly: "Ini yang saya tulis, bukan sesuatu
   yang sebelumnya ada di repo."
4. Summarizing when asked for raw output. If the user says "tampilkan tanpa ringkasan",
   use `cat` or `read_file` — don't paraphrase.
5. Testing specific wording instead of structure. When placeholder content becomes
   final (e.g., `[PLACEHOLDER - TASK-017]` → RD-001 wording), E2E and unit test
   assertions that check for specific strings will break. Replace them with structural
   checks: `reason.length >= 10`, `!reason.includes('{score}')`,
   `!reason.includes('[PLACEHOLDER')`. Never assert on specific wording from RD-001 —
   wording can change without structural changes.
6. Forgetting `git pull --rebase` on push rejection. When `git push` fails with
   "rejected because the remote contains work", use `git pull --rebase && git push`.
   Plain `git pull` may create a merge commit when a rebase is cleaner.
7. Flagging `{score}` in templates as an error. `{score}` in `reasons.js` and
   `actions.js` templates is CORRECT — the engine substitutes it at runtime.
   Validators and linters should only flag `[PLACEHOLDER` markers and `TODO:` markers,
   not `{score}`. A validator warning about "unsubstituted {score}" in template source
   files is a false positive — the substitution happens at runtime, not at rest.
8. Using Intent(High) instead of Intent(Low) for NBA actions. Since
   `next_best_action` always picks the dimension with the LOWEST score, ALL action
   entries in `actions.js` MUST use Recommendation Intent (Low) from the RD.
   Intent(High) wording (e.g., "mempertahankan kemampuan...") is wrong for NBA
   because NBA targets the weakest dimension. TM-001's Design Decision section
   explicitly states this rule. If TM-001 row labels say "Recommendation Intent (Low)"
   but the action text uses High wording, fix the action text — the label is the
   contract, the text must match.
9. Reporting a commit hash without verifying it exists. After every commit, run
   `git log --oneline -3` and confirm the hash you're about to report actually
   appears. If the user says "commit X TIDAK ADA", verify with `git log` and
   `git rev-parse HEAD` before defending. If local HEAD and origin/main diverge
   (e.g., user hasn't pulled), `git pull` first then re-check. Never insist a
   commit exists when `git log` doesn't show it.
10. Normalization auto-detection must guard against negative scores. When the
    engine auto-detects whether scores need normalization (checking `s <= maxScale`),
    you MUST also check `s > 0`. Without this guard, negative test scores like -5
    get normalized into -100, changing the error message from "Score -5" to
    "Score -100" and breaking assertions that check the message content. The
    correct guard is: `s > 0 && s <= config.maxScale`.

## Verifying Your Own Work

After every commit, run `git log --oneline -3` and confirm the commit hash you're
about to report actually exists. The user will call out fabricated hashes. If the
user says "commit X TIDAK ADA", verify with `git log` first before defending.

## Pack Generator (scripts/create-pack.js)

When upgrading the pack generator, make it generate the FULL governance artifact
set — not just the 4 pack files:

- `docs/rubrics/RD-XXX-<domain>.md` — rubric template with TODO markers
- `docs/rubrics/TM-XXX-<domain>-mapping.md` — mapping template with Rule Zero
- `engines/recommendation/packs/<domain>/{metadata,thresholds,reasons,actions}.js`
- `tests/<domain>.test.js` — test template with structural assertions

Support three modes:
- CLI full: `node scripts/create-pack.js <id> "<name>" <ver> <dim1,dim2,...>`
- CLI legacy: `node scripts/create-pack.js <id>` (backward compat)
- Interactive: `node scripts/create-pack.js` (readline prompts)

Auto-detect the next RD number from existing `docs/rubrics/RD-*.md` files.
Auto-validate with `loader.loadPack()` after generation. All generated wording
MUST use `TODO:` markers — never generate assessment content.

## Score Normalization

When assessment `config.json` has `maxScale` ≠ 100 (e.g., `maxScale: 5`),
scores must be normalized before the Recommendation Engine processes them.
See `references/score-normalization.md` for the auto-detection pattern,
formula, and pitfall about test scores already being 0-100.

## Pack Validation Pipeline

After creating or modifying any Domain Pack, run the three-script governance
chain in order. Each catches a different class of error:

1. `scripts/validate-pack.js <domain>` — **structural compliance** (SPEC-002 §1e)
   Catches: missing files, dimension mismatch, semver violations, threshold range,
   `[PLACEHOLDER]` markers in pack files.
2. `scripts/lint-pack.js <domain>` — **code quality & formatting**
   Catches: console.log, missing header comments, orphan recommendations,
   unexpected files in pack directory, optional metadata gaps.
3. `scripts/validate-traceability.js <domain>` — **RD → TM → code traceability**
   Catches: Intent(High) vs Intent(Low) mismatch, wording divergence from
   RD-approved text, orphan TM entries without code, orphan code without TM entries.
   This is the ONLY script that detects semantic drift between governance
   artifacts and implementation.

All three support `--all` and `--help`. See `references/pack-validation-pipeline.md`
for what each script catches and the usage pattern.

## ADR-004 Strategy Fields (SPEC-002 Alignment)

When an ADR introduces new strategy metadata fields to the pack contract
(e.g., `pack_type`, `scoring_strategy`, `graph_strategy`, `interpretation_strategy`
from ADR-004), align SPEC-002 with these targeted changes — never touch
sections that aren't affected:

1. **Metadata example (1a):** add strategy fields to the code sample with
   backward-compatible defaults (`threshold`/`none`/`threshold`).
2. **Field table (1a):** add rows with type=string, required=no, default value,
   and the list of valid values from the ADR.
3. **Completeness validation (1e):** add rules — missing → use defaults;
   invalid values → throw existing `INVALID_PACK_CONFIG`.
4. **Return value shape (3):** add strategy fields to the merged config example.
5. **Open Questions:** add one Q about strategy-specific file contracts,
   marked **Deferred** to ADR-005 or future task.
6. **References:** add link to the new ADR.

**Do NOT change** sections 1b/1c/1d (thresholds.js/reasons.js/actions.js) —
strategy fields only affect metadata. Do NOT introduce new error codes — reuse
`INVALID_PACK_CONFIG`. The strategy fields are optional; packs without them
fall back to the threshold pipeline (backward compat per ADR-004).
```

**Catatan:** Section terakhir ("ADR-004 Strategy Fields") kemungkinan besar
ditambahkan sekitar TASK-025C-A. Ini **belum bisa dipastikan sebagai hasil
patch background review** vs. penambahan manual sebelumnya — tidak ada
diff before/after yang tersimpan (lihat Q5 di bawah). Confidence: **UNKNOWN**.

---

## TAHAP 2 — Audit Mekanisme Background Review

### Q1: Apakah patch selalu menyentuh file yang sama, atau bisa skill manapun?

**Diketahui:** Background review tidak terbatas satu file. Prioritas
berjenjang (dari `background_review.py` baris 198-231):
1. Update skill yang sedang di-load dalam percakapan (prioritas pertama)
2. Update umbrella skill yang sudah ada
3. Tambah support file di bawah umbrella
4. Buat umbrella baru (hanya jika tidak ada yang cocok)

Pada TASK-025C-A, `digitalbuku-architecture` jadi target karena skill itu
di-load aktif (`skill_view` dipanggil, log baris 3199).

Skill yang dilindungi (tidak bisa disentuh background review):
bundled skills, hub-installed skills (`background_review.py` baris 248-249).

**Tidak diketahui:** Apakah prompt prioritas ini selalu diikuti model, atau
kadang model memilih skill di luar yang di-load. Log TASK-025C-A hanya
menunjukkan 1 skill di-patch — tidak ada data tandingan.

**Evidence:**
```
background_review.py:198-203
  1. UPDATE A CURRENTLY-LOADED SKILL. Look back through the conversation
  for skills the user loaded via /skill-name or you read via skill_view.
  If any of them covers the territory of the new learning, PATCH that
  one first.

agent.log:3199
  2026-07-13 00:34:27,643 ... tool skill_view completed (0.02s, 9822 chars)
  -> skill 'digitalbuku-architecture' dibaca sebelum patch
```
**Confidence: HIGH**

---

### Q2: Apakah ada backup otomatis sebelum patch?

**Diketahui:** Tidak ada. `skill_manage(action='patch')` menulis via
`atomic_replace()` — tulis ke temp file lalu `os.replace()`, tanpa `.bak`.

Pencarian file `*.bak`, `*.backup`, `*.old`, `*.orig` di seluruh
`/home/ubuntu/.hermes/skills/` — 0 hasil.

Satu-satunya backup yang ada adalah **curator snapshot periodik**
(interval 7 hari). Snapshot terakhir: `2026-07-11T16:56:39Z` —
**dua hari sebelum** patch TASK-025C-A (`2026-07-12T16:35:38Z`). State
file sebelum patch Jul 13 tidak tercakup snapshot manapun.

**Evidence:**
```
utils.py:91-111
  def atomic_replace(tmp_path, target):
      """Atomically move tmp_path onto target... os.replace(tmp, target)
      atomically swaps tmp into place at target."""
  -> Tidak ada langkah backup/copy/snapshot.

find /home/ubuntu/.hermes/skills/ -name '*.bak'    -> 0 hasil
find /home/ubuntu/.hermes/skills/ -name '*.backup' -> 0 hasil
find /home/ubuntu/.hermes/skills/ -name '*.old'    -> 0 hasil
find /home/ubuntu/.hermes/skills/ -name '*.orig'   -> 0 hasil

Curator backup terakhir:
  /home/ubuntu/.hermes/skills/.curator_backups/2026-07-11T16-56-39Z/skills.tar.gz
```
**Confidence: HIGH**

---

### Q3: Apakah ada mekanisme rollback untuk patch yang sudah diterapkan?

**Diketahui:** Tidak ada rollback per-patch/per-file. Satu-satunya
recovery adalah `hermes curator rollback` — restore **penuh** (bulk) dari
snapshot tar.gz terakhir di `.curator_backups/`. Kalau dijalankan sekarang,
seluruh direktori skills kembali ke state 11 Juli — termasuk perubahan sah
pada skill lain sejak itu ikut hilang.

**Evidence:** `.curator_backups/2026-07-11T16-56-39Z/skills.tar.gz` adalah
satu-satunya titik pulih yang ada; tidak ada mekanisme undo granular untuk
`skill_manage(action='patch')` individual.

**Confidence: HIGH**

---

### Q4: Apakah ada mode "proposal-only" untuk background review?

**Diketahui:** Ada, tapi **tidak berlaku untuk background review**.
Mode proposal-only diimplementasikan lewat `skills.write_approval`:
- Default `false` — semua skill write langsung diterapkan.
- `true` — staging ke `~/.hermes/pending/skills/<id>.json`, user review
  via `/skills pending`, `/skills diff`, `/skills approve/reject`.

Background review diklasifikasikan sebagai *"autonomous actor"* dan
melewati gate ini sepenuhnya. Guard yang berlaku untuknya berbeda:

| Guard | Lokasi | Efek |
|---|---|---|
| `_background_review_write_guard()` | `skill_manager_tool.py:281-363` | Tolak bundled/hub-installed/external/pinned skills |
| `_background_review_read_before_write_guard()` | `skill_manager_tool.py:366-393` | Tolak patch jika `SKILL.md` belum di-load dalam turn review yang sama |
| `_curator_consolidation_delete_guard()` | `skill_manager_tool.py:405-452` | Tolak delete tanpa `absorbed_into=<umbrella>` |

Skill agent-created yang tidak di-pin (seperti `digitalbuku-architecture`)
lolos semua guard ini → langsung di-patch.

Tidak ada config key `curator.mode`, `curator.auto_apply`,
`curator.proposal_only`, atau `background_review.write_approval`
(pencarian di `config.py` — 0 hasil).

**Evidence:**
```
hermes_cli/config.py:2239-2244
  "skills": { "write_approval": False }

skill_manager_tool.py:281-297
  """Refuse autonomous curator writes to externally owned skills.
  Foreground agents may still perform user-directed edits to external,
  bundled, or hub-installed skills. The background review fork is
  different: it is autonomous lifecycle maintenance, so its write
  surface is restricted to local curator-owned sediment."""

skill_manager_tool.py:336-362
  if skill_usage.is_protected_builtin(name): return error
  if skill_usage.is_hub_installed(name):     return error
  if skill_usage.is_bundled(name):           return error
  -> Agent-created (created_by: "agent") TIDAK ditolak

.usage.json
  "digitalbuku-architecture": { "created_by": "agent", "pinned": false }
  -> Lolos semua guard -> langsung di-patch
```
**Confidence: HIGH**

---

### Q5: Target pasti patch ketiga (00:35:38, 389 chars)?

**Diketahui:** Target sama persis dengan patch kedua —
`digitalbuku-architecture/SKILL.md`. Dibuktikan lewat triangulasi tiga
sumber independen:

**Kronologi (agent.log):**
| Waktu (SGT) | Aksi | Hasil |
|---|---|---|
| 00:34:20 | `skill_manage(patch, ...)` | GAGAL — read_before_write guard |
| 00:34:27 | `skill_view('digitalbuku-architecture')` | Sukses (9822 chars) |
| 00:34:42 | `skill_manage(patch, ...)` #1 | SUKSES — 548 chars |
| 00:34:53 | `skill_manage(patch, ...)` #2 | GAGAL — escape-drift error |
| 00:35:38 | `skill_manage(patch, ...)` #3 | SUKSES — 389 chars |

**Verifikasi filesystem** (scan seluruh direktori skills untuk mtime
16:35:30–16:35:50 UTC): hanya **1 file** cocok —
`digitalbuku-architecture/SKILL.md` pada `16:35:38.3045993220 UTC`.
File lain di skill yang sama (`references/score-normalization.md`,
`references/pack-validation-pipeline.md`) tidak tersentuh sejak 11 Juli.

**Verifikasi `.usage.json`:** `last_patched_at: "2026-07-12T16:35:38.306326+00:00"`
— cocok dengan mtime filesystem (selisih 2ms, rounding artifact).

**Tidak diketahui:** Isi persis patch (`old_string` → `new_string`).
Field `_change` dari JSON response `skill_manage` tidak dipersist ke
`state.db` maupun `agent.log`.

**Confidence: HIGH** (untuk identitas file target) /
**UNKNOWN** (untuk isi persis perubahan)

---

### Verifikasi Tambahan: Config untuk Mematikan Background Review

**Diketahui:** `curator.enabled` **BUKAN** kontrol yang tepat — itu
mengontrol Curator (periodic sweep 7 hari), mekanisme terpisah dari
background review per-turn. Tidak ada referensi `curator.enabled` di
`turn_finalizer.py` (tempat background review di-spawn).

Kontrol yang benar: dua trigger terpisah, keduanya berbasis nudge interval:

| Trigger | Config key | Default | Set ke 0 |
|---|---|---|---|
| Memory review | `memory.nudge_interval` | `10` | Mati |
| Skill review | `skills.creation_nudge_interval` | `10` | Mati |

Logika gate (identik untuk keduanya — dibuktikan lewat kutipan source
code langsung, bukan analogi):

```
turn_finalizer.py:454-460 (skill review gate)
  _should_review_skills = False
  if (agent._skill_nudge_interval > 0
          and agent._iters_since_skill >= agent._skill_nudge_interval
          and "skill_manage" in agent.valid_tool_names):
      _should_review_skills = True

turn_context.py:294-301 (memory review gate — pola identik)
  should_review_memory = False
  if (agent._memory_nudge_interval > 0
          and "memory" in agent.valid_tool_names
          and agent._memory_store):
      agent._turns_since_memory += 1
      if agent._turns_since_memory >= agent._memory_nudge_interval:
          should_review_memory = True

turn_finalizer.py:472 (spawn gate)
  if final_response and not interrupted and (_should_review_memory or _should_review_skills):
      agent._spawn_background_review(...)
```

Kalau `creation_nudge_interval = 0` dan `nudge_interval = 0`: kedua
variabel `_should_review_*` tetap `False` selamanya → kondisi spawn di
baris 472 tidak pernah terpenuhi → **tidak ada fork background review
sama sekali**.

Tidak ada config key khusus lain (`background_review.*enabled`,
`background_review.*disable`, dll — pencarian source code 0 hasil).
`skills.creation_nudge_interval` tidak muncul di `DEFAULT_CONFIG`
(tidak terdokumentasi eksplisit) tapi tetap bisa di-set manual di
`config.yaml` (fallback default 10 kalau tidak di-set).

**Konfigurasi untuk mencegah kejadian serupa terulang:**
```yaml
skills:
  creation_nudge_interval: 0
memory:
  nudge_interval: 0
```

**Efek:** mematikan background review (skill patch + memory save
otomatis), TIDAK memengaruhi: `skill_manage` tool foreground,
`skills.write_approval`, curator periodic sweep, `/curator` slash command.

**Confidence: HIGH**

---

## Ringkasan Confidence Keseluruhan

| Temuan | Confidence |
|---|---|
| Q1 — target patch bisa skill manapun | HIGH |
| Q2 — tidak ada backup otomatis | HIGH |
| Q3 — rollback hanya bulk, bukan per-file | HIGH |
| Q4 — proposal-only tidak berlaku untuk background review | HIGH |
| Q5 — identitas file patch ketiga | HIGH |
| Q5 — isi persis patch | UNKNOWN |
| Config untuk mematikan mekanisme | HIGH |
| Asal-usul aturan verifikasi commit di SKILL.md saat ini | UNKNOWN |
