# UXP Foundation — Batch A + B (S01–S06)

Folder ini adalah plugin UXP diagnostic untuk membuktikan fondasi sebelum engine composer production dibuat.

## Baseline
- Adobe Premiere Pro 25.6.0 atau lebih baru.
- UXP Developer Tool (UDT) 2.2 atau lebih baru.
- Manifest v5.
- Windows 11 sebagai environment development pertama.

## Kenapa JavaScript murni dulu?
Foundation sengaja belum memakai bundler atau TypeScript. Tujuannya memperkecil permukaan error saat membuktikan manifest, lifecycle, host/version API, filesystem, Project DOM, import media, dan sequence creation. Setelah spike P0 terverifikasi, kode dapat direfactor ke TypeScript production.

## Cara load di UXP Developer Tool
1. Buka Adobe Premiere Pro.
2. Aktifkan Developer Mode bila belum aktif.
3. Buka UXP Developer Tool.
4. Add Plugin.
5. Pilih file `uxp/manifest.json` dari clone repo ini.
6. Klik Load.
7. Di Premiere buka `Window > UXP Plugins > AI Automatic Video Composer`.
8. Panel diagnostics harus tampil.

## Gunakan PROJECT TEST
S01–S04 aman/read-only kecuali state plugin S03.

**S05 dan S06 memodifikasi project Premiere. Jangan gunakan project produksi untuk spike ini.**

---

## Batch A

### S01 — Plugin Boot & Panel
1. Klik `Run S01`.
2. Reload plugin dari UDT 10 kali.
3. Buka/tutup panel beberapa kali.
4. Restart Premiere dan load ulang.
5. Pastikan tidak ada manifest/runtime error.

### S02 — Host & Version Gate
1. Klik `Run S02`.
2. Pastikan Host adalah Premiere.
3. Pastikan Premiere >= 25.6.0.
4. Catat UXP version, OS, architecture, dan locale.

### S03 — Filesystem Access
1. Klik `Pilih PNG`.
2. Klik `Pilih Folder Aset` dan pilih folder berisi minimal `A001.png` dan `A002.png`.
3. Pastikan canonical asset terdeteksi.
4. Klik `Tulis State Test` lalu `Baca State Test`.
5. Restart/reload dan baca state lagi untuk persistence proof.
6. Klik `Run S03 Summary`.

---

## Batch B

### S04 — Active Project
1. Buka project TEST di Premiere.
2. Klik `Run S04`.
3. Pastikan project name/GUID/path muncul.
4. Pastikan root, insertion bin, sequence count, active sequence dan root child count masuk akal.
5. S04 tetap harus aman jika project belum mempunyai active sequence.

### S05 — Bin + Import Axxx
**Probe ini memodifikasi project.**

1. Jalankan S03 folder picker lebih dulu.
2. Pastikan minimal dua canonical asset tersedia.
3. Klik `Run S05 · Import Probe`.
4. Plugin membuat/memakai bin `AAVC_GENERATED`.
5. Plugin mengimport dua aset pertama dua kali untuk mengamati duplicate behavior Premiere.
6. Lihat JSON hasil:
   - `matchingClipsBefore`
   - `matchingClipsAfterFirst`
   - `matchingClipsAfterSecond`
   - `duplicateDelta`
7. Jika `duplicateDelta > 0`, status `PASS_WITH_LIMIT` adalah hasil valid untuk spike; artinya production layer wajib mempunyai anti-duplicate binder sendiri.

Pembuatan bin memakai Action di dalam `Project.lockedAccess()` dan `Project.executeTransaction()` agar mengikuti aturan API Premiere terbaru.

### S06 — Sequence Creation
**Probe ini memodifikasi project.**

1. Jalankan S05 terlebih dahulu.
2. Pastikan sequence `AAVC_SPIKE_S06` belum ada jika ingin membuktikan creation dari nol.
3. Klik `Run S06 · Create Sequence`.
4. Plugin memakai `Project.createSequenceFromMedia()` karena tersedia sejak Premiere 25.6.
5. Pastikan sequence muncul dan dapat dibuka.
6. Pastikan panel menampilkan jumlah V/A track, frame size, timebase, dan end time.
7. Lihat timeline secara manual dan konfirmasi dua media hasil S05 ikut membentuk sequence.
8. Jika sequence sudah ada dari percobaan sebelumnya, probe memakai readback/reuse dan memberi `PASS_WITH_LIMIT`; hapus sequence test untuk re-prove creation.

`createSequenceWithPresetPath()` sengaja bukan dependency MVP karena baru tersedia mulai Premiere 26.3.

---

## Kriteria status
- `PASS`: probe runtime berhasil sesuai kriteria yang dapat diverifikasi panel.
- `PASS_WITH_LIMIT`: inti berhasil tetapi ada limitation atau bukti manual yang belum lengkap.
- `FAIL`: API/runtime gagal.
- `BLOCKED_BY_VERSION`: host tidak memenuhi baseline.

## Catat hasil
Status panel bukan bukti tunggal. Isi record di:
- `docs/spike-results/S01-S03_BATCH_A.md`
- `docs/spike-results/S04-S06_BATCH_B.md`

Catat versi Premiere, UXP runtime, Windows, commit plugin, langkah manual, readback, limitation, dan keputusan arsitektur.

## Setelah S06
Jangan langsung masuk parser DOCX production. Urutan berikutnya:

**S07 Timeline Placement → S08 Timing/Duration → S09 Motion → S10 Keyframe → S11 Transaction/Undo.**

S07, S08, dan S11 adalah blocker MVP utama.
