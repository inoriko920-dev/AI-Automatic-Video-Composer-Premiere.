const ppro = require("premierepro");

const BATCH_C_SEQUENCE_NAME = "AAVC_SPIKE_S07_S08";
const BATCH_C_BIN_NAME = "AAVC_GENERATED";
const CLIP_TYPE = ppro.Constants.TrackItemType.CLIP;

const batchC = {
  statuses: { s07: "NOT RUN", s08: "NOT RUN" },
  sequence: null,
  project: null,
  generatedBin: null,
  a001: null,
  a002: null,
  lastFrameSeconds: null
};

function cEl(id) {
  return document.getElementById(id);
}

function cNow() {
  return new Date().toISOString();
}

function cLog(message, level = "INFO") {
  const line = `[${cNow()}] [${level}] ${message}`;
  console.log(line);
  const node = cEl("log");
  if (node) {
    node.textContent += `${line}\n`;
    node.scrollTop = node.scrollHeight;
  }
}

function cError(error) {
  if (!error) return "Unknown error";
  if (error.stack) return `${error.message || error}\n${error.stack}`;
  return String(error.message || error);
}

function cSetBadge(id, status) {
  const node = cEl(id);
  if (!node) return;
  node.textContent = status;
  node.className = "badge badge-neutral";
  if (status === "PASS") node.className = "badge badge-pass";
  else if (status === "PASS_WITH_LIMIT") node.className = "badge badge-warn";
  else if (status === "FAIL" || status === "BLOCKED_BY_VERSION") node.className = "badge badge-fail";
}

function cSetStatus(spike, status) {
  batchC.statuses[spike] = status;
  cSetBadge(`${spike}Badge`, status);
  cUpdateOverallFromDom();
}

function cUpdateOverallFromDom() {
  const values = [];
  for (let i = 1; i <= 8; i += 1) {
    const node = cEl(`s${String(i).padStart(2, "0")}Badge`);
    if (node) values.push(String(node.textContent || "NOT RUN"));
  }
  if (!values.length) return;

  let overall = "NOT RUN";
  if (values.some((v) => v === "FAIL" || v === "BLOCKED_BY_VERSION")) overall = "FAIL";
  else if (values.every((v) => v === "PASS")) overall = "PASS";
  else if (values.some((v) => v === "PASS" || v === "PASS_WITH_LIMIT")) overall = "PASS_WITH_LIMIT";
  cSetBadge("overallBadge", overall);
}

function cTryFolder(item) {
  try {
    return ppro.FolderItem.cast(item);
  } catch (_) {
    return null;
  }
}

function cTryClip(item) {
  try {
    return ppro.ClipProjectItem.cast(item);
  } catch (_) {
    return null;
  }
}

function cProjectItem(item) {
  try {
    return ppro.ProjectItem.cast(item);
  } catch (_) {
    return item;
  }
}

function cCanonicalKey(name) {
  const match = String(name || "").match(/^(A\d{3,})(?:\.[^.]+)?$/i);
  return match ? match[1].toUpperCase() : null;
}

async function cGetProject() {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("Tidak ada active project Premiere.");
  return project;
}

async function cFindGeneratedBin(project) {
  const root = await project.getRootItem();
  const items = await root.getItems();
  for (const item of items) {
    if (String(item.name || "") !== BATCH_C_BIN_NAME) continue;
    const folder = cTryFolder(item);
    if (folder) return folder;
  }
  return null;
}

async function cFindFixtures(folder) {
  const items = await folder.getItems();
  const found = {};
  for (const item of items) {
    const key = cCanonicalKey(item.name);
    if (key !== "A001" && key !== "A002") continue;
    if (!found[key]) {
      const clip = cTryClip(item);
      if (clip) found[key] = { key, clip, projectItem: cProjectItem(item), name: item.name };
    }
  }
  return found;
}

