type Listener = (msg: string) => void
const listeners = new Set<Listener>()

/** Short status message at the top of the screen (rendered by ToastHost). */
export function toast(msg: string): void {
  listeners.forEach((l) => l(msg))
}

export function onToast(l: Listener): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function confirmAction(msg: string): boolean {
  return window.confirm(msg)
}
