import * as THREE from 'three'
import { STLExporter } from 'three/addons/exporters/STLExporter.js'
import QRCode from 'qrcode'
import type { ExtrudeConfig, IGeometryBuilder } from '../../application/ports/IGeometryBuilder'
import { QrContentBuilder } from '../qr/QrContentBuilder'

/**
 * Generates a 3D printable QR Code geometry.
 *
 * Each dark module (cell) becomes a raised box on top of a flat base plate.
 * The base plate has a quiet zone margin so the QR Code remains scannable.
 *
 * Supports multiple QR types: Pix, Wi-Fi, URL, WhatsApp, vCard, plain text.
 */
export class QrCodeGeometryBuilder implements IGeometryBuilder {
  private readonly contentBuilder = new QrContentBuilder()

  async build(config: ExtrudeConfig): Promise<ArrayBuffer> {
    const {
      qrType = 'url',
      qrContent = '',
      qrPixKeyType = 'email',
      qrValue,
      qrIdentifier,
      qrDescription,
      targetSize = 50,
      depth = 3,
      stampRelief = 1.5,
      qrShowBase = true,
    } = config

    // 1. Build the QR content string based on type
    const content = this.buildContent({
      type: qrType as string,
      content: qrContent,
      pixKeyType: qrPixKeyType,
      value: typeof qrValue === 'number' ? qrValue : undefined,
      identifier: typeof qrIdentifier === 'string' ? qrIdentifier : undefined,
      description: typeof qrDescription === 'string' ? qrDescription : undefined,
    })

    // 2. Generate QR Code matrix using qrcode library
    const qrData = QRCode.create(content, { errorCorrectionLevel: 'M' })
    const modules = qrData.modules
    const size = modules.size  // N×N grid

    // 3. Build 3D geometry
    const mmPerModule = targetSize / (size + 8) // +8 for quiet zone (4 each side)
    const quietZone = 4 * mmPerModule

    // Base plate (quiet zone included in totalSize)
    const plateW = size * mmPerModule + quietZone * 2
    const plateGeo = new THREE.BoxGeometry(plateW, plateW, depth)
    plateGeo.translate(0, 0, -depth / 2)

    // Collect all raised module positions (non-indexed — 36 vertices per box)
    const positions: number[] = []
    const origin = -(size * mmPerModule) / 2 + mmPerModule / 2

    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        if (modules.data[row * size + col]) {
          const x = origin + col * mmPerModule
          // QR row 0 = top; Three.js Y increases upward → flip row
          const y = -(origin + row * mmPerModule)

          // Convert to non-indexed so each face has 3 unique vertices
          const geo = new THREE.BoxGeometry(mmPerModule, mmPerModule, stampRelief)
          geo.translate(x, y, stampRelief / 2)
          const ni = geo.toNonIndexed()
          const posAttr = ni.attributes.position
          for (let i = 0; i < posAttr.count; i++) {
            positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i))
          }
          geo.dispose()
          ni.dispose()
        }
      }
    }

    // 4. Merge module geometries (+ base plate if enabled)
    let allPositions: number[]

    if (qrShowBase) {
      const plateNI = plateGeo.toNonIndexed()
      plateNI.deleteAttribute('uv')
      const platePosAttr = plateNI.attributes.position
      const platePosArr: number[] = []
      for (let i = 0; i < platePosAttr.count; i++) {
        platePosArr.push(platePosAttr.getX(i), platePosAttr.getY(i), platePosAttr.getZ(i))
      }
      allPositions = [...platePosArr, ...positions]
    } else {
      allPositions = positions
    }

    const merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.Float32BufferAttribute(allPositions, 3))
    merged.computeVertexNormals()

    // 5. Export to STL
    const mesh = new THREE.Mesh(merged)
    const stlData = new STLExporter().parse(mesh, { binary: true }) as DataView
    const raw = stlData.buffer
    if (!(raw instanceof ArrayBuffer)) throw new Error('Unexpected SharedArrayBuffer from STLExporter')
    return raw.slice(stlData.byteOffset, stlData.byteOffset + stlData.byteLength)
  }

  private buildContent(opts: {
    type: string
    content: string
    pixKeyType: string
    value?: number
    identifier?: string
    description?: string
  }): string {
    return this.contentBuilder.build(opts)
  }
}