async function cFindSequence(project) {
  const sequences = await project.getSequences();
  return sequences.find((seq) => String(seq.name || "") === BATCH_C_SEQUENCE_NAME) || null;
}

async function cGetTrackItems(track) {
  if (!track) return [];
  const result = track.getTrackItems(CLIP_TYPE, false);
  return result && typeof result.then === "function" ? await result : result;
}

async function cDescribeTrackItem(item) {
  const projectItem = await item.getProjectItem();
  const start = await item.getStartTime();
  const end = await item.getEndTime();
  const duration = await item.getDuration();
  const trackIndex = await item.getTrackIndex();
  return {
    name: projectItem ? String(projectItem.name || "") : "",
    key: projectItem ? cCanonicalKey(projectItem.name) : null,
    trackIndex,
    startSeconds: start ? Number(start.seconds) : null,
    endSeconds: end ? Number(end.seconds) : null,
    durationSeconds: duration ? Number(duration.seconds) : null,
    startTicks: start ? String(start.ticks) : null,
    endTicks: end ? String(end.ticks) : null
  };
}

async function cReadPlacement(sequence) {
  const videoTrackCount = await sequence.getVideoTrackCount();
  const tracks = [];
  for (let index = 0; index < videoTrackCount; index += 1) {
    const track = await sequence.getVideoTrack(index);
    const items = await cGetTrackItems(track);
    const described = [];
    for (const item of items) described.push(await cDescribeTrackItem(item));
    tracks.push({ index, name: track ? track.name : `V${index + 1}`, items: described });
  }
  return { videoTrackCount, tracks };
}

async function cFrameDurationSeconds(sequence) {
  const timebase = await sequence.getTimebase();
  try {
    const frameTime = ppro.TickTime.createWithTicks(String(timebase));
    const seconds = Number(frameTime.seconds);
    if (Number.isFinite(seconds) && seconds > 0 && seconds < 1) {
      batchC.lastFrameSeconds = seconds;
      return { seconds, source: "sequence.getTimebase -> TickTime.createWithTicks", timebase: String(timebase) };
    }
  } catch (error) {
    cLog(`S08 note — timebase conversion failed: ${error.message || error}`, "WARN");
  }

  try {
    const settings = await sequence.getSettings();
    if (settings && typeof settings.getVideoFrameRate === "function") {
      const rate = await settings.getVideoFrameRate();
      const fps = rate ? Number(rate.value) : NaN;
      if (Number.isFinite(fps) && fps > 0) {
        const seconds = 1 / fps;
        batchC.lastFrameSeconds = seconds;
        return { seconds, source: "SequenceSettings.getVideoFrameRate", fps, timebase: String(timebase) };
      }
    }
  } catch (_) {
    // getVideoFrameRate is only available in newer hosts; baseline 25.6 must not depend on it.
  }

  return { seconds: 1 / 23.976, source: "fallback-23.976", timebase: String(timebase) };
}

function cCloseEnough(actual, expected, tolerance) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance + 1e-6;
}

async function cActivateSequence(project, sequence) {
  try { await project.setActiveSequence(sequence); } catch (_) {}
  try { await project.openSequence(sequence); } catch (_) {}
}

