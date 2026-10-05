# S04–S06 Batch B — Project / Import / Sequence

Status: **IMPLEMENTED — NOT YET VERIFIED IN REAL PREMIERE**

Dokumen ini mencatat implementasi probe Batch B. Jangan mengubah status menjadi PASS hanya karena static check GitHub berhasil. PASS harus berasal dari UXP Developer Tool + Premiere nyata.

## Baseline
- Premiere Pro 25.6+
- UXP Developer Tool 2.2+
- Manifest v5
- Windows 11 sebagai environment test pertama
- Plugin development build dari folder `uxp/`

## S04 — Active Project
### Implementasi
- `require("premierepro")`
- `Project.getActiveProject()`
- `project.getRootItem()`
- `project.getInsertionBin()`
- `project.getSequences()`
- `project.getActiveSequence()` sebagai informasi tambahan
- enumerate child root via `FolderItem.getItems()`

### Acceptance runtime
1. Buka project TEST di Premiere.
2. Klik `Run S04`.
3. Project name/GUID/path tampil.
4. Root item dan insertion bin terbaca.
5. Sequence count cocok dengan Project panel.
6. Tidak crash bila belum ada active sequence.

Status hasil: `NOT VERIFIED`

---

## S05 — Bin + Import Media
### Implementasi
- Memakai dua file canonical pertama dari folder S03.
- Membuat atau memakai bin `AAVC_GENERATED`.
- Pembuatan bin memakai `project.lockedAccess()` + `project.executeTransaction()` + `FolderItem.createBinAction()`.
- Import memakai `project.importFiles(paths, true, targetBin, false)`.
- Import dilakukan dua kali dalam project TEST untuk mengamati duplicate behavior host.
- Readback bin dilakukan setelah import dan item dicocokkan berdasarkan key `Axxx`.

### Acceptance runtime
1. Folder S03 mempunyai minimal `A001` + `A002`.
2. Gunakan PROJECT TEST karena probe memodifikasi project.
3. Klik `Run S05`.
4. Bin `AAVC_GENERATED` muncul/terpakai.
5. Dua aset ditemukan kembali sebagai ClipProjectItem.
6. Panel melaporkan jumlah matching item sebelum, sesudah import pertama, dan sesudah import kedua.
7. Jika second import membuat duplikat, status boleh `PASS_WITH_LIMIT`; production binder wajib mencegah duplikasi sendiri.
8. Uji Undo untuk pembuatan bin secara manual di Premiere dan catat behavior.

Status hasil: `NOT VERIFIED`

---

## S06 — Sequence Creation
### Strategi baseline
Primary spike memakai:

`Project.createSequenceFromMedia(name, clipProjectItems, targetBin)`

Alasan: tersedia sejak Premiere 25.6 dan tidak membutuhkan preset path.

`createSequenceWithPresetPath()` tidak dipakai sebagai dependency MVP karena baru tersedia mulai 26.3.

### Implementasi
- Sequence test bernama `AAVC_SPIKE_S06`.
- Mengambil dua ClipProjectItem hasil S05.
- Jika sequence belum ada: buat via `createSequenceFromMedia`.
- Jika sudah ada: readback/reuse dan status runtime `PASS_WITH_LIMIT` sampai sequence dihapus untuk re-prove creation.
- Set active/open sequence dicoba tetapi kegagalannya dicatat sebagai note, bukan otomatis membatalkan bukti creation.
- Readback: `project.getSequences()`.
- Diagnostics: video track count, audio track count, frame size, timebase, sequence end time.

### Acceptance runtime
1. Jalankan S05 terlebih dahulu.
2. Pastikan `AAVC_SPIKE_S06` belum ada untuk first proof.
3. Klik `Run S06`.
4. Sequence muncul di project/bin.
5. Sequence dapat ditemukan kembali melalui `getSequences()`.
6. Panel menampilkan jumlah video/audio track dan metadata sequence.
7. Buka timeline dan pastikan dua media sumber memang ikut membentuk sequence.
8. Catat default duration still yang dipilih Premiere; ini menjadi input penting S08.

Status hasil: `NOT VERIFIED`

---

## Hal yang sengaja belum dilakukan
- S07 placement ke V1/V2 dengan waktu eksplisit.
- S08 duration 3 s / 5 s.
- S09 Motion discovery.
- S10 keyframes.
- S11 transaction/Undo untuk batch composer.

S06 hanya membuktikan sequence dapat dibuat dengan media pada baseline. Kontrol timeline deterministik dimulai pada S07.

## Result sheet manual
Isi setelah pengujian:
- Premiere version:
- UXP version:
- Windows version:
- Commit/plugin version:
- S04: PASS / PASS_WITH_LIMIT / FAIL / BLOCKED_BY_VERSION
- S05: PASS / PASS_WITH_LIMIT / FAIL / BLOCKED_BY_VERSION
- S06: PASS / PASS_WITH_LIMIT / FAIL / BLOCKED_BY_VERSION
- Duplicate behavior S05:
- Sequence behavior S06:
- Console/log error:
- Undo notes:
- Decision/fallback:
