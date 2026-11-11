/** Fixed-window counter per key. One process, so memory is enough. */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>()
  private limit: number
  private windowMs: number
  private now: () => number

  constructor(limit: number, windowMs: number, now: () => number = Date.now) {
    this.limit = limit
    this.windowMs = windowMs
    this.now = now
  }

  /** Counts a hit; returns false once the key is over the limit. */
  take(key: string): boolean {
    const t = this.now()
    const cur = this.hits.get(key)
    if (!cur || cur.resetAt <= t) {
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs })
      return true
    }
    cur.count++
    return cur.count <= this.limit
  }

  /** Read-only check, for counting only failures (e.g. wrong passwords). */
  blocked(key: string): boolean {
    const cur = this.hits.get(key)
    return !!cur && cur.resetAt > this.now() && cur.count >= this.limit
  }

  /** Hits counted in the running window, 0 once it has passed. */
  count(key: string): number {
    const cur = this.hits.get(key)
    return cur && cur.resetAt > this.now() ? cur.count : 0
  }

  reset(key: string): void {
    this.hits.delete(key)
  }

  sweep(): void {
    const t = this.now()
    for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k)
  }
}
