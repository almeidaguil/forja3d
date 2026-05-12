import { CanvasImageTracer } from '../infrastructure/tracer/CanvasImageTracer'
import { OpenScadGeometryBuilder } from '../infrastructure/openscad/OpenScadGeometryBuilder'
import { HeightmapStampBuilder } from '../infrastructure/three/HeightmapStampBuilder'
import { PotraceStampBuilder } from '../infrastructure/three/PotraceStampBuilder'
import { QrCodeGeometryBuilder } from '../infrastructure/three/QrCodeGeometryBuilder'
import type { GenerateModelDeps } from '../application/useCases/generateModel'

export interface AppDependencies {
  modelGenerator: GenerateModelDeps
}

export function createAppDependencies(): AppDependencies {
  return {
    modelGenerator: {
      imageTracer: new CanvasImageTracer(),
      geometryBuilder: new OpenScadGeometryBuilder(),
      heightmapBuilder: new HeightmapStampBuilder(),
      potraceBuilder: new PotraceStampBuilder(),
      qrBuilder: new QrCodeGeometryBuilder(),
    },
  }
}

