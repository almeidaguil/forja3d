/**
 * End-to-end test: verify openscad-wasm-prebuilt can render a cookie cutter ring.
 *
 * Run:  node scripts/test-openscad-wasm.mjs
 */
import { createOpenSCAD } from 'openscad-wasm-prebuilt'

async function main() {
  console.log('Initializing OpenSCAD WASM...')
  const openscad = await createOpenSCAD()
  console.log('OpenSCAD WASM initialized successfully.\n')

  // --- Test 1: Simple cube ---
  console.log('Test 1: Simple cube')
  try {
    const cubeStl = await openscad.renderToStl('cube([10, 10, 10]);')
    const cubeLines = cubeStl.split('\n').length
    const cubeTriangles = (cubeStl.match(/facet normal/g) || []).length
    console.log(`  OK: ${cubeLines} lines, ${cubeTriangles} triangles`)
    console.log(`  First line: ${cubeStl.split('\n')[0]}`)
  } catch (e) {
    console.log(`  ERROR: ${e}`)
  }
  console.log()

  // --- Test 2: Cookie cutter ring from star polygon ---
  console.log('Test 2: Star cookie cutter ring (the hard case)')
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
    offset(r = -1.5)
      polygon(points = [${starPoints.join(',')}]);
  }
}
`
  try {
    const starStl = await openscad.renderToStl(starScad)
    const starTriangles = (starStl.match(/facet normal/g) || []).length
    console.log(`  OK: ${starTriangles} triangles`)
    console.log(`  Valid STL: ${starStl.startsWith('solid') && starStl.trimEnd().endsWith('endsolid')}`)
  } catch (e) {
    console.log(`  ERROR: ${e}`)
    console.log('  Note: OpenSCAD WASM may only support one callMain per instance.')
    console.log('  This means we need to create a new instance per render.')
  }
  console.log()

  // If test 2 failed, try with a fresh instance
  console.log('Test 2b: Star cookie cutter ring (fresh instance)')
  try {
    const openscad2 = await createOpenSCAD()
    const starStl = await openscad2.renderToStl(starScad)
    const starTriangles = (starStl.match(/facet normal/g) || []).length
    console.log(`  OK: ${starTriangles} triangles`)
    console.log(`  Valid STL: ${starStl.startsWith('solid') && starStl.trimEnd().endsWith('endsolid')}`)
  } catch (e) {
    console.log(`  ERROR: ${e}`)
  }
  console.log()

  // --- Test 3: Direct instance.callMain approach with noExitRuntime ---
  console.log('Test 3: Using low-level API directly')
  try {
    const openscad3 = await createOpenSCAD()
    const inst = openscad3.getInstance()
    inst.FS.writeFile('/input.scad', starScad)
    const exitCode = inst.callMain(['/input.scad', '-o', '/output.stl'])
    console.log(`  callMain exit code: ${exitCode}`)
    const stlData = inst.FS.readFile('/output.stl', { encoding: 'utf8' })
    const triangles = (stlData.match(/facet normal/g) || []).length
    console.log(`  OK: ${triangles} triangles`)
    inst.FS.unlink('/input.scad')
    inst.FS.unlink('/output.stl')
  } catch (e) {
    console.log(`  ERROR: ${e}`)
  }
  console.log()

  console.log('=== Tests complete ===')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
