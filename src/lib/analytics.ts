// Pure data shaping for the Sprint Analytics page. Everything here takes the
// reviewer_activity payload (or its `events` list) and a fixed `now`, so the
// charts are deterministic and testable without a DOM.

export interface ApprovalEvent {
  reviewer: string
  at: string
  dependabot: boolean
  pr: number | null
  repo: string | null
}

export interface Entry {
  reviewer: string
  count: number
}

export type WindowKey = 'day' | 'week' | 'month' | 'ytd'
export type ScopeKey = 'all' | 'human' | 'dependabot'
export type Windows = Partial<Record<WindowKey, Entry[]>>
export type Scopes = Partial<Record<ScopeKey, Windows>>

export interface ReviewerActivityPayload {
  scopes: Scopes
  events?: ApprovalEvent[]
  backend_members?: string[]
  generated_at?: string
}

export interface DayPoint {
  date: string
  human: number
  dependabot: number
}

const HOUR = 3_600_000
const DAY = 86_400_000

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function startOfHour(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours())
}

// Whole calendar days from `from` to `to` (negative when `to` is earlier).
// Rounded so a DST shift never pushes a day into its neighbour.
function dayDiff(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY)
}

// Approvals per local calendar day for the last `days` days, ending today.
export function dailySeries(events: ApprovalEvent[], days: number, now: Date): DayPoint[] {
  const today = startOfDay(now)
  const points: DayPoint[] = []
  const index = new Map<string, DayPoint>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)
    const point = { date: localDateKey(d), human: 0, dependabot: 0 }
    points.push(point)
    index.set(point.date, point)
  }
  for (const e of events) {
    const point = index.get(localDateKey(new Date(e.at)))
    if (!point) continue
    if (e.dependabot) point.dependabot += 1
    else point.human += 1
  }
  return points
}

export interface WindowStats {
  count: number
  previous: number
  spark: number[]
}

function countBetween(events: ApprovalEvent[], from: number, to: number): number {
  let n = 0
  for (const e of events) {
    const t = new Date(e.at).getTime()
    if (t >= from && t < to) n += 1
  }
  return n
}

// Rolling counts for the last 24h / 7d / 30d with the equal-length window
// before each (for the delta), plus a sparkline: clock hours for the day,
// calendar days for the week and month, oldest first.
export function windowSummary(events: ApprovalEvent[], now: Date): Record<'day' | 'week' | 'month', WindowStats> {
  const t0 = now.getTime()
  const rolling = (span: number): Omit<WindowStats, 'spark'> => ({
    count: countBetween(events, t0 - span, t0 + 1),
    previous: countBetween(events, t0 - 2 * span, t0 - span),
  })

  const hourly = new Array<number>(24).fill(0)
  const hourEnd = startOfHour(now).getTime()
  for (const e of events) {
    const idx = 23 + Math.round((startOfHour(new Date(e.at)).getTime() - hourEnd) / HOUR)
    if (idx >= 0 && idx < 24) hourly[idx] += 1
  }

  const daily = (n: number): number[] => {
    const buckets = new Array<number>(n).fill(0)
    for (const e of events) {
      const idx = n - 1 + dayDiff(now, new Date(e.at))
      if (idx >= 0 && idx < n) buckets[idx] += 1
    }
    return buckets
  }

  return {
    day: { ...rolling(DAY), spark: hourly },
    week: { ...rolling(7 * DAY), spark: daily(7) },
    month: { ...rolling(30 * DAY), spark: daily(30) },
  }
}

export interface LeaderboardRow {
  reviewer: string
  human: number
  dependabot: number
  total: number
}

// One row per reviewer for a window, human and dependabot approvals side by
// side. Uses the API's per-window totals (which cover YTD, unlike `events`).
export function leaderboardRows(scopes: Scopes, window: WindowKey): LeaderboardRow[] {
  const rows = new Map<string, LeaderboardRow>()
  const add = (entries: Entry[] | undefined, key: 'human' | 'dependabot') => {
    for (const { reviewer, count } of entries ?? []) {
      const row = rows.get(reviewer) ?? { reviewer, human: 0, dependabot: 0, total: 0 }
      row[key] += count
      row.total += count
      rows.set(reviewer, row)
    }
  }
  add(scopes.human?.[window], 'human')
  add(scopes.dependabot?.[window], 'dependabot')
  return [...rows.values()].sort((a, b) => b.total - a.total || a.reviewer.localeCompare(b.reviewer))
}

export interface Heatmap {
  reviewers: string[]
  rows: number[][] // per reviewer: Sunday..Saturday
  max: number
}

// Approvals per reviewer per weekday, for the `topN` busiest reviewers.
export function weekdayHeatmap(events: ApprovalEvent[], topN = 10): Heatmap {
  const perReviewer = new Map<string, number[]>()
  for (const e of events) {
    const row = perReviewer.get(e.reviewer) ?? new Array<number>(7).fill(0)
    row[new Date(e.at).getDay()] += 1
    perReviewer.set(e.reviewer, row)
  }
  const total = (row: number[]) => row.reduce((a, b) => a + b, 0)
  const reviewers = [...perReviewer.keys()]
    .sort((a, b) => total(perReviewer.get(b)!) - total(perReviewer.get(a)!) || a.localeCompare(b))
    .slice(0, topN)
  const rows = reviewers.map(r => perReviewer.get(r)!)
  const max = rows.reduce((m, row) => Math.max(m, ...row), 0)
  return { reviewers, rows, max }
}

export function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  const k = (n / 1000).toFixed(1).replace(/\.0$/, '')
  return `${k}K`
}

// "+12%" / "-8%" / "" — the delta of a window against the one before it.
export function percentDelta(count: number, previous: number): number | null {
  if (previous === 0) return null
  return Math.round(((count - previous) / previous) * 100)
}
