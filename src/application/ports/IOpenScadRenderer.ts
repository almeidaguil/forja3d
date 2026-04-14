import type { ParameterValue } from '../../shared/types'

export interface RenderConfig {
  template: string
  params: Record<string, ParameterValue>
}

export interface IOpenScadRenderer {
  render(config: RenderConfig): Promise<ArrayBuffer>
}
