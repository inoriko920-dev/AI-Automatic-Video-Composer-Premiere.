const ppro = require("premierepro");

const BATCH_D_SEQUENCE_NAME = "AAVC_SPIKE_S07_S08";
const CLIP_TYPE_D = ppro.Constants.TrackItemType.CLIP;

const batchD = {
  statuses: { s09: "NOT RUN", s10: "NOT RUN", s11: "NOT RUN" },
  scaleCandidate: null,
  scaleComponent: null,
  a001: null,
  a002: null,
  sequence: null,
  project: null,
  s11Before: null,
  s11After: null
};

function dEl(id) {
  return document.getElementById(id);
}

function dNow() {
  return new Date().toISOString();
}

function dLog(message, level = "INFO") {
  const line = `[${dNow()}] [${level}] ${message}`;
  console.log(line);
  const node = dEl("log");
  if (node) {
    node.textContent += `${line}\n`;
    node.scrollTop = node.scrollHeight;
  }
}

function dError(error) {
  if (!error) return "Unknown error";
  if (error.stack) return `${error.message || error}\n${error.stack}`;
  return String(error.message || error);
}

function dSetBadge(id, status) {
  const node = dEl(id);
  if (!node) return;
  node.textContent = status;
  node.className = "badge badge-neutral";
  if (status === "PASS") node.className = "badge badge-pass";
  else if (status === "PASS_WITH_LIMIT") node.className = "badge badge-warn";
  else if (status === "FAIL" || status === "BLOCKED_BY_VERSION") node.className = "badge badge-fail";
}

function dSetStatus(spike, status) {
  batchD.statuses[spike] = status;
  dSetBadge(`${spike}Badge`, status);
  dUpdateOverall();
}

function dUpdateOverall() {
  const values = [];
  for (let i = 1; i <= 11; i += 1) {
    const node = dEl(`s${String(i).padStart(2, "0")}Badge`);
    if (node) values.push(String(node.textContent || "NOT RUN"));
  }
  if (!values.length) return;
  let overall = "NOT RUN";
  if (values.some((v) => v === "FAIL" || v === "BLOCKED_BY_VERSION")) overall = "FAIL";
  else if (values.every((v) => v === "PASS")) overall = "PASS";
  else if (values.some((v) => v === "PASS" || v === "PASS_WITH_LIMIT")) overall = "PASS_WITH_LIMIT";
  dSetBadge("overallBadge", overall);
}

function dCanonicalKey(name) {
  const match = String(name || "").match(/^(A\d{3,})(?:\.[^.]+)?$/i);
  return match ? match[1].toUpperCase() : null;
}

function dUnwrapValue(value) {
  if (value === null || value === undefined) return null;
  if (value.value && typeof value.value === "object" && Object.prototype.hasOwnProperty.call(value.value, "value")) {
    return value.value.value;
  }
  if (Object.prototype.hasOwnProperty.call(value, "value")) return value.value;
  return value;
}

function dValueKind(value) {
  if (typeof value === "number") return "number";
  if (typeof value === "string") return "string";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value) && value.length >= 2) return "point-array";
  if (value && typeof value === "object") {
    if (Number.isFinite(Number(value.x)) && Number.isFinite(Number(value.y))) return "point-object";
    if (["red", "green", "blue"].every((key) => key in value)) return "color";
    return "object";
  }
  return typeof value;
}

function dSerializable(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.slice(0, 8);
  const out = {};
  for (const key of ["x", "y", "width", "height", "red", "green", "blue", "alpha"]) {
    if (key in value) out[key] = value[key];
  }
  return Object.keys(out).length ? out : String(value);
}

async function dGetProjectAndSequence() {
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("Tidak ada active project Premiere.");
  const sequences = await project.getSequences();
  const sequence = sequences.find((item) => String(item.name || "") === BATCH_D_SEQUENCE_NAME) || null;
  if (!sequence) throw new Error(`Sequence ${BATCH_D_SEQUENCE_NAME} belum ada. Jalankan S07 dan S08 terlebih dahulu.`);
  batchD.project = project;
  batchD.sequence = sequence;
  try { await project.setActiveSequence(sequence); } catch (_) {}
  try { await project.openSequence(sequence); } catch (_) {}
  return { project, sequence };
}

