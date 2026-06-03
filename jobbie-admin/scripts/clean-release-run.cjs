const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

const result = isWin
  ? spawnSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'clean-release.ps1')],
      { cwd: root, stdio: 'inherit', shell: false },
    )
  : spawnSync('bash', [path.join(__dirname, 'clean-release.sh')], { cwd: root, stdio: 'inherit', shell: false });

if (result.status !== 0) {
  console.warn('clean:release: some folders could not be removed (build is not blocked).');
}

process.exit(0);
