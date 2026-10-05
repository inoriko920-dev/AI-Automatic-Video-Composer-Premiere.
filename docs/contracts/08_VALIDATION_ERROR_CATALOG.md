# 08 — Validation Error Catalog

Status: **DESIGN COMPLETE / IMPLEMENTATION BLOCKED BY FOUNDATION GATE**

Semua validation issue production wajib memakai code stabil. UI boleh menerjemahkan pesan, tetapi code tidak berubah karena bahasa.

## 1. Shape

```ts
interface ValidationIssue {
  code: string;
  severity: "ERROR" | "WARNING" | "INFO";
  scope: "SYSTEM" | "PROJECT" | "DOCX" | "SCENE" | "ASSET" | "TIMELINE" | "EXPORT";
  message: string;
  sceneId?: string;
  assetId?: string;
  details?: Record<string, unknown>;
  suggestedAction?: string;
}
```

## 2. System / host

- `HOST_UNSUPPORTED_VERSION` — ERROR
- `HOST_CAPABILITY_MISSING` — ERROR
- `FILESYSTEM_PERMISSION_DENIED` — ERROR
- `NETWORK_PERMISSION_DENIED` — WARNING/ERROR sesuai fitur
- `FOUNDATION_CAPABILITY_UNVERIFIED` — ERROR pada production gate

## 3. Project

- `PROJECT_NOT_OPEN` — ERROR
- `PROJECT_NOT_SAVED` — WARNING bila stable GUID/path workflow memerlukan save
- `PROJECT_IDENTITY_MISMATCH` — ERROR
- `SEQUENCE_NOT_FOUND` — ERROR
- `SEQUENCE_IDENTITY_MISMATCH` — ERROR
- `GENERATED_BIN_NOT_FOUND` — WARNING bila bisa dibuat ulang

## 4. DOCX

- `DOCX_UNREADABLE` — ERROR
- `DOCX_FORMAT_UNSUPPORTED` — ERROR
- `DOCX_SCENE_BOUNDARY_INVALID` — ERROR
- `DOCX_DUPLICATE_SCENE_ID` — ERROR
- `DOCX_EMPTY_SCENE` — ERROR
- `DOCX_UNKNOWN_LAYOUT` — ERROR
- `DOCX_INVALID_DURATION` — ERROR
- `DOCX_PARSE_WARNING` — WARNING

## 5. Scene

- `SCENE_NO_ASSET` — ERROR kecuali intentionally-empty mode eksplisit
- `SCENE_TOO_MANY_ASSETS_FOR_LAYOUT` — ERROR
- `SCENE_DURATION_OUT_OF_RANGE` — ERROR
- `SCENE_ORDER_CONFLICT` — ERROR
- `SCENE_ID_CHANGED_ON_RERUN` — WARNING/ERROR tergantung diff

## 6. Asset

- `ASSET_MISSING` — ERROR
- `ASSET_DUPLICATE_ID` — ERROR
- `ASSET_UNSUPPORTED_FORMAT` — ERROR
- `ASSET_UNREADABLE` — ERROR
- `ASSET_UNUSED` — WARNING
- `ASSET_SOURCE_CHANGED` — WARNING
- `ASSET_RELINK_REQUIRED` — ERROR

## 7. Timeline / Premiere mutation

- `TIMELINE_PLACEMENT_FAILED` — ERROR
- `TIMELINE_READBACK_MISMATCH` — ERROR
- `TIMELINE_DURATION_MISMATCH` — ERROR
- `TIMELINE_TRANSACTION_FAILED` — ERROR
- `TIMELINE_UNDO_GUARANTEE_UNAVAILABLE` — ERROR/WARNING by capability policy
- `MOTION_PARAM_NOT_FOUND` — WARNING/ERROR tergantung preset
- `KEYFRAME_READBACK_FAILED` — ERROR untuk preset yang mensyaratkan keyframe
- `GENERATED_ITEM_MISSING` — WARNING/ERROR pada rerun
- `USER_EDIT_CONFLICT` — WARNING dan blok auto-overwrite item tersebut

## 8. State / rerun

- `STATE_UNREADABLE` — ERROR
- `STATE_SCHEMA_UNSUPPORTED` — ERROR
- `STATE_MIGRATION_FAILED` — ERROR
- `STATE_PREMIERE_DIVERGED` — WARNING
- `RERUN_USER_MODIFIED_ITEM` — WARNING
- `RERUN_ORPHAN_GENERATED_ITEM` — WARNING
- `RERUN_UNSAFE_UPDATE_BLOCKED` — WARNING

## 9. Export

- `AME_NOT_INSTALLED` — WARNING bila export manual tetap tersedia
- `EXPORT_PRESET_INVALID` — ERROR
- `EXPORT_QUEUE_FAILED` — ERROR
- `EXPORT_OUTPUT_UNWRITABLE` — ERROR

## 10. Severity policy

### ERROR
Mutation/generate tidak boleh dimulai atau harus dihentikan aman.

### WARNING
Generate boleh lanjut hanya bila rule menyatakan aman. UI harus menampilkan warning sebelum mutation bila berdampak ke user.

### INFO
Tidak mempengaruhi output, hanya diagnostik.

## 11. Validation phases

Validation dijalankan bertahap:

1. `PRE_PARSE`
2. `POST_PARSE`
3. `POST_BIND`
4. `PRE_PLAN`
5. `PRE_MUTATION`
6. `POST_MUTATION_READBACK`
7. `RERUN_DIFF`
8. `PRE_EXPORT`

Tidak semua code valid di semua phase.

## 12. Mutation gate

Composer tidak boleh memulai mutation bila masih ada `ERROR` pada phase sampai `PRE_MUTATION`.

Post-mutation ERROR harus:
- menghentikan langkah berikutnya;
- menyimpan diagnostic evidence;
- tidak menyatakan run sukses;
- menggunakan Undo/rollback strategy bila capability mendukung.

## 13. UI requirement

Validation Center minimal menampilkan:
- severity;
- code;
- pesan Indonesia;
- scene/asset terkait;
- suggested action;
- filter ERROR/WARNING/INFO.

## 14. Acceptance criteria

- code unik dan stabil;
- setiap failure path production punya code;
- unit test memeriksa severity/gate behavior;
- tidak ada generic `UNKNOWN_ERROR` sebagai normal control flow;
- user-edit conflict tidak pernah diperlakukan sebagai silent overwrite.