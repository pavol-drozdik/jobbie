const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);
const force = args.includes('--force');
const unsigned = args.includes('--unsigned');

if (!force) {
  const clean = spawnSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'clean:release'],
    {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    },
  );

  if (clean.error) {
    console.error('clean:release failed to start:', clean.error);
  }

  console.log('clean:release exit:', {
    status: clean.status,
    signal: clean.signal,
  });

  if (clean.status !== 0) {
    console.warn(
      'clean:release reported issues; continuing with a fresh output directory.',
    );
  }
}

const outDirName = `release-build-${Date.now()}-${process.pid}`;
const outDir = path.join(root, outDirName);
fs.mkdirSync(outDir, { recursive: true });

console.log('electron-builder output:', {
  outDirName,
  outDir,
  exists: fs.existsSync(outDir),
});

const ebEnv = { ...process.env };
if (unsigned) {
  ebEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
}

const eb = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'electron-builder',
    '--win',
    '--publish',
    'never',
    `-c.directories.output=${outDirName}`,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: ebEnv,
  },
);

if (eb.error) {
  console.error('electron-builder failed to start:', eb.error);
  process.exit(1);
}

if (eb.status !== 0) {
  console.error('electron-builder failed:', {
    status: eb.status,
    signal: eb.signal,
  });
  process.exit(eb.status ?? 1);
}

console.log('electron-builder finished, starting copy step...');

const copy = spawnSync(
  process.execPath,
  [path.join(__dirname, 'copy-win-installer.cjs'), outDirName],
  {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  },
);

console.log('copy step finished with code:', copy.status);

process.exit(copy.status === null ? 1 : copy.status);
