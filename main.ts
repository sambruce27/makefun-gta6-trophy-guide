// Leonida Trophy Guide — entry program (Node 22, standard library only).
// The guide itself is plain static files in app/ (index.html, style.css, app.js
// and data/trophies.json): no build step, nothing fetched over the network, it
// opens offline from any static server with app/ at its root. This program is
// only the hand-in: it copies app/ and screenshots/ from beside this file into
// the output directory and writes dossier.json there with the vendored
// make.fun library, so the judge reads exactly what the app contains.
// vendor/makefun-frontend.ts is the kit's copy and is left unchanged — the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// Local check:  mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// then open out/dossier.json and serve app/ with `node serve.ts`.
// In the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

// The repository root is the directory holding this file.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Start from a clean output directory so a stale file from an earlier run
// can never ride along into the submission.
mkdirSync(outputDir, { recursive: true });
rmSync(join(outputDir, 'app'), { recursive: true, force: true });
rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
rmSync(join(outputDir, 'dossier.json'), { force: true });

// Copy the whole guide and its screenshots, nothing else. Fail loudly if the
// guide itself is missing instead of handing in an empty output directory.
if (!existsSync(join(repoRoot, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — refusing to build an empty dossier');
}
if (!existsSync(join(repoRoot, 'app', 'data', 'trophies.json'))) {
  throw new Error('app/data/trophies.json is missing — the trophy list is the guide');
}
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (from the kit's gate): the dossier text is capped at
// 160 KiB, at most 4 screenshots of at most 256 KiB each, app/ at most 993
// files and directories and 48 MiB in all. The program writes the whole of
// /output under the platform's own cap (1,000 entries, 64 MiB), which app/,
// screenshots/ and dossier.json share, so the guide leaves them room.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
