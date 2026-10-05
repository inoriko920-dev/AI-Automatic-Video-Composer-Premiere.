# 04 — TAHAP 02 EXECUTION CHECKLIST — ASTRA → SOL

Status: **PREPARED / DO NOT EXECUTE BEFORE FOUNDATION GO**

Dokumen ini adalah checklist eksekusi setelah `docs/03_STAGE_02_CORE_ARCHITECTURE_PRODUCTION_PLAN.md` disetujui dan Foundation Gate dinyatakan GO.

---

## 0. Pre-flight wajib

ASTRA harus memeriksa:

- [ ] tersedia `aavc-foundation-report-*.json` dari Premiere nyata;
- [ ] S07 PASS;
- [ ] S08 PASS;
- [ ] S11 PASS;
- [ ] S12 PASS setelah restart;
- [ ] S10 PASS atau ADR fallback disetujui;
- [ ] versi Premiere/UXP/Windows tercatat;
- [ ] limitation S13–S16 tercatat;
- [ ] `npm run check` foundation hijau;
- [ ] tidak ada perubahan production yang belum direview.

Jika salah satu blocker belum selesai → **STOP / NO-GO**.

---

# Batch P0 — Production Skeleton

## ASTRA plan

Output plan wajib:
- production folder layout;
- build tool;
- TypeScript strict config;
- test runner;
- lint/format config;
- separation spike vs production;
- CI commands;
- no secret policy.

## SOL implement

Checklist:
- [ ] `src/` production dibuat;
- [ ] `tsconfig.json` strict;
- [ ] bundler UXP compatible;
- [ ] `npm run typecheck`;
- [ ] `npm run lint`;
- [ ] `npm test`;
- [ ] `npm run build`;
- [ ] production panel minimal dapat load;
- [ ] spike S01–S16 tetap utuh;
- [ ] tidak ada `premierepro` import di domain.

### Exit P0

```text
CHECK + TYPECHECK + TEST + BUILD = PASS
PRODUCTION EMPTY PANEL = LOADS
SPIKE FOUNDATION = STILL AVAILABLE
```

---

# Batch P1 — Domain + State Model

## Implement
- [ ] `Scene`;
- [ ] `SceneAssetRef`;
- [ ] `AssetBinding`;
- [ ] `LayoutSpec`;
- [ ] `TimingSpec`;
- [ ] `ComposerPlan`;
- [ ] `ComposerRun`;
- [ ] `GeneratedItemIdentity`;
- [ ] `ValidationIssue`;
- [ ] `Result<T,E>`;
- [ ] ErrorCodes;
- [ ] state schema v1;
- [ ] migration interface;
- [ ] deterministic ID helper;
- [ ] hashing wrapper.

### Tests
- [ ] stable Scene ID;
- [ ] plan serialization;
- [ ] invalid duration rejected;
- [ ] duplicate scene identity rejected;
- [ ] state migration no-op v1→v1;
- [ ] hash deterministic.

### Exit P1
Pure domain tests PASS tanpa Premiere.

---

# Batch P2 — DOCX Parser

## ASTRA
Sebelum SOL coding, pilih library ZIP/XML melalui micro-spike.

Kriteria:
- UXP bundlable;
- Node-testable;
- license aman;
- no unsupported Node runtime dependency.

## SOL
- [ ] DOCX bytes reader;
- [ ] ZIP extraction abstraction;
- [ ] Word XML reader;
- [ ] paragraph/table tokenization;
- [ ] Prompt-1 recognizer;
- [ ] scene block mapper;
- [ ] Scene normalization;
- [ ] source fingerprint;
- [ ] structured errors.

### Fixtures
- [ ] valid 1 scene;
- [ ] valid multi-scene;
- [ ] malformed DOCX;
- [ ] unsupported structure;
- [ ] duplicate scene ID;
- [ ] missing asset reference.

### Exit P2
Known DOCX fixture → deterministic `Scene[]`.

---

# Batch P3 — Axxx Scanner + Binder

## Implement
- [ ] canonical regex;
- [ ] extension normalize;
- [ ] case normalize;
- [ ] duplicate ID detection;
- [ ] missing required assets;
- [ ] extra unused assets;
- [ ] asset fingerprint;
- [ ] binding result;
- [ ] import-needed decision.

### Tests
- [ ] A001.png recognized;
- [ ] A001.JPG normalized;
- [ ] duplicate A001 blocker;
- [ ] missing A002 blocker;
- [ ] unused A999 warning;
- [ ] rerun same path/fingerprint = no new import planned.

### Exit P3
Binder dapat berjalan penuh tanpa Premiere.

---

# Batch P4 — Premiere Adapter Core

**Hanya API VERIFIED dari Foundation Report yang boleh dipakai.**

## Implement
- [ ] ProjectGateway;
- [ ] dedicated bin ensure/find;
- [ ] import/reuse asset;
- [ ] composer sequence ensure/find;
- [ ] V1/V2 placement;
- [ ] end/duration mutation;
- [ ] Project/Sequence persistent properties;
- [ ] transaction wrapper;
- [ ] DOM readback;
- [ ] PremiereTime;
- [ ] capability registry.

