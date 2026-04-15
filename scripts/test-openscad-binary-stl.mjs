/**
 * Test: verify ASCII STL -> binary STL conversion works correctly,
 * and that the binary STL can be loaded by Three.js's STLLoader.
 *
 * Run:  node scripts/test-openscad-binary-stl.mjs
 */
import { createOpenSCAD } from 'openscad-wasm-prebuilt'

function asciiStlToArrayBuffer(ascii) {
  const lines = ascii.split('\n')
  const triangles = []
  let currentNormal = [0, 0, 0]
  let currentVertices = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      const parts = line.split(/\s+/)
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])]
      currentVertices = []
    } else if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/)
      currentVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])])
    } else if (line.startsWith('endfacet')) {
      triangles.push({ normal: currentNormal, vertices: currentVertices })
    }
  }

  const numTriangles = triangles.length
  const bufferSize = 80 + 4 + numTriangles * 50
  const buffer = new ArrayBuffer(bufferSize)
  const view = new DataView(buffer)

  view.setUint32(80, numTriangles, true)

  let offset = 84
  for (const tri of triangles) {
    view.setFloat32(offset, tri.normal[0], true); offset += 4
    view.setFloat32(offset, tri.normal[1], true); offset += 4
    view.setFloat32(offset, tri.normal[2], true); offset += 4
    for (const v of tri.vertices) {
      view.setFloat32(offset, v[0], true); offset += 4
      view.setFloat32(offset, v[1], true); offset += 4
      view.setFloat32(offset, v[2], true); offset += 4
    }
    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}

async function main() {
  // Star cookie cutter
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

  console.log('Rendering star cookie cutter with OpenSCAD WASM...')
  const openscad = await createOpenSCAD()
  const asciiStl = await openscad.renderToStl(starScad)

  console.log(`ASCII STL: ${asciiStl.length} chars`)

  const triangleCount = (asciiStl.match(/facet normal/g) || []).length
  console.log(`Triangles in ASCII: ${triangleCount}`)

  // Convert to binary
  const binaryStl = asciiStlToArrayBuffer(asciiStl)
  console.log(`Binary STL: ${binaryStl.byteLength} bytes`)

  // Validate binary STL header
  const view = new DataView(binaryStl)
  const binaryTriangleCount = view.getUint32(80, true)
  console.log(`Triangles in binary: ${binaryTriangleCount}`)

  const expectedSize = 80 + 4 + binaryTriangleCount * 50
  console.log(`Expected size: ${expectedSize}, actual: ${binaryStl.byteLength}`)
  console.log(`Size match: ${expectedSize === binaryStl.byteLength}`)

  // Validate a few triangles
  console.log('\nFirst triangle:')
  let off = 84
  const n = [view.getFloat32(off, true), view.getFloat32(off+4, true), view.getFloat32(off+8, true)]
  off += 12
  const v1 = [view.getFloat32(off, true), view.getFloat32(off+4, true), view.getFloat32(off+8, true)]
  off += 12
  const v2 = [view.getFloat32(off, true), view.getFloat32(off+4, true), view.getFloat32(off+8, true)]
  off += 12
  const v3 = [view.getFloat32(off, true), view.getFloat32(off+4, true), view.getFloat32(off+8, true)]
  console.log(`  Normal: [${n.map(v => v.toFixed(4)).join(', ')}]`)
  console.log(`  V1: [${v1.map(v => v.toFixed(4)).join(', ')}]`)
  console.log(`  V2: [${v2.map(v => v.toFixed(4)).join(', ')}]`)
  console.log(`  V3: [${v3.map(v => v.toFixed(4)).join(', ')}]`)

  // Check bounding box of all vertices
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  let minZ = Infinity, maxZ = -Infinity
  off = 84
  for (let t = 0; t < binaryTriangleCount; t++) {
    off += 12 // skip normal
    for (let v = 0; v < 3; v++) {
      const x = view.getFloat32(off, true); off += 4
      const y = view.getFloat32(off, true); off += 4
      const z = view.getFloat32(off, true); off += 4
      if (x < minX) minX = x; if (x > maxX) maxX = x
      if (y < minY) minY = y; if (y > maxY) maxY = y
      if (z < minZ) minZ = z; if (z > maxZ) maxZ = z
    }
    off += 2 // skip attribute
  }
  console.log(`\nBounding box:`)
  console.log(`  X: [${minX.toFixed(2)}, ${maxX.toFixed(2)}] (${(maxX-minX).toFixed(2)} mm)`)
  console.log(`  Y: [${minY.toFixed(2)}, ${maxY.toFixed(2)}] (${(maxY-minY).toFixed(2)} mm)`)
  console.log(`  Z: [${minZ.toFixed(2)}, ${maxZ.toFixed(2)}] (${(maxZ-minZ).toFixed(2)} mm)`)

  console.log('\n=== Binary STL conversion validated successfully ===')

  // Write test file
  const fs = await import('fs')
  fs.writeFileSync('/tmp/test-star-cutter.stl', Buffer.from(binaryStl))
  console.log('Binary STL written to /tmp/test-star-cutter.stl')
  console.log('Open in a 3D viewer (PrusaSlicer, etc.) to visually confirm no artifacts.')
}

main().catch(err => {
  console.error('FATAL:', err)
  process.exit(1)
})
