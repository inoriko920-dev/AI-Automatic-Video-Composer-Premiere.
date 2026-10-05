import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REQUIRED_PASS = ["S07", "S08", "S11", "S12"];
const REQUIRED_PASS_OR_FALLBACK = ["S10"];
const ALLOWED_STATUS = new Set(["NOT RUN", "PASS", "PASS_WITH_LIMIT", "FAIL", "BLOCKED_BY_VERSION"]);
const EXPECTED_SCHEMA = 1;
const MIN_PREMIERE = [25, 6, 0];

function usage() {
  console.log(`Usage:\n  node scripts/review-foundation-report.mjs <report.json> [--out <review.json>] [--s10-fallback-adr <path>]\n\nThis command NEVER changes docs/foundation-gate.json automatically.`);
}

function parseArgs(argv) {
  const args = { reportPath: null, outPath: null, s10FallbackAdr: null };
  const rest = [...argv];
  while (rest.length) {
    const token = rest.shift();
    if (!args.reportPath && !String(token).startsWith("--")) {
      args.reportPath = token;
      continue;
    }
    if (token === "--out") {
      args.outPath = rest.shift() || null;
      continue;
    }
    if (token === "--s10-fallback-adr") {
      args.s10FallbackAdr = rest.shift() || null;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${token}`);
  }
  return args;
}

function parseVersion(value) {
  const parts = String(value || "")
    .match(/\d+(?:\.\d+){0,3}/)?.[0]
    ?.split(".")
    .map((part) => Number(part)) || [];
  while (parts.length < 3) parts.push(0);
  return parts.slice(0, 3);
}

function versionAtLeast(actual, minimum) {
  for (let i = 0; i < Math.max(actual.length, minimum.length); i += 1) {
    const a = Number(actual[i] || 0);
    const b = Number(minimum[i] || 0);
    if (a > b) return true;
    if (a < b) return false;
  }
  return true;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath);
  let parsed;
  try {
    parsed = JSON.parse(raw.toString("utf8"));
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
  return { raw, parsed };
}

function normalizeStatuses(report) {
  const statuses = report?.statuses;
  if (!statuses || typeof statuses !== "object" || Array.isArray(statuses)) {
    throw new Error("Report must contain an object field: statuses");
  }
  const normalized = {};
  for (let i = 1; i <= 16; i += 1) {
    const key = `S${String(i).padStart(2, "0")}`;
    const value = String(statuses[key] ?? "NOT RUN").trim();
    if (!ALLOWED_STATUS.has(value)) {
      throw new Error(`Invalid status ${key}=${JSON.stringify(value)}`);
    }
    normalized[key] = value;
  }
  return normalized;
}

function validateFallbackAdr(adrPath) {
  if (!adrPath) return { supplied: false, valid: false, path: null, reason: "not supplied" };
  const resolved = path.resolve(adrPath);
  if (!fs.existsSync(resolved)) {
    return { supplied: true, valid: false, path: resolved, reason: "file does not exist" };
  }
  const text = fs.readFileSync(resolved, "utf8");
  const looksLikeAdr = /\bADR\b/i.test(text) || /#\s*ADR[- ]?\d+/i.test(text) || /Decision/i.test(text);
  const mentionsS10 = /\bS10\b/i.test(text) || /keyframe/i.test(text);
  const approved = /status\s*:\s*(accepted|approved)/i.test(text) || /\bACCEPTED\b/i.test(text) || /\bAPPROVED\b/i.test(text);
  return {
    supplied: true,
    valid: Boolean(looksLikeAdr && mentionsS10 && approved),
    path: resolved,
    reason: looksLikeAdr && mentionsS10 && approved ? "accepted S10/keyframe fallback ADR detected" : "ADR must mention S10/keyframe and be explicitly ACCEPTED/APPROVED"
  };
}

function buildReview(reportPath, raw, report, fallbackAdr) {
  const errors = [];
  const warnings = [];

  if (Number(report?.schema) !== EXPECTED_SCHEMA) {
    errors.push(`Unsupported report schema: ${report?.schema ?? "missing"}; expected ${EXPECTED_SCHEMA}`);
  }

  if (report?.product !== "AI Automatic Video Composer Premiere") {
    warnings.push(`Unexpected product field: ${JSON.stringify(report?.product ?? null)}`);
  }

  const statuses = normalizeStatuses(report);
  const hostVersion = parseVersion(report?.host?.version);
  const hostVersionOk = versionAtLeast(hostVersion, MIN_PREMIERE);
  if (!hostVersionOk) {
    errors.push(`Premiere ${report?.host?.version ?? "unknown"} is below baseline 25.6.0`);
  }

  const hardBlockers = REQUIRED_PASS.filter((key) => statuses[key] !== "PASS");
  const s10Pass = statuses.S10 === "PASS";
  const s10ResolvedByAdr = !s10Pass && fallbackAdr.valid;

  let decision = "NO_GO";
  const decisionReasons = [];

  if (errors.length) {
    decisionReasons.push(...errors);
  }
  if (hardBlockers.length) {
    decisionReasons.push(`Required PASS missing: ${hardBlockers.join(", ")}`);
  }

  if (!errors.length && hardBlockers.length === 0) {
    if (s10Pass) {
      decision = "GO_CANDIDATE";
      decisionReasons.push("S07/S08/S10/S11/S12 satisfy Foundation Gate runtime requirements.");
    } else if (s10ResolvedByAdr) {
      decision = "GO_CANDIDATE_WITH_S10_FALLBACK";
      decisionReasons.push(`S10 is ${statuses.S10}, but an accepted fallback ADR was supplied.`);
    } else {
      decision = "REQUIRES_S10_FALLBACK_ADR";
      decisionReasons.push(`S10 is ${statuses.S10}; supply an accepted fallback ADR or obtain S10 PASS.`);
    }
  }

  const nonPass = Object.entries(statuses).filter(([, value]) => value !== "PASS");
  const p0 = {
    requiredPass: Object.fromEntries(REQUIRED_PASS.map((key) => [key, statuses[key]])),
    requiredPassOrFallbackAdr: Object.fromEntries(REQUIRED_PASS_OR_FALLBACK.map((key) => [key, statuses[key]])),
    s10FallbackAdr: fallbackAdr
  };

  return {
    schemaVersion: 1,
    reviewedAt: new Date().toISOString(),
    reviewer: "scripts/review-foundation-report.mjs",
    source: {
      path: path.resolve(reportPath),
      fileName: path.basename(reportPath),
      sha256: sha256(raw),
      reportSchema: report?.schema ?? null,
      reportGeneratedAt: report?.generatedAt ?? null,
      foundationVersion: report?.foundationVersion ?? null
    },
    environment: {
      premiereVersion: report?.host?.version ?? null,
      premiereBaselineOk: hostVersionOk,
      uxpVersion: report?.host?.uxpVersion ?? null,
      osPlatform: report?.host?.osPlatform ?? null,
      osRelease: report?.host?.osRelease ?? null,
      architecture: report?.host?.architecture ?? null
    },
    statuses,
    p0,
    decision,
    decisionReasons,
    errors,
    warnings,
    nonPassStatuses: Object.fromEntries(nonPass),
    gateMutationPerformed: false,
    nextAction: decision.startsWith("GO_CANDIDATE")
      ? "Human review evidence, then explicitly update docs/foundation-gate.json to GO_APPROVED in a separate reviewed commit."
      : "Do not open Stage 02. Resolve listed blockers and produce a new real-host report."
  };
}

function printSummary(review) {
  console.log("\nAAVC FOUNDATION REPORT REVIEW");
  console.log(`Decision: ${review.decision}`);
  console.log(`Premiere: ${review.environment.premiereVersion || "unknown"} (baseline=${review.environment.premiereBaselineOk ? "OK" : "FAIL"})`);
  console.log(`Evidence SHA-256: ${review.source.sha256}`);
  console.log("P0 statuses:");
  for (const key of ["S07", "S08", "S10", "S11", "S12"]) {
    console.log(`  ${key}: ${review.statuses[key]}`);
  }
  if (review.decisionReasons.length) {
    console.log("Reasons:");
    for (const reason of review.decisionReasons) console.log(`  - ${reason}`);
  }
  console.log(`Next: ${review.nextAction}`);
}

let args;
try {
  args = parseArgs(process.argv.slice(2));
  if (!args.reportPath) {
    usage();
    process.exitCode = 2;
  } else {
    const resolvedReport = path.resolve(args.reportPath);
    if (!fs.existsSync(resolvedReport)) throw new Error(`Report file not found: ${resolvedReport}`);

    const { raw, parsed } = safeReadJson(resolvedReport);
    const fallbackAdr = validateFallbackAdr(args.s10FallbackAdr);
    const review = buildReview(resolvedReport, raw, parsed, fallbackAdr);
    printSummary(review);

    if (args.outPath) {
      const resolvedOut = path.resolve(args.outPath);
      fs.mkdirSync(path.dirname(resolvedOut), { recursive: true });
      fs.writeFileSync(resolvedOut, `${JSON.stringify(review, null, 2)}\n`, "utf8");
      console.log(`Review JSON written: ${resolvedOut}`);
    }

    if (review.decision === "NO_GO") process.exitCode = 1;
    else if (review.decision === "REQUIRES_S10_FALLBACK_ADR") process.exitCode = 3;
  }
} catch (error) {
  console.error(`Foundation report review failed: ${error.message || error}`);
  process.exitCode = 2;
}
