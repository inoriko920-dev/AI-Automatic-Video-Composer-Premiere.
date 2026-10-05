# 05 — Stage 02 Dependency Feasibility Matrix

Status: **DESIGN / PRE-GATE — NO PRODUCTION SOURCE YET**

Tujuan dokumen ini adalah mengunci dependency candidate sebelum Batch P0 production dimulai, tanpa melewati `docs/foundation-gate.json`.

## 1. Prinsip dependency

1. Runtime plugin harus sesedikit mungkin dependency.
2. Dependency yang menyentuh Node native addon, child process, binary binding, atau asumsi browser penuh tidak dipakai di core.
3. Semua dependency production harus dapat dibundle lokal; tidak ada CDN runtime.
4. Adobe/Premiere/UXP modules tetap external pada bundler dan dipanggil melalui runtime `require()`.
5. Domain/parser/binder harus dapat dites di Node tanpa Premiere.
6. Host adapter adalah satu-satunya lapisan yang boleh mengetahui `premierepro`/`uxp`.
7. Dependency final baru dianggap APPROVED setelah build/load proof di Premiere nyata setelah Foundation Gate GO.

## 2. Fakta platform yang sudah diverifikasi

Premiere UXP saat ini mendukung:
- CommonJS module organization dengan `require()` / `module.exports`;
- filesystem melalui `require("uxp").storage.localFileSystem` dan Node-style `require("fs")` dalam sandbox/permission model UXP;
- npm/tooling eksternal selama build development;
- TypeScript typings resmi melalui `@adobe/premierepro`;
- framework UI bersifat opsional;
- packaging resmi melalui UXP Developer Tool menjadi `.ccx`.

Implikasi arsitektur: source TypeScript boleh memakai bundler, tetapi output plugin harus tetap kompatibel dengan runtime UXP dan tidak menganggap runtime Node penuh.

## 3. Matrix keputusan

| Area | Candidate | Status | Alasan | Risiko / proof wajib |
|---|---|---|---|---|
| Language | TypeScript strict | RECOMMENDED | kontrak domain/state kuat, API typings resmi tersedia | compile target harus sesuai UXP |
| Premiere typings | `@adobe/premierepro` | RECOMMENDED DEV-ONLY | typings resmi Premiere | jangan bundle package ini ke runtime |
| Module runtime | CommonJS-compatible bundle | REQUIRED | UXP mendukung `require()` | externals `premierepro`, `uxp`, `fs`, `os` |
| Bundler | Rollup | RECOMMENDED CANDIDATE | kontrol output/externals/tree-shaking jelas | P0 wajib load hasil bundle di UDT |
| Bundler alt | esbuild | ALTERNATIVE | sederhana/cepat | hanya dipilih bila output UXP lebih bersih |
| UI framework | Vanilla HTML/CSS + Spectrum UXP widgets | RECOMMENDED MVP | dependency kecil, debugging mudah | hindari framework sebelum kebutuhan nyata |
| React/Vue/Svelte | — | DEFER | tidak dibutuhkan untuk MVP composer | tambah build/runtime surface |
| ZIP DOCX | `fflate` | RECOMMENDED CANDIDATE | pure JavaScript, browser + Node compatible, dapat unzip `Uint8Array` | P0/P2 wajib proof DOCX fixture di UXP |
| XML DOCX | `fast-xml-parser` | RECOMMENDED CANDIDATE | pure JS, CommonJS/ESM/browser compatible | konfigurasi namespace/order harus diuji fixture |
| High-level DOCX lib | Mammoth/Docxtemplater-style stack | NOT MVP | fitur jauh lebih besar dari kebutuhan parser scene | dependency/transform semantics tidak diperlukan |
| Runtime schema lib | none initially | RECOMMENDED | validator domain eksplisit lebih kecil/deterministik | evaluasi lagi bila state schema membesar |
| Unit test runner | Node built-in `node:test` or minimal runner | RECOMMENDED | no browser/Premiere dependency untuk domain tests | host tests tetap perlu Premiere nyata |
| Network client | built-in `fetch` | RECOMMENDED OPTIONAL | tidak perlu axios di core | AI/provider layer saja |
| State storage | UXP plugin-data + Project/Sequence Properties | REQUIRED DESIGN | persistence + identity | mengikuti hasil S12 real-host |
| User input file | `localFileSystem` picker/Entry | REQUIRED | sandbox-safe dan user-authorized | token/path persistence harus dikontrol |
| Render/export | Premiere/AME API | REQUIRED | jangan bawa FFmpeg ke core plugin | mengikuti S14 limitation |
| Native companion | Hybrid UXP/C++ | DEFER / LAST RESORT | kompleksitas tinggi | hanya jika pure UXP blocker terbukti |

