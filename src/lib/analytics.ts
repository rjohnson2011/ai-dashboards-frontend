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

// Ranges offered on the daily approvals chart. The year needs more events
// than the API sends by default; the page asks for them when it is picked.
export type PulseRange = '2w' | '1m' | '3m' | '1y'

export const PULSE_RANGES: Array<{ key: PulseRange; label: string; days: number }> = [
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '1m', label: 'Month', days: 30 },
  { key: '3m', label: '3 months', days: 90 },
  { key: '1y', label: 'Year', days: 365 },
]

export interface DayPoint {
  date: string
  human: number
  dependabot: number
}

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

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function isWeekend(d: Date): boolean {
  const dow = d.getDay()
  return dow === 0 || dow === 6
}

// The team does not review on weekends, so a Saturday or Sunday approval
// counts toward the following Monday.
function toWorkday(d: Date): Date {
  const day = startOfDay(d)
  const dow = day.getDay()
  if (dow === 6) return addDays(day, 2)
  if (dow === 0) return addDays(day, 1)
  return day
}

function pointsFor(dates: Date[]): { points: DayPoint[]; index: Map<string, DayPoint> } {
  const points: DayPoint[] = []
  const index = new Map<string, DayPoint>()
  for (const d of dates) {
    const point = { date: localDateKey(d), human: 0, dependabot: 0 }
    points.push(point)
    index.set(point.date, point)
  }
  return { points, index }
}

function fold(events: ApprovalEvent[], index: Map<string, DayPoint>): void {
  for (const e of events) {
    const point = index.get(localDateKey(toWorkday(new Date(e.at))))
    if (!point) continue
    if (e.dependabot) point.dependabot += 1
    else point.human += 1
  }
}

// Approvals per weekday over the `days` calendar days ending yesterday, so
// the trailing point is always a completed day rather than "today so far".
// Saturday and Sunday are omitted; their approvals fold into the following
// Monday when that Monday is in range.
export function weekdaySeries(events: ApprovalEvent[], days: number, now: Date): DayPoint[] {
  const today = startOfDay(now)
  const dates: Date[] = []
  for (let i = days; i >= 1; i--) {
    const d = addDays(today, -i)
    if (!isWeekend(d)) dates.push(d)
  }
  const { points, index } = pointsFor(dates)
  fold(events, index)
  return points
}

// The last `n` weekdays strictly before today, oldest first.
function completedWeekdays(now: Date, n: number): Date[] {
  const out: Date[] = []
  let d = addDays(startOfDay(now), -1)
  while (out.length < n) {
    if (!isWeekend(d)) out.unshift(d)
    d = addDays(d, -1)
  }
  return out
}

export interface WindowStats {
  count: number
  previous: number
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
// before each (for the delta). The week also carries a sparkline over the
// last seven completed weekdays, so the trailing point is never a partial
// day that reads as a drop.
export function windowSummary(
  events: ApprovalEvent[],
  now: Date
): { day: WindowStats; week: WindowStats & { spark: number[] }; month: WindowStats } {
  const t0 = now.getTime()
  const rolling = (span: number): WindowStats => ({
    count: countBetween(events, t0 - span, t0 + 1),
    previous: countBetween(events, t0 - 2 * span, t0 - span),
  })
  const { points, index } = pointsFor(completedWeekdays(now, 7))
  fold(events, index)
  return {
    day: rolling(DAY),
    week: { ...rolling(7 * DAY), spark: points.map(p => p.human + p.dependabot) },
    month: rolling(30 * DAY),
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
