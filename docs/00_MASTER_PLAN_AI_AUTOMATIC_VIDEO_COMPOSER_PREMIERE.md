# 00 MASTER PLAN — AI Automatic Video Composer - Premiere

## Status
Dokumen ini adalah acuan utama proyek. Jika implementasi menyimpang dari keputusan inti di sini, perubahan harus dicatat sebagai ADR dan tidak dilakukan diam-diam.

## 1. Visi produk
Membuat plugin Adobe Premiere Pro yang menyusun timeline video naratif/infografis secara otomatis dari input terstruktur, tetapi hasil akhirnya tetap native dan bisa diedit manual di Premiere.

Target alur:

`Scene DOCX + Folder aset Axxx + Narasi + Subtitle SRT`

→ parse scene
→ bind aset
→ tentukan layout SINGLE/DOUBLE
→ tentukan durasi
→ susun V1/V2
→ motion/keyframe
→ subtitle
→ audio
→ validasi
→ timeline Premiere siap edit
→ export Premiere/AME

## 2. Masalah yang diselesaikan
AAVC standalone sebelumnya harus membangun sendiri timeline, preview, motion, subtitle, render, recovery, dan banyak fitur yang Premiere sudah miliki. Versi Premiere memindahkan fokus produk ke bagian unik: **otak composer otomatis**, bukan membuat editor video kedua.

## 3. Hubungan dengan AAVC standalone
Repo standalone tetap menjadi referensi logika/spesifikasi, bukan dependency runtime.

Logika yang dapat diterjemahkan ulang:
- Scene DOCX parser.
- Canonical asset binder `A001.png`, `A002.png`, dst.
- SINGLE/DOUBLE layout rules.
- Project state.
- Animation registry dan randomizer.
- Subtitle style/animation concepts.
- Validation center.
- Gemini/provider boundary.

Yang tidak dibawa 1:1:
- Python/PySide6 sebagai runtime utama.
- FFmpeg sebagai timeline/render utama.
- UI editor mandiri.

## 4. Baseline teknis
- Premiere Pro 25.6+.
- UXP Developer Tool 2.2+.
- Manifest v5.
- TypeScript/JavaScript + HTML/CSS/Spectrum UXP.
- Windows 11 sebagai platform development pertama.
- Premiere DOM API untuk project/sequence/track/clip/effect.
- Premiere/Adobe Media Encoder untuk export.

Fitur yang hanya tersedia pada 26.x/27.x harus di-version-gate dan tidak boleh diam-diam menjadi dependency MVP 25.6.

## 5. Prinsip arsitektur
1. Plugin UXP adalah controller utama.
2. Premiere adalah timeline/playback/render environment utama.
3. AI tidak boleh menjadi dependency untuk composer deterministic dasar.
4. Semua input harus divalidasi sebelum timeline dimutasi.
5. Operasi mutasi harus undoable bila API mendukung Action/Transaction.
6. Rerun tidak boleh merusak edit manual user.
7. Plugin harus memiliki ownership yang jelas atas bin/track/marker/state yang dibuat.
8. Adapter Premiere dipisahkan dari business logic scene.
9. API yang belum dibuktikan pada host nyata masuk spike, bukan diasumsikan tersedia.
10. External companion process/Hybrid UXP hanya dipertimbangkan jika UXP murni benar-benar terbukti menjadi blocker.

## 6. Model data inti
Entitas minimum:
- `ProjectState`
- `Scene`
- `SceneAssetRef`
- `AssetBinding`
- `LayoutSpec`
- `TimingSpec`
- `AnimationSpec`
- `SubtitleSpec`
- `AudioSpec`
- `ComposerRun`
- `GeneratedItemIdentity`
- `ValidationIssue`

Setiap scene harus memiliki ID stabil yang tidak bergantung pada index track Premiere.

## 7. Kontrak input
### Scene DOCX
Parser harus menghasilkan struktur scene deterministik. Format yang belum dikenali harus menghasilkan validation error, bukan tebakan diam-diam.

### Asset folder
Canonical naming utama:
- `A001.png`
- `A002.png`
- `A003.png`
- dst.

Binder harus mendeteksi:
- missing asset,
- duplicate asset ID,
- format tidak didukung,
- file corrupt/tidak terbaca,
- asset tidak terpakai.

### Narasi
Narasi masuk ke audio track milik plugin, dengan mapping terhadap timeline scene bila timing sudah tersedia.

