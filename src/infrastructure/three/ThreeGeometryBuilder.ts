import * as THREE from 'three'
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'

export class ThreeGeometryBuilder implements IGeometryBuilder {
  build(config: ExtrudeConfig): ArrayBuffer {
    const { pathData, targetSize, depth } = config

    // Wrap path in a minimal SVG so SVGLoader can parse it
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${pathData}"/></svg>`
    const svgData = new SVGLoader().parse(svgString)

    const geometries: THREE.BufferGeometry[] = []
    for (const path of svgData.paths) {
      for (const shape of SVGLoader.createShapes(path)) {
        geometries.push(
          new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false })
        )
      }
    }

    if (!geometries.length) throw new Error('No geometry generated from path data')

    const merged = geometries.length === 1 ? geometries[0] : mergeGeometries(geometries)

    // Flip Y axis: SVG is Y-down, Three.js is Y-up
    merged.applyMatrix4(new THREE.Matrix4().makeScale(1, -1, 1))

    // Scale XY to targetSize mm, keep depth as specified
    merged.computeBoundingBox()
    const box = merged.boundingBox!
    const xySpan = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
    if (xySpan > 0) {
      const s = targetSize / xySpan
      merged.applyMatrix4(new THREE.Matrix4().makeScale(s, s, 1))
    }

    // Center XY at origin
    merged.computeBoundingBox()
    const center = new THREE.Vector3()
    merged.boundingBox!.getCenter(center)
    merged.translate(-center.x, -center.y, 0)

    // Export to binary STL
    const mesh = new THREE.Mesh(merged)
    const exporter = new STLExporter()
    const stlData = exporter.parse(mesh, { binary: true }) as DataView
    // Slice to own the ArrayBuffer (DataView may share a larger buffer)
    const raw = stlData.buffer
    if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
    return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
  }
}
