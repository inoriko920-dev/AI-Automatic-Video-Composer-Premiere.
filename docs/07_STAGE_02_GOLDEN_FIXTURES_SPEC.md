# 07 — Stage 02 Golden Fixtures Specification

Status: **DESIGN ONLY / PRE-GATE**

Tujuan dokumen ini adalah menyediakan jawaban referensi deterministik untuk parser, binder, planner, validation, dan rerun. Setelah Foundation Gate GO, implementasi harus diuji terhadap fixture ini.

## 1. Prinsip golden fixture

- Input fixture sederhana dan dapat dibaca manusia.
- Expected output disimpan eksplisit.
- Stable code/ID tidak boleh berubah tanpa migration/ADR.
- Fixture parser tidak memerlukan Premiere.
- Fixture Premiere host terpisah dari pure-domain fixture.
- Jangan mengubah expected output hanya agar test hijau; perubahan kontrak harus direview.

---

# F-DOCX-01 — Valid 3 Scene SINGLE

Logical source:

```text
SCENE 001
TITLE: Pembukaan
NARRATION:
Kota itu mulai berubah ketika matahari terbit.
ASSETS: A001
LAYOUT: SINGLE
DURATION: 3.0

SCENE 002
TITLE: Jalan Utama
NARRATION:
Aktivitas perlahan memenuhi jalan utama.
ASSETS: A002
LAYOUT: SINGLE
DURATION: 4.0

SCENE 003
TITLE: Penutup
NARRATION:
Hari pertama berakhir dengan suasana yang lebih tenang.
ASSETS: A003
LAYOUT: SINGLE
DURATION: 5.0
```

Expected normalized facts:
- scene count = 3;
- ordinals = 1,2,3;
- asset IDs = A001/A002/A003;
- all layout = SINGLE;
- duration hints = 3/4/5;
- no ERROR;
- same file parsed twice → same `sceneId` values and source fingerprint.

---

# F-DOCX-02 — Mixed SINGLE / DOUBLE / AUTO

Logical source:

```text
SCENE 001
NARRATION:
Satu visual menjadi fokus utama.
ASSETS: A001
LAYOUT: SINGLE
DURATION: 3

SCENE 002
NARRATION:
Dua visual dibandingkan dalam satu scene.
ASSETS: A002, A003
LAYOUT: DOUBLE
DURATION: 5

SCENE 003
NARRATION:
Planner boleh menentukan layout dari jumlah aset.
ASSETS: A004, A005
LAYOUT: AUTO
DURATION: 4.5
```

Expected:
- 3 scenes;
- asset order scene 2 tetap `[A002, A003]`;
- AUTO tetap AUTO setelah parsing;
- parser tidak menentukan Position/Scale;
- planner nanti boleh menyelesaikan AUTO secara deterministik.

---

# F-DOCX-03 — Scene Tanpa Asset

Source:

```text
SCENE 001
NARRATION:
Scene ini tidak memiliki aset.
LAYOUT: SINGLE
DURATION: 3
```

Expected issue:

```json
{
  "code": "SCENE_NO_ASSET",
  "severity": "ERROR",
  "scope": "SCENE"
}
```

Mutation gate = BLOCKED.

---

# F-DOCX-04 — Duplicate Scene Number

Source memiliki `SCENE 002` dua kali.

Expected:
- parser tetap menghasilkan diagnostics terstruktur;
- `DOCX_DUPLICATE_SCENE_ID` ERROR;
- tidak ada silent renumbering;
- mutation BLOCKED.

---

# F-DOCX-05 — Invalid Layout + Duration

Source:

```text
SCENE 001
NARRATION:
Invalid fixture.
ASSETS: A001
LAYOUT: TRIPLE
DURATION: -2
```

Expected issues:
- `DOCX_UNKNOWN_LAYOUT` ERROR;
- `DOCX_INVALID_DURATION` ERROR;
- no mutation.

---

# F-DOCX-06 — Unicode + Multiline + Run Fragmentation

Logical text:

```text
SCENE 001
TITLE: Kota — Pagi
NARRATION:
“Pagi ini,” katanya,
kota terasa berbeda…
ASSETS: A001
LAYOUT: SINGLE
DURATION: 4.25
```

Open XML fixture harus memecah sebagian kata/kalimat ke beberapa `w:r` run untuk memastikan parser menggabungkan text run dengan benar.

Expected narration normalized:

```text
“Pagi ini,” katanya,
kota terasa berbeda…
```

Unicode punctuation tidak boleh rusak.