async function dGetTrackItems(track) {
  if (!track) return [];
  const result = track.getTrackItems(CLIP_TYPE_D, false);
  return result && typeof result.then === "function" ? await result : result;
}

async function dFindA001A002(sequence) {
  const found = { a001: null, a002: null };
  const count = await sequence.getVideoTrackCount();
  for (let index = 0; index < count; index += 1) {
    const track = await sequence.getVideoTrack(index);
    const items = await dGetTrackItems(track);
    for (const item of items) {
      const projectItem = await item.getProjectItem();
      const key = projectItem ? dCanonicalKey(projectItem.name) : null;
      if (index === 0 && key === "A001" && !found.a001) found.a001 = item;
      if (index === 1 && key === "A002" && !found.a002) found.a002 = item;
    }
  }
  if (!found.a001) throw new Error("A001 di V1 tidak ditemukan. Jalankan S07 terlebih dahulu.");
  batchD.a001 = found.a001;
  batchD.a002 = found.a002;
  return found;
}

async function dInspectParam(componentMeta, component, paramIndex) {
  const param = component.getParam(paramIndex);
  let raw = null;
  let startValueError = null;
  try {
    const startValue = await param.getStartValue();
    raw = dUnwrapValue(startValue);
  } catch (error) {
    startValueError = String(error.message || error);
  }

  let keyframesSupported = false;
  try { keyframesSupported = await param.areKeyframesSupported(); } catch (_) {}

  let timeVarying = false;
  try { timeVarying = Boolean(param.isTimeVarying()); } catch (_) {}

  return {
    componentIndex: componentMeta.index,
    componentDisplayName: componentMeta.displayName,
    componentMatchName: componentMeta.matchName,
    paramIndex,
    displayName: String(param.displayName || ""),
    keyframesSupported,
    timeVarying,
    valueKind: dValueKind(raw),
    value: dSerializable(raw),
    rawValue: raw,
    param,
    startValueError
  };
}

async function dInspectComponents(trackItem) {
  const chain = await trackItem.getComponentChain();
  const componentCount = chain.getComponentCount();
  const components = [];
  const params = [];

  for (let componentIndex = 0; componentIndex < componentCount; componentIndex += 1) {
    const component = chain.getComponentAtIndex(componentIndex);
    let displayName = "";
    let matchName = "";
    try { displayName = await component.getDisplayName(); } catch (_) {}
    try { matchName = await component.getMatchName(); } catch (_) {}
    const paramCount = component.getParamCount();
    const meta = { index: componentIndex, displayName: String(displayName || ""), matchName: String(matchName || ""), paramCount };
    components.push(meta);

    for (let paramIndex = 0; paramIndex < paramCount; paramIndex += 1) {
      try {
        params.push(await dInspectParam(meta, component, paramIndex));
      } catch (error) {
        params.push({
          componentIndex,
          componentDisplayName: meta.displayName,
          componentMatchName: meta.matchName,
          paramIndex,
          displayName: "<unreadable>",
          keyframesSupported: false,
          timeVarying: false,
          valueKind: "error",
          value: null,
          rawValue: null,
          param: null,
          startValueError: String(error.message || error)
        });
      }
    }
  }

  return { chain, componentCount, components, params };
}

function dTextContains(text, patterns) {
  const value = String(text || "").toLowerCase();
  return patterns.some((pattern) => value.includes(pattern));
}

function dChooseScaleCandidate(inventory) {
  let best = null;
  for (const candidate of inventory.params) {
    if (!candidate.param || candidate.valueKind !== "number") continue;
    let score = 0;
    const compText = `${candidate.componentMatchName} ${candidate.componentDisplayName}`;
    if (dTextContains(compText, ["motion", "transform"])) score += 100;
    if (dTextContains(candidate.displayName, ["scale", "skala", "zoom", "échelle", "escala", "scala"])) score += 220;
    if (candidate.keyframesSupported) score += 30;
    const number = Number(candidate.rawValue);
    if (Number.isFinite(number) && number > 0 && number <= 1000) score += 15;
    if (Number.isFinite(number) && Math.abs(number - 100) <= 5) score += 60;
    if (!best || score > best.score) best = { ...candidate, score };
  }
  return best;
}

