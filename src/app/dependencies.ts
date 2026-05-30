import { CanvasImageTracer } from '../infrastructure/tracer/CanvasImageTracer'
import { ImageConverterAdapter } from '../infrastructure/tracer/ImageConverterAdapter'
import { OpenScadGeometryBuilder } from '../infrastructure/openscad/OpenScadGeometryBuilder'
import { HeightmapStampBuilder } from '../infrastructure/three/HeightmapStampBuilder'
import { PotraceStampBuilder } from '../infrastructure/three/PotraceStampBuilder'
import { QrCodeGeometryBuilder } from '../infrastructure/three/QrCodeGeometryBuilder'
import { QrAssetExporter } from '../infrastructure/qr/QrAssetExporter'
import { QrContentBuilder } from '../infrastructure/qr/QrContentBuilder'
import type { GenerateModelDeps } from '../application/useCases/generateModel'

export interface AppDependencies {
  modelGenerator: GenerateModelDeps
}

export function createAppDependencies(): AppDependencies {
  return {
    modelGenerator: {
      imageTracer: new CanvasImageTracer(),
      imageConverter: new ImageConverterAdapter(),
      geometryBuilder: new OpenScadGeometryBuilder(),
      heightmapBuilder: new HeightmapStampBuilder(),
      potraceBuilder: new PotraceStampBuilder(),
      qrBuilder: new QrCodeGeometryBuilder(),
      qrContentBuilder: new QrContentBuilder(),
      qrAssetExporter: new QrAssetExporter(),
    },
  }
}