## 4. DOCX parsing production path

`.docx` diperlakukan sebagai ZIP Open XML, bukan dokumen HTML.

Pipeline candidate:

1. user memilih Scene DOCX melalui UXP picker;
2. adapter membaca bytes sebagai `ArrayBuffer` / `Uint8Array`;
3. `fflate` membuka ZIP;
4. parser mengambil minimum `word/document.xml`;
5. bila format scene membutuhkan metadata tambahan, baca hanya file Open XML yang relevan seperti relations/styles;
6. `fast-xml-parser` mengubah XML menjadi representation yang mempertahankan urutan node yang dibutuhkan;
7. `DocxSceneParser` domain adapter mengekstrak paragraph/run/text;
8. normalizer menerapkan grammar `05_SCENE_DOCX_INPUT_CONTRACT.md`;
9. hasil akhir adalah domain `Scene[]`, bukan object XML mentah.

### Aturan penting

- tidak mengekstrak seluruh ZIP ke filesystem;
- filter unzip hanya entry yang dibutuhkan;
- tidak mengeksekusi macro/embedded object;
- gambar embedded di DOCX bukan asset composer otomatis kecuali kontrak masa depan menentukannya;
- parser tidak bergantung pada Premiere DOM;
- error XML/ZIP menjadi ValidationIssue stabil, bukan exception mentah ke UI.

## 5. Kenapa `fflate`

Candidate ini dipilih karena:
- pure JavaScript;
- bekerja di browser dan Node;
- menerima `Uint8Array`;
- menyediakan unzip sync/async;
- mendukung filter entry sehingga parser tidak perlu mendekompresi isi DOCX yang tidak digunakan;
- bundle surface kecil dibanding stack ZIP besar.

Untuk scene DOCX yang kecil/menengah, `unzipSync` dapat cukup sederhana. Untuk file besar, adapter harus dapat berpindah ke async unzip agar UI tidak freeze. Threshold final ditentukan dari benchmark fixture.

## 6. Kenapa `fast-xml-parser`

Candidate ini dipilih karena:
- pure JavaScript;
- CommonJS, ESM, dan browser compatible;
- tidak memerlukan native module;
- parser XML dapat dikonfigurasi untuk mempertahankan urutan node;
- cocok untuk Open XML yang perlu dibaca, bukan dimodifikasi penuh.

Konfigurasi production harus eksplisit dan dikunci test. Jangan mengandalkan default library untuk:
- namespace;
- attribute handling;
- whitespace;
- text node naming;
- ordered content.

## 7. TypeScript strategy

Setelah Foundation Gate GO:

- `strict: true`;
- target awal ES2020-compatible;
- no implicit `any` pada domain/ports;
- Premiere/UXP host objects tidak boleh bocor ke domain types;
- `@adobe/premierepro` dipakai sebagai dev dependency untuk typings;
- runtime host modules di-mark external oleh bundler.

Contoh boundary konseptual:

```text
Domain Scene/ComposerPlan
        ↓
Ports (ProjectPort, TimelinePort, FilePort)
        ↓
UXP/Premiere adapters
        ↓
require("premierepro"), require("uxp")
```

