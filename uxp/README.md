# UXP Foundation — Batch A + B + C + D (S01–S11)

Folder ini adalah plugin UXP diagnostic untuk membuktikan fondasi sebelum engine composer production dibuat.

## Baseline
- Adobe Premiere Pro 25.6.0 atau lebih baru.
- UXP Developer Tool (UDT) 2.2 atau lebih baru.
- Manifest v5.
- Windows 11 sebagai environment development pertama.

## Kenapa JavaScript murni dulu?
Foundation sengaja belum memakai bundler atau TypeScript. Tujuannya memperkecil permukaan error saat membuktikan manifest, lifecycle, host/version API, filesystem, Project DOM, import media, sequence creation, timeline placement, timing, motion, keyframe, dan transaction/Undo. Setelah spike P0 terverifikasi, kode dapat direfactor ke TypeScript production.

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

**S05–S11 dapat memodifikasi project Premiere. Jangan gunakan project produksi.**

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
7. Hasil dibaca kembali dari DOM.
8. Bila placement lama sudah benar dari run sebelumnya, probe tidak menduplikasi A002 dan dapat memberi `PASS_WITH_LIMIT`.

### S08 — Timing & Duration
**Blocker MVP.**

1. Jalankan S07 terlebih dahulu.
2. Klik `Run S08 · Set 3s / 5s`.
3. Target A001: start 0 s, end 3 s, duration 3 s.
4. Target A002: start 1 s, end 6 s, duration 5 s.
5. Dua `createSetEndAction()` dijalankan dalam satu transaction.
6. PASS hanya jika semua nilai berada dalam toleransi maksimum **1 frame**.

---

## Batch D

### S09 — Motion Parameter Discovery
1. Jalankan S07/S08 sampai fixture sequence siap.
2. Klik `Run S09 · Discover Motion`.
3. Plugin membaca seluruh VideoComponentChain A001.
4. Panel mencatat component displayName, internal matchName, param displayName, value type, keyframe support, dan time-varying state.
5. Plugin mencari evidence Motion/Position/Scale/Opacity tanpa menganggap satu English display name sebagai satu-satunya kunci.
6. Satu numeric motion candidate yang aman diubah sedikit, dibaca kembali, lalu direstore.
7. Baca JSON inventory dan catat matchName/param host nyata di `docs/spike-results/S09-S11_BATCH_D.md`.

`PASS_WITH_LIMIT` masih masuk akal bila static mutation berhasil tetapi semantic mapping host/locale belum cukup kuat.

### S10 — Native Keyframe Animation
1. Jalankan S09 lebih dulu.
2. Klik `Run S10 · Add 2 Keyframes`.
3. Plugin mengaktifkan time-varying pada numeric motion candidate.
4. Plugin meminta keyframe:
   - 0 s = value awal,
   - 2 s = value awal + delta.
5. Plugin mencoba LINEAR interpolation.
6. PASS **hanya** jika `getKeyframeListAsTickTimes()` benar-benar berisi 0 s dan 2 s serta `getValueAtTime()` cocok.

Penting: ada laporan issue terbuka di sampel Adobe pada 2026 bahwa keyframe Action dapat terlihat sukses tetapi keyframe tidak benar-benar muncul. Karena itu transaction success tidak cukup. Bila DOM readback gagal, S10 harus FAIL dan motion native jangan dipromosikan ke engine production.

### S11 — Transaction & One Undo
**Blocker MVP.**

1. Pastikan A001/A002 masih berada pada sequence fixture.
2. Klik `Run S11 · Mutate 2 Values`.
3. Plugin mengambil baseline timing kedua clip.
4. Dua `createSetEndAction()` dimasukkan ke **satu** `Project.executeTransaction()` dengan undo string tunggal.
5. Panel harus membuktikan kedua nilai berubah.
6. **Jangan lakukan edit apa pun setelah ini.**
7. Tekan **Ctrl+Z SEKALI** di Premiere.
8. Klik `Verify S11 Undo`.
9. PASS hanya jika A001 dan A002 sekaligus kembali ke baseline.

Undo sengaja diverifikasi melalui UI Premiere nyata, bukan command host yang tidak terdokumentasi untuk probe ini.

---

## Kriteria status
- `PASS`: probe runtime berhasil sesuai kriteria panel/readback.
- `PASS_WITH_LIMIT`: inti berhasil tetapi ada limitation, rerun reuse, atau bukti manual yang belum lengkap.
- `FAIL`: API/runtime gagal atau readback tidak sesuai target.
- `BLOCKED_BY_VERSION`: host tidak memenuhi baseline.

## Catat hasil
Isi record:
- `docs/spike-results/S01-S03_BATCH_A.md`
- `docs/spike-results/S04-S06_BATCH_B.md`
- `docs/spike-results/S07-S08_BATCH_C.md`
- `docs/spike-results/S09-S11_BATCH_D.md`

Catat versi Premiere, UXP runtime, Windows, commit plugin, readback, limitation, dan keputusan arsitektur.

## Setelah S11
Jika blocker S07/S08/S11 terbukti PASS, lanjutkan:

**S12 Identity / Rerun Safety → S13 Network Permission → S14 Encoder Export → S15 MOGRT/Graphics → S16 Packaging CCX.**

Jika S10 gagal karena bug keyframe host tetapi S07/S08/S11 stabil, MVP composer dapat dilanjutkan tanpa motion native sementara dan motion dibuat capability-gated.