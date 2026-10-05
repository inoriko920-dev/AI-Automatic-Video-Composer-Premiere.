# Batch D — S09 Motion + S10 Keyframes + S11 Transaction/Undo

Status implementasi: **IMPLEMENTED / NOT VERIFIED ON REAL PREMIERE HOST**

Versi foundation: `0.0.4`

## Tujuan
Batch D menutup tiga pembuktian P0 terakhir sebelum fondasi dapat dipromosikan ke arsitektur composer production:

- **S09 — Motion Parameter Discovery**
- **S10 — Native Keyframe Animation**
- **S11 — Transaction & One Undo**

S11 adalah blocker MVP utama bersama S07 dan S08.

---

## Fixture wajib

Gunakan project TEST yang sudah mempunyai:

- bin `AAVC_GENERATED`,
- `A001` dan `A002`,
- sequence `AAVC_SPIKE_S07_S08`,
- A001 di V1 mulai 0 s,
- A002 di V2 mulai 1 s,
- hasil S08 ideal: A001 0→3 s dan A002 1→6 s.

Jalankan S07 dan S08 lebih dulu jika fixture belum siap.

---

## S09 — Motion Parameter Discovery

### Tujuan
Membuktikan plugin dapat menginspeksi fixed/intrinsic video components tanpa hard-code index buta.

### Implementasi
1. Ambil `VideoClipTrackItem` A001 dari V1.
2. `getComponentChain()`.
3. Enumerate seluruh component:
   - `getDisplayName()`
   - `getMatchName()`
   - `getParamCount()`
4. Enumerate seluruh parameter:
   - `displayName`
   - `getStartValue()`
   - `areKeyframesSupported()`
   - `isTimeVarying()`
5. Klasifikasikan value menjadi scalar, point, boolean, color, dll.
6. Cari kandidat Motion/Position/Scale/Opacity dengan prioritas:
   - component internal `matchName`,
   - value shape,
   - display name sebagai sinyal tambahan,
   - numeric value sekitar 100 sebagai salah satu heuristic Scale.
7. Pilih satu numeric motion candidate yang aman.
8. Bila bukan time-varying:
   - ubah nilainya sedikit melalui `createSetValueAction()`,
   - readback,
   - restore ke nilai awal,
   - readback lagi.

### Catatan penting
`Component` memiliki internal `matchName`, tetapi `ComponentParam` pada API saat ini hanya mengekspos `displayName`. Karena display name dapat terlokalisasi, production layer tidak boleh mengandalkan satu string Inggris untuk parameter. S09 menyimpan inventory nyata host sebagai dasar adapter/ADR.

### PASS
- component chain terbaca,
- semantic Motion/Position/Opacity dapat dikenali atau dibuktikan dengan inventory,
- numeric motion candidate dapat diubah, dibaca kembali, lalu direstore.

`PASS_WITH_LIMIT` valid bila inventory berhasil tetapi semantic mapping masih bergantung pada host/locale atau static mutation harus dilewati karena fixture sudah time-varying.

---

## S10 — Native Keyframe Animation

### Tujuan
Membuktikan keyframe bukan hanya diterima oleh Action API, tetapi benar-benar ada pada DOM Premiere.

### Implementasi
1. Gunakan numeric motion candidate dari S09 pada A001.
2. Pastikan `areKeyframesSupported() === true`.
3. Enable animation melalui `createSetTimeVaryingAction(true)`.
4. Buat dua keyframe:
   - t=0 s, value awal,
   - t=2 s, value awal + delta.
5. Tambahkan keduanya melalui `createAddKeyframeAction()`.
6. Terapkan interpolation `LINEAR` bila action didukung.
7. Verifikasi dengan:
   - `isTimeVarying()`
   - `getKeyframeListAsTickTimes()`
   - `getValueAtTime(0)`
   - `getValueAtTime(2)`

