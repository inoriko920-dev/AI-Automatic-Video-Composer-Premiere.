# 03 — TAHAP 02 CORE ARCHITECTURE PRODUCTION PLAN

Status: **PLANNED / IMPLEMENTATION BLOCKED BY FOUNDATION GATE**

Dokumen ini adalah blueprint production setelah Tahap 01 Foundation/API Spike selesai diverifikasi di Premiere nyata. Dokumen boleh disiapkan sebelum gate, tetapi **kode production Tahap 02 tidak boleh dipromosikan atau dianggap aktif sampai gate S07/S08/S10/S11/S12 dinyatakan GO**.

---

## 1. Tujuan Tahap 02

Mengubah hasil eksperimen UXP S01–S16 menjadi fondasi production TypeScript yang bersih, modular, deterministic, testable, dan aman untuk rerun.

Output akhir Tahap 02 bukan video final penuh. Outputnya adalah **core composer MVP** yang mampu:

`Scene DOCX + folder Axxx`

→ parse scene
→ validasi
→ bind aset
→ buat/reuse sequence milik AAVC
→ susun SINGLE/DOUBLE di V1/V2
→ set timing deterministik
→ tulis identity/state
→ readback hasil dari Premiere DOM
→ menghasilkan report sukses/gagal

Motion registry, subtitle kompleks, Gemini, narration workflow, MOGRT subtitle, dan export automation lengkap berada setelah core composer ini stabil.

---

## 2. Gate masuk Tahap 02

### GO wajib
- S07 Timeline Placement = PASS.
- S08 Timing & Duration = PASS.
- S11 One Transaction / One Undo = PASS.
- S12 Identity after reload/restart = PASS.
- S10 Native Keyframe = PASS, **atau** ada ADR fallback yang eksplisit berdasarkan bukti host nyata.

### Tidak boleh dianggap GO
- GitHub Actions hijau saja.
- `executeTransaction()` mengembalikan true tetapi DOM readback gagal.
- test hanya dilakukan pada satu state yang tidak dapat direproduce.
- hasil tanpa versi Premiere/UXP/OS.

### Evidence minimum
Gunakan `aavc-foundation-report-*.json` dari Verification Kit v0.0.6 sebagai sumber keputusan gate.

---

## 3. Prinsip arsitektur production

1. **Business logic tidak boleh mengimpor `premierepro` langsung.**
2. Semua API Premiere harus berada di adapter/infrastructure layer.
3. Parser DOCX dan Axxx binder harus dapat dites di Node tanpa Premiere.
4. Semua hasil composer harus mempunyai stable identity.
5. Semua mutation harus dibuat dari plan yang sudah tervalidasi.
6. Plan harus dapat di-preview sebelum mutation.
7. Setelah mutation, hasil harus dibaca ulang dari Premiere DOM.
8. Rerun harus idempotent sejauh ownership AAVC masih utuh.
9. Edit manual user tidak boleh dihapus diam-diam.
10. Tidak ada AI dependency pada composer dasar.
11. Tidak ada FFmpeg dependency pada timeline dasar.
12. Track index adalah lokasi, bukan identitas.
13. Semua host capability harus lewat capability registry/version gate.
14. Error harus berupa kode/domain error, bukan string acak.
15. Satu operasi generate besar harus dibungkus transaction strategy yang dapat di-Undo secara masuk akal.

---

## 4. Struktur source target

Rencana production source:

