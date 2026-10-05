# 01 UXP FOUNDATION & API SPIKE PLAN

## Tujuan
Membuktikan API Premiere UXP yang benar-benar dapat dipakai oleh AI Automatic Video Composer sebelum SOL membangun parser/composer production.

Tidak ada fitur inti yang boleh dianggap “pasti bisa” hanya karena nama API terlihat cocok di dokumentasi.

## Baseline
- Premiere Pro 25.6+.
- UXP Developer Tool 2.2+.
- Manifest v5.
- TypeScript/JavaScript + HTML/CSS/Spectrum UXP.
- Windows 11 sebagai environment development pertama.

## Aturan hasil spike
Setiap probe harus menghasilkan salah satu status:
- `PASS`
- `PASS_WITH_LIMIT`
- `FAIL`
- `BLOCKED_BY_VERSION`

Catat versi Premiere, UXP runtime, OS, commit plugin, observed behavior, readback dari DOM, hasil Undo, hasil rerun, limitation, dan keputusan implementasi.

## Definition of Done
Tahap 01 selesai hanya bila:
1. Plugin panel load/reload stabil.
2. Host/version gate bekerja.
3. File/folder lokal dapat dipilih dan dibaca.
4. Active project dapat diakses.
5. A001/A002 dapat diimport ke area project milik plugin.
6. Sequence target dapat dibuat/dipilih.
7. Minimal dua visual dapat ditempatkan pada track dan waktu tertentu.
8. Durasi still dapat diatur dan diverifikasi dari DOM.
9. Position/Scale dapat dibaca/diubah.
10. Keyframe native dapat dibuat dan dibaca kembali.
11. Mutasi dapat dibungkus transaction/Undo yang logis.
12. Hasil generated dapat dikenali ulang setelah restart/rerun.
13. Network permission/failure mode terbukti.
14. Sequence dapat diexport atau di-queue ke AME.
15. CCX development dapat dipackage dan dipasang ulang.
16. Semua probe mempunyai result sheet.

## Matriks spike
| ID | Spike | Yang dibuktikan | Prioritas |
|---|---|---|---|
| S01 | Plugin Boot & Panel | load, reload, console, lifecycle | P0 |
| S02 | Host & Version Gate | host/version/os/locale | P0 |
| S03 | Filesystem Access | picker, folder, persistent data | P0 |
| S04 | Active Project | getActiveProject, root/insertion bin | P0 |
| S05 | Bin + Import Media | importFiles, duplicate behavior | P0 |
| S06 | Sequence Creation | strategy kompatibel 25.6 | P0 |
| S07 | Timeline Placement | visual ke V1/V2 pada TickTime tertentu | P0 |
| S08 | Timing & Duration | start/end/in/out, still duration | P0 |
| S09 | Motion Parameters | Position/Scale/Opacity discovery | P0 |
| S10 | Keyframe Animation | time varying, add keyframe, interpolation | P0 |
| S11 | Transaction & Undo | lockedAccess + executeTransaction | P0 |
| S12 | Identity / Rerun Tags | marker/property/naming/state | P0 |
| S13 | Network Permission | allowlist + fetch + timeout/error | P1 |
| S14 | Encoder Export | exportSequence / queue AME | P1 |
| S15 | MOGRT / Graphics | subtitle animation feasibility | P2 |
| S16 | Packaging CCX | package, install, update smoke test | P1 |

# Detail P0

## S01 — Plugin Boot & Panel
**Tujuan:** skeleton UXP dapat dimuat stabil.

Langkah:
1. Manifest v5 dengan satu panel entrypoint.
2. Panel menampilkan plugin/build version, Run Probe, diagnostics, log.
3. Load dan reload melalui UDT minimal 10 kali.
4. Buka/tutup panel dan restart Premiere.
5. Tangkap exception global.

**PASS:** tidak ada error manifest/runtime dan reload konsisten.

## S02 — Host & Version Gate
1. Baca host name/version, UXP version, OS, architecture, locale.
2. Tampilkan pada diagnostics.
3. Terapkan minimum 25.6.
4. Fitur version-gated harus dapat disabled tanpa crash.

**PASS:** capability gate deterministik.

## S03 — Filesystem Access
1. Deklarasikan permission local filesystem yang sesuai.
2. Pilih PNG fixture.
3. Pilih folder berisi A001/A002 dan enumerate.
4. Tulis JSON kecil ke data folder UXP.
5. Restart Premiere dan baca kembali state.

**PASS:** file/folder user dapat dipilih dan state persisten bertahan.

**Catatan:** jangan desain parser DOCX production sebelum pola akses file terbukti.