### PASS
- key list benar-benar memiliki 0 s dan 2 s,
- value readback pada kedua waktu cocok dengan request,
- parameter benar-benar time-varying.

### Known risk yang sengaja diuji
Ada issue terbuka di repo sampel Adobe, dilaporkan Februari 2026 pada Premiere Beta 26.2, di mana `createAddKeyframeAction()` terlihat sukses tetapi keyframe tidak muncul seperti yang diharapkan. Karena itu S10 **tidak** menganggap transaction success sebagai bukti. DOM readback wajib.

Jika Action sukses tetapi key list/value tidak cocok, hasil S10 adalah **FAIL**, bukan PASS.

---

## S11 — Transaction & One Undo

### Tujuan
Membuktikan dua perubahan yang dibuat plugin dalam satu `Project.executeTransaction()` dapat dibalik oleh **satu Undo**.

### Implementasi
1. Baca timing A001 dan A002 sebagai baseline.
2. Dalam satu `project.lockedAccess()`:
   - buat `A001.createSetEndAction()`,
   - buat `A002.createSetEndAction()`.
3. Masukkan kedua action ke **satu** `project.executeTransaction()` dengan undo string:
   - `AAVC S11: Two Timing Changes / One Undo`
4. Readback untuk membuktikan kedua perubahan terjadi.
5. Status sementara menjadi `PASS_WITH_LIMIT` karena bukti Undo belum dilakukan.
6. User segera menekan **Ctrl+Z satu kali** di Premiere, tanpa melakukan edit lain.
7. Klik `Verify S11 Undo`.
8. Plugin membaca ulang A001/A002 dan membandingkannya dengan baseline sebelum transaction.

### Kenapa Undo manual?
Probe sengaja memakai Undo UI Premiere yang nyata dan tidak mengandalkan host-menu command yang tidak didokumentasikan untuk plugin ini. Yang sedang dibuktikan adalah apakah satu transaction masuk ke Undo history sebagai satu unit logis.

### PASS
Setelah satu Ctrl+Z:
- A001 kembali ke state baseline,
- A002 kembali ke state baseline.

Jika hanya satu state yang kembali atau keduanya tidak kembali, S11 = FAIL.

---

## Manual verification sheet

| Field | Result |
|---|---|
| Premiere version | NOT TESTED |
| UXP version | NOT TESTED |
| Windows version | NOT TESTED |
| Plugin version | 0.0.4 |
| S09 result | NOT VERIFIED |
| Motion component matchName | NOT VERIFIED |
| Position param evidence | NOT VERIFIED |
| Scale candidate | NOT VERIFIED |
| Opacity component evidence | NOT VERIFIED |
| Static mutation/readback/restore | NOT VERIFIED |
| S10 result | NOT VERIFIED |
| Keyframe times | NOT VERIFIED |
| Value @ 0s | NOT VERIFIED |
| Value @ 2s | NOT VERIFIED |
| Interpolation | NOT VERIFIED |
| S11 transaction mutation | NOT VERIFIED |
| One Ctrl+Z restores A001 | NOT VERIFIED |
| One Ctrl+Z restores A002 | NOT VERIFIED |
| S11 final result | NOT VERIFIED |
| Notes / limitations | NOT VERIFIED |

---

## Promotion gate setelah Batch D

Fondasi belum boleh dipromosikan ke production composer hanya karena kode ada di repo.

Minimal sebelum Tahap 02 production architecture:

- S07 PASS pada Premiere nyata,
- S08 PASS pada Premiere nyata,
- S09 minimal PASS_WITH_LIMIT dengan mapping yang terdokumentasi,
- S10 PASS bila native motion animation menjadi dependency MVP,
- **S11 PASS wajib** untuk operasi composer yang aman terhadap Undo.

Jika S10 terkena bug host tetapi S07/S08/S11 lulus, composer MVP masih dapat dilanjutkan **tanpa motion animation native** sementara, lalu motion dijadikan capability-gated feature sampai keyframe path stabil.