```text
src/
  app/
    bootstrap.ts
    container.ts
    commands/
      analyzeProject.ts
      composeTimeline.ts
      validateInputs.ts
      relinkAssets.ts
    usecases/
      buildComposerPlan.ts
      executeComposerPlan.ts
      verifyComposerResult.ts

  domain/
    model/
      ProjectState.ts
      Scene.ts
      SceneAssetRef.ts
      AssetBinding.ts
      LayoutSpec.ts
      TimingSpec.ts
      ComposerPlan.ts
      ComposerRun.ts
      GeneratedItemIdentity.ts
      ValidationIssue.ts
    services/
      SceneNormalizer.ts
      AssetBinder.ts
      LayoutResolver.ts
      TimingPlanner.ts
      ComposerPlanner.ts
      RerunDiffEngine.ts
    errors/
      DomainError.ts
      ErrorCodes.ts

  ports/
    PremierePort.ts
    SceneDocumentPort.ts
    FileSystemPort.ts
    StateStorePort.ts
    LoggerPort.ts
    ClockPort.ts

  infrastructure/
    premiere/
      PremiereAdapter.ts
      ProjectGateway.ts
      SequenceGateway.ts
      TrackGateway.ts
      ClipGateway.ts
      MotionGateway.ts
      PropertyGateway.ts
      TransactionGateway.ts
      PremiereCapabilityRegistry.ts
      PremiereTime.ts
    docx/
      DocxSceneParser.ts
      DocxXmlReader.ts
      Prompt1SceneMapper.ts
    assets/
      CanonicalAssetScanner.ts
    state/
      UxpStateStore.ts
      StateSchema.ts
      StateMigration.ts
    filesystem/
      UxpFileSystemAdapter.ts
    logging/
      AppLogger.ts

  presentation/
    panel/
      index.html
      panel.ts
      state.ts
      components/
      screens/
        HomeScreen.ts
        InputScreen.ts
        ValidationScreen.ts
        PlanPreviewScreen.ts
        GenerateScreen.ts
        ResultScreen.ts

  shared/
    result.ts
    ids.ts
    assert.ts
    collections.ts
    hashing.ts
    schema.ts

  tests/
    unit/
    integration/
    fixtures/
```

Catatan: nama folder dapat berubah kecil ketika implementation dimulai, tetapi pemisahan **domain / ports / infrastructure / presentation** tidak boleh dihilangkan tanpa ADR.

---

## 5. Dependency rule

Arah dependency wajib:

```text
presentation → app/usecases → domain
                    ↓
                  ports
                    ↑
infrastructure/adapters
```

Dilarang:
- `domain` import UXP/Premiere.
- parser DOCX memanggil timeline API.
- UI langsung melakukan `executeTransaction()`.
- Gemini adapter mengubah track tanpa melalui use case/composer plan.

---

## 6. Model data minimum

### 6.1 Scene

```ts
interface Scene {
  id: SceneId;
  ordinal: number;
  sourceLabel?: string;
  narrationText?: string;
  assetRefs: SceneAssetRef[];
  requestedLayout?: 'SINGLE' | 'DOUBLE' | 'AUTO';
  durationHintSeconds?: number;
  metadata: Record<string, string>;
}
```

### 6.2 SceneAssetRef

```ts
interface SceneAssetRef {
  assetId: string;      // A001
  role?: 'PRIMARY' | 'SECONDARY';
  sourceSceneId: SceneId;
}
```

### 6.3 AssetBinding

```ts
interface AssetBinding {
  assetId: string;
  fileName: string;
  absolutePath: string;
  extension: string;
  exists: boolean;
  duplicateCount: number;
  fingerprint?: string;
}
```

### 6.4 LayoutSpec

```ts
interface LayoutSpec {
  mode: 'SINGLE' | 'DOUBLE';
  primary: VisualPlacement;
  secondary?: VisualPlacement;
}
```

`VisualPlacement` menyimpan logical position/scale, bukan object Premiere.

### 6.5 TimingSpec

```ts
interface TimingSpec {
  startSeconds: number;
  durationSeconds: number;
  endSeconds: number;
}
```

Domain memakai detik sebagai semantic time. Konversi ke tick/frame hanya dilakukan oleh `PremiereTime`.

### 6.6 ComposerPlan

```ts
interface ComposerPlan {
  schemaVersion: number;
  runId: string;
  targetSequenceIdentity: string;
  scenes: PlannedScene[];
  requiredAssets: string[];
  warnings: ValidationIssue[];
  fingerprint: string;
}
```

Plan harus immutable setelah user menekan Generate.

---

## 7. Stable ID strategy

Scene ID **tidak boleh** sekadar `scene-1`, `scene-2` jika sumber mempunyai informasi yang lebih stabil.

Prioritas ID:
1. explicit scene ID dari DOCX bila tersedia;
2. canonical scene marker dari format Prompt-1;
3. deterministic hash dari normalized scene content + asset IDs;
4. fallback ordinal hanya sebagai bagian tambahan, bukan satu-satunya identity.

Generated item identity minimum:

```text
AAVC:<projectId>:<composerRunId>:<sceneId>:<role>
```

Role contoh:
- `PRIMARY_VISUAL`
- `SECONDARY_VISUAL`
- `SCENE_MARKER`
- `NARRATION`
- `SUBTITLE`

---

## 8. State schema

Production state disimpan dua lapis:

### A. Premiere persistent properties
Untuk identity kecil dan lookup cepat:
- project role/schema;
- target sequence role/schema;
- composer project ID;
- active composer run ID bila sesuai.

