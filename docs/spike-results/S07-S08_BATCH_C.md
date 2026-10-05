# Batch C — S07 Timeline Placement + S08 Timing & Duration

Status implementasi: **IMPLEMENTED / NOT VERIFIED ON REAL PREMIERE HOST**

Versi foundation: `0.0.3`

## Tujuan
Batch C membuktikan dua kemampuan blocker MVP pertama:

- **S07** — menempatkan `A001` dan `A002` pada track/waktu yang ditentukan.
- **S08** — mengatur dan membaca kembali durasi still dengan toleransi maksimum 1 frame.

Tidak boleh menandai PASS hanya karena kode berhasil lolos static check. PASS final harus berasal dari Premiere Pro nyata.

---

## Fixture wajib

Project TEST harus sudah memiliki:

- bin `AAVC_GENERATED`,
- `A001` dan `A002` hasil S05,
- Premiere Pro 25.6+,
- UXP Developer Tool 2.2+.

Jalankan S05 lebih dulu bila fixture belum ada.

---

## S07 — Timeline Placement V1/V2

### Target

- `A001` berada pada **V1**, mulai **0.000 s**.
- `A002` berada pada **V2**, mulai **1.000 s**.

### Implementasi probe

1. Cari atau buat sequence `AAVC_SPIKE_S07_S08`.
2. Jika sequence belum ada, buat dari `A001` menggunakan `Project.createSequenceFromMedia()` sehingga A001 menjadi fixture awal.
3. Gunakan `SequenceEditor.getEditor(sequence)`.
4. Buat `createInsertProjectItemAction()` untuk `A002` pada:
   - time = `TickTime.createWithSeconds(1)`
   - videoTrackIndex = `1` (V2)
   - audioTrackIndex = `0`
   - limitShift = `false`
5. Jalankan action melalui `Project.lockedAccess()` + `Project.executeTransaction()`.
6. Readback seluruh video track menggunakan `VideoTrack.getTrackItems()`.
7. Verifikasi ProjectItem, track index, start, end, dan duration dari DOM Premiere.

### PASS

- A001 ditemukan di track index 0 pada 0 detik.
- A002 ditemukan di track index 1 pada 1 detik.
- Selisih start tidak melebihi satu frame sequence.

### Rerun

Jika placement yang benar sudah ada dari run sebelumnya, probe tidak menambah A002 kedua. Status panel dapat menjadi `PASS_WITH_LIMIT` karena mutation baru tidak dilakukan. Untuk membuktikan creation dari nol lagi, hapus sequence `AAVC_SPIKE_S07_S08` pada project TEST lalu jalankan ulang.

---

## S08 — Timing & Duration

### Target

- A001: start `0 s`, end `3 s`, duration `3 s`.
- A002: start `1 s`, end `6 s`, duration `5 s`.

### Implementasi probe

1. Ambil track item A001 pada V1 dan A002 pada V2 dari sequence S07.
2. Di dalam satu locked transaction:
   - `A001.createSetEndAction(TickTime.createWithSeconds(3))`
   - `A002.createSetEndAction(TickTime.createWithSeconds(6))`
3. Readback:
   - `getStartTime()`
   - `getEndTime()`
   - `getDuration()`
4. Hitung toleransi 1 frame dari `Sequence.getTimebase()` dengan mengubah timebase ke `TickTime`.
5. Pada host lebih baru, `SequenceSettings.getVideoFrameRate()` dapat menjadi fallback tambahan, tetapi bukan dependency baseline 25.6.

### PASS

Semua enam check benar dalam toleransi <= 1 frame:

- A001 start ≈ 0 s
- A001 end ≈ 3 s
- A001 duration ≈ 3 s
- A002 start ≈ 1 s
- A002 end ≈ 6 s
- A002 duration ≈ 5 s

---

## Manual verification sheet

Isi setelah dijalankan pada PC nyata.

| Field | Result |
|---|---|
| Premiere version | NOT TESTED |
| UXP version | NOT TESTED |
| Windows version | NOT TESTED |
| Plugin version | 0.0.3 |
| S07 result | NOT VERIFIED |
| A001 actual track/start | NOT VERIFIED |
| A002 actual track/start | NOT VERIFIED |
| S08 result | NOT VERIFIED |
| A001 actual start/end/duration | NOT VERIFIED |
| A002 actual start/end/duration | NOT VERIFIED |
| Sequence timebase | NOT VERIFIED |
| 1-frame tolerance | NOT VERIFIED |
| Undo behavior | Deferred to S11 |
| Rerun behavior | NOT VERIFIED |
| Notes / limitation | NOT VERIFIED |

## Gate

Jika S07 atau S08 FAIL pada Premiere nyata dan tidak ada fallback yang deterministic, **jangan lanjut membangun composer production**. Cari penyebab/fallback dahulu. Jika keduanya PASS, berikutnya lanjut ke **S09 Motion Parameter Discovery + S10 Keyframe Animation**, lalu blocker transaksi **S11** harus dibuktikan sebelum engine production dipromosikan.
