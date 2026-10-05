# 06 — Stage 02 Production UI/UX Specification

Status: **DESIGN ONLY / PRE-GATE**

Dokumen ini mendefinisikan UI production plugin setelah Foundation Gate GO. Tidak ada source production yang boleh dibuat hanya karena dokumen ini tersedia.

## 1. Tujuan UI

Panel harus terasa seperti tool native Premiere, bukan editor video kedua.

Tugas UI hanya:
- memilih input;
- menganalisis;
- menunjukkan validation;
- menunjukkan ComposerPlan;
- meminta user mengeksekusi generate/rerun;
- menunjukkan progress/readback;
- menyelesaikan conflict tanpa merusak edit manual;
- membuka hasil di timeline Premiere.

Timeline, playback, trim, keyframe editor, mixer, dan monitor tetap milik Premiere.

## 2. Technology policy

### P0/P1 MVP
Gunakan:
- standard HTML yang didukung UXP;
- CSS lokal;
- built-in Spectrum UXP widgets untuk control umum.

Candidate control:
- `sp-button`;
- `sp-checkbox`;
- `sp-dropdown`;
- `sp-menu-item`;
- `sp-progressbar`;
- `sp-radio-group`;
- `sp-slider` bila benar-benar diperlukan;
- `sp-textarea`;
- `sp-textfield`.

Alasan P0: built-in widget tidak membutuhkan dependency/import tambahan sehingga bundle proof tetap kecil.

### P8 evaluation
Spectrum Web Components (SWC) dapat dievaluasi untuk component yang lebih kaya setelah core composer stabil. Migrasi UI tidak boleh mengubah domain/ports.

Tidak memakai React/Vue/Svelte pada MVP.

## 3. Panel information architecture

Satu panel utama dengan 6 area logis:

```text
AAVC HEADER
↓
1. INPUT
↓
2. ANALYSIS / VALIDATION
↓
3. PLAN PREVIEW
↓
4. GENERATE / RERUN
↓
5. RESULT / CONFLICT
↓
6. DIAGNOSTICS
```

Jangan membuat banyak panel Premiere untuk MVP.

## 4. Header

Elemen:
- nama: `AI Automatic Video Composer`;
- plugin version;
- host capability badge;
- project state badge;
- optional settings icon/button.

Badge status utama:
- `BELUM SIAP`;
- `SIAP DIANALISIS`;
- `ADA MASALAH`;
- `SIAP DIBUAT`;
- `MEMBUAT TIMELINE`;
- `SELESAI`;
- `KONFLIK EDIT MANUAL`.

Host/version detail tidak perlu memenuhi header; pindah ke Diagnostics.

## 5. Screen 1 — Input

### Required

#### Scene DOCX
- path/read-only field;
- `Pilih DOCX`;
- clear/reselect.

#### Folder Aset
- path/read-only field;
- `Pilih Folder Aset`;
- detected canonical asset count.

### Optional MVP+

#### Narasi
- audio path;
- `Pilih Narasi`.

#### Subtitle SRT
- SRT path;
- `Pilih SRT`.

Optional input yang belum dipilih tidak boleh memblokir visual composer dasar.

### Primary action

`ANALISIS PROJECT`

Button disabled bila required input belum ada.

## 6. Screen 2 — Analysis / Validation

Setelah ANALISIS PROJECT:

Summary:
- scene count;
- required assets;
- found assets;
- missing assets;
- unused assets;
- total planned duration;
- SINGLE count;
- DOUBLE count;
- blocker count;
- warning count.

### Validation issue row

Setiap issue menampilkan:
- severity badge `BLOCKER / WARNING / INFO`;
- stable code;
- pesan Bahasa Indonesia;
- scene/asset context;
- suggested fix;
- optional `Tunjukkan` / `Pilih Ulang` action.

Contoh:

```text
[BLOCKER] ASSET_MISSING
Scene SCN-004 membutuhkan A017 tetapi file tidak ditemukan.
[ Pilih Folder Aset Ulang ]
```