### B. UXP plugin-data JSON
Untuk state kaya:

```json
{
  "schemaVersion": 1,
  "projectGuid": "...",
  "composerProjectId": "...",
  "sequenceGuid": "...",
  "source": {
    "docxFingerprint": "...",
    "assetFolderFingerprint": "..."
  },
  "runs": [],
  "sceneBindings": {},
  "generatedItems": {}
}
```

State store wajib memiliki migration version.

---

## 9. DOCX parser contract

Parser production tidak boleh mengembalikan setengah struktur tanpa error yang jelas.

Pipeline:

```text
DOCX File
→ ZIP/XML reader
→ paragraph/table token stream
→ Prompt-1 structure recognizer
→ raw scene blocks
→ normalized Scene[]
→ semantic validation
```

Output:

```ts
interface SceneParseResult {
  scenes: Scene[];
  warnings: ValidationIssue[];
  sourceFingerprint: string;
}
```

Error wajib:
- `DOCX_UNREADABLE`
- `DOCX_UNSUPPORTED_STRUCTURE`
- `SCENE_ID_DUPLICATE`
- `SCENE_EMPTY`
- `ASSET_REFERENCE_INVALID`

Parser tidak boleh menebak scene yang ambigu tanpa warning/error.

---

## 10. Canonical Axxx binder

Scanner mendukung minimal:
- PNG
- JPG/JPEG
- WEBP bila host/import sudah terbukti

Regex canonical:

```text
^A\d{3,}$
```

Extension dipisahkan dari ID.

Binder harus mendeteksi:
- missing required asset;
- duplicate canonical ID;
- unsupported extension;
- unreadable path;
- extra unused asset;
- case collision;
- asset yang sudah diimport ke dedicated bin.

Tidak boleh import ulang file yang sudah dimiliki AAVC jika identity/path/fingerprint masih cocok.

---

## 11. Dedicated Premiere ownership

Production target awal:

```text
Project
└─ AAVC_GENERATED
   ├─ ASSETS
   ├─ AUDIO
   └─ GENERATED
```

Sequence target:

```text
AAVC_COMPOSER_<short-id>
```

Naming adalah helper, bukan identity tunggal.

Persistent properties dan state JSON tetap sumber ownership utama.

---

## 12. Composer plan sebelum mutation

Tidak boleh langsung membaca DOCX lalu mutasi timeline.

Urutan production:

1. load inputs;
2. parse;
3. scan/bind assets;
4. read current Premiere state;
5. resolve capabilities;
6. build `ComposerPlan`;
7. run validation;
8. tampilkan Preview Plan;
9. user Generate;
10. execute plan;
11. readback verify;
12. persist run result.

Plan preview minimal menampilkan:
- jumlah scene;
- jumlah aset;
- SINGLE/DOUBLE per scene;
- start/duration/end;
- warning/error;
- target sequence;
- apakah rerun CREATE/UPDATE/SKIP/CONFLICT.

---

## 13. Layout engine MVP

### SINGLE
- primary asset ke V1;
- full-frame logical placement;
- Scale/Position melalui native Premiere bila capability tersedia.

### DOUBLE
- primary + secondary ke V1/V2;
- layout preset deterministic;
- tidak rasterize dua aset menjadi satu image.

MVP pertama tidak perlu 20 layout. Cukup:
- SINGLE_CENTER;
- DOUBLE_LEFT_RIGHT;
- DOUBLE_TOP_BOTTOM bila terbukti diperlukan.

Semua preset harus menghasilkan `LayoutSpec`, bukan langsung Premiere action.

---

## 14. Timing planner

MVP duration source priority:
1. explicit duration dari Scene DOCX;
2. timing data resmi lain bila format mendukung;
3. project default duration yang user atur;
4. tidak ada tebakan AI.

Rules:
- positive finite seconds;
- minimum duration configurable;
- continuous scene timeline;
- no accidental overlap untuk visual utama;
- frame rounding hanya di adapter Premiere;
- DOM readback <= 1 frame.

---

## 15. PremiereTime utility

Satu-satunya modul yang boleh mengetahui tick/frame conversion detail.

API target:

```ts
class PremiereTime {
  secondsToTickTime(seconds: number): unknown;
  tickTimeToSeconds(value: unknown): number;
  frameToleranceSeconds(sequence: SequenceHandle): Promise<number>;
  closeWithinFrame(actual: number, expected: number, sequence: SequenceHandle): Promise<boolean>;
}
```

