// Checks a built dist/ folder for the PWA rules of the release brief (D1, D2).
// Usage: node scripts/verify-dist.mjs <dist-dir>
// Prints one line per check and exits 1 when any check fails.
// It reads sw.js as text. It never runs the service worker.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, posix, relative, sep } from 'node:path'

const distArg = process.argv[2]
if (!distArg) {
  console.error('Usage: node scripts/verify-dist.mjs <dist-dir>')
  process.exit(2)
}
const dist = distArg

const COLOR = '#121314'
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const EXPECTED_ICONS = [
  { sizes: '192x192', purpose: 'any' },
  { sizes: '512x512', purpose: 'any' },
  { sizes: '512x512', purpose: 'maskable' },
]

const read = (name) => readFileSync(join(dist, name), 'utf8')

// Every file below a folder of dist/, as a posix path relative to dist/.
function listFiles(folder) {
  const root = join(dist, folder)
  if (!existsSync(root)) return []
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else found.push(relative(dist, full).split(sep).join('/'))
    }
  }
  walk(root)
  return found.sort()
}

// An icon src is relative to the manifest, which sits at the root of dist/.
const iconPath = (src) => posix.normalize(src.replace(/^\//, ''))

function loadManifest() {
  if (!existsSync(join(dist, 'manifest.webmanifest'))) {
    throw new Error(`${join(dist, 'manifest.webmanifest')} does not exist`)
  }
  return JSON.parse(read('manifest.webmanifest'))
}

function precacheUrls() {
  if (!existsSync(join(dist, 'sw.js'))) throw new Error(`${join(dist, 'sw.js')} does not exist`)
  const sw = read('sw.js')
  const call = /precacheAndRoute\(\[(.*?)\],\{/s.exec(sw)
  if (!call) throw new Error('sw.js has no precacheAndRoute([...]) list')
  const urls = [...call[1].matchAll(/url:"([^"]+)"/g)].map((match) => match[1])
  if (urls.length === 0) throw new Error('the precache list in sw.js is empty')
  return new Set(urls)
}

function missingFrom(precache, files) {
  return files.filter((file) => !precache.has(file))
}

function requireListed(precache, files, what) {
  if (files.length === 0) throw new Error(`dist has no ${what} to check`)
  const missing = missingFrom(precache, files)
  if (missing.length > 0) {
    throw new Error(`the precache list does not name ${what}: ${missing.join(', ')}`)
  }
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label} is ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
  }
}

function readPngSize(file) {
  const bytes = readFileSync(join(dist, file))
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error(`${file} is not a PNG file (bad signature)`)
  }
  if (bytes.subarray(12, 16).toString('ascii') !== 'IHDR') {
    throw new Error(`${file} has no IHDR chunk after the PNG signature`)
  }
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

function manifestLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map((match) => match[0])
    .filter((tag) => /\brel=["']?manifest["']?(?=[\s/>"'])/i.test(tag))
}

