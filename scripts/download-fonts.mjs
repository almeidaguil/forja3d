/**
 * Downloads TTF fonts using the google/fonts monorepo which contains ALL Google Fonts
 * in a consistent directory structure: /ofl/{fontname}/{FontName}-{Weight}.ttf
 */

import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const FONTS_DIR = join(__dirname, '..', 'public', 'fonts')

// The google/fonts monorepo has all Google Fonts at consistent paths
const gf = (dir, file) => [
  `https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/${dir}/${file}`,
  `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/${file}`,
  `https://cdn.jsdelivr.net/gh/google/fonts@main/apache/${dir}/${file}`,
  `https://raw.githubusercontent.com/google/fonts/main/apache/${dir}/${file}`,
]

const FONTS = [
  ['NotoSans-Bold.ttf',        ...gf('notosans', 'NotoSans-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf'],
  ['Roboto-Bold.ttf',          ...gf('roboto', 'Roboto-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf'],
  ['OpenSans-Bold.ttf',        ...gf('opensans', 'OpenSans-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/opensans@main/fonts/ttf/OpenSans-Bold.ttf'],
  ['Montserrat-Bold.ttf',      ...gf('montserrat', 'Montserrat-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/Montserrat@main/fonts/ttf/static/Montserrat-Bold.ttf'],
  ['Lato-Bold.ttf',            ...gf('lato', 'Lato-Bold.ttf')],
  ['Raleway-Bold.ttf',         ...gf('raleway', 'Raleway-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/Raleway@main/fonts/ttf/static/Raleway-Bold.ttf'],
  ['Oswald-Bold.ttf',          ...gf('oswald', 'Oswald-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/OswaldFont@main/fonts/ttf/Oswald-Bold.ttf'],
  ['Anton-Regular.ttf',        ...gf('anton', 'Anton-Regular.ttf')],
  ['BebasNeue-Regular.ttf',    ...gf('bebasneue', 'BebasNeue-Regular.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/bebas-neue@main/fonts/ttf/BebasNeue-Regular.ttf'],
  ['Righteous-Regular.ttf',    ...gf('righteous', 'Righteous-Regular.ttf')],
  ['AlfaSlabOne-Regular.ttf',  ...gf('alfaslaboneregular', 'AlfaSlabOne-Regular.ttf'),
                                ...gf('alfaslabone', 'AlfaSlabOne-Regular.ttf')],
  ['Pacifico-Regular.ttf',     ...gf('pacifico', 'Pacifico-Regular.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/Pacifico@main/fonts/ttf/Pacifico-Regular.ttf'],
  ['DancingScript-Bold.ttf',   ...gf('dancingscript', 'DancingScript-Bold.ttf')],
  ['GreatVibes-Regular.ttf',   ...gf('greatvibes', 'GreatVibes-Regular.ttf')],
  ['Sacramento-Regular.ttf',   ...gf('sacramento', 'Sacramento-Regular.ttf')],
  ['Satisfy-Regular.ttf',      ...gf('satisfy', 'Satisfy-Regular.ttf')],
  ['Lobster-Regular.ttf',      ...gf('lobster', 'Lobster-Regular.ttf'),
                                ...gf('lobsterone', 'Lobster-Regular.ttf')],
  ['Caveat-Bold.ttf',          ...gf('caveat', 'Caveat-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/caveat@main/fonts/ttf/Caveat-Bold.ttf'],
  ['PlayfairDisplay-Bold.ttf', ...gf('playfairdisplay', 'PlayfairDisplay-Bold.ttf'),
    'https://cdn.jsdelivr.net/gh/googlefonts/PlayfairDisplay@main/fonts/ttf/static/PlayfairDisplay-Bold.ttf'],
  ['Merriweather-Bold.ttf',    ...gf('merriweather', 'Merriweather-Bold.ttf')],
]

async function downloadFont(filename, ...urls) {
  const dest = join(FONTS_DIR, filename)
  if (existsSync(dest)) { console.log(`  ⏭  ${filename} (already exists)`); return true }
  for (const url of urls) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) { process.stdout.write('.'); continue }
      const buf = Buffer.from(await resp.arrayBuffer())
      if (buf.length < 1000) { process.stdout.write('!'); continue }
      writeFileSync(dest, buf)
      const short = url.replace('https://cdn.jsdelivr.net/gh/', 'cdn:').replace('https://raw.githubusercontent.com/', 'raw:')
      console.log(`  ✅ ${filename} (${Math.round(buf.length / 1024)}KB) — ${short}`)
      return true
    } catch { process.stdout.write('x') }
  }
  console.log(`\n  ❌ ${filename} — all ${urls.length} URLs failed`)
  return false
}

console.log(`\nDownloading fonts to public/fonts/\n`)
let ok = 0, fail = 0
for (const [filename, ...urls] of FONTS) {
  const success = await downloadFont(filename, ...urls)
  success ? ok++ : fail++
}
console.log(`\n✅ ${ok} downloaded  ❌ ${fail} failed\n`)
if (fail > 0) process.exit(1)
