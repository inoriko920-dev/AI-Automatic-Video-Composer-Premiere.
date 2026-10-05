# AI Automatic Video Composer - Premiere

Plugin Adobe Premiere Pro untuk menyusun video naratif/infografis secara otomatis dari **Scene DOCX + aset canonical `Axxx` + narasi + subtitle**, dengan hasil akhir berupa timeline Premiere yang tetap bisa diedit manual.

## Status proyek

**Tahap 00 selesai. Tahap 01 Foundation/API Spike: S01–S16 sudah IMPLEMENTED, tetapi belum VERIFIED penuh di Premiere nyata. Tahap 02 sudah READY TO PLAN, tetapi NOT READY TO IMPLEMENT sampai Foundation Gate lolos.**

Foundation test build saat ini: **v0.0.6**.

Repo memakai aturan:

`implement spike → static validate → verify di Premiere nyata → dokumentasikan limitation → baru promote ke production architecture`

Tidak ada spike yang otomatis dianggap PASS hanya karena kodenya ada di repo atau GitHub Actions hijau.

## Baseline

- Premiere Pro **25.6+**
- UXP Developer Tool **2.2+**
- Manifest **v5**
- Windows 11 sebagai environment development pertama
- JavaScript UXP murni selama fase spike
- TypeScript production setelah gate foundation lolos
- Premiere/Adobe Media Encoder sebagai timeline + export utama

## Goal

`Scene DOCX + Folder Axxx + Narasi + SRT`

→ parse scene
→ bind aset
→ SINGLE/DOUBLE layout
→ V1/V2 placement
→ duration
→ motion/keyframe
→ subtitle
→ audio
→ validation
→ timeline Premiere editable
→ export Premiere/AME

## Dokumen utama

- `docs/00_MASTER_PLAN_AI_AUTOMATIC_VIDEO_COMPOSER_PREMIERE.md`
- `docs/01_UXP_FOUNDATION_API_SPIKE_PLAN.md`
- `docs/02_FOUNDATION_VERIFICATION_RUNBOOK.md`
- `docs/03_STAGE_02_CORE_ARCHITECTURE_PRODUCTION_PLAN.md`
- `docs/04_STAGE_02_EXECUTION_CHECKLIST_ASTRA_SOL.md`
- `docs/adr/0001-foundation-gate-before-production.md`
- `docs/spike-results/S01-S03_BATCH_A.md`
- `docs/spike-results/S04-S06_BATCH_B.md`
- `docs/spike-results/S07-S08_BATCH_C.md`
- `docs/spike-results/S09-S11_BATCH_D.md`
- `docs/spike-results/S12-S16_BATCH_E.md`
- `docs/spike-results/FOUNDATION_VERIFICATION_REPORT_TEMPLATE.md`
- `uxp/README.md`

## Foundation yang sudah diimplementasikan

### Batch A — S01–S03
- S01 Plugin Boot & Panel
- S02 Host & Version Gate
- S03 Filesystem Access + persistent plugin-data

### Batch B — S04–S06
- S04 Active Project / Project Tree
- S05 Dedicated bin `AAVC_GENERATED` + import `Axxx`
- S06 Sequence Creation via `Project.createSequenceFromMedia()`

### Batch C — S07–S08
- S07 A001 → V1 @ 0s, A002 → V2 @ 1s
- S08 duration A001=3s, A002=5s, toleransi ≤ 1 frame

### Batch D — S09–S11
- S09 Motion/Position/Scale/Opacity discovery
- S10 native keyframe @ 0s + 2s + DOM readback
- S11 dua mutation dalam satu transaction + verifikasi satu Ctrl+Z

### Batch E — S12–S16
- S12 persistent Project/Sequence Properties + GUID backup JSON untuk rerun identity
- S13 network permission GET/POST dengan allowlist foundation-only `https://httpbin.org`
- S14 EncoderManager / queue sequence ke Adobe Media Encoder dengan `.epr`
- S15 MOGRT insertion via `SequenceEditor.insertMogrtFromPath()` + component inspection
- S16 package-readiness static check + prosedur manual UDT → `.ccx` → install → smoke test

## Verification Kit Windows

Untuk mengurangi setup manual, repo menyediakan:

- `scripts/windows/START_FOUNDATION_VERIFICATION.cmd`
- `scripts/windows/New-AAVCFoundationFixture.ps1`
- `scripts/windows/Collect-AAVCFoundationEnvironment.ps1`

Double-click `START_FOUNDATION_VERIFICATION.cmd` dari clone repo. Tool ini akan:

1. membuat fixture PNG `A001.png`, `A002.png`, `A003.png` di `.aavc-foundation-test/assets`;
2. membuat folder `results` dan `exports`;
3. mengumpulkan informasi environment Windows/Premiere yang dapat dideteksi;
4. menjalankan `npm run check`.

Folder `.aavc-foundation-test/` masuk `.gitignore` agar hasil test lokal tidak ikut ter-commit.

Panel v0.0.6 juga memiliki **Verification Report exporter**. Setelah S01–S16 dijalankan, pilih `.aavc-foundation-test/results` lalu klik `Export Full Report`. Plugin menyimpan JSON lengkap dan TXT summary serta menghitung gate `GO_CANDIDATE` / `NO_GO` berdasarkan spike P0.

## Gate sebelum Tahap 02

**Jangan mulai Core Architecture production hanya berdasarkan static check.** Keputusan ini dikunci oleh `ADR-0001`.

Minimal harus dibuktikan pada Premiere nyata:

1. S07 — placement benar.
2. S08 — timing/duration presisi.
3. S10 — keyframe benar-benar muncul pada DOM/timeline atau limitation terdokumentasi dalam ADR fallback.
4. S11 — dua mutation dapat dibalik dengan satu Undo.
5. S12 — identity tetap dikenali setelah reload/restart.

S13–S16 boleh memiliki limitation yang tidak memblokir composer dasar, tetapi hasilnya harus dicatat.

## Tahap 02 — sudah dirancang, belum diimplementasikan

Blueprint production ada di `docs/03_STAGE_02_CORE_ARCHITECTURE_PRODUCTION_PLAN.md`, dan checklist eksekusi ASTRA → SOL ada di `docs/04_STAGE_02_EXECUTION_CHECKLIST_ASTRA_SOL.md`.

Desain tersebut sudah mengunci:
- TypeScript strict + production build layer;
- pemisahan `domain / ports / infrastructure / presentation`;
- Scene DOCX parser contract;
- canonical `Axxx` binder;
- `ComposerPlan` sebelum mutation;
- Premiere adapter boundary;
- capability registry;
- stable identity + state schema;
- deterministic SINGLE/DOUBLE layout;
- unified Premiere time conversion;
- transaction/readback rules;
- idempotent rerun + three-way user-edit protection;
- Validation Center error codes;
- fixture F01–F10;
- implementasi Batch P0–P8 dengan acceptance per batch.

Status resmi Tahap 02 tetap:

**READY TO PLAN / NOT READY TO IMPLEMENT**.

## Cara test foundation

Cara yang disarankan:

1. Clone/download repo.
2. Double-click `scripts/windows/START_FOUNDATION_VERIFICATION.cmd`.
3. Buka `docs/02_FOUNDATION_VERIFICATION_RUNBOOK.md`.
4. Gunakan project Premiere TEST.
5. UXP Developer Tool → Add Plugin → `uxp/manifest.json`.
6. Load plugin.
7. Premiere → Window → UXP Plugins → AI Automatic Video Composer.
8. Jalankan S01 → S16 sesuai runbook.
9. Export Full Report ke `.aavc-foundation-test/results`.
10. Gunakan report itu untuk keputusan GO/NO-GO Tahap 02.

## Security / permission note

Domain `https://httpbin.org` hanya dipakai untuk S13 foundation. **Sebelum production release domain ini harus dihapus** dan diganti allowlist provider yang benar. API key tidak boleh masuk source, log, atau repo.

## Static validation

```bash
npm run check
```

CI mengecek:
- syntax `main.js`, `batch-c.js`, `batch-d.js`, `batch-e.js`, `verification.js`;
- manifest foundation;
- package readiness dasar.

Static validation tidak menggantikan test Premiere/AME/CCX nyata.

## Langkah berikutnya

1. Jalankan Foundation Verification Kit v0.0.6 di Windows/Premiere nyata.
2. Review `aavc-foundation-report-*.json`.
3. Jika gate GO → ubah Tahap 02 menjadi READY TO IMPLEMENT.
4. Mulai **Batch P0 — Production TypeScript Skeleton** sesuai dokumen Tahap 02.
5. Jika blocker gagal → perbaiki foundation terlebih dahulu dan jangan membuat workaround tersembunyi di production.