function dDiscoverySummary(inventory) {
  const motionComponents = inventory.components.filter((component) =>
    dTextContains(`${component.matchName} ${component.displayName}`, ["motion", "transform"])
  );
  const opacityComponents = inventory.components.filter((component) =>
    dTextContains(`${component.matchName} ${component.displayName}`, ["opacity"])
  );
  const positionParams = inventory.params.filter((param) =>
    param.valueKind.startsWith("point") || dTextContains(param.displayName, ["position", "posisi", "positionen", "posición"])
  );
  const scaleParams = inventory.params.filter((param) =>
    dTextContains(param.displayName, ["scale", "skala", "zoom", "échelle", "escala", "scala"])
  );
  return { motionComponents, opacityComponents, positionParams, scaleParams };
}

function dPublicInventory(inventory) {
  return {
    componentCount: inventory.componentCount,
    components: inventory.components,
    params: inventory.params.map((param) => ({
      componentIndex: param.componentIndex,
      componentDisplayName: param.componentDisplayName,
      componentMatchName: param.componentMatchName,
      paramIndex: param.paramIndex,
      displayName: param.displayName,
      keyframesSupported: param.keyframesSupported,
      timeVarying: param.timeVarying,
      valueKind: param.valueKind,
      value: param.value,
      startValueError: param.startValueError
    }))
  };
}

async function dReadScalar(param) {
  const value = await param.getStartValue();
  return Number(dUnwrapValue(value));
}

function dSetScalarValue(project, param, value, undoString) {
  let success = false;
  project.lockedAccess(() => {
    const keyframe = param.createKeyframe(value);
    const action = param.createSetValueAction(keyframe, true);
    success = project.executeTransaction((compoundAction) => {
      compoundAction.addAction(action);
    }, undoString);
  });
  return success;
}