async function runS07() {
  try {
    const project = await cGetProject();
    batchC.project = project;

    const generatedBin = await cFindGeneratedBin(project);
    if (!generatedBin) throw new Error(`Bin ${BATCH_C_BIN_NAME} belum ada. Jalankan S05 terlebih dahulu.`);
    batchC.generatedBin = generatedBin;

    const fixtures = await cFindFixtures(generatedBin);
    if (!fixtures.A001 || !fixtures.A002) {
      throw new Error("S07 membutuhkan A001 dan A002 hasil import S05 di bin AAVC_GENERATED.");
    }
    batchC.a001 = fixtures.A001;
    batchC.a002 = fixtures.A002;

    let sequence = await cFindSequence(project);
    let createdNow = false;
    if (!sequence) {
      sequence = await project.createSequenceFromMedia(
        BATCH_C_SEQUENCE_NAME,
        [fixtures.A001.clip],
        cProjectItem(generatedBin)
      );
      createdNow = Boolean(sequence);
    }
    if (!sequence) throw new Error("Tidak dapat membuat sequence khusus S07/S08.");
    batchC.sequence = sequence;
    await cActivateSequence(project, sequence);

    const frame = await cFrameDurationSeconds(sequence);
    const before = await cReadPlacement(sequence);
    const existingV2A002 = before.tracks.some((track) =>
      track.index === 1 && track.items.some((item) => item.key === "A002" && cCloseEnough(item.startSeconds, 1, frame.seconds))
    );

    let insertedNow = false;
    if (!existingV2A002) {
      project.lockedAccess(() => {
        const editor = ppro.SequenceEditor.getEditor(sequence);
        const action = editor.createInsertProjectItemAction(
          fixtures.A002.projectItem,
          ppro.TickTime.createWithSeconds(1),
          1,
          0,
          false
        );
        const ok = project.executeTransaction((compoundAction) => {
          compoundAction.addAction(action);
        }, "AAVC S07: Place A002 on V2 at 1s");
        if (!ok) throw new Error("executeTransaction returned false for S07 placement.");
      });
      insertedNow = true;
    }

    const after = await cReadPlacement(sequence);
    const v1A001 = after.tracks.some((track) =>
      track.index === 0 && track.items.some((item) => item.key === "A001" && cCloseEnough(item.startSeconds, 0, frame.seconds))
    );
    const v2A002 = after.tracks.some((track) =>
      track.index === 1 && track.items.some((item) => item.key === "A002" && cCloseEnough(item.startSeconds, 1, frame.seconds))
    );

    const payload = {
      sequence: sequence.name,
      createdNow,
      insertedNow,
      method: "SequenceEditor.createInsertProjectItemAction",
      target: { A001: "V1 @ 0.000s", A002: "V2 @ 1.000s" },
      frameToleranceSeconds: frame.seconds,
      frameToleranceSource: frame.source,
      placementVerified: { A001_V1_0s: v1A001, A002_V2_1s: v2A002 },
      readback: after
    };
    cEl("s07Result").textContent = JSON.stringify(payload, null, 2);
    cEl("s07SequenceName").textContent = sequence.name;
    cEl("s07Tracks").textContent = `V=${after.videoTrackCount}`;

    if (!v1A001 || !v2A002) {
      cSetStatus("s07", "FAIL");
      cLog(`S07 FAIL — placement readback mismatch: A001=${v1A001}, A002=${v2A002}.`, "ERROR");
      return;
    }

    if (!createdNow && !insertedNow) {
      cSetStatus("s07", "PASS_WITH_LIMIT");
      cLog("S07 PASS_WITH_LIMIT — placement yang benar sudah ada dari run sebelumnya; mutation baru tidak dilakukan.", "WARN");
      return;
    }

    cSetStatus("s07", "PASS");
    cLog("S07 PASS — A001 berada di V1 @ 0s dan A002 berada di V2 @ 1s berdasarkan DOM readback.");
  } catch (error) {
    cSetStatus("s07", "FAIL");
    cLog(`S07 FAIL — ${cError(error)}`, "ERROR");
  }
}

async function cFindTargetItems(sequence) {
  const result = { a001: null, a002: null };
  const count = await sequence.getVideoTrackCount();
  for (let index = 0; index < count; index += 1) {
    const track = await sequence.getVideoTrack(index);
    const items = await cGetTrackItems(track);
    for (const item of items) {
      const desc = await cDescribeTrackItem(item);
      if (index === 0 && desc.key === "A001" && !result.a001) result.a001 = item;
      if (index === 1 && desc.key === "A002" && !result.a002) result.a002 = item;
    }
  }
  return result;
}