const checks = [
  {
    name: 'manifest: name and short_name are "Trening"',
    run() {
      const manifest = loadManifest()
      expectEqual('name', manifest.name, 'Trening')
      expectEqual('short_name', manifest.short_name, 'Trening')
    },
  },
  {
    name: 'manifest: id, start_url and scope are "/"',
    run() {
      const manifest = loadManifest()
      expectEqual('id', manifest.id, '/')
      expectEqual('start_url', manifest.start_url, '/')
      expectEqual('scope', manifest.scope, '/')
    },
  },
  {
    name: 'manifest: display standalone and lang pl',
    run() {
      const manifest = loadManifest()
      expectEqual('display', manifest.display, 'standalone')
      expectEqual('lang', manifest.lang, 'pl')
    },
  },
  {
    name: `manifest: background_color and theme_color are ${COLOR}`,
    run() {
      const manifest = loadManifest()
      expectEqual('background_color', String(manifest.background_color).toLowerCase(), COLOR)
      expectEqual('theme_color', String(manifest.theme_color).toLowerCase(), COLOR)
    },
  },
  {
    name: 'manifest: icons are 192 any, 512 any and 512 maskable, all image/png',
    run() {
      const icons = loadManifest().icons
      if (!Array.isArray(icons)) throw new Error('icons is not a list')
      const actual = icons.map((icon) => `${icon.sizes} ${icon.purpose}`).sort()
      const expected = EXPECTED_ICONS.map((icon) => `${icon.sizes} ${icon.purpose}`).sort()
      expectEqual('the icon list (sizes and purpose)', actual.join(', '), expected.join(', '))
      for (const icon of icons) expectEqual(`type of ${icon.src}`, icon.type, 'image/png')
    },
  },
  {
    name: 'icons: every icon file is a PNG with the size the manifest names',
    run() {
      const icons = loadManifest().icons
      if (!Array.isArray(icons) || icons.length === 0) throw new Error('the manifest has no icons')
      for (const icon of icons) {
        const file = iconPath(icon.src)
        if (!existsSync(join(dist, file))) throw new Error(`${file} does not exist in dist`)
        const [width, height] = String(icon.sizes).split('x').map(Number)
        const actual = readPngSize(file)
        if (actual.width !== width || actual.height !== height) {
          throw new Error(
            `${file} is ${actual.width}x${actual.height}, the manifest says ${icon.sizes}`,
          )
        }
      }
    },
  },
  {
    name: 'index.html: manifest link has crossorigin="use-credentials"',
    run() {
      const links = manifestLinks(read('index.html'))
      if (links.length !== 1) {
        throw new Error(`index.html has ${links.length} manifest links, expected 1`)
      }
      if (!/\bhref=["']?\/manifest\.webmanifest["']?(?=[\s/>"'])/.test(links[0])) {
        throw new Error(`the manifest link does not point to /manifest.webmanifest: ${links[0]}`)
      }
      if (!/\bcrossorigin=["']use-credentials["']/.test(links[0])) {
        throw new Error(`the manifest link has no crossorigin="use-credentials": ${links[0]}`)
      }
    },
  },
  {
    name: 'sw.js: exists and has a precache list',
    run() {
      precacheUrls()
    },
  },
  {
    name: 'sw.js precache: index.html',
    run() {
      requireListed(precacheUrls(), ['index.html'], 'index.html')
    },
  },
  {
    name: 'sw.js precache: every file in dist/assets/',
    run() {
      requireListed(precacheUrls(), listFiles('assets'), 'files from dist/assets/')
    },
  },
  {
    name: 'sw.js precache: favicon.svg',
    run() {
      requireListed(precacheUrls(), ['favicon.svg'], 'favicon.svg')
    },
  },
  {
    name: 'sw.js precache: every dist/fonts/*.woff2',
    run() {
      const fonts = listFiles('fonts').filter((file) => file.endsWith('.woff2'))
      requireListed(precacheUrls(), fonts, 'fonts from dist/fonts/')
    },
  },
  {
    name: 'sw.js precache: every manifest icon',
    run() {
      const icons = loadManifest().icons
      if (!Array.isArray(icons) || icons.length === 0) throw new Error('the manifest has no icons')
      requireListed(precacheUrls(), icons.map((icon) => iconPath(icon.src)), 'manifest icons')
    },
  },
  {
    name: 'sw.js precache: no font licence .txt file',
    run() {
      const text = [...precacheUrls()].filter((url) => url.endsWith('.txt'))
      if (text.length > 0) throw new Error(`the precache list names text files: ${text.join(', ')}`)
    },
  },
  {
    name: 'sw.js: navigation fallback to index.html',
    run() {
      if (!existsSync(join(dist, 'sw.js'))) throw new Error(`${join(dist, 'sw.js')} does not exist`)
      const sw = read('sw.js')
      if (!/NavigationRoute\(\w+\.createHandlerBoundToURL\("index\.html"\)/.test(sw)) {
        throw new Error('sw.js has no NavigationRoute bound to index.html')
      }
    },
  },
]

let failed = 0
for (const check of checks) {
  try {
    check.run()
    console.log(`ok   ${check.name}`)
  } catch (error) {
    failed += 1
    console.log(`FAIL ${check.name}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failed > 0) {
  console.error(`verify-dist: ${failed} of ${checks.length} checks failed`)
  process.exit(1)
}
console.log(`verify-dist: all ${checks.length} checks passed`)