async function runS09() {
  try {
    const { project, sequence } = await dGetProjectAndSequence();
    const targets = await dFindA001A002(sequence);
    const inventory = await dInspectComponents(targets.a001);
    const discovery = dDiscoverySummary(inventory);
    const scaleCandidate = dChooseScaleCandidate(inventory);

    if (!scaleCandidate) {
      dEl("s09Result").textContent = JSON.stringify({ inventory: dPublicInventory(inventory), discovery, error: "No numeric scale-like candidate" }, null, 2);
      dSetStatus("s09", "FAIL");
      dLog("S09 FAIL — tidak menemukan kandidat numeric parameter yang aman untuk static-value probe.", "ERROR");
      return;
    }

    batchD.scaleCandidate = scaleCandidate.param;
    batchD.scaleComponent = {
      componentIndex: scaleCandidate.componentIndex,
      componentDisplayName: scaleCandidate.componentDisplayName,
      componentMatchName: scaleCandidate.componentMatchName,
      paramIndex: scaleCandidate.paramIndex,
      displayName: scaleCandidate.displayName
    };

    const original = Number(scaleCandidate.rawValue);
    let mutationVerified = false;
    let restoreVerified = false;
    let mutationSkipped = false;
    let mutated = original;

    if (scaleCandidate.timeVarying || !Number.isFinite(original)) {
      mutationSkipped = true;
    } else {
      mutated = original === 0 ? 1 : original + Math.max(1, Math.abs(original) * 0.05);
      const mutationOk = dSetScalarValue(project, scaleCandidate.param, mutated, "AAVC S09: Static Motion Param Probe");
      if (!mutationOk) throw new Error("executeTransaction returned false for S09 static-value mutation.");
      const afterMutation = await dReadScalar(scaleCandidate.param);
      mutationVerified = Number.isFinite(afterMutation) && Math.abs(afterMutation - mutated) <= 1e-6;

      const restoreOk = dSetScalarValue(project, scaleCandidate.param, original, "AAVC S09: Restore Motion Param");
      if (!restoreOk) throw new Error("executeTransaction returned false while restoring S09 value.");
      const afterRestore = await dReadScalar(scaleCandidate.param);
      restoreVerified = Number.isFinite(afterRestore) && Math.abs(afterRestore - original) <= 1e-6;
    }

    const heuristicDiscovery = {
      motionComponentCount: discovery.motionComponents.length,
      opacityComponentCount: discovery.opacityComponents.length,
      positionCandidateCount: discovery.positionParams.length,
      explicitScaleNameCount: discovery.scaleParams.length
    };

    const payload = {
      sequence: sequence.name,
      clip: "A001 / V1",
      rule: "component matchName is preferred; ComponentParam exposes displayName only, so parameter mapping remains runtime-discovered",
      heuristicDiscovery,
      selectedNumericCandidate: {
        componentIndex: scaleCandidate.componentIndex,
        componentDisplayName: scaleCandidate.componentDisplayName,
        componentMatchName: scaleCandidate.componentMatchName,
        paramIndex: scaleCandidate.paramIndex,
        displayName: scaleCandidate.displayName,
        original,
        mutated,
        score: scaleCandidate.score,
        keyframesSupported: scaleCandidate.keyframesSupported,
        timeVarying: scaleCandidate.timeVarying
      },
      staticMutation: { mutationSkipped, mutationVerified, restoreVerified },
      inventory: dPublicInventory(inventory)
    };
    dEl("s09Result").textContent = JSON.stringify(payload, null, 2);
    dEl("s09Motion").textContent = `${heuristicDiscovery.motionComponentCount} motion-like / ${inventory.componentCount} total`;
    dEl("s09Scale").textContent = `${scaleCandidate.displayName || "param"} @ C${scaleCandidate.componentIndex}/P${scaleCandidate.paramIndex}`;

    const discoveryStrong = discovery.motionComponents.length > 0 && discovery.positionParams.length > 0 && discovery.opacityComponents.length > 0;
    if (mutationSkipped) {
      dSetStatus("s09", "PASS_WITH_LIMIT");
      dLog("S09 PASS_WITH_LIMIT — component/parameter inventory berhasil, tetapi static mutation dilewati karena kandidat sudah time-varying atau bukan scalar aman.", "WARN");
      return;
    }
    if (!mutationVerified || !restoreVerified) {
      dSetStatus("s09", "FAIL");
      dLog(`S09 FAIL — static mutation/readback gagal. mutation=${mutationVerified}, restore=${restoreVerified}.`, "ERROR");
      return;
    }
    if (!discoveryStrong) {
      dSetStatus("s09", "PASS_WITH_LIMIT");
      dLog("S09 PASS_WITH_LIMIT — static-value mutation berhasil, tetapi semantic Motion/Position/Opacity discovery masih perlu dicatat dari host/locale nyata.", "WARN");
      return;
    }

    dSetStatus("s09", "PASS");
    dLog("S09 PASS — component chain terpetakan dan numeric motion candidate berhasil diubah/readback lalu dipulihkan.");
  } catch (error) {
    dSetStatus("s09", "FAIL");
    dLog(`S09 FAIL — ${dError(error)}`, "ERROR");
  }
}

async function dResolveScaleCandidate(trackItem) {
  if (batchD.scaleCandidate) return batchD.scaleCandidate;
  const inventory = await dInspectComponents(trackItem);
  const candidate = dChooseScaleCandidate(inventory);
  if (!candidate || !candidate.param) throw new Error("Tidak ada numeric motion candidate untuk S10. Jalankan S09 dan periksa inventory.");
  batchD.scaleCandidate = candidate.param;
  batchD.scaleComponent = {
    componentIndex: candidate.componentIndex,
    componentDisplayName: candidate.componentDisplayName,
    componentMatchName: candidate.componentMatchName,
    paramIndex: candidate.paramIndex,
    displayName: candidate.displayName
  };
  return candidate.param;
}