### Real-host fixture F01
1 scene SINGLE / A001 / 3s.

PASS:
- [ ] A001 imported once;
- [ ] V1 @ 0;
- [ ] duration ≈ 3s <= 1 frame;
- [ ] identity written;
- [ ] readback matches.

### Real-host fixture F02
2 scene SINGLE.

PASS:
- [ ] no accidental overlap;
- [ ] scene 2 follows scene 1;
- [ ] readback deterministic.

### Exit P4
F01/F02 PASS di host nyata.

---

# Batch P5 — Composer Planner

## Implement
- [ ] default duration config;
- [ ] continuous timing planner;
- [ ] SINGLE layout resolver;
- [ ] DOUBLE layout resolver;
- [ ] ComposerPlan fingerprint;
- [ ] Preview Plan model;
- [ ] mutation planning separated from execution.

### Tests
- [ ] 1 SINGLE;
- [ ] 2 SINGLE;
- [ ] DOUBLE left/right;
- [ ] invalid asset count;
- [ ] invalid duration;
- [ ] same inputs → same plan fingerprint.

### Exit P5
No Premiere mutation diperlukan untuk unit acceptance.

---

# Batch P6 — Execute + Verify

## Implement
- [ ] use case `executeComposerPlan`;
- [ ] mutation grouping;
- [ ] transaction receipt;
- [ ] generated identity state;
- [ ] post-mutation DOM readback;
- [ ] mismatch handling;
- [ ] result summary;
- [ ] diagnostics export.

### Fixtures
- [ ] F01 SINGLE;
- [ ] F02 sequential scenes;
- [ ] F03 DOUBLE;
- [ ] F04 missing asset = no mutation;
- [ ] F05 duplicate asset ID = no mutation.

### Exit P6
No BLOCKER input may mutate Premiere.

---

# Batch P7 — Rerun / User-edit Protection

## Implement
- [ ] stored generated snapshot;
- [ ] current Premiere snapshot;
- [ ] new desired plan;
- [ ] three-way diff;
- [ ] CREATE;
- [ ] UPDATE_SAFE;
- [ ] SKIP_UNCHANGED;
- [ ] CONFLICT_USER_EDIT;
- [ ] REMOVE_ORPHAN_CANDIDATE;
- [ ] BLOCKED.

### Fixtures

#### F06 rerun unchanged
Expected:
- [ ] no duplicate import;
- [ ] no duplicate clip;
- [ ] SKIP_UNCHANGED.

#### F07 source changed
Expected:
- [ ] UPDATE_SAFE jika item masih sama dengan last generated snapshot.

#### F08 user edit
Manual shift clip di Premiere.
Expected:
- [ ] CONFLICT_USER_EDIT;
- [ ] plugin tidak overwrite otomatis.

### Exit P7
Rerun safe terbukti.

---

# Batch P8 — Scale + Production MVP UI

## Implement
- [ ] Home screen;
- [ ] Input screen;
- [ ] Validation screen;
- [ ] Plan Preview;
- [ ] Generate progress;
- [ ] Result screen;
- [ ] diagnostics/report export;
- [ ] open composer sequence helper.

## Scale fixtures

### F09 — 10 scenes
- [ ] deterministic;
- [ ] no duplicate;
- [ ] acceptable DOM call behavior;
- [ ] diagnostics complete.

### F10 — 100 scenes
- [ ] no crash;
- [ ] no uncontrolled memory growth observed;
- [ ] rerun remains deterministic;
- [ ] performance metrics recorded.

Tidak menetapkan angka performance arbitrer sebelum benchmark nyata.

---

# Final Tahap 02 acceptance

ASTRA hanya boleh menyatakan COMPLETE bila:

- [ ] P0–P8 exit criteria PASS;
- [ ] TypeScript production terpisah dari spike JS;
- [ ] parser deterministic;
- [ ] binder deterministic;
- [ ] V1/V2 native timeline editable;
- [ ] <= 1 frame timing validation;
- [ ] stable identity;
- [ ] unchanged rerun tidak menduplikasi;
- [ ] manual user edit protected;
- [ ] Validation Center blocks invalid input before mutation;
- [ ] CI typecheck/lint/test/build PASS;
- [ ] real-host critical fixtures PASS;
- [ ] no Gemini dependency;
- [ ] no FFmpeg core dependency;
- [ ] ADR updated untuk setiap architectural deviation.

---

# Handoff format ASTRA → SOL

Setiap batch harus diberikan ke SOL dalam format:

```text
BATCH:
GOAL:
IN SCOPE:
OUT OF SCOPE:
FILES/FOLDERS:
INTERFACES:
IMPLEMENTATION RULES:
TESTS REQUIRED:
REAL-HOST CHECKS:
ACCEPTANCE CRITERIA:
DO NOT:
EVIDENCE TO RETURN:
```

SOL tidak boleh diberi instruksi generik seperti "lanjutkan aplikasi" untuk batch production. Scope harus eksplisit agar perubahan mudah direview/revert.

---

# Current action

**JANGAN JALANKAN P0.**

Tunggu Foundation Verification Report dan perubahan status `READY TO PLAN / NOT READY TO IMPLEMENT` menjadi `READY TO IMPLEMENT`.
