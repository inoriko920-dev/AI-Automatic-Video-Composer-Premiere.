import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const reviewer = path.resolve("scripts/review-foundation-report.mjs");
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aavc-foundation-review-"));

function baseReport() {
  const statuses = {};
  for (let i = 1; i <= 16; i += 1) statuses[`S${String(i).padStart(2, "0")}`] = "PASS";
  return {
    schema: 1,
    generatedAt: "2026-01-01T00:00:00.000Z",
    product: "AI Automatic Video Composer Premiere",
    foundationVersion: "0.0.6",
    host: {
      name: "Premiere Pro",
      version: "25.6.0",
      uxpVersion: "8.0.0",
      osPlatform: "win32",
      osRelease: "test",
      architecture: "x64"
    },
    statuses,
    results: {},
    diagnosticsLog: "synthetic self-test only"
  };
}

function runCase(name, mutate, expectedCode, expectedDecision) {
  const report = baseReport();
  mutate(report);
  const reportPath = path.join(tempDir, `${name}.json`);
  const outPath = path.join(tempDir, `${name}.review.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  const child = spawnSync(process.execPath, [reviewer, reportPath, "--out", outPath], {
    cwd: process.cwd(),
    encoding: "utf8"
  });

  const actualCode = child.status ?? 0;
  if (actualCode !== expectedCode) {
    throw new Error(`${name}: expected exit ${expectedCode}, got ${actualCode}\nSTDOUT:\n${child.stdout}\nSTDERR:\n${child.stderr}`);
  }

  if (!fs.existsSync(outPath)) {
    throw new Error(`${name}: reviewer did not produce output JSON`);
  }

  const review = JSON.parse(fs.readFileSync(outPath, "utf8"));
  if (review.decision !== expectedDecision) {
    throw new Error(`${name}: expected decision ${expectedDecision}, got ${review.decision}`);
  }
  if (review.gateMutationPerformed !== false) {
    throw new Error(`${name}: reviewer must never mutate the gate`);
  }
  if (!/^[a-f0-9]{64}$/.test(review.source.sha256 || "")) {
    throw new Error(`${name}: missing/invalid SHA-256 evidence hash`);
  }

  console.log(`PASS ${name}: ${review.decision} (exit ${actualCode})`);
}

try {
  runCase("go-candidate", () => {}, 0, "GO_CANDIDATE");
  runCase("hard-blocker", (report) => { report.statuses.S07 = "FAIL"; }, 1, "NO_GO");
  runCase("s10-needs-adr", (report) => { report.statuses.S10 = "PASS_WITH_LIMIT"; }, 3, "REQUIRES_S10_FALLBACK_ADR");
  console.log("Foundation reviewer self-tests passed.");
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
