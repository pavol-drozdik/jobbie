const http = require('node:http')
const fs = require('node:fs')
const path = require('node:path')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.json': 'application/json',
  '.map': 'application/json',
}

/**
 * Serves packaged Vue dist over http://127.0.0.1 (Turnstile rejects file:// origins).
 * @param {string} rootDir
 * @param {number} port
 */
function createStaticUiServer(rootDir, port) {
  const root = path.resolve(rootDir)

  const server = http.createServer((req, res) => {
    try {
      const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`)
      let rel = decodeURIComponent(reqUrl.pathname)
      if (rel === '/') rel = '/index.html'

      const filePath = path.normalize(path.join(root, rel.replace(/^\//, '')))
      const relToRoot = path.relative(root, filePath)
      if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
        res.writeHead(403)
        res.end('Forbidden')
        return
      }
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404)
        res.end('Not found')
        return
      }

      const ext = path.extname(filePath).toLowerCase()
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      })
      fs.createReadStream(filePath).pipe(res)
    } catch {
      res.writeHead(500)
      res.end('Internal error')
    }
  })

  return new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        url: `http://127.0.0.1:${port}/`,
      })
    })
  })
}

/**
 * @param {string} rootDir
 * @param {number} preferredPort
 */
async function createStaticUiServerWithFallback(rootDir, preferredPort) {
  const maxAttempts = 12
  let lastError = null
  for (let offset = 0; offset < maxAttempts; offset += 1) {
    const port = preferredPort + offset
    try {
      return await createStaticUiServer(rootDir, port)
    } catch (err) {
      lastError = err
      if (err && typeof err === 'object' && 'code' in err && err.code === 'EADDRINUSE') {
        continue
      }
      throw err
    }
  }
  throw lastError ?? new Error(`No free UI port near ${preferredPort}`)
}

module.exports = { createStaticUiServer, createStaticUiServerWithFallback }