## S04 — Active Project & Project Tree
1. `Project.getActiveProject()`.
2. Baca guid/name/path.
3. Ambil root item/insertion bin.
4. Enumerate sequence.
5. Uji keadaan project tidak siap.

**PASS:** project terbaca dan failure mode jelas.

## S05 — Bin + Import Media
1. Buat/temukan area/bin generated plugin.
2. Import A001.png dan A002.png dengan `Project.importFiles`.
3. Verifikasi ClipProjectItem ditemukan kembali.
4. Jalankan import kedua kali.
5. Catat duplicate behavior.
6. Uji missing path.

**PASS:** import repeatable dan strategi anti-duplikasi dapat ditetapkan.

## S06 — Sequence Creation Strategy
Tujuan utamanya memilih jalur yang kompatibel dengan minimum 25.6.

Uji:
- `createSequence` bila sesuai host.
- `createSequenceFromMedia`.
- pada 26.3+, bandingkan `createSequenceWithPresetPath`.
- baca kembali SequenceSettings.

`createSequenceWithPresetPath` tidak boleh menjadi satu-satunya jalur MVP karena API tersebut baru tersedia pada 26.3.

**Fallback:** template project/sequence jika creation API baseline terlalu terbatas.

## S07 — Timeline Placement V1/V2
**Blocker MVP.**

1. Sequence test memiliki minimal V1/V2.
2. Taruh A001 di V1 mulai 0 detik.
3. Taruh A002 di V2 mulai 1 detik.
4. Baca kembali track item/start time.
5. Uji insert/overwrite/ripple behavior.
6. Pilih metode paling deterministic.

**PASS:** clip berada di track/time yang benar dan DOM readback cocok.

**Fallback:** template sequence dengan track yang sudah disiapkan jika track manipulation terbatas.

## S08 — Timing & Duration
**Blocker MVP.**

1. A001 menjadi 3.000 s.
2. A002 menjadi 5.000 s.
3. Baca kembali start/end/out.
4. Uji 23.976/24/25/30/60 fps.
5. Gunakan satu utilitas konversi seconds <-> TickTime.

**PASS:** selisih maksimum 1 frame.

## S09 — Motion Parameter Discovery
1. Ambil components dari VideoClipTrackItem.
2. Cari berdasarkan match name bila memungkinkan.
3. Enumerate param count/displayName/matchName.
4. Temukan Position/Scale/Opacity/Anchor Point.
5. Ubah nilai statis dan readback.
6. Uji locale non-English bila tersedia.

Jangan hard-code English displayName sebagai satu-satunya key.

## S10 — Keyframe Animation
1. Pastikan `areKeyframesSupported`.
2. Set parameter time-varying.
3. Buat keyframe awal/akhir.
4. Tambahkan Action di transaction.
5. Set interpolation.
6. Baca kembali TickTime keyframe.
7. Undo dan verifikasi kembali ke state awal.

**PASS:** keyframe native berada di waktu/nilai yang benar dan Undo bersih.

## S11 — Locked Access, Transaction, Undo
**Blocker MVP.**

1. Action dibuat di dalam `project.lockedAccess` bila diwajibkan.
2. Beberapa Action digabungkan melalui `project.executeTransaction`.
3. Gunakan undoString yang jelas.
4. Ubah minimal dua state dalam satu transaction.
5. Satu Undo harus membalik batch secara logis.
6. Uji error handling di tengah persiapan operasi.

**PASS:** composer kecil menjadi unit Undo yang konsisten dan tidak memakai stale Action.

## S12 — Identity & Rerun Safety
Uji beberapa mekanisme:
- sequence marker dengan `scene_id`,
- Project/Sequence Properties bila cocok,
- generated naming convention,
- dedicated bin,
- plugin state JSON.

Restart Premiere lalu cari kembali identity.

Ubah satu clip secara manual lalu jalankan probe rerun.

**PASS:** plugin dapat mengenali hasil generate tanpa menganggap index track sebagai identitas permanen.

# Detail P1

## S13 — Network Permission
1. Allowlist hanya domain yang dibutuhkan.
2. Test fetch/POST.
3. Timeout/abort/retry terbatas.
4. Simulasikan offline.
5. API key tidak boleh masuk log.
6. Provider disabled mode harus bekerja.

AI tetap opsional dan composer dasar harus bekerja tanpa network.

## S14 — EncoderManager Export
1. Deteksi AME.
2. Uji `exportSequence`.
3. Uji queue to AME.
4. Catat progress/complete/error bila diperlukan.
5. Catat mode ketika AME tidak ada.

`launchEncoder` / `startBatchEncode` adalah enhancement 26.3+, bukan baseline 25.6.

