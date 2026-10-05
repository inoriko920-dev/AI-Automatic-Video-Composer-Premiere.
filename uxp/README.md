# UXP Foundation — Batch A (S01–S03)

Folder ini adalah plugin UXP minimal untuk membuktikan fondasi sebelum engine composer production dibuat.

## Baseline
- Adobe Premiere Pro 25.6.0 atau lebih baru.
- UXP Developer Tool (UDT) 2.2 atau lebih baru.
- Manifest v5.
- Windows 11 adalah environment development pertama.

## Kenapa JavaScript murni dulu?
Batch A sengaja tidak memakai bundler atau TypeScript. Tujuannya memperkecil permukaan error saat membuktikan manifest, lifecycle, host/version API, dan filesystem permission. Setelah spike foundation terverifikasi, kode dapat direfactor ke TypeScript production.

## Cara load di UXP Developer Tool
1. Buka Adobe Premiere Pro.
2. Buka UXP Developer Tool.
3. Add Plugin.
4. Pilih file `uxp/manifest.json` dari clone repo ini.
5. Klik Load.
6. Di Premiere buka `Window > UXP Plugins > AI Automatic Video Composer`.
7. Panel diagnostics harus tampil.

## Urutan verifikasi Batch A

### S01 — Plugin Boot & Panel
1. Klik `Run S01`.
2. Pastikan status minimal `PASS` pada kondisi normal.
3. Reload plugin dari UDT 10 kali.
4. Buka/tutup panel beberapa kali.
5. Restart Premiere dan load ulang.
6. Pastikan tidak ada manifest/runtime error.

Catatan: lifecycle `hide()` tidak boleh dijadikan mekanisme cleanup kritis karena perilakunya dapat berbeda antar host/release.

### S02 — Host & Version Gate
1. Klik `Run S02`.
2. Pastikan Host adalah Premiere.
3. Pastikan Premiere >= 25.6.0.
4. Catat UXP version, OS, architecture, dan locale yang tampil.
5. Pada host terlalu lama, plugin harus memberi `BLOCKED_BY_VERSION`, bukan crash.

### S03 — Filesystem Access
1. Klik `Pilih PNG` dan pilih satu fixture PNG.
2. Klik `Pilih Folder Aset` dan pilih folder yang memiliki `A001.png`, `A002.png`, dst.
3. Pastikan jumlah file canonical terdeteksi.
4. Klik `Tulis State Test`.
5. Klik `Baca State Test` dan pastikan JSON terbaca.
6. Restart Premiere / reload plugin.
7. Klik `Baca State Test` lagi tanpa menulis ulang.
8. Jika state lama tetap terbaca, persistence restart terbukti.
9. Klik `Run S03 Summary`.

## Kriteria status
- `PASS`: probe runtime berhasil sesuai kriteria yang dapat diverifikasi oleh panel.
- `PASS_WITH_LIMIT`: probe sebagian berhasil tetapi checklist manual belum lengkap.
- `FAIL`: API/runtime gagal.
- `BLOCKED_BY_VERSION`: host tidak memenuhi baseline.

## Penting
Status panel adalah alat diagnostics, bukan bukti tunggal. Hasil final harus dicatat di `docs/spike-results/` bersama versi Premiere, versi UXP, OS, langkah manual, hasil reload/restart, dan limitation.

## Belum termasuk Batch A
- akses active project,
- import media ke Project panel,
- pembuatan sequence,
- penempatan timeline,
- duration/motion/keyframe,
- transaction/Undo,
- Gemini,
- subtitle,
- export.

Semua itu dikerjakan setelah foundation S01–S03 terverifikasi.