function dTickSeconds(tick) {
  return tick ? Number(tick.seconds) : NaN;
}

async function runS10() {
  try {
    const { project, sequence } = await dGetProjectAndSequence();
    const targets = await dFindA001A002(sequence);
    const param = await dResolveScaleCandidate(targets.a001);
    const supports = await param.areKeyframesSupported();
    if (!supports) throw new Error(`Parameter ${param.displayName || "selected"} tidak mendukung keyframe.`);

    const baseValue = await dReadScalar(param);
    if (!Number.isFinite(baseValue)) throw new Error("Selected keyframe parameter bukan scalar numeric.");
    const secondValue = baseValue === 0 ? 10 : baseValue + Math.max(5, Math.abs(baseValue) * 0.1);

    let timeVaryingSuccess = false;
    project.lockedAccess(() => {
      const action = param.createSetTimeVaryingAction(true);
      timeVaryingSuccess = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(action);
      }, "AAVC S10: Enable Keyframes");
    });
    if (!timeVaryingSuccess) throw new Error("Failed to enable time-varying parameter.");

    let addSuccess = false;
    project.lockedAccess(() => {
      const key0 = param.createKeyframe(baseValue);
      key0.position = ppro.TickTime.createWithSeconds(0);
      const key2 = param.createKeyframe(secondValue);
      key2.position = ppro.TickTime.createWithSeconds(2);
      const add0 = param.createAddKeyframeAction(key0);
      const add2 = param.createAddKeyframeAction(key2);
      addSuccess = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(add0);
        compoundAction.addAction(add2);
      }, "AAVC S10: Add Motion Keyframes");
    });
    if (!addSuccess) throw new Error("executeTransaction returned false while adding keyframes.");

    let interpolationSuccess = false;
    try {
      project.lockedAccess(() => {
        const linear0 = param.createSetInterpolationAtKeyframeAction(
          ppro.TickTime.createWithSeconds(0),
          ppro.Constants.InterpolationMode.LINEAR,
          true
        );
        const linear2 = param.createSetInterpolationAtKeyframeAction(
          ppro.TickTime.createWithSeconds(2),
          ppro.Constants.InterpolationMode.LINEAR,
          true
        );
        interpolationSuccess = project.executeTransaction((compoundAction) => {
          compoundAction.addAction(linear0);
          compoundAction.addAction(linear2);
        }, "AAVC S10: Set Linear Interpolation");
      });
    } catch (error) {
      dLog(`S10 interpolation note — ${error.message || error}`, "WARN");
    }

    const keyTimes = param.getKeyframeListAsTickTimes() || [];
    const keySeconds = keyTimes.map(dTickSeconds).filter(Number.isFinite);
    const value0Obj = await param.getValueAtTime(ppro.TickTime.createWithSeconds(0));
    const value2Obj = await param.getValueAtTime(ppro.TickTime.createWithSeconds(2));
    const value0 = Number(dUnwrapValue(value0Obj));
    const value2 = Number(dUnwrapValue(value2Obj));
    const timeVaryingReadback = Boolean(param.isTimeVarying());

    const has0 = keySeconds.some((seconds) => Math.abs(seconds - 0) <= 1e-4);
    const has2 = keySeconds.some((seconds) => Math.abs(seconds - 2) <= 1e-4);
    const value0Ok = Number.isFinite(value0) && Math.abs(value0 - baseValue) <= 1e-4;
    const value2Ok = Number.isFinite(value2) && Math.abs(value2 - secondValue) <= 1e-4;

    const payload = {
      sequence: sequence.name,
      parameter: batchD.scaleComponent,
      keyframesSupported: supports,
      timeVaryingReadback,
      requested: [
        { seconds: 0, value: baseValue },
        { seconds: 2, value: secondValue }
      ],
      addTransactionSuccess: addSuccess,
      interpolationTransactionSuccess: interpolationSuccess,
      keyframeTimesSeconds: keySeconds,
      valuesReadback: { at0: value0, at2: value2 },
      checks: { has0, has2, value0Ok, value2Ok }
    };
    dEl("s10Result").textContent = JSON.stringify(payload, null, 2);
    dEl("s10Param").textContent = param.displayName || "selected numeric param";
    dEl("s10Keys").textContent = keySeconds.length ? keySeconds.map((value) => value.toFixed(3)).join(", ") : "none";

    if (!timeVaryingReadback || !has0 || !has2 || !value0Ok || !value2Ok) {
      dSetStatus("s10", "FAIL");
      dLog("S10 FAIL — keyframe actions tidak lolos DOM readback. Jangan promosikan keyframe engine meskipun transaction mengembalikan success.", "ERROR");
      return;
    }

    dSetStatus("s10", interpolationSuccess ? "PASS" : "PASS_WITH_LIMIT");
    dLog(interpolationSuccess
      ? "S10 PASS — dua keyframe native dan value readback terverifikasi; interpolation LINEAR juga diterapkan."
      : "S10 PASS_WITH_LIMIT — keyframe/value terverifikasi tetapi interpolation action belum terbukti.", interpolationSuccess ? "INFO" : "WARN");
  } catch (error) {
    dSetStatus("s10", "FAIL");
    dLog(`S10 FAIL — ${dError(error)}`, "ERROR");
  }
}