---

# F-DOCX-07 — 100 Scene Stress

Generator fixture nanti membuat 100 scene:
- ordinal 001–100;
- asset A001–A100;
- SINGLE;
- duration 3s.

Expected:
- exactly 100 scenes;
- no dropped scene;
- no duplicate stable IDs;
- deterministic fingerprint;
- parser metrics dicatat, tetapi tidak menetapkan performance threshold sebelum benchmark nyata.

---

# F-AXXX-01 — Normal Binding

Folder logical:

```text
A001.png
A002.jpg
A003.PNG
notes.txt
```

Scenes membutuhkan A001/A002/A003.

Expected:
- 3 required bound;
- extension/case normalized;
- `notes.txt` ignored as non-asset;
- no ERROR.

---

# F-AXXX-02 — Missing Asset

Scene membutuhkan A001 + A002.
Folder hanya A001.png.

Expected:
- `ASSET_MISSING` ERROR untuk A002;
- mutation BLOCKED.

---

# F-AXXX-03 — Duplicate Canonical ID

Folder:

```text
A001.png
A001.jpg
```

Expected:
- `ASSET_DUPLICATE_ID` ERROR;
- binder tidak memilih salah satu diam-diam.

---

# F-AXXX-04 — Unused Asset

Scene hanya membutuhkan A001.
Folder memiliki A001.png + A999.png.

Expected:
- A001 bound;
- `ASSET_UNUSED` WARNING untuk A999;
- generate boleh lanjut bila tidak ada ERROR lain.

---

# F-PLAN-01 — Continuous SINGLE Timing

Input scenes:
- S1 duration 3s / A001;
- S2 duration 4s / A002;
- S3 duration 5s / A003.

Expected plan:

```text
S1  start=0  end=3   V1
S2  start=3  end=7   V1
S3  start=7  end=12  V1
```

No overlap.
Total duration = 12s.

---

# F-PLAN-02 — DOUBLE Layout

Input:
- one scene;
- assets A001, A002;
- layout DOUBLE;
- duration 5s.

Expected plan:
- both items same scene start/end;
- primary → V1;
- secondary → V2;
- position/scale berasal dari deterministic DOUBLE layout contract;
- planner output sama untuk input + config yang sama.

---

# F-VALID-01 — Multiple Errors

Input mempunyai:
- invalid duration;
- missing asset;
- duplicate asset file.

Expected:
- semua issue relevan dikumpulkan;
- UI tidak berhenti pada error pertama saja;
- ERROR count > 0;
- mutation = BLOCKED.

---

# F-RERUN-01 — Unchanged

Snapshot generated = current Premiere = new desired plan.

Expected:
- `SKIP_UNCHANGED`;
- zero duplicate import;
- zero new clip;
- zero unsafe mutation.

---

# F-RERUN-02 — Safe Source Change

Last generated duration = 3s.
Current Premiere duration = 3s.
New desired duration = 4s.

Expected:
- `UPDATE_SAFE`;
- planned update 3→4s.

---

# F-RERUN-03 — Manual User Edit Conflict

Last generated position = P0.
Current Premiere position = P1 (manual edit).
New desired plan position = P2.

Expected:
- `USER_EDIT_CONFLICT` / `CONFLICT_USER_EDIT`;
- default decision = keep current manual edit;
- no overwrite until explicit user choice.

---

# F-STATE-01 — Schema Roundtrip

Expected:
- ProjectState v1 serialize → parse → equivalent data;
- unknown future schema → `STATE_SCHEMA_UNSUPPORTED`;
- corrupt JSON → `STATE_UNREADABLE`;
- migration failure → `STATE_MIGRATION_FAILED`.

---

# F-TIME-01 — Frame Tolerance

Untuk host fixture nyata:
- desired start/end dikonversi dengan `PremiereTime`;
- DOM readback harus cocok <= 1 frame;
- mismatch >1 frame → `TIMELINE_DURATION_MISMATCH` atau `TIMELINE_READBACK_MISMATCH`.

---

# Golden fixture versioning

Fixture contract version: `1`.

Perubahan expected behavior memerlukan salah satu:
- bug fix yang mengoreksi fixture salah;
- contract version bump;
- ADR bila mengubah behavior arsitektural.

Golden fixture bukan snapshot UI pixel. Fokusnya domain/state/timeline semantics.

## Acceptance

P1–P7 belum boleh dinyatakan selesai bila fixture relevan belum mempunyai automated test atau real-host evidence sesuai layernya.