Tidak boleh tersebar `TickTime.createWithSeconds()` di seluruh codebase production.

---

## 16. Premiere adapter port

Domain/use case hanya mengenal interface seperti:

```ts
interface PremierePort {
  getProjectSnapshot(): Promise<ProjectSnapshot>;
  ensureOwnedBin(): Promise<OwnedBinHandle>;
  ensureComposerSequence(spec: SequenceSpec): Promise<SequenceHandle>;
  ensureAssetImported(binding: AssetBinding): Promise<AssetHandle>;
  executeTimelineMutation(plan: TimelineMutationPlan): Promise<MutationReceipt>;
  readbackTimeline(identity: GeneratedIdentity[]): Promise<GeneratedItemSnapshot[]>;
  readCapabilities(): Promise<PremiereCapabilities>;
}
```

Semua object Premiere asli tetap di infrastructure layer.

---

## 17. Capability registry

`PremiereCapabilityRegistry` menyimpan hasil:
- host version;
- timeline placement support;
- timing mutation support;
- keyframe support/readback;
- properties persistence support;
- MOGRT support;
- EncoderManager support;
- API 26.x optional capabilities.

Business logic meminta capability semantic, misalnya:

```ts
capabilities.nativeScaleKeyframes === true
```

bukan membandingkan versi Premiere berulang-ulang di banyak file.

---

## 18. Transaction strategy

Composer tidak membuat puluhan transaction terpisah tanpa alasan.

MVP strategy:
- import/bin operations dikelompokkan logis;
- timeline generation utama memakai compound transaction bila API/action lifecycle memungkinkan;
- readback dilakukan setelah transaction;
- jika operation tidak dapat digabung karena API limitation, limitation harus dicatat dan UI menjelaskan Undo behavior.

S11 menjadi dasar keputusan final strategi ini.

---

## 19. Rerun diff engine

Setiap planned scene dibandingkan dengan generated state saat ini.

Decision enum:

```text
CREATE
UPDATE_SAFE
SKIP_UNCHANGED
CONFLICT_USER_EDIT
REMOVE_ORPHAN_CANDIDATE
BLOCKED
```

### Rule utama
- identity cocok + fingerprint sama → SKIP_UNCHANGED;
- identity cocok + source berubah + item belum user-modified → UPDATE_SAFE;
- identity cocok tetapi visual/timing berubah di Premiere di luar known state → CONFLICT_USER_EDIT;
- scene hilang dari DOCX → jangan langsung delete; tandai REMOVE_ORPHAN_CANDIDATE;
- missing asset → BLOCKED.

User edit harus menang atas auto-delete.

---

## 20. User-edit protection

Untuk setiap generated item simpan snapshot terakhir plugin:
- start/end;
- asset identity;
- logical layout;
- known motion preset;
- state fingerprint.

Pada rerun:

```text
current Premiere state
vs
last generated snapshot
vs
new desired plan
```

Dari perbandingan tiga arah ini baru diputuskan update atau conflict.

---

## 21. Validation Center contract

Severity:
- `INFO`
- `WARNING`
- `ERROR`
- `BLOCKER`

Contoh codes:
- `NO_ACTIVE_PROJECT`
- `DOCX_UNREADABLE`
- `NO_SCENES`
- `ASSET_MISSING`
- `ASSET_DUPLICATE_ID`
- `UNSUPPORTED_LAYOUT`
- `TIMING_INVALID`
- `HOST_CAPABILITY_MISSING`
- `GENERATED_ITEM_CONFLICT`
- `SEQUENCE_UNAVAILABLE`

Generate button disabled jika ada BLOCKER.

---

## 22. Result/error pattern

Expected domain failure tidak boleh dilempar sebagai raw exception ke UI.

Gunakan pattern:

```ts
type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Unexpected programmer/runtime error tetap ditangkap pada application boundary dan masuk diagnostics report.

---

## 23. Logging

Logger wajib mendukung:
- level;
- timestamp;
- runId;
- sceneId bila relevan;
- error code;
- safe metadata.

Dilarang log:
- API keys;
- token rahasia;
- full confidential narration tanpa kebutuhan;
- credential/path sensitif yang tidak perlu.

---

## 24. Fingerprint strategy

Gunakan deterministic fingerprint untuk:
- normalized DOCX scene source;
- asset file identity;
- ComposerPlan;
- generated scene snapshot.

Tujuan:
- SKIP rerun yang tidak berubah;
- mendeteksi source change;
- reproducible debugging.

Hash algorithm dipilih satu kali dan dibungkus `hashing.ts`.

---

## 25. Production UI MVP

Panel awal tidak meniru editor penuh Premiere.

Screen flow:

### 1. Home
- New Composition
- Open Existing AAVC State
- Diagnostics

### 2. Inputs
- Scene DOCX
- Folder Axxx
- default scene duration

### 3. Validation
- errors/warnings
- scene count
- binding summary

### 4. Plan Preview
- scene table
- asset IDs
- layout
- timing
- rerun decision

### 5. Generate
- progress
- current scene
- transaction state

### 6. Result
- generated/updated/skipped/conflict count
- open target sequence
- export diagnostics/report

---

## 26. DOCX library decision

Sebelum implementation parser, lakukan micro-spike khusus library ZIP/XML yang cocok dengan UXP bundling.

Kriteria:
- dapat membaca `.docx` sebagai ZIP;
- tidak membutuhkan Node API yang tidak tersedia di UXP;
- bundle size masuk akal;
- XML parsing deterministic;
- license aman;
- dapat diuji juga di Node test runner.

Jika library tidak cocok, gunakan minimal ZIP/XML implementation yang dikemas sendiri. Jangan memilih library hanya karena populer di browser biasa.

---

## 27. Build/tooling target

Setelah gate GO:
- TypeScript strict mode;
- ESLint;
- formatter konsisten;
- bundler yang kompatibel UXP;
- source maps untuk dev;
- no secret injection ke bundle;
- separate dev/prod manifest bila dibutuhkan;
- package scripts untuk check/test/build.

Target scripts:

```text
npm run typecheck
npm run lint
npm test
npm run build
npm run check
```

`npm run check` harus menjadi gate CI utama.

---

## 28. Testing pyramid

### Unit — tanpa Premiere
Wajib cepat dan deterministic:
- DOCX block normalization;
- Scene ID;
- asset regex/binder;
- layout resolver;
- timing planner;
- rerun diff;
- fingerprint;
- validation codes.

### Integration — adapter fakes
Gunakan fake `PremierePort` untuk:
- build → execute plan flow;
- conflict handling;
- transaction receipt;
- readback mismatch.

### Real-host verification
Premiere nyata untuk:
- placement;
- duration;
- keyframe;
- one Undo;
- properties persistence;
- package smoke.

---

## 29. Fixture matrix Tahap 02

Minimum fixtures:

### F01 — 1 scene SINGLE
- A001
- 3 s

### F02 — 2 scene SINGLE
- A001 → A002

### F03 — 1 scene DOUBLE
- A001 + A002

### F04 — missing asset
- Scene meminta A003, file tidak ada
- harus BLOCKER tanpa mutation

### F05 — duplicate ID
- dua file canonical A001
- harus BLOCKER

### F06 — rerun unchanged
- run kedua = SKIP_UNCHANGED

### F07 — source changed
- duration scene berubah
- UPDATE_SAFE bila belum user edit

### F08 — manual edit conflict
- user menggeser generated clip
- rerun harus CONFLICT_USER_EDIT, bukan overwrite diam-diam

### F09 — 10 scenes
- determinism + performance smoke

### F10 — 100 scenes
- scalability/regression setelah MVP stabil

---

## 30. Performance target awal

Tidak menetapkan angka palsu sebelum profiling, tetapi desain harus menghindari:
- scan seluruh project berulang per scene;
- import file yang sama berkali-kali;
- DOM call per property bila dapat dibatch/cache;
- hashing file besar berkali-kali tanpa cache;
- UI render table penuh setiap progress tick.

Profiling dilakukan minimal pada 10 dan 100 scene.

---

## 31. Migration dari spike JavaScript

File foundation:
- `uxp/main.js`
- `uxp/batch-c.js`
- `uxp/batch-d.js`
- `uxp/batch-e.js`
- `uxp/verification.js`

tidak langsung di-copy menjadi production modules.

Proses migration:
1. identifikasi API yang VERIFIED;
2. tulis adapter TypeScript baru;
3. pindahkan acceptance/readback rules;
4. buat automated unit/integration tests;
5. pertahankan spike sebagai diagnostics/reference sampai production parity terbukti;
6. baru deprecate spike UI jika sudah tidak diperlukan.

---

## 32. Batch implementasi Tahap 02

### Batch P0 — Production skeleton
- TS strict;
- bundler/build;
- domain/ports/infrastructure folders;
- Result/ErrorCodes;
- logging;
- CI typecheck/lint/test/build.

**Exit:** empty production panel loads tanpa memakai spike global code.

### Batch P1 — Domain + state model
- Scene;
- bindings;
- layout/timing;
- ComposerPlan;
- validation issue;
- state schema/migration.

**Exit:** pure unit tests hijau.

### Batch P2 — DOCX parser
- ZIP/XML reader;
- Prompt-1 mapper;
- normalization;
- fixture tests.

**Exit:** known DOCX fixtures menghasilkan Scene[] deterministic.

### Batch P3 — Axxx scanner/binder
- folder scan;
- canonical IDs;
- duplicate/missing detection;
- import planning.

**Exit:** binder unit/integration tests hijau.

### Batch P4 — Premiere adapter core
Hanya memakai API yang Foundation Gate izinkan:
- active project;
- bin;
- import;
- sequence;
- track placement;
- timing;
- persistent properties;
- transaction;
- readback.

**Exit:** real-host fixture F01/F02 berhasil.

### Batch P5 — Composer planner
- SINGLE/DOUBLE;
- scene timeline;
- mutation plan;
- preview model.

**Exit:** fake adapter tests menghasilkan plan konsisten.

### Batch P6 — Execute + verify
- transaction execution;
- generated identity;
- DOM readback;
- MutationReceipt;
- result report.

**Exit:** F01–F05 nyata/terkontrol lulus.

### Batch P7 — Idempotent rerun
- diff engine;
- three-way state comparison;
- SKIP/UPDATE/CONFLICT;
- orphan policy.

**Exit:** F06–F08 lulus.

### Batch P8 — Scale test + polish
- 10/100 scenes;
- diagnostics;
- recovery behavior;
- UI production MVP.

**Exit:** Tahap 02 release candidate.

---

## 33. Definition of Done Tahap 02

Tahap 02 baru selesai jika:

1. production code TypeScript terpisah dari spike code;
2. parser menghasilkan Scene[] deterministic;
3. binder canonical reliable;
4. 1 dan 2 visual scene dapat dibuat native di Premiere;
5. timing readback <= 1 frame;
6. generated sequence memiliki stable identity;
7. rerun unchanged tidak menduplikasi;
8. manual-edit conflict tidak dioverwrite diam-diam;
9. mutation failure menghasilkan report yang jelas;
10. unit/integration CI hijau;
11. real-host fixtures kritis hijau;
12. output tetap editable di Premiere;
13. tidak ada Gemini dependency;
14. tidak ada FFmpeg dependency pada core timeline;
15. state schema mempunyai versi/migration path.

---

## 34. Yang sengaja belum masuk Tahap 02

Bukan scope core architecture:
- 21 animation registry penuh;
- random motion production;
- animated subtitle penuh;
- Gemini creative director;
- narration alignment kompleks;
- music/SFX engine;
- final AME preset UX;
- auto-install/update production;
- cloud account orchestration.

Fitur tersebut dibangun di tahap berikutnya setelah core composer terbukti stabil.

---

## 35. Aturan untuk ASTRA

ASTRA wajib:
- mulai dari report Foundation Gate;
- menolak API yang belum VERIFIED;
- memecah pekerjaan sesuai Batch P0–P8;
- menjaga dependency rule;
- membuat ADR bila ada perubahan arsitektur;
- tidak memasukkan feature creep ke Tahap 02.

ASTRA tidak menulis kode production sebagai pengganti SOL.

---

## 36. Aturan untuk SOL

SOL wajib:
- implement sesuai plan/ADR;
- tidak copy spike code secara buta;
- menulis test sebelum/bersamaan dengan modul penting;
- setiap Premiere mutation memiliki readback verification;
- tidak mengubah manual user edit tanpa decision dari rerun engine;
- tidak menambahkan AI dependency pada core;
- menjaga `npm run check` hijau.

Jika API Premiere berbeda dengan asumsi plan, SOL berhenti pada modul terkait, mencatat evidence, dan meminta keputusan ADR—bukan membuat workaround tersembunyi.

---

## 37. Keputusan saat ini

**Tahap 02 = READY TO PLAN, NOT READY TO IMPLEMENT.**

Trigger perubahan status menjadi `READY TO IMPLEMENT` hanya setelah Foundation Verification Report menunjukkan gate GO atau GO dengan ADR fallback S10 yang disetujui.
