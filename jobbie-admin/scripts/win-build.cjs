const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const unsigned = args.includes('--unsigned');

if (!force) {
  const clean = spawnSync('npm', ['run', 'clean:release'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (clean.status !== 0) {
    console.warn('clean:release reported issues; continuing with a fresh output directory.');
  }
}

const outDirName = `release-build-${Date.now()}-${process.pid}`;
const outDir = path.join(root, outDirName);
fs.mkdirSync(outDir, { recursive: true });
console.log(`electron-builder output: ${outDirName}/`);

const ebEnv = { ...process.env };
if (unsigned) {
  ebEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
}

const eb = spawnSync(
  'npx',
  ['electron-builder', '--win', `-c.directories.output=${outDirName}`],
  { cwd: root, stdio: 'inherit', shell: true, env: ebEnv },
);

if (eb.status !== 0) {
  process.exit(eb.status === null ? 1 : eb.status);
}

const copy = spawnSync('node', [path.join(__dirname, 'copy-win-installer.cjs'), outDirName], {
  cwd: root,
  stdio: 'inherit',
  shell: false,
});

process.exit(copy.status === null ? 1 : copy.status);
