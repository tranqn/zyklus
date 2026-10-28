import { useEffect, useRef, useState } from 'react'
import { ANIMATION } from '../domain/animations'
import { Icon } from './kit'
import { useT } from '../i18n'

type Player = { play(): void; pause(): void; destroy(): void; goToAndStop(v: number, frame: boolean): void }

/** Looping Lottie animation of an exercise (by id) or of a pattern directly (mobility moves),
 * loaded only when it is shown. */
export function ExerciseAnimation({ exerciseId, pattern: direct, label, size = 320 }: { exerciseId?: string; pattern?: string; label: string; size?: number }) {
  const pattern = direct ?? (exerciseId ? ANIMATION[exerciseId] : undefined)
  const { t } = useT()
  const box = useRef<HTMLDivElement>(null)
  const player = useRef<Player | null>(null)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const [playing, setPlaying] = useState(!reduce)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!pattern || !box.current) return
    let cancelled = false
    const el = box.current
    ;(async () => {
      try {
        const [{ default: lottie }, data] = await Promise.all([import('lottie-web/build/player/lottie_light'), fetch(`./anim/${pattern}.json`).then((r) => r.json())])
        if (cancelled) return
        player.current = lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: !reduce, animationData: data }) as unknown as Player
      } catch (e) {
        console.warn('[animation]', pattern, e)
        if (!cancelled) setFailed(true)
      }
    })()
    return () => {
      cancelled = true
      player.current?.destroy()
      player.current = null
    }
  }, [pattern, reduce])

  if (!pattern || failed) return null
  return (
    <figure style={{ margin: '0 auto', position: 'relative', width: '100%', maxWidth: size }}>
      <div ref={box} role="img" aria-label={t('shell.anim.label', { name: label })} style={{ width: '100%', aspectRatio: '1', background: 'var(--surface-2)', borderRadius: 16 }} />
      <button
        className="icon-btn"
        style={{ position: 'absolute', right: 8, bottom: 8, background: 'var(--surface)' }}
        aria-label={playing ? t('shell.anim.pause') : t('shell.anim.play')}
        onClick={() => {
          if (playing) player.current?.pause()
          else player.current?.play()
          setPlaying(!playing)
        }}
      >
        <Icon name={playing ? 'pause' : 'play'} size={18} />
      </button>
    </figure>
  )
}