Auto-export tidak boleh menjadi blocker timeline composer.

## S16 — Packaging CCX
1. Manifest single host Premiere valid.
2. Package melalui UDT menjadi CCX.
3. Install pada environment test.
4. S01/S02 tetap PASS.
5. Naikkan version patch dan test reinstall/update.

# Detail P2

## S15 — MOGRT / Graphics / Subtitle Feasibility
Tujuan hanya menentukan arah subtitle animasi.

Uji:
- API graphics/MOGRT yang tersedia,
- insert template,
- ubah parameter template,
- requirement font/path/template,
- Native Caption vs Animated Graphic.

Jika belum stabil, MVP tetap dilanjutkan tanpa animated subtitle.

# Protokol semua spike
1. Gunakan project TEST, bukan project produksi.
2. Catat host/UXP/OS/plugin version.
3. Fixture minimal.
4. Satu probe utama per tombol/command.
5. Catat state awal.
6. Jalankan dan log return/error.
7. Baca kembali state dari Premiere DOM.
8. Uji Undo bila melakukan mutasi.
9. Jalankan dua kali untuk mendeteksi duplikasi/rerun.
10. Reload plugin dan ulangi.
11. Klasifikasikan result.
12. Buat keputusan implementasi/fallback/ADR.

# Error taxonomy minimum
| Kode | Makna | Respons |
|---|---|---|
| ENV_UNSUPPORTED | host di bawah baseline | blokir composer |
| NO_ACTIVE_PROJECT | project tidak ada | minta buka/buat project |
| FS_PERMISSION_DENIED | user menolak file access | batalkan aman |
| MEDIA_MISSING | file tidak ditemukan | tandai file |
| IMPORT_FAILED | import gagal | log path/error |
| SEQUENCE_UNAVAILABLE | sequence tidak tersedia | stop sebelum mutasi |
| TRACK_WRITE_FAILED | clip gagal ditempatkan | rollback/Undo bila mungkin |
| PARAM_UNSUPPORTED | param tidak ditemukan | disable feature |
| KEYFRAME_UNSUPPORTED | keyframe tidak didukung | static/skip fallback |
| EXPORT_UNAVAILABLE | AME/preset/export tidak ada | export manual |
| NETWORK_UNAVAILABLE | AI offline/ditolak | deterministic local fallback |

# Version gate
| Capability | 25.6 | 26.3+ | 27.0+ | Keputusan |
|---|---|---|---|---|
| panel/project/import | Ya | Ya | Ya | core |
| transaction/lockedAccess | Ya | Ya | Ya | core |
| ComponentParam keyframe | Ya | Ya | Ya | core |
| EncoderManager exportSequence | Ya | Ya | Ya | core |
| createSequenceWithPresetPath | Tidak | Ya | Ya | enhanced |
| launchEncoder/startBatchEncode | Tidak | Ya | Ya | enhanced |
| panel media drag/drop | Tidak | Tidak | Ya | nice-to-have |

# Fixture test
- `A001.png` — landscape 1920x1080.
- `A002.png` — ukuran/orientasi berbeda.
- audio 10 detik untuk tahap lanjutan.
- template sequence/project hanya jika fallback dibutuhkan.
- export preset kecil bila S14 memerlukan.

Jangan gunakan project produksi untuk API spike.

# Urutan SOL
| Batch | Spike | Gate |
|---|---|---|
| A | S01 -> S02 -> S03 | bootstrap/permission |
| B | S04 -> S05 -> S06 | project/import/sequence |
| C | S07 -> S08 | placement/timing |
| D | S09 -> S10 -> S11 | motion/keyframe/undo |
| E | S12 | rerun identity |
| F | S13 -> S14 -> S16 | network/export/package |
| G | S15 | graphics exploration |

## STOP RULE
Jika **S07, S08, atau S11 FAIL tanpa fallback yang layak**, jangan lanjut membangun parser DOCX/composer production.

# Output Stage 01
- Plugin foundation load/debug/package.
- Diagnostics/API Probe panel internal.
- Premiere adapter minimal dari API yang sudah lulus.
- Fixture test.
- `docs/spike-results/` S01–S16.
- ADR untuk fallback/version gate besar.
- Capability matrix final.
- Daftar blocker yang sudah dibuktikan.

# Handoff ke Stage 02
Stage 02 baru dimulai setelah P0 lulus. Hasil Stage 01 menjadi fakta dasar untuk:
- ProjectState,
- contracts,
- service boundary,
- scene model,
- asset binder,
- composer transaction strategy,
- test harness.

Tidak ada parser DOCX production sebelum capability timeline benar-benar diketahui.
