/// <reference lib="webworker" />

import { normalizeWorkerError, type OpenScadRenderRequest, type OpenScadRenderResponse } from './workerProtocol'

interface OpenScadWorkerInstance {
  renderToStl(code: string): Promise<string>
  getInstance?(): {
    FS: {
      writeFile(path: string, data: string | Uint8Array): void
      mkdir(path: string): void
    }
  }
}

let modulePromise: Promise<typeof import('openscad-wasm-prebuilt')> | null = null
const cancelled = new Set<number>()

function asciiStlToArrayBuffer(ascii: string): ArrayBuffer {
  const lines = ascii.split('\n')
  const triangles: Array<{ normal: [number, number, number]; vertices: [number, number, number][] }> = []
  let currentNormal: [number, number, number] = [0, 0, 0]
  let currentVertices: [number, number, number][] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line.startsWith('facet normal')) {
      const parts = line.split(/\s+/)
      currentNormal = [parseFloat(parts[2]), parseFloat(parts[3]), parseFloat(parts[4])]
      currentVertices = []
      continue
    }
    if (line.startsWith('vertex')) {
      const parts = line.split(/\s+/)
      currentVertices.push([parseFloat(parts[1]), parseFloat(parts[2]), parseFloat(parts[3])])
      continue
    }
    if (line.startsWith('endfacet')) triangles.push({ normal: currentNormal, vertices: currentVertices })
  }

  const numTriangles = triangles.length
  const buffer = new ArrayBuffer(80 + 4 + numTriangles * 50)
  const view = new DataView(buffer)
  view.setUint32(80, numTriangles, true)

  let offset = 84
  for (const tri of triangles) {
    view.setFloat32(offset, tri.normal[0], true); offset += 4
    view.setFloat32(offset, tri.normal[1], true); offset += 4
    view.setFloat32(offset, tri.normal[2], true); offset += 4
    for (const vertex of tri.vertices) {
      view.setFloat32(offset, vertex[0], true); offset += 4
      view.setFloat32(offset, vertex[1], true); offset += 4
      view.setFloat32(offset, vertex[2], true); offset += 4
    }
    view.setUint16(offset, 0, true); offset += 2
  }

  return buffer
}

async function createInstance(): Promise<OpenScadWorkerInstance> {
  if (!modulePromise) modulePromise = import('openscad-wasm-prebuilt')
  const mod = await modulePromise
  const instance = await mod.createOpenSCAD()
  return instance as unknown as OpenScadWorkerInstance
}

function setupFont(instance: OpenScadWorkerInstance, fontData?: ArrayBuffer): void {
  if (!fontData) return
  const raw = instance.getInstance?.()
  if (!raw?.FS) return

  try {
    for (const dir of ['/usr', '/usr/share', '/usr/share/fonts', '/etc', '/etc/fonts', '/tmp', '/tmp/fontcache']) {
      try { raw.FS.mkdir(dir) } catch { /* already exists */ }
    }
    raw.FS.writeFile('/usr/share/fonts/Font.ttf', new Uint8Array(fontData))
    raw.FS.writeFile('/etc/fonts/fonts.conf',
      '<?xml version="1.0"?>' +
      '<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">' +
      '<fontconfig>' +
      '<dir>/usr/share/fonts</dir>' +
      '<cachedir>/tmp/fontcache</cachedir>' +
      '</fontconfig>',
    )
  } catch {
    // Font setup failure is non-fatal. OpenSCAD still attempts default fonts.
  }
}

function post(response: OpenScadRenderResponse): void {
  const transfer = response.ok ? [response.geometry] : []
  self.postMessage(response, transfer)
}

self.onmessage = async (event: MessageEvent<OpenScadRenderRequest | { type: 'cancel'; id: number }>) => {
  const message = event.data
  if ('type' in message && message.type === 'cancel') {
    cancelled.add(message.id)
    return
  }
  const request = message as OpenScadRenderRequest

  try {
    const instance = await createInstance()
    setupFont(instance, request.fontData)
    const asciiStl = await instance.renderToStl(request.scadCode)
    if (cancelled.has(request.id)) {
      cancelled.delete(request.id)
      return
    }
    if (!asciiStl || asciiStl.trim().length === 0) throw new Error('OpenSCAD produziu STL vazio.')
    post({ id: request.id, ok: true, geometry: asciiStlToArrayBuffer(asciiStl) })
  } catch (error) {
    if (cancelled.has(request.id)) {
      cancelled.delete(request.id)
      return
    }
    post({ id: request.id, ok: false, error: normalizeWorkerError(error) })
  }
}
