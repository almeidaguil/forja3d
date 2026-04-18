import { useEffect, useRef } from 'react'
import type { JSX } from 'react'
import * as THREE from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

interface ThreePreviewProps {
  stlBuffer: ArrayBuffer | null
  secondaryStlBuffer?: ArrayBuffer | null
  color: string
}

function Placeholder(): JSX.Element {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 flex items-center justify-center min-h-96 lg:min-h-full">
      <div className="text-center space-y-3">
        <div className="w-20 h-20 rounded-xl bg-zinc-800 mx-auto flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <path d="M16 4L28 11V21L16 28L4 21V11L16 4Z" stroke="#52525b" strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M16 4V28M4 11L28 11M4 21L28 21" stroke="#3f3f46" strokeWidth="1" />
          </svg>
        </div>
        <p className="text-zinc-600 text-sm">Clique em "Gerar Preview" para ver o modelo 3D</p>
      </div>
    </div>
  )
}

export function ThreePreview({ stlBuffer, secondaryStlBuffer, color }: ThreePreviewProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const materialRef = useRef<THREE.MeshPhongMaterial | null>(null)
  const colorRef = useRef(color)
  useEffect(() => { colorRef.current = color }, [color])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !stlBuffer) return

    const width = container.clientWidth
    const height = container.clientHeight || 384

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#18181b')

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 2000)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    container.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.6))
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
    dirLight.position.set(1, 2, 3)
    scene.add(dirLight)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
    fillLight.position.set(-2, -1, -1)
    scene.add(fillLight)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true

    const material = new THREE.MeshPhongMaterial({
      color: colorRef.current,
      specular: 0x222222,
      shininess: 40,
    })
    materialRef.current = material

    const loader = new STLLoader()
    const geometries: THREE.BufferGeometry[] = []

    // Primary mesh (cutter or main model)
    const primaryGeo = loader.parse(stlBuffer)
    primaryGeo.computeBoundingBox()
    const primarySize = new THREE.Vector3()
    primaryGeo.boundingBox!.getSize(primarySize)
    const maxDim = Math.max(primarySize.x, primarySize.y, primarySize.z)

    if (secondaryStlBuffer) {
      // Place cutter on the left, stamp on the right with a gap
      const secondaryGeo = loader.parse(secondaryStlBuffer)
      secondaryGeo.center()
      primaryGeo.center()

      const gap = maxDim * 0.15
      primaryGeo.translate(-maxDim / 2 - gap / 2, 0, 0)
      secondaryGeo.translate(maxDim / 2 + gap / 2, 0, 0)

      scene.add(new THREE.Mesh(primaryGeo, material))
      scene.add(new THREE.Mesh(secondaryGeo, material))
      geometries.push(primaryGeo, secondaryGeo)

      camera.position.set(0, 0, maxDim * 2.5)
    } else {
      primaryGeo.center()
      scene.add(new THREE.Mesh(primaryGeo, material))
      geometries.push(primaryGeo)
      camera.position.set(0, 0, maxDim * 2)
    }

    controls.target.set(0, 0, 0)
    controls.update()

    let frameId: number
    function animate() {
      frameId = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth
      const h = container.clientHeight || 384
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
    })
    observer.observe(container)

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      geometries.forEach(g => g.dispose())
      material.dispose()
      materialRef.current = null
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [stlBuffer, secondaryStlBuffer])

  useEffect(() => {
    if (materialRef.current) materialRef.current.color.set(color)
  }, [color])

  if (!stlBuffer) return <Placeholder />

  return (
    <div
      ref={containerRef}
      className="rounded-xl border border-zinc-800 overflow-hidden min-h-96 lg:min-h-full"
    />
  )
}