### Subtitle
Dua arah produk:
1. Native/simple caption mode.
2. Animated graphic/MOGRT mode untuk style yang lebih mirip CapCut/Canva.

Animated subtitle bukan blocker MVP composer visual.

## 8. Struktur timeline target
Konsep awal:
- V1 — visual utama.
- V2 — visual kedua/overlay untuk DOUBLE.
- V3 atau graphics layer — subtitle/graphic bila dibutuhkan.
- A1 — narasi.
- A2 — musik/SFX opsional.

Track index bukan identitas permanen. Plugin harus memakai kombinasi ownership, naming, marker/property/state untuk mengenali hasil generate.

## 9. Layout
### SINGLE
Satu aset menjadi fokus utama scene.

### DOUBLE
Dua aset ditempatkan sesuai layout contract yang ditentukan composer.

Implementasi sebaiknya menggunakan parameter native Premiere seperti Position/Scale/Opacity dan bukan merender gambar gabungan terlebih dahulu, agar hasil tetap editable.

## 10. Timing
Timeline harus menggunakan satu utilitas konversi waktu yang konsisten.

Aturan:
- duration scene deterministic,
- rounding maksimal satu frame,
- start/end/in/out diverifikasi kembali dari Premiere DOM,
- jangan hanya percaya return value API.

## 11. Motion dan animation registry
Animation registry menjadi lapisan business logic yang memetakan nama preset ke operasi native Premiere.

Contoh kategori:
- static,
- zoom in/out,
- pan,
- slide,
- fade,
- combined motion.

Registry harus capability-aware: bila parameter tertentu tidak keyframeable pada host/version tertentu, preset tersebut harus di-disable/fallback.

## 12. Random animation
Randomizer wajib deterministic melalui seed.

Harus mendukung:
- seed,
- cooldown/repetition control,
- locked animation,
- capability filtering,
- reproducible rerun.

## 13. Subtitle
Mode MVP tidak boleh tergantung pada animasi subtitle kompleks.

Arah:
- Caption Mode untuk stabilitas.
- Animated Graphic Mode untuk preset Pop/Fade/Slide/Highlight setelah feasibility terbukti.

## 14. Gemini / AI provider
AI ditempatkan di boundary terpisah.

AI dapat membantu:
- intent scene,
- pemilihan layout,
- rekomendasi motion,
- metadata,
- keputusan kreatif tambahan.

AI tidak boleh dibutuhkan untuk:
- membaca project,
- binding Axxx,
- menyusun timeline dasar,
- membuka project hasil generate.

API key tidak boleh masuk repo/log.

## 15. Validation Center
Sebelum generate, plugin minimal harus memeriksa:
- project aktif,
- Scene DOCX valid,
- folder aset valid,
- seluruh asset wajib tersedia,
- sequence target tersedia/dapat dibuat,
- track capability,
- timing valid,
- version/capability gate,
- permission filesystem/network bila diperlukan.

Validation issue harus mempunyai severity dan kode yang jelas.

## 16. Rerun / idempotency
Ini requirement inti.

Plugin harus dapat membedakan:
- item yang dibuat plugin,
- item yang sudah diedit user,
- item baru yang perlu ditambahkan,
- item generated yang aman di-update.

Strategi identitas dapat menggunakan kombinasi:
- dedicated bin,
- naming prefix,
- sequence markers,
- Project/Sequence Properties bila cocok,
- state JSON persisten.

Jangan memakai track index saja.

## 17. Undo dan transaction
Semua operasi besar harus dibagi dalam transaction boundary yang dapat dipahami user.

Target ideal:
- satu generate batch = satu atau beberapa Undo logis,
- tidak membuat stale Action,
- Action dibuat dalam `project.lockedAccess` bila diwajibkan API,
- commit melalui `project.executeTransaction`.

## 18. Export
Jalur utama:
- Premiere native export,
- Adobe Media Encoder queue.

Auto-export adalah fitur pendukung. Jika export otomatis gagal tetapi sequence valid, composer tetap dianggap berhasil dan user dapat export manual.

## 19. UI target
Panel sederhana dan fokus workflow, bukan membuat editor video kedua.

Konsep:
- Scene DOCX [Pilih]
- Folder Aset [Pilih]
- Narasi [Pilih]
- Subtitle [Pilih]
- Gemini [status]
- Random Motion [toggle]
- Subtitle [toggle]
- ANALISIS PROJECT
- BUAT TIMELINE OTOMATIS
- Validation/Status/Log

