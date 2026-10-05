# UXP Foundation — Batch A + B + C (S01–S08)

Folder ini adalah plugin UXP diagnostic untuk membuktikan fondasi sebelum engine composer production dibuat.

## Baseline
- Adobe Premiere Pro 25.6.0 atau lebih baru.
- UXP Developer Tool (UDT) 2.2 atau lebih baru.
- Manifest v5.
- Windows 11 sebagai environment development pertama.

## Kenapa JavaScript murni dulu?
Foundation sengaja belum memakai bundler atau TypeScript. Tujuannya memperkecil permukaan error saat membuktikan manifest, lifecycle, host/version API, filesystem, Project DOM, import media, sequence creation, timeline placement, dan timing. Setelah spike P0 terverifikasi, kode dapat direfactor ke TypeScript production.

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

**S05–S08 memodifikasi project Premiere. Jangan gunakan project produksi untuk spike ini.**

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

### S05 — Bin + Import Axxx
1. Jalankan S03 folder picker lebih dulu.
2. Pastikan minimal dua canonical asset tersedia.
3. Klik `Run S05 · Import Probe`.
4. Plugin membuat/memakai bin `AAVC_GENERATED`.
5. Plugin mengimport dua aset pertama dua kali untuk mengamati duplicate behavior.
6. Jika `duplicateDelta > 0`, `PASS_WITH_LIMIT` valid; production binder wajib mempunyai anti-duplikasi sendiri.

### S06 — Sequence Creation
1. Jalankan S05 terlebih dahulu.
2. Klik `Run S06 · Create Sequence`.
3. Plugin memakai `Project.createSequenceFromMedia()`.
4. Pastikan `AAVC_SPIKE_S06` muncul dan metadata sequence terbaca.

---

## Batch C

### S07 — Timeline Placement V1/V2
**Blocker MVP.**

1. Pastikan S05 sudah berhasil dan bin `AAVC_GENERATED` memiliki A001/A002.
2. Klik `Run S07 · Place A001/A002`.
3. Plugin membuat/memakai sequence `AAVC_SPIKE_S07_S08`.
4. A001 harus berada di **V1 @ 0.000 s**.
5. A002 harus berada di **V2 @ 1.000 s**.
6. Plugin memakai `SequenceEditor.createInsertProjectItemAction()` untuk A002.
7. Hasil dibaca kembali dari DOM melalui `VideoTrack.getTrackItems()` + TrackItem timing.
8. Bila placement lama sudah benar dari run sebelumnya, probe tidak menduplikasi A002 dan dapat memberi `PASS_WITH_LIMIT`.

Untuk pembuktian creation dari nol lagi, hapus sequence `AAVC_SPIKE_S07_S08` pada project TEST lalu jalankan ulang.

### S08 — Timing & Duration
**Blocker MVP.**

1. Jalankan S07 terlebih dahulu.
2. Klik `Run S08 · Set 3s / 5s`.
3. Target A001: start 0 s, end 3 s, duration 3 s.
4. Target A002: start 1 s, end 6 s, duration 5 s.
5. Dua `createSetEndAction()` dijalankan dalam satu transaction.
6. Panel membaca kembali start/end/duration dari Premiere DOM.
7. PASS hanya jika semua nilai berada dalam toleransi maksimum **1 frame**.
8. Toleransi frame baseline dihitung dari `Sequence.getTimebase()`; host lebih baru dapat memakai frame-rate API tambahan sebagai fallback.

---

## Kriteria status
- `PASS`: probe runtime berhasil sesuai kriteria panel/readback.
- `PASS_WITH_LIMIT`: inti berhasil tetapi ada limitation, rerun reuse, atau bukti manual yang belum lengkap.
- `FAIL`: API/runtime gagal atau readback tidak sesuai target.
- `BLOCKED_BY_VERSION`: host tidak memenuhi baseline.

## Catat hasil
Status panel bukan bukti tunggal. Isi record di:
- `docs/spike-results/S01-S03_BATCH_A.md`
- `docs/spike-results/S04-S06_BATCH_B.md`
- `docs/spike-results/S07-S08_BATCH_C.md`

Catat versi Premiere, UXP runtime, Windows, commit plugin, readback, limitation, dan keputusan arsitektur.

## Setelah S08
Jika S07 dan S08 terbukti PASS di Premiere nyata, lanjutkan:

**S09 Motion Parameter Discovery → S10 Keyframe Animation → S11 Transaction/Undo.**

S11 tetap blocker utama sebelum composer production dibuat.
