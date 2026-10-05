import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const gatePath = path.join(root, 'docs', 'foundation-gate.json');

if (!fs.existsSync(gatePath)) {
  console.error('Stage 02 gate check failed: docs/foundation-gate.json is missing.');
  process.exit(1);
}

const gate = JSON.parse(fs.readFileSync(gatePath, 'utf8'));
const allowedStatus = 'GO_APPROVED';

const guardedPaths = [
  'src',
  'production',
  'app',
  'packages/core',
  'packages/domain',
  'packages/infrastructure',
  'packages/presentation'
];

const existingGuardedPaths = guardedPaths.filter((relative) =>
  fs.existsSync(path.join(root, relative))
);

if (existingGuardedPaths.length && gate.status !== allowedStatus) {
  console.error('Stage 02 production source is blocked by Foundation Gate.');
  console.error(`Current gate status: ${gate.status}`);
  console.error(`Production-like paths found: ${existingGuardedPaths.join(', ')}`);
  console.error('Run the real Premiere foundation verification, review the exported report, then explicitly approve the gate before introducing production source.');
  process.exit(1);
}

console.log(`Stage 02 gate check OK. status=${gate.status}; guardedSourcePresent=${existingGuardedPaths.length > 0}`);
