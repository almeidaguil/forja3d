import { useState } from 'react'
import type { ParameterSchema, ParameterValue } from '../../shared/types'

export interface UseParameterFormReturn {
  values: Record<string, ParameterValue>
  imageFile: File | null
  setValue: (key: string, value: ParameterValue) => void
  setImageFile: (file: File | null) => void
}

export function useParameterForm(parameters: ParameterSchema[]): UseParameterFormReturn {
  const [values, setValues] = useState<Record<string, ParameterValue>>(
    () => Object.fromEntries(parameters.map((p) => [p.key, p.default]))
  )
  const [imageFile, setImageFile] = useState<File | null>(null)

  const setValue = (key: string, value: ParameterValue): void => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  return { values, imageFile, setValue, setImageFile }
}
