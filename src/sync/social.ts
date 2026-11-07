import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { today } from '../domain/util'
import { tk } from '../i18n'
import { api, ApiError, apiMessage } from './api'
import { useSync } from './engine'

/** What a friend or challenge member shares (see server/src/social.ts). */
export interface FriendView {
  id: number
  name: string
  daily: { count: number; best: number; activeToday: boolean; atRisk: boolean; paused: boolean }
  weekly: { count: number; best: number; active: number; goal: number; done: boolean }
  levels: Record<string, number>
  since?: number
}

export interface ChallengeView {
  id: string
  kind: 'goal' | 'streak'
  title: string
  metric: 'active_days' | 'minutes' | null
  target: number | null
  days: number
  start: string
  end: string
  code: string
  owner: boolean
  status: 'running' | 'done' | 'failed' | 'over'
  total: number
  members: { id: number; name: string; value: number; status?: 'running' | 'out' | 'done'; me: boolean }[]
}

export interface SocialCounts {
  friends: number
  team: number
  grit: number
}

interface SocialCache {
  /** account the cache belongs to */
  userId?: number
  name?: string
  code?: string
  counts?: SocialCounts
  friends: FriendView[]
  challenges: ChallengeView[]
  fetchedAt?: number
}

/** Last answer of the server, so the pages open instantly and show something offline. */
export const useSocial = create<SocialCache>()(
  persist((): SocialCache => ({ friends: [], challenges: [] }), { name: 'zyklus-social', storage: createJSONStorage(() => localStorage) }),
)

/** The cache of the signed-in account only. */
export function useSocialCache(): SocialCache {
  const cache = useSocial()
  const userId = useSync((s) => s.user?.id)
  return cache.userId === userId ? cache : { friends: [], challenges: [] }
}

const day = () => `today=${today()}`
const enc = encodeURIComponent

export const social = {
  me: () => api<{ name: string; code: string; counts: SocialCounts }>('GET', `/social/me?${day()}`),
  rotate: () => api<{ code: string }>('POST', '/social/invite/rotate', {}),
  invite: (code: string) => api<{ name: string; self: boolean; friends: boolean }>('GET', `/social/invite/${enc(code)}`),
  accept: (code: string) => api<{ friend: FriendView }>('POST', `/social/invite/${enc(code)}/accept?${day()}`, {}),
  friends: () => api<{ friends: FriendView[] }>('GET', `/social/friends?${day()}`),
  removeFriend: (id: number) => api('POST', `/social/friends/${id}/remove`, {}),
  challenges: () => api<{ challenges: ChallengeView[] }>('GET', `/social/challenges?${day()}`),
  challenge: (id: string) => api<{ challenge: ChallengeView }>('GET', `/social/challenges/${enc(id)}?${day()}`),
  create: (body: { kind: 'goal' | 'streak'; title: string; metric?: string; target?: number; days: number; invite: number[] }) => api<{ challenge: ChallengeView }>('POST', `/social/challenges?${day()}`, body),
  previewJoin: (code: string) => api<{ challenge: ChallengeView }>('GET', `/social/challenges/join/${enc(code)}?${day()}`),
  join: (code: string) => api<{ challenge: ChallengeView }>('POST', `/social/challenges/join/${enc(code)}?${day()}`, {}),
  inviteToChallenge: (id: string, ids: number[]) => api<{ challenge: ChallengeView }>('POST', `/social/challenges/${enc(id)}/invite?${day()}`, { ids }),
  leave: (id: string) => api('POST', `/social/challenges/${enc(id)}/leave`, {}),
}

/** Refresh in the background when the cache is older than ten minutes (Today shows running challenges). */
export function refreshSocialIfStale() {
  const { fetchedAt, userId } = useSocial.getState()
  if (userId === useSync.getState().user?.id && Date.now() - (fetchedAt ?? 0) < 10 * 60_000) return
  refreshSocial().catch(() => undefined)
}

/** Fetch everything the friends page shows and keep it in the cache. */
export async function refreshSocial(): Promise<void> {
  const userId = useSync.getState().user?.id
  if (!userId) return
  const [me, friends, challenges] = await Promise.all([social.me(), social.friends(), social.challenges()])
  useSocial.setState({ userId, name: me.name, code: me.code, counts: me.counts, friends: friends.friends, challenges: challenges.challenges, fetchedAt: Date.now() })
}

export function socialError(e: unknown): string {
  if (e instanceof ApiError && e.status > 0 && e.status < 500) {
    const s = tk(`social.err.${e.code}`, undefined, '')
    if (s) return s
  }
  return apiMessage(e)
}

/** Invite links opened before signing in or onboarding are remembered and opened afterwards. */
const PENDING_KEY = 'zyklus-pending-invite'
export const INVITE_PATH = /^\/(einladung|challenge)\/[A-Za-z0-9-]+$/
export function rememberInvite(path: string) {
  try {
    if (INVITE_PATH.test(path)) sessionStorage.setItem(PENDING_KEY, path)
  } catch {
    // storage blocked: the link just has to be opened again
  }
}
export function takeInvite(): string | null {
  try {
    const p = sessionStorage.getItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY)
    return p
  } catch {
    return null
  }
}

export const inviteLink = (code: string) => `${location.origin}/#/einladung/${code}`
export const challengeLink = (code: string) => `${location.origin}/#/challenge/${code}`

/** Native share sheet where there is one, otherwise copy to the clipboard. Returns 'copied' when it copied. */
export async function shareLink(text: string, url: string): Promise<'shared' | 'copied' | 'failed'> {
  if (navigator.share) {
    try {
      await navigator.share({ text, url })
      return 'shared'
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'shared'
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`)
    return 'copied'
  } catch {
    return 'failed'
  }
}
