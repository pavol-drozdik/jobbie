const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.join(__dirname, '..')
const electronVersion = require(path.join(root, 'node_modules', 'electron', 'package.json')).version

console.log(`[rebuild:api-native] electron ${electronVersion}, module api, package ssh2`)

const result = spawnSync(
  'npx',
  ['electron-rebuild', '-m', 'api', '-v', electronVersion, '-w', 'ssh2'],
  { cwd: root, stdio: 'inherit', shell: true },
)

process.exit(result.status === null ? 1 : result.status)
