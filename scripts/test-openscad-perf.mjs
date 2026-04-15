/**
 * Performance test: measure time for OpenSCAD WASM instance creation + rendering.
 *
 * Run:  node scripts/test-openscad-perf.mjs
 */
import { createOpenSCAD } from 'openscad-wasm-prebuilt'

const starPoints = []
for (let i = 0; i < 10; i++) {
  const angle = (Math.PI / 5) * i - Math.PI / 2
  const r = i % 2 === 0 ? 30 : 12
  starPoints.push(`[${(35 + r * Math.cos(angle)).toFixed(4)},${(35 + r * Math.sin(angle)).toFixed(4)}]`)
}
const starScad = `
$fn = 32;
linear_extrude(height = 20) {
  difference() {
    polygon(points = [${starPoints.join(',')}]);
    offset(r = -1.5) polygon(points = [${starPoints.join(',')}]);
  }
}
`

async function main() {
  // Warm up: first instance creation is always slowest (module loading)
  console.log('Warming up (first instance)...')
  let t0 = Date.now()
  const warm = await createOpenSCAD()
  console.log(`  First instance creation: ${Date.now() - t0}ms`)

  t0 = Date.now()
  await warm.renderToStl(starScad)
  console.log(`  First render: ${Date.now() - t0}ms`)
  console.log()

  // Measure 3 sequential renders (each with a new instance)
  console.log('Sequential renders (new instance each time):')
  for (let i = 0; i < 3; i++) {
    t0 = Date.now()
    const inst = await createOpenSCAD()
    const tInit = Date.now() - t0

    t0 = Date.now()
    const stl = await inst.renderToStl(starScad)
    const tRender = Date.now() - t0

    const triangles = (stl.match(/facet normal/g) || []).length
    console.log(`  Run ${i+1}: init=${tInit}ms, render=${tRender}ms, total=${tInit+tRender}ms, triangles=${triangles}`)
  }
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
