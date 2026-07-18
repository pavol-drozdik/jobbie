const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const args = process.argv.slice(2);

const force = args.includes('--force');
const unsigned = args.includes('--unsigned');

function runCommand(command, commandArgs, options = {}) {
  const isWindowsCmd =
    process.platform === 'win32' && command.toLowerCase().endsWith('.cmd');

  return spawnSync(
    command,
    commandArgs,
    {
      ...options,
      shell: isWindowsCmd,
    },
  );
}

if (!force) {
  const clean = runCommand(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['run', 'clean:release'],
    {
      cwd: root,
      stdio: 'inherit',
    },
  );

  if (clean.error) {
    console.warn('clean:release failed:', clean.error.message);
  }

  if (clean.status !== 0) {
    console.warn(
      'clean:release failed, continuing with fresh output directory.',
    );
  }
}

const outDirName = `release-build-${Date.now()}-${process.pid}`;

const outDir = path.join(root, outDirName);

fs.mkdirSync(outDir, { recursive: true });

console.log('electron-builder output:', outDirName);

const ebEnv = {
  ...process.env,
};

if (unsigned) {
  ebEnv.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
}

const electronBuilderBin = path.join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32'
    ? 'electron-builder.cmd'
    : 'electron-builder',
);

if (!fs.existsSync(electronBuilderBin)) {
  console.error(
    'electron-builder not found:',
    electronBuilderBin,
  );
  process.exit(1);
}

console.log('using electron-builder:', electronBuilderBin);

const eb = runCommand(
  electronBuilderBin,
  [
    '--win',
    '--publish',
    'never',
    `-c.directories.output=${outDirName}`,
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: ebEnv,
  },
);

if (eb.error) {
  console.error(
    'electron-builder start failed:',
    eb.error,
  );
  process.exit(1);
}

if (eb.status !== 0) {
  console.error(
    'electron-builder failed:',
    {
      status: eb.status,
      signal: eb.signal,
    },
  );

  process.exit(eb.status ?? 1);
}

console.log('electron-builder finished.');

const copy = spawnSync(
  process.execPath,
  [
    path.join(
      __dirname,
      'copy-win-installer.cjs',
    ),
    outDirName,
  ],
  {
    cwd: root,
    stdio: 'inherit',
  },
);

if (copy.error) {
  console.error(
    'copy step failed:',
    copy.error,
  );
  process.exit(1);
}

if (copy.status !== 0) {
  console.error(
    'copy step failed with code:',
    copy.status,
  );
  process.exit(copy.status ?? 1);
}

console.log('copy step completed successfully.');