async function dDescribeTiming(item) {
  const start = await item.getStartTime();
  const end = await item.getEndTime();
  const duration = await item.getDuration();
  return {
    startSeconds: Number(start.seconds),
    endSeconds: Number(end.seconds),
    durationSeconds: Number(duration.seconds),
    startTicks: String(start.ticks),
    endTicks: String(end.ticks)
  };
}

async function dFrameTolerance(sequence) {
  try {
    const timebase = await sequence.getTimebase();
    const frame = ppro.TickTime.createWithTicks(String(timebase));
    const seconds = Number(frame.seconds);
    if (Number.isFinite(seconds) && seconds > 0 && seconds < 1) return seconds;
  } catch (_) {}
  return 1 / 23.976;
}

function dClose(actual, expected, tolerance) {
  return Number.isFinite(actual) && Number.isFinite(expected) && Math.abs(actual - expected) <= tolerance + 1e-6;
}

async function runS11() {
  try {
    const { project, sequence } = await dGetProjectAndSequence();
    const targets = await dFindA001A002(sequence);
    if (!targets.a002) throw new Error("A002 di V2 tidak ditemukan. Jalankan S07/S08 terlebih dahulu.");

    const beforeA = await dDescribeTiming(targets.a001);
    const beforeB = await dDescribeTiming(targets.a002);
    if (beforeA.durationSeconds <= 1 || beforeB.durationSeconds <= 1) {
      throw new Error("Durasi fixture terlalu pendek untuk S11 transaction probe. Jalankan S08 terlebih dahulu.");
    }

    const targetEndA = beforeA.endSeconds - 0.25;
    const targetEndB = beforeB.endSeconds - 0.25;
    let transactionSuccess = false;

    project.lockedAccess(() => {
      const actionA = targets.a001.createSetEndAction(ppro.TickTime.createWithSeconds(targetEndA));
      const actionB = targets.a002.createSetEndAction(ppro.TickTime.createWithSeconds(targetEndB));
      transactionSuccess = project.executeTransaction((compoundAction) => {
        compoundAction.addAction(actionA);
        compoundAction.addAction(actionB);
      }, "AAVC S11: Two Timing Changes / One Undo");
    });
    if (!transactionSuccess) throw new Error("executeTransaction returned false for S11 multi-action transaction.");

    const afterA = await dDescribeTiming(targets.a001);
    const afterB = await dDescribeTiming(targets.a002);
    const tolerance = await dFrameTolerance(sequence);
    const changedA = dClose(afterA.endSeconds, targetEndA, tolerance);
    const changedB = dClose(afterB.endSeconds, targetEndB, tolerance);

    batchD.s11Before = { A001: beforeA, A002: beforeB, tolerance };
    batchD.s11After = { A001: afterA, A002: afterB };

    const payload = {
      sequence: sequence.name,
      transaction: "ONE Project.executeTransaction containing TWO createSetEndAction actions",
      undoString: "AAVC S11: Two Timing Changes / One Undo",
      before: batchD.s11Before,
      requestedAfter: { A001_end: targetEndA, A002_end: targetEndB },
      after: batchD.s11After,
      mutationChecks: { A001_changed: changedA, A002_changed: changedB },
      nextManualStep: "Immediately press Ctrl+Z ONCE in Premiere, make no other edits, then click Verify S11 Undo."
    };
    dEl("s11Result").textContent = JSON.stringify(payload, null, 2);
    dEl("s11Mutation").textContent = changedA && changedB ? "2 actions changed in 1 transaction" : "mutation mismatch";
    dEl("s11Undo").textContent = "Ctrl+Z sekali, lalu Verify";

    if (!changedA || !changedB) {
      dSetStatus("s11", "FAIL");
      dLog(`S11 FAIL — transaction berjalan tetapi readback mutasi tidak cocok. A001=${changedA}, A002=${changedB}.`, "ERROR");
      return;
    }

    dSetStatus("s11", "PASS_WITH_LIMIT");
    dLog("S11 transaction mutation verified. Sekarang tekan Ctrl+Z SEKALI di Premiere tanpa edit lain, lalu klik Verify S11 Undo.", "WARN");
  } catch (error) {
    dSetStatus("s11", "FAIL");
    dLog(`S11 FAIL — ${dError(error)}`, "ERROR");
  }
}

