# 05 — Scene DOCX Input Contract

Status: **DESIGN COMPLETE / IMPLEMENTATION BLOCKED BY FOUNDATION GATE**

Dokumen ini mengunci kontrak input Scene DOCX untuk Tahap 02 production. Parser tidak boleh menebak struktur yang ambigu. Input yang tidak memenuhi kontrak menghasilkan validation issue yang eksplisit.

## 1. Tujuan

Scene DOCX adalah sumber struktur editorial. Parser mengubah DOCX menjadi daftar `Scene` deterministik tanpa bergantung pada Premiere DOM.

Output minimum per scene:

```ts
interface Scene {
  sceneId: string;
  ordinal: number;
  title?: string;
  narrationText: string;
  assetRefs: SceneAssetRef[];
  layoutHint?: "SINGLE" | "DOUBLE" | "AUTO";
  durationHintSeconds?: number;
  notes?: string[];
}
```

## 2. Stable scene ID

`sceneId` tidak boleh menggunakan index track Premiere.

Urutan prioritas:
1. ID eksplisit pada DOCX bila format mendukungnya.
2. ID yang dibentuk dari ordinal + normalized content fingerprint.
3. Parser harus menghasilkan ID yang sama untuk dokumen yang sama.

Contoh:

`SCN-001-a4f19c2d`

Perubahan typo kecil pada scene tidak boleh diam-diam dianggap scene baru tanpa dicatat dalam rerun diff.

## 3. Struktur scene yang diterima

Parser production wajib memiliki satu grammar canonical. Bentuk awal yang direkomendasikan:

```text
SCENE 001
TITLE: Pembukaan
NARRATION:
Teks narasi scene...
ASSETS: A001, A002
LAYOUT: DOUBLE
DURATION: 5.0
NOTES:
- optional note
```

Field wajib:
- scene boundary / scene number;
- narration atau content utama;
- minimal satu asset reference untuk visual scene yang bukan intentionally-empty.

Field opsional:
- title;
- layout;
- duration;
- notes.

## 4. Normalisasi

Parser wajib:
- normalisasi whitespace;
- mempertahankan urutan scene;
- mempertahankan urutan assetRefs;
- canonicalize asset ID menjadi uppercase `A###`;
- mengubah koma/semicolon daftar asset menjadi array;
- menolak duration negatif/0;
- tidak menghapus isi narasi secara agresif.

## 5. Asset reference

Format canonical:

```ts
interface SceneAssetRef {
  assetId: string;      // A001
  role?: "PRIMARY" | "SECONDARY" | "OVERLAY";
  required: boolean;
}
```

Aturan:
- `A1` tidak otomatis dianggap `A001` kecuali migration rule eksplisit diaktifkan.
- duplicate asset ID dalam scene boleh hanya jika role berbeda dan ada alasan eksplisit; default = validation error.
- referensi tidak dikenal tidak boleh dihapus diam-diam.

## 6. Layout hint

Nilai canonical:
- `SINGLE`
- `DOUBLE`
- `AUTO`

Jika kosong, planner boleh menentukan layout berdasarkan jumlah asset + rule engine.

Parser tidak menentukan Position/Scale Premiere. Itu tanggung jawab Composer Planner.

## 7. Duration hint

`durationHintSeconds` adalah hint domain, bukan final Premiere time.

Aturan:
- numeric finite;
- > 0;
- minimum/maximum production ditentukan validation policy;
- konversi ke frame dilakukan oleh `PremiereTime`, bukan parser.

## 8. Error handling

Parser tidak boleh throw error generik untuk seluruh dokumen jika hanya satu scene invalid.

Output parser:

```ts
interface SceneParseResult {
  scenes: Scene[];
  issues: ValidationIssue[];
  sourceFingerprint: string;
  parserVersion: string;
}
```

Severity:
- `ERROR` = generate diblokir;
- `WARNING` = boleh lanjut setelah user mengetahui;
- `INFO` = catatan.

## 9. Edge cases wajib diuji

- scene number lompat;
- scene duplicate;
- narration kosong;
- asset kosong;
- asset duplicate;
- unknown layout;
- duration non-numeric;
- paragraph style berubah tetapi teks sama;
- tabel vs paragraph;
- line break ganda;
- karakter Unicode;
- dokumen 100+ scene.

## 10. Fixture minimum

- F-DOCX-01 valid 3 scene SINGLE.
- F-DOCX-02 valid mixed SINGLE/DOUBLE.
- F-DOCX-03 missing asset ref.
- F-DOCX-04 duplicate scene number.
- F-DOCX-05 invalid duration/layout.
- F-DOCX-06 Unicode + multiline narration.
- F-DOCX-07 100 scenes stress fixture.

## 11. Acceptance criteria parser

Parser baru boleh dianggap production-ready bila:
- hasil deterministik untuk file yang sama;
- tidak menggunakan Premiere API;
- error mempunyai code stabil;
- 100-scene fixture selesai tanpa data hilang;
- stable IDs konsisten pada rerun;
- unit tests mencakup seluruh edge case di atas.

## 12. Non-goals

Kontrak ini belum mencakup:
- subtitle parsing;
- voice-over alignment;
- Gemini interpretation;
- motion preset;
- Premiere placement.

Semua fitur tersebut berada di layer terpisah.