## 20. Struktur repo target
```text
/
├─ manifest.json
├─ index.html
├─ src/
│  ├─ application/
│  ├─ domain/
│  ├─ importing/
│  ├─ composer/
│  ├─ animation/
│  ├─ subtitles/
│  ├─ providers/
│  ├─ platform/premiere/
│  ├─ presentation/
│  └─ logging/
├─ tests/
├─ fixtures/
├─ docs/
│  ├─ adr/
│  └─ spike-results/
└─ scripts/
```

Struktur final boleh berubah setelah Tahap 01 membuktikan pola UXP yang paling aman.

## 21. Roadmap 00–15
### Tahap 00 — Master Plan
Kunci visi, scope, prinsip, architecture direction, contracts, dan roadmap.

### Tahap 01 — UXP Foundation & API Spike
Buktikan plugin boot, filesystem, project, import, sequence, timeline placement, timing, motion, keyframe, transaction/undo, identity/rerun, network, export, graphics feasibility, packaging.

### Tahap 02 — Core Architecture
Bangun production boundaries berdasarkan API yang sudah lulus spike.

### Tahap 03 — Scene DOCX Parser
Implementasi parser + fixtures + validation.

### Tahap 04 — Asset Discovery & Binder
Canonical Axxx discovery, duplicate/missing handling, Premiere project item mapping.

### Tahap 05 — Composer MVP
DOCX → Axxx → sequence → V1/V2 → duration.

### Tahap 06 — Layout Engine
SINGLE/DOUBLE placement dan transform native.

### Tahap 07 — Motion Engine
Animation registry + deterministic randomizer + keyframes.

### Tahap 08 — Narration & Audio
Import, track placement, duration/sync behavior.

### Tahap 09 — Subtitle Basic
Caption/simple subtitle path.

### Tahap 10 — Animated Subtitle / Graphics
MOGRT/graphics path jika spike membuktikan feasible.

### Tahap 11 — Gemini / AI Director
Provider boundary, intent/recommendation, fallback local.

### Tahap 12 — Validation & Rerun Safety
Full validation center, idempotency, conflict detection.

### Tahap 13 — Export Automation
Premiere/AME presets, progress/error handling.

### Tahap 14 — QA & Performance
3/10/100 scene suites, large asset folders, failure recovery, regression.

### Tahap 15 — Packaging & Release
CCX packaging, versioning, install/update guide, release checklist.

## 22. Acceptance target MVP
MVP pertama dinyatakan berhasil bila:
1. User memilih Scene DOCX.
2. User memilih folder Axxx.
3. Plugin memvalidasi input.
4. Plugin mengimpor asset yang diperlukan.
5. Plugin membuat/memilih sequence.
6. Scene disusun berurutan.
7. SINGLE/DOUBLE masuk ke V1/V2 dengan benar.
8. Durasi sesuai kontrak dalam toleransi maksimal 1 frame.
9. Hasil tetap editable di Premiere.
10. Kegagalan tidak merusak project secara diam-diam.
11. Operasi dapat di-Undo sesuai desain transaction.
12. Rerun tidak menduplikasi timeline secara tak terkendali.

## 23. Test strategy
Minimal test set:
- 3 scene — smoke.
- 10 scene — normal regression.
- 100 scene — scale/performance.

Edge cases:
- missing Axxx,
- duplicate ID,
- unsupported format,
- empty DOCX,
- malformed scene,
- no active project,
- no sequence,
- unsupported host version,
- offline AI provider,
- export/AME unavailable,
- rerun setelah edit manual.

## 24. Gate utama sebelum production parser/composer
Tahap 02+ tidak boleh dimulai sebelum P0 Tahap 01 terbukti, terutama:
- S07 Timeline Placement,
- S08 Timing & Duration,
- S11 Transaction & Undo.

Jika salah satu FAIL tanpa fallback yang layak, selesaikan keputusan arsitektur terlebih dahulu.

## 25. Pembagian ASTRA dan SOL
**ASTRA**
- planning,
- issue breakdown,
- membaca hasil spike,
- acceptance criteria,
- ADR,
- menjaga scope.

**SOL**
- implementation,
- test/probe,
- logging,
- cleanup eksperimen,
- tidak membawa API yang belum terbukti ke production adapter.

## 26. Keputusan produk utama
Produk ini bukan pengganti Premiere.

Produk ini adalah **automatic scene-based composer yang menggunakan Premiere sebagai editor/timeline/render host**.