async function runS08() {
  try {
    const project = await cGetProject();
    let sequence = await cFindSequence(project);
    if (!sequence) throw new Error("Sequence S07/S08 belum ada. Jalankan S07 terlebih dahulu.");
    batchC.project = project;
    batchC.sequence = sequence;
    await cActivateSequence(project, sequence);

    const targets = await cFindTargetItems(sequence);
    if (!targets.a001 || !targets.a002) {
      throw new Error("Track item target A001(V1) dan A002(V2) tidak lengkap. Jalankan S07 terlebih dahulu.");
    }

    const beforeA = await cDescribeTrackItem(targets.a001);
    const beforeB = await cDescribeTrackItem(targets.a002);

    project.lockedAccess(() => {
      const actionA = targets.a001.createSetEndAction(ppro.TickTime.createWithSeconds(3));
      const actionB = targets.a002.createSetEndAction(ppro.TickTime.createWithSeconds(6));
      const ok = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(actionA);
        compoundAction.addAction(actionB);
      }, "AAVC S08: Set still durations 3s and 5s");
      if (!ok) throw new Error("executeTransaction returned false for S08 timing mutation.");
    });

    const afterA = await cDescribeTrackItem(targets.a001);
    const afterB = await cDescribeTrackItem(targets.a002);
    const frame = await cFrameDurationSeconds(sequence);

    const checks = {
      A001_start_0s: cCloseEnough(afterA.startSeconds, 0, frame.seconds),
      A001_end_3s: cCloseEnough(afterA.endSeconds, 3, frame.seconds),
      A001_duration_3s: cCloseEnough(afterA.durationSeconds, 3, frame.seconds),
      A002_start_1s: cCloseEnough(afterB.startSeconds, 1, frame.seconds),
      A002_end_6s: cCloseEnough(afterB.endSeconds, 6, frame.seconds),
      A002_duration_5s: cCloseEnough(afterB.durationSeconds, 5, frame.seconds)
    };
    const pass = Object.values(checks).every(Boolean);

    const payload = {
      sequence: sequence.name,
      mutation: "VideoClipTrackItem.createSetEndAction in one Project transaction",
      requested: {
        A001: { start: 0, end: 3, duration: 3 },
        A002: { start: 1, end: 6, duration: 5 }
      },
      frameTolerance: frame,
      before: { A001: beforeA, A002: beforeB },
      after: { A001: afterA, A002: afterB },
      checks
    };
    cEl("s08Result").textContent = JSON.stringify(payload, null, 2);
    cEl("s08A001").textContent = `${afterA.startSeconds?.toFixed(3)} → ${afterA.endSeconds?.toFixed(3)} (${afterA.durationSeconds?.toFixed(3)}s)`;
    cEl("s08A002").textContent = `${afterB.startSeconds?.toFixed(3)} → ${afterB.endSeconds?.toFixed(3)} (${afterB.durationSeconds?.toFixed(3)}s)`;

    if (!pass) {
      cSetStatus("s08", "FAIL");
      cLog(`S08 FAIL — timing readback tidak memenuhi toleransi <= 1 frame. ${JSON.stringify(checks)}`, "ERROR");
      return;
    }

    cSetStatus("s08", "PASS");
    cLog(`S08 PASS — A001=3s dan A002=5s dengan toleransi frame ${frame.seconds.toFixed(6)}s.`);
  } catch (error) {
    cSetStatus("s08", "FAIL");
    cLog(`S08 FAIL — ${cError(error)}`, "ERROR");
  }
}

function cWire() {
  const s07 = cEl("runS07");
  const s08 = cEl("runS08");
  if (s07) s07.addEventListener("click", runS07);
  if (s08) s08.addEventListener("click", runS08);
  cLog("Batch C S07–S08 loaded. Gunakan project TEST dan jalankan setelah S05/S06.");
}

cWire();
