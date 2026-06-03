import fs from 'node:fs'

const h = fs.readFileSync('Jobbie design/A_B _ Desktop.html', 'utf8')
const markers = [
  '1 248 nových ponúk tento týždeň',
  'Nájdi prácu,',
  'Spájame uchádzačov',
  'Hľadať',
  'Sklad &amp; logistika',
  'Hľadám prácu',
  'Chcem inzerovať',
  '1 200+ ponúk',
  'Overení zamestnávatelia',
  'Zadarmo',
  '4,8 / 5',
  'Prihláška odoslaná',
]

for (const label of markers) {
  const i = h.indexOf(label)
  if (i < 0) {
    console.log('MISSING', label)
    continue
  }
  const snip = h.slice(i - 2500, i + 800)
  const fsz = [...new Set(snip.match(/font-size:\s*([0-9.]+px)/g) || [])]
  const fw = [...new Set(snip.match(/font-weight:\s*([0-9]+)/g) || [])]
  const col = [...new Set(snip.match(/(?:color|background-color):\s*(rgb[a]?[^;]+)/g) || [])].slice(-8)
  const inline = [...new Set(snip.match(/inline-size:\s*([0-9.]+px)/g) || [])].slice(-5)
  const block = [...new Set(snip.match(/block-size:\s*([0-9.]+px)/g) || [])].slice(-5)
  const pad = [...new Set(snip.match(/padding:\s*([^;]{4,50})/g) || [])].slice(-4)
  const br = [...new Set(snip.match(/border-radius:\s*([^;]{3,40})/g) || [])].slice(-4)
  console.log('\n===', label, '===')
  console.log('font', fsz, 'weight', fw)
  console.log('colors', col)
  console.log('size', inline, block)
  console.log('pad', pad, 'br', br)
}
