import { useMemo } from 'react'
import { flamesOf, type Flames } from '../domain/motivation'
import { useStore } from '../store'

export function useFlames(): Flames {
  const s = useStore()
  return useMemo(() => flamesOf(s), [s])
}
