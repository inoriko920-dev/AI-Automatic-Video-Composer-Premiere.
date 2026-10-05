# 02 — Foundation Verification Runbook (S01–S16)

Tujuan dokumen ini adalah membuat pengujian foundation **sekali jalan, berurutan, dan dapat diaudit** sebelum proyek masuk Tahap 02 production.

> Gunakan project Premiere TEST baru. Jangan gunakan project kerja/produksi.

## 1. Persiapan otomatis Windows

Dari root repo, double-click:

`scripts/windows/START_FOUNDATION_VERIFICATION.cmd`

Script akan:
1. membuat `.aavc-foundation-test/assets/A001.png`, `A002.png`, `A003.png`;
2. membuat folder `results` dan `exports`;
3. mengumpulkan informasi Windows/Premiere/UDT yang dapat dideteksi ke `windows-environment.json`;
4. menjalankan `npm run check`.

Jika langkah ini gagal, jangan lanjut test Premiere sebelum penyebabnya diperbaiki.

## 2. Persiapan Premiere

1. Buka Premiere Pro 25.6+.
2. Buat project TEST baru dan simpan, misalnya `AAVC_FOUNDATION_TEST.prproj`.
3. Buka UXP Developer Tool 2.2+.
4. Add Plugin → pilih `uxp/manifest.json`.
5. Load.
6. Premiere → Window → UXP Plugins → AI Automatic Video Composer.
7. Pastikan panel menampilkan S01–S16.

## 3. Jalankan S01–S06

### S01
- Run S01.
- Reload plugin 10 kali dari UDT.
- Buka/tutup panel.
- Tidak boleh crash/manifest error.

### S02
- Run S02.
- Host harus Premiere.
- Premiere harus >= 25.6.

### S03
- Pilih PNG: `.aavc-foundation-test/assets/A001.png`.
- Pilih Folder Aset: `.aavc-foundation-test/assets`.
- Harus menemukan minimal 3 aset canonical.
- Tulis State → Baca State → Run Summary.

### S04
- Run S04.
- Project/GUID/path/root harus terbaca.

### S05
- Run Import Probe.
- `AAVC_GENERATED` harus ada.
- A001/A002 harus terimport.
- Catat duplicate behavior.

### S06
- Run Create Sequence.
- `AAVC_SPIKE_S06` harus muncul dan metadata terbaca.

## 4. Jalankan blocker S07–S12

### S07 — BLOCKER
Target:
- A001 = V1 @ 0s
- A002 = V2 @ 1s

Readback DOM harus cocok <= 1 frame.

### S08 — BLOCKER
Target:
- A001 = 0→3s
- A002 = 1→6s

Semua start/end/duration harus cocok <= 1 frame.

### S09
- Discover Motion.
- Simpan hasil inventory parameter.
- Static mutation harus kembali ke nilai awal.

### S10 — P0
- Add 2 keyframes.
- PASS hanya jika keyframes benar-benar muncul di DOM readback.
- Jangan menerima `executeTransaction=true` sebagai bukti tunggal.

### S11 — BLOCKER
1. Run `Mutate 2 Values`.
2. **Jangan melakukan edit apa pun.**
3. Tekan Ctrl+Z **sekali** di Premiere.
4. Klik `Verify S11 Undo`.
5. Kedua nilai harus kembali ke baseline dengan satu Undo.

### S12 — BLOCKER RERUN
1. Run `Write Identity`.
2. Tutup/restart Premiere atau reload plugin.
3. Buka project TEST yang sama.
4. Klik `Verify S12 Restart`.
5. Persistent properties + GUID backup harus tetap cocok.

## 5. Jalankan S13–S16

### S13 — Network
- Run network probe.
- GET/POST harus sukses saat online.
- Uji sekali dalam kondisi network diblok/offline bila memungkinkan: error harus terkontrol, panel tidak crash.

### S14 — AME Export
1. Pilih output folder `.aavc-foundation-test/exports`.
2. Pilih preset `.epr` yang valid dari Premiere/AME.
3. Probe encoder.
4. Queue test sequence ke AME.
5. Pastikan job muncul di AME.

### S15 — MOGRT
- Probe installed MOGRT path.
- Bila punya fixture `.mogrt`, pilih lalu insert ke V3 @ 0s.
- Catat apakah track item dan parameter dapat diinspeksi.
- Tidak adanya fixture boleh menghasilkan PASS_WITH_LIMIT.

### S16 — Packaging
1. UDT → Actions (...) → Package.
2. Pastikan `.ccx` terbentuk.
3. Install melalui Creative Cloud Desktop.
4. Buka Premiere dan smoke-test S01 + S02 dari package terinstall.
5. Uji reinstall/update dengan patch version berbeda.

## 6. Export Verification Report

Setelah seluruh tes selesai:
1. pada card `Verification Report`, pilih folder `.aavc-foundation-test/results`;
2. klik `Export Full Report`;
3. pastikan file `aavc-foundation-report-*.json` terbentuk.

Simpan juga screenshot bila ada FAIL atau PASS_WITH_LIMIT.

## 7. Gate Tahap 02

**GO** ke Tahap 02 hanya jika:
- S07 PASS;
- S08 PASS;
- S11 PASS;
- S12 PASS setelah restart;
- S10 PASS, atau ada ADR eksplisit yang memilih fallback bila bug host terbukti.

S13–S16 boleh mempunyai limitation yang terdokumentasi sesuai prioritas, tetapi tidak boleh crash atau merusak project.

Jika blocker gagal, status adalah **NO-GO** dan kita memperbaiki foundation terlebih dahulu.
