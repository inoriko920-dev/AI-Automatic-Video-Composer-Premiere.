# ADR-0003 — DOCX Parser and Production Toolchain Candidates

Status: **PROPOSED — PENDING FOUNDATION GO + P0 HOST PROOF**

Date: 2026-10-06

## Context

Stage 02 membutuhkan parser Scene DOCX yang berjalan di Premiere UXP, tetapi domain parser tidak boleh bergantung pada Premiere runtime dan tidak boleh membawa dependency Node-native yang rapuh.

DOCX adalah ZIP Open XML. Kebutuhan MVP hanya membaca struktur scene terkontrol, bukan menjadi general-purpose Word renderer/editor.

## Decision candidate

Setelah Foundation Gate `GO_APPROVED`, Batch P0 akan menguji stack berikut:

- TypeScript strict untuk source production;
- `@adobe/premierepro` sebagai dev-only API typings;
- Rollup sebagai bundler candidate utama;
- host modules `premierepro`, `uxp`, `fs`, `os` sebagai external runtime modules;
- `fflate` sebagai ZIP reader candidate;
- `fast-xml-parser` sebagai XML reader candidate;
- Vanilla HTML/CSS + Spectrum UXP widgets untuk MVP UI;
- built-in `fetch` untuk provider network optional;
- no runtime schema framework pada awal project;
- no native/hybrid companion dan no FFmpeg pada core plugin.

## Why

### ZIP
`fflate` adalah pure JavaScript dan dapat bekerja pada `Uint8Array`, sehingga sesuai dengan model read-bytes → unzip-memory. Parser hanya perlu entry Open XML tertentu seperti `word/document.xml`.

### XML
`fast-xml-parser` adalah pure JavaScript dan tersedia untuk CommonJS/ESM/browser environments. Ini lebih dekat ke kebutuhan parser Open XML daripada library DOCX besar yang mengubah Word menjadi HTML atau membawa behavior tambahan.

### Toolchain
UXP mendukung modular JavaScript CommonJS. TypeScript dipakai saat development, kemudian bundle harus menghasilkan artifact yang tetap kompatibel dengan runtime UXP. Rollup dipilih sebagai candidate karena kontrol output dan externals yang eksplisit.

## Non-decision

ADR ini **belum APPROVED** untuk instalasi dependency production.

Tidak boleh:
- membuat `src/` production sebelum ADR-0001 membuka gate;
- menganggap npm package yang browser-compatible otomatis kompatibel dengan UXP;
- membundle `premierepro` atau `uxp` ke artifact;
- mengganti Rollup/fflate/fast-xml-parser diam-diam bila proof gagal.

## Required P0 proof

Setelah gate GO:

1. TypeScript compile berhasil.
2. Rollup menghasilkan bundle CommonJS-compatible.
3. Host modules tetap external.
4. Bundle load di UDT/Premiere.
5. UXP file picker membaca DOCX fixture sebagai bytes.
6. `fflate` membuka DOCX dan menemukan `word/document.xml`.
7. `fast-xml-parser` membaca XML tanpa kehilangan urutan paragraph/run yang dibutuhkan kontrak Scene.
8. Parser menghasilkan normalized Scene domain.
9. Pure parser tests tetap dapat berjalan di Node tanpa Premiere.
10. Packaged `.ccx` smoke load berhasil.

## Failure policy

Jika candidate gagal:
- simpan error/evidence;
- buat ADR baru atau revisi ADR ini;
- pilih alternative berdasarkan proof;
- jangan menambal dependency dengan hidden runtime hack.

Potential fallback:
- Rollup → esbuild bila bundler menjadi blocker;
- ZIP/XML candidate → pure-JS alternative yang mempunyai surface lebih kecil dan lolos UXP proof.

## Approval condition

Ubah status ADR ini menjadi `ACCEPTED` hanya setelah P0 dependency proof di Premiere nyata lolos dan exact versions/lockfile telah direview.
