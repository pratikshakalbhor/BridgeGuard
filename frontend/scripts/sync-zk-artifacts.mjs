#!/usr/bin/env node
// Copies the compiled BridgeGuard contract + ZK artifacts from the repo-root
// `compact compile` output into the frontend so that ZK proof generation can
// run locally in the browser:
//
//   contracts/managed/bridgeguard-v2/contract/  -> src/generated/contract/
//   contracts/managed/bridgeguard-v2/keys/      -> public/zk/keys/
//   contracts/managed/bridgeguard-v2/zkir/      -> public/zk/zkir/
//
// The browser proof provider (`FetchZkConfigProvider`) resolves prover keys,
// verifier keys and the .bzkir intermediate representation from `public/zk`,
// which Vite copies into `dist/` at build time. The compiled contract module
// is imported directly by the browser proof service.
//
// Run automatically before `npm run dev` and `npm run build` (predev/prebuild).
import { mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, '..');
const managed = resolve(frontendRoot, '..', 'contracts', 'managed', 'bridgeguard-v2');

const targets = [
  { from: join(managed, 'contract', 'index.js'), to: join(frontendRoot, 'src', 'generated', 'contract', 'index.js') },
  { from: join(managed, 'contract', 'index.js.map'), to: join(frontendRoot, 'src', 'generated', 'contract', 'index.js.map') },
  { from: join(managed, 'contract', 'index.d.ts'), to: join(frontendRoot, 'src', 'generated', 'contract', 'index.d.ts') },
];

if (!existsSync(managed)) {
  console.error(`[sync-zk-artifacts] Missing managed contract at ${managed}.`);
  console.error('Run `npm run compile` (compact compile) at the repo root first.');
  process.exit(1);
}

function copyDir(from, to) {
  if (!existsSync(from)) {
    console.error(`[sync-zk-artifacts] Missing artifact directory ${from}`);
    process.exit(1);
  }
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    copyFileSync(join(from, entry), join(to, entry));
  }
}

let copied = 0;
for (const t of targets) {
  if (!existsSync(t.from)) {
    console.error(`[sync-zk-artifacts] Missing file ${t.from}`);
    process.exit(1);
  }
  mkdirSync(dirname(t.to), { recursive: true });
  copyFileSync(t.from, t.to);
  copied += 1;
}

copyDir(join(managed, 'keys'), join(frontendRoot, 'public', 'zk', 'keys'));
copyDir(join(managed, 'zkir'), join(frontendRoot, 'public', 'zk', 'zkir'));

console.log(`[sync-zk-artifacts] Copied ${copied} contract files + keys/ + zkir/ -> frontend (${frontendRoot})`);