## 8. Bundler decision

Candidate utama: **Rollup**.

Alasan desain:
- mudah mengontrol entry/output;
- externals eksplisit;
- tree-shaking dependency pure JS;
- output production dapat dibuat CommonJS-compatible;
- cocok untuk satu panel plugin tanpa framework besar.

Namun keputusan final tetap memiliki proof gate sendiri di P0:

1. compile TypeScript;
2. bundle;
3. `premierepro`, `uxp`, `fs`, `os` tidak ikut dibundle;
4. plugin load di UDT;
5. S01/S02-equivalent smoke host info bekerja dari bundle;
6. packaged CCX smoke load.

Jika Rollup gagal pada requirement UXP, esbuild diuji sebagai fallback melalui ADR, bukan diganti diam-diam.

## 9. UI dependency policy

MVP tidak membutuhkan React/Vue/Svelte.

Gunakan:
- semantic HTML;
- CSS lokal;
- Spectrum UXP Widgets bila membantu consistency;
- state controller kecil sendiri.

Framework baru boleh masuk jika panel production sudah membuktikan state/UI complexity yang nyata.

## 10. Test strategy dependency

### Pure domain tests
Berjalan di Node CI:
- Scene grammar;
- DOCX XML normalization;
- Axxx binder;
- layout solver;
- time math;
- validation catalog;
- plan hash;
- three-way rerun diff.

### Adapter contract tests
Gunakan fake ports/mocks di Node. Tidak fake Premiere behavior yang belum dibuktikan.

### Real-host tests
Tetap wajib untuk:
- import media;
- sequence/track mutation;
- timing;
- keyframe;
- transaction/Undo;
- Properties identity;
- AME;
- MOGRT;
- package install.

## 11. Security / supply chain

Saat dependency benar-benar ditambahkan setelah gate:
- lockfile wajib committed;
- exact/controlled version policy;
- license dicatat;
- dependency tree diperiksa;
- tidak ada CDN runtime;
- tidak ada postinstall yang diperlukan untuk native binary;
- tidak ada secret/API key dalam bundle;
- network tetap optional provider boundary.

## 12. P0 dependency proof checklist

Setelah gate GO, sebelum fitur production lain:

- [ ] install TypeScript + Adobe typings sebagai dev dependencies;
- [ ] install Rollup candidate;
- [ ] install `fflate` + `fast-xml-parser`;
- [ ] build bundle minimal;
- [ ] static inspect bundle untuk host externals;
- [ ] load di UDT/Premiere;
- [ ] read one DOCX fixture bytes;
- [ ] extract `word/document.xml`;
- [ ] parse XML;
- [ ] return one normalized Scene tanpa Premiere dependency;
- [ ] package CCX smoke test;
- [ ] catat dependency versions + limitation dalam ADR.

## 13. Current decision

**Pre-gate recommendation:**

- TypeScript strict;
- Rollup candidate;
- Vanilla/Spectrum UI;
- `fflate` for ZIP;
- `fast-xml-parser` for XML;
- built-in fetch;
- no runtime schema framework initially;
- no hybrid/native companion;
- no FFmpeg runtime.

Status dependency ini adalah **RECOMMENDED CANDIDATE**, bukan installed production dependency. `scripts/check-stage02-gate.mjs` tetap melarang source production sebelum real-host Foundation Gate menjadi `GO_APPROVED`.

## 14. Referensi verifikasi

- Adobe Premiere UXP — JavaScript Modules.
- Adobe Premiere UXP — TypeScript Support.
- Adobe Premiere UXP — Filesystem Operations / storage APIs.
- Adobe Premiere UXP — UI tech stack / Spectrum guidance.
- Adobe Premiere UXP — Packaging CCX.
- fflate documentation — browser/Node pure-JS ZIP APIs.
- fast-xml-parser documentation — CommonJS/ESM/browser-compatible XML parser.
