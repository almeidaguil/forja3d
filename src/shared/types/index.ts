export type ParameterType = 'string' | 'number' | 'boolean' | 'select' | 'color' | 'image'

export type ParameterValue = string | number | boolean

export type RenderStrategy =
  | { type: 'openscad'; scadTemplate: string }
  | { type: 'three-extrude'; svgSource: 'image' | 'builtin'; builtinShape?: BuiltinShape }
  | { type: 'three-heightmap'; svgSource: 'image' }
  | { type: 'potrace-stamp'; svgSource: 'image' }

export type BuiltinShape = 'circle' | 'square' | 'hexagon' | 'star'

export type ModelCategory =
  | 'cutters'
  | 'stamps'
  | 'keychains'
  | 'signs'
  | 'letters'

export interface ParameterSchema {
  key: string
  type: ParameterType
  label: string
  default: ParameterValue
  min?: number
  max?: number
  step?: number
  options?: string[]
  unit?: string
}

export interface Model {
  id: string
  slug: string
  title: string
  description: string
  category: ModelCategory
  coverImage?: string
  renderStrategy: RenderStrategy
  parameters: ParameterSchema[]
  creditsRequired: number // V2: used by credit system; always 1 in V1
}

export interface GenerationResult {
  status: 'success' | 'error'
  geometry?: ArrayBuffer
  error?: string
}