async function verifyS11Undo() {
  try {
    if (!batchD.s11Before) throw new Error("Belum ada baseline S11. Jalankan Run S11 terlebih dahulu.");
    const { sequence } = await dGetProjectAndSequence();
    const targets = await dFindA001A002(sequence);
    if (!targets.a002) throw new Error("A002 tidak ditemukan saat verify Undo.");

    const currentA = await dDescribeTiming(targets.a001);
    const currentB = await dDescribeTiming(targets.a002);
    const tolerance = batchD.s11Before.tolerance || await dFrameTolerance(sequence);
    const restoredA = dClose(currentA.endSeconds, batchD.s11Before.A001.endSeconds, tolerance);
    const restoredB = dClose(currentB.endSeconds, batchD.s11Before.A002.endSeconds, tolerance);

    const payload = {
      baselineBeforeTransaction: batchD.s11Before,
      stateAfterSingleManualUndo: { A001: currentA, A002: currentB },
      checks: { A001_restored: restoredA, A002_restored: restoredB },
      interpretation: restoredA && restoredB
        ? "PASS: one manual Undo reverted both actions from the single transaction."
        : "FAIL: one manual Undo did not restore both values."
    };
    dEl("s11Result").textContent = JSON.stringify(payload, null, 2);

    if (!restoredA || !restoredB) {
      dSetStatus("s11", "FAIL");
      dEl("s11Undo").textContent = "Undo verification FAILED";
      dLog(`S11 FAIL — satu Undo tidak memulihkan kedua state. A001=${restoredA}, A002=${restoredB}.`, "ERROR");
      return;
    }

    dSetStatus("s11", "PASS");
    dEl("s11Undo").textContent = "1 Undo restored both ✓";
    dLog("S11 PASS — satu Ctrl+Z memulihkan kedua perubahan dari satu executeTransaction.");
  } catch (error) {
    dSetStatus("s11", "FAIL");
    dLog(`S11 Undo verification FAIL — ${dError(error)}`, "ERROR");
  }
}

function dWire() {
  const s09 = dEl("runS09");
  const s10 = dEl("runS10");
  const s11 = dEl("runS11");
  const verifyUndo = dEl("verifyS11Undo");
  if (s09) s09.addEventListener("click", runS09);
  if (s10) s10.addEventListener("click", runS10);
  if (s11) s11.addEventListener("click", runS11);
  if (verifyUndo) verifyUndo.addEventListener("click", verifyS11Undo);
  dLog("Batch D S09–S11 loaded. Jalankan setelah S07/S08 pada project TEST.");
}

dWire();