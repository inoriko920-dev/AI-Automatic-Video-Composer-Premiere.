# 07 — ComposerPlan & ProjectState Schema

Status: **DESIGN COMPLETE / IMPLEMENTATION BLOCKED BY FOUNDATION GATE**

Dokumen ini mengunci bentuk state production agar parser, binder, planner, Premiere adapter, rerun engine, dan UI tidak memiliki format masing-masing.

## 1. Prinsip

- Semua schema mempunyai `schemaVersion`.
- State domain tidak menyimpan object Premiere runtime secara langsung.
- Premiere GUID/property/identity disimpan sebagai serializable reference.
- Semua scene/item generated mempunyai stable ID.
- Plan dan executed state dipisahkan.

## 2. ComposerProjectState

```ts
interface ComposerProjectState {
  schemaVersion: number;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  source: SourceState;
  scenes: SceneState[];
  assets: AssetState[];
  plan?: ComposerPlan;
  lastRun?: ComposerRunState;
  premiere?: PremiereOwnershipState;
}
```

## 3. SourceState

```ts
interface SourceState {
  sceneDocxFingerprint: string;
  sceneDocxName: string;
  assetFolderFingerprint: string;
  parserVersion: string;
  binderVersion: string;
}
```

Tidak wajib menyimpan absolute path bila tidak diperlukan. Bila path disimpan, perlakukan sebagai machine-local metadata.

## 4. SceneState

```ts
interface SceneState {
  sceneId: string;
  ordinal: number;
  narrationText: string;
  assetIds: string[];
  layout: "SINGLE" | "DOUBLE";
  durationSeconds: number;
  userLocked?: boolean;
}
```

## 5. ComposerPlan

```ts
interface ComposerPlan {
  planId: string;
  planVersion: number;
  generatedAt: string;
  sourceFingerprint: string;
  sequenceSpec: SequenceSpec;
  scenePlans: ScenePlan[];
  validationSnapshot: ValidationSnapshot;
}
```

Plan bersifat deterministic untuk input + rules + seed yang sama.

## 6. ScenePlan

```ts
interface ScenePlan {
  sceneId: string;
  ordinal: number;
  startSeconds: number;
  durationSeconds: number;
  layout: "SINGLE" | "DOUBLE";
  placements: VisualPlacement[];
  animation?: AnimationPlan;
}
```

```ts
interface VisualPlacement {
  generatedItemId: string;
  assetId: string;
  trackRole: "PRIMARY" | "SECONDARY";
  startSeconds: number;
  endSeconds: number;
  transform: {
    positionX: number;
    positionY: number;
    scale: number;
    opacity: number;
  };
}
```

Track role adalah logical role, bukan Premiere track index permanen.

## 7. SequenceSpec

```ts
interface SequenceSpec {
  sequenceIdentity: string;
  displayName: string;
  frameRateHint?: number;
  width?: number;
  height?: number;
}
```

Actual sequence capability/readback tetap berasal dari Premiere adapter.

## 8. GeneratedItemIdentity

```ts
interface GeneratedItemIdentity {
  generatedItemId: string;
  sceneId: string;
  assetId: string;
  role: string;
  generationRevision: number;
}
```

Contoh:

`GEN-SCN-001-a4f19c2d-A001-PRIMARY`

ID tidak boleh bergantung pada V1/V2 index.

## 9. PremiereOwnershipState

```ts
interface PremiereOwnershipState {
  projectGuid?: string;
  sequenceGuid?: string;
  sequenceRoleProperty?: string;
  generatedBinIdentity?: string;
  generatedItems: PremiereGeneratedItemRef[];
}

interface PremiereGeneratedItemRef {
  generatedItemId: string;
  projectItemGuid?: string;
  trackItemFingerprint?: string;
  lastKnownTrackRole: string;
  lastAppliedPlanHash: string;
}
```

## 10. ComposerRunState

```ts
interface ComposerRunState {
  runId: string;
  startedAt: string;
  completedAt?: string;
  status: "PLANNED" | "APPLIED" | "PARTIAL" | "FAILED";
  planHash: string;
  mutationSummary: MutationSummary;
  verification: VerificationSummary;
}
```

## 11. Three-way rerun inputs

Rerun engine membandingkan:

1. **Previous Applied State** — apa yang terakhir plugin terapkan.
2. **Current Premiere State** — kondisi timeline sekarang, termasuk edit manual.
3. **New Desired Plan** — hasil parser/binder/planner terbaru.

Hasil per item:
- `UNCHANGED`
- `SAFE_UPDATE`
- `USER_MODIFIED`
- `NEW`
- `REMOVED_FROM_SOURCE`
- `MISSING_IN_PREMIERE`

`USER_MODIFIED` tidak boleh ditimpa otomatis secara default.

## 12. Persistence

State harus:
- JSON serializable;
- schema-versioned;
- atomic write bila filesystem memungkinkan;
- menyimpan backup previous revision;
- tidak berisi API key/token.

## 13. Migration

Setiap schema change wajib:
- menaikkan `schemaVersion`;
- menyediakan migration function atau menolak state lama dengan pesan jelas;
- tidak mengubah state lama diam-diam.

## 14. Determinism

`planHash` harus berubah bila material plan berubah, tetapi stabil bila hanya timestamp berubah.

Hash material minimal berasal dari:
- normalized scenes;
- asset binding IDs/fingerprint;
- layout/timing rules;
- animation seed/rules bila digunakan;
- capability profile yang mempengaruhi output.

## 15. Acceptance criteria

- serialize -> deserialize roundtrip tanpa kehilangan data;
- stable IDs tidak berubah pada identical rerun;
- three-way classification mempunyai unit tests;
- user-modified state tidak otomatis tertimpa;
- migration tests tersedia;
- 100-scene state tetap dapat diproses deterministic.