Jika ada BLOCKER:
- Generate disabled;
- tidak ada Premiere mutation.

## 7. Screen 3 — Plan Preview

Plan Preview adalah representasi `ComposerPlan`, bukan timeline mini-editor.

Kolom/list row minimum:
- scene order;
- stable scene ID;
- asset IDs;
- layout SINGLE/DOUBLE;
- start;
- duration;
- target V track;
- planned motion bila enabled;
- warning marker.

### Scene detail

Klik scene membuka detail inline:
- source text excerpt;
- bound files;
- layout reason;
- timing;
- identity planned;
- validation notes.

MVP tidak menyediakan drag/drop timeline di panel.

## 8. Settings MVP

Settings harus sedikit dan deterministic.

### Composer
- default scene duration bila source tidak menentukan;
- target sequence mode: create/use owned sequence;
- preserve manual edits: selalu ON untuk MVP, tidak boleh dimatikan diam-diam.

### Motion
Setelah motion registry masuk:
- `Aktifkan Motion`;
- seed;
- deterministic random checkbox;
- intensity sederhana.

### Subtitle
Setelah subsystem tersedia:
- off;
- native caption;
- animated graphics bila capability tersedia.

### AI
Gemini/AI tidak ditampilkan sebagai requirement MVP. Jika belum dikonfigurasi, composer tetap berfungsi penuh secara deterministic.

## 9. Primary Generate action

Sebelum execution:

Button:

`BUAT TIMELINE OTOMATIS`

Enabled hanya bila:
- validation BLOCKER = 0;
- plan exists;
- project/host capability valid;
- no unresolved rerun conflict.

Sebelum mutasi besar, UI menampilkan concise confirmation summary:

```text
10 scene
14 aset
Durasi 01:42
Sequence: AAVC Composer
Tidak ada blocker
```

Tidak perlu dialog berulang untuk setiap scene.

## 10. Generation progress

Gunakan progressbar + stage text.

Stage logis:
1. `Menyiapkan project`;
2. `Mengimpor aset`;
3. `Menyusun sequence`;
4. `Mengatur timing/layout`;
5. `Menerapkan identity`;
6. `Memverifikasi hasil`;
7. `Menyimpan state`.

Progress scene:

`Scene 24 / 100`

UI tidak boleh menampilkan PASS sebelum DOM readback selesai.

## 11. Result screen

Jika berhasil:

Summary:
- sequence name;
- scene generated;
- asset reused/imported;
- warnings;
- verification result;
- elapsed metric bila tersedia.

Actions:
- `BUKA SEQUENCE`;
- `LIHAT DIAGNOSTICS`;
- `EXPORT REPORT`;
- `ANALISIS ULANG`.

Jangan auto-export video setelah generate.

## 12. Rerun UX

Saat source diubah dan ANALISIS PROJECT dijalankan ulang, planner membuat rerun diff.

Summary:
- CREATE;
- UPDATE_SAFE;
- SKIP_UNCHANGED;
- CONFLICT_USER_EDIT;
- REMOVE_ORPHAN_CANDIDATE;
- BLOCKED.

### Safe case

Jika hanya CREATE/UPDATE_SAFE/SKIP_UNCHANGED:

Primary action:
`UPDATE TIMELINE`

### Conflict case

Jika `CONFLICT_USER_EDIT` ada:

Generate/update global tidak boleh langsung overwrite.

Conflict row menampilkan:
- Scene ID;
- field yang berubah;
- last generated value;
- current Premiere value;
- new desired value.

Example:

```text
SCN-007 · Position
Generated: 960,540
Premiere sekarang: 1040,520   ← edit manual
Rencana baru: 960,540
```

Default action:
- `PERTAHANKAN EDIT MANUAL`.

Optional explicit action:
- `GANTI DENGAN RENCANA BARU`.

Never default to overwrite user edit.

## 13. User-edit conflict controls

Per conflict:
- Keep Manual — default;
- Apply New Plan — explicit;
- Skip Scene.

Bulk actions yang aman:
- `Pertahankan Semua Edit Manual`.

Bulk `Overwrite All` tidak ada pada MVP.

## 14. Empty/error states

### No Premiere project

```text
Tidak ada project Premiere aktif.
Buka atau buat project terlebih dahulu.
```

### DOCX parse fail

Jangan tampilkan stack trace utama.

```text
Scene DOCX tidak dapat dibaca.
DOCX_ZIP_INVALID
[Lihat detail]
```

### Missing assets

Tampilkan jumlah dan IDs, bukan hanya "asset missing".

### Runtime host mismatch

Tampilkan host version + minimum requirement.

## 15. Diagnostics area

Collapsed by default.

Berisi:
- Premiere version;
- UXP version;
- plugin version;
- project GUID;
- sequence GUID;
- capability registry;
- latest run ID;
- plan hash;
- state schema version;
- structured log;
- export report button.

Stack trace hanya di Diagnostics.

## 16. Layout/panel behavior

Panel harus usable saat docked sempit.

Prioritas responsive:
- satu kolom pada lebar kecil;
- path text truncate/ellipsis;
- actions tetap terlihat;
- Plan Preview berubah menjadi stacked cards jika tabel tidak muat;
- tidak memaksa lebar timeline Premiere mengecil berlebihan.

Minimum production width mengikuti hasil P0/P8 host test, bukan angka arbitrer dari browser.

## 17. Language

MVP UI: Bahasa Indonesia.

Internal error codes tetap English/stable:
- `ASSET_MISSING`;
- `DOCX_ZIP_INVALID`;
- `USER_EDIT_CONFLICT`.

Pesan user-facing diterjemahkan/ditulis natural Indonesia.

## 18. State machine

```text
EMPTY
  ↓ input complete
INPUT_READY
  ↓ analyze
ANALYZING
  ├─ BLOCKED
  └─ PLAN_READY
        ↓ generate/update
GENERATING
        ↓
VERIFYING
  ├─ FAILED
  ├─ CONFLICT
  └─ COMPLETE
```

UI action harus mengikuti state machine, bukan sekadar enable/disable berdasarkan DOM element lokal.

## 19. Destructive-operation rules

- invalid input: zero mutation;
- rerun conflict: zero overwrite sampai resolved;
- DELETE orphan: tidak otomatis pada MVP;
- user edit: protected default;
- Generate harus menghasilkan transaction/readback receipt;
- bila host operation gagal parsial, Result screen harus menyatakan partial/failed state dengan jelas.

## 20. MVP UI acceptance

P8 UI dianggap lulus bila:
- input required jelas;
- Analyze menghasilkan validation summary;
- BLOCKER benar-benar mematikan Generate;
- Plan Preview dapat menampilkan 10 dan 100 scene tanpa menjadi unusable;
- Generate progress menunjukkan stage + scene count;
- Result membuka sequence hasil;
- rerun diff terlihat;
- manual edit conflict tidak overwrite secara default;
- Diagnostics dapat diexport;
- panel usable docked di Premiere;
- semua fungsi utama dapat dipakai tanpa AI.

## 21. Current status

Dokumen ini belum memberikan izin membuat production UI source.

Urutan tetap:

`Foundation real-host report → evidence review → GO_APPROVED → P0 dependency/bundle proof → P1..P7 core → P8 production UI.`

## 22. Adobe UI notes yang menjadi dasar

Premiere UXP menyediakan standard HTML, built-in Spectrum UXP widgets, dan Spectrum Web Components. Built-in widgets dapat digunakan tanpa install/import library tambahan. SWC menyediakan component set lebih luas dan direkomendasikan Adobe untuk plugin ship-ready, tetapi membawa dependency/build step tambahan. Karena itu AAVC memilih built-in widgets untuk P0/minimal shell dan mengevaluasi SWC di P8 setelah core stabil.
