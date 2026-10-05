# AI Automatic Video Composer - Premiere

Plugin Adobe Premiere Pro untuk menyusun video naratif/infografis secara otomatis dari **Scene DOCX + aset canonical `Axxx` + narasi + subtitle**, dengan hasil akhir berupa timeline Premiere yang tetap bisa diedit manual.

## Status proyek

**Tahap 00 selesai. Tahap 01 Foundation/API Spike: S01–S16 sudah IMPLEMENTED, tetapi belum VERIFIED penuh di Premiere nyata.**

Repo memakai aturan:

`implement → static validate → verify di Premiere nyata → dokumentasikan limitation → baru promote ke production architecture`

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
- `docs/spike-results/S01-S03_BATCH_A.md`
- `docs/spike-results/S04-S06_BATCH_B.md`
- `docs/spike-results/S07-S08_BATCH_C.md`
- `docs/spike-results/S09-S11_BATCH_D.md`
- `docs/spike-results/S12-S16_BATCH_E.md`
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

## Gate sebelum Tahap 02

**Jangan mulai Core Architecture production hanya berdasarkan static check.**

Minimal harus dibuktikan pada Premiere nyata:

1. S07 — placement benar.
2. S08 — timing/duration presisi.
3. S10 — keyframe benar-benar muncul pada DOM/timeline atau limitation terdokumentasi dalam ADR.
4. S11 — dua mutation dapat dibalik dengan satu Undo.
5. S12 — identity tetap dikenali setelah reload/restart.

S13–S16 boleh memiliki limitation yang tidak memblokir composer dasar, tetapi hasilnya harus dicatat.

## Cara test foundation

1. Gunakan project TEST.
2. Premiere 25.6+ → enable Developer Mode.
3. UXP Developer Tool 2.2+ → Add Plugin → `uxp/manifest.json`.
4. Load plugin.
5. Premiere → Window → UXP Plugins → AI Automatic Video Composer.
6. Jalankan S01 → S16 sesuai `uxp/README.md`.
7. Isi result sheet di `docs/spike-results/`.

## Security / permission note

Domain `https://httpbin.org` hanya dipakai untuk S13 foundation. **Sebelum production release domain ini harus dihapus** dan diganti allowlist provider yang benar. API key tidak boleh masuk source, log, atau repo.

## Static validation

```bash
npm run check
```

CI mengecek:
- syntax `main.js`, `batch-c.js`, `batch-d.js`, `batch-e.js`;
- manifest foundation;
- package readiness dasar.

Static validation tidak menggantikan test Premiere/AME/CCX nyata.

## Langkah berikutnya

Setelah Tahap 01 diverifikasi, masuk **Tahap 02 — Core Architecture Production**:

- TypeScript foundation;
- Premiere adapter layer;
- project/composer state;
- Scene DOCX parser;
- `Axxx` binder;
- deterministic timeline composer;
- validation + rerun safety;
- baru kemudian motion registry, subtitle, Gemini, dan export workflow.