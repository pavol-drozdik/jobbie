const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outputDirName = process.argv[2];
if (!outputDirName) {
  console.error('Usage: node scripts/copy-win-installer.cjs <output-dir-name>');
  process.exit(1);
}

const buildDir = path.join(root, outputDirName);
const releaseDir = path.join(root, 'release');

if (!fs.existsSync(buildDir)) {
  console.error(`Missing ${outputDirName}/ - run electron-builder first.`);
  process.exit(1);
}

const setup = fs
  .readdirSync(buildDir)
  .find((name) => name.endsWith('-Setup.exe') && name.startsWith('JOBBIE-Admin-'));

if (!setup) {
  console.error(`No JOBBIE-Admin-*-Setup.exe in ${outputDirName}/`);
  process.exit(1);
}

fs.mkdirSync(releaseDir, { recursive: true });
const dest = path.join(releaseDir, setup);
fs.copyFileSync(path.join(buildDir, setup), dest);
console.log(`Copied installer to ${dest}`);

for (const name of fs.readdirSync(buildDir)) {
  if (name === 'latest.yml' || name.endsWith('.blockmap')) {
    const ymlDest = path.join(releaseDir, name);
    fs.copyFileSync(path.join(buildDir, name), ymlDest);
    console.log(`Copied ${name} to ${ymlDest}`);
  }
}
