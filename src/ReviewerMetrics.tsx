import { useEffect, useMemo, useState } from 'react'
import AppHeader from './components/AppHeader'
import StatTile, { Delta } from './components/analytics/StatTile'
import PulseChart from './components/analytics/PulseChart'
import Leaderboard from './components/analytics/Leaderboard'
import WeekdayHeatmap from './components/analytics/WeekdayHeatmap'
import { SeriesLegend } from './components/analytics/PulseChart'
import { A } from './components/analytics/theme'
import { authService } from './services/auth'
import { mockReviewerActivity } from './services/mockData'
import {
  type PulseRange,
  type ReviewerActivityPayload,
  PULSE_RANGES,
  type WindowKey,
  weekdaySeries,
  formatCompact,
  leaderboardRows,
  weekdayHeatmap,
  windowSummary,
} from './lib/analytics'

// Read at call time (not module load) so tests can switch it off per run.
const mockModeOn = () => import.meta.env.VITE_USE_MOCK_DATA === 'true'

const WINDOW_TABS: Array<{ key: WindowKey; label: string; empty: string }> = [
  { key: 'day', label: '24 hours', empty: 'No approvals in the last 24 hours.' },
  { key: 'week', label: '7 days', empty: 'No approvals in the last 7 days.' },
  { key: 'month', label: '30 days', empty: 'No approvals in the last 30 days.' },
  { key: 'ytd', label: 'Year to date', empty: 'No approvals yet this year.' },
]

// Sprint Analytics: approved reviews, who gave them, and when. Approvals only;
// change requests and comments are stored but never counted (team decision).
function ReviewerMetrics() {
  const [data, setData] = useState<ReviewerActivityPayload | null>(null)
  const [backendOnly, setBackendOnly] = useState(true)
  const [window, setWindow] = useState<WindowKey>('week')
  const [range, setRange] = useState<PulseRange>('2w')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // 90 days of events covers every range but the year, which asks for more.
  const eventsDays = range === '1y' ? 366 : 90

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        if (mockModeOn()) {
          if (!cancelled) setData(mockReviewerActivity())
          return
        }
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        const res = await fetch(`${base}/api/v1/reviews/reviewer_activity?backend_only=${backendOnly}&events_days=${eventsDays}`, {
          headers: { ...authService.getAuthHeaders() },
        })
        if (res.status === 401 || res.status === 403) {
          authService.logout()
          return
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const json = (await res.json()) as ReviewerActivityPayload
        if (!cancelled) {
          setData(json)
          setError(null)
        }
      } catch {
        if (!cancelled) setError('Could not load review activity. Check the API and try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [backendOnly, eventsDays, reloadKey])

  // Anchor "now" to the API's timestamp so every derived number agrees with
  // the totals it computed, and so a re-render never shifts a day bucket.
  const now = useMemo(() => (data?.generated_at ? new Date(data.generated_at) : new Date()), [data])
  const events = useMemo(() => data?.events ?? [], [data])
  const summary = useMemo(() => windowSummary(events, now), [events, now])
  const rangeDays = PULSE_RANGES.find(r => r.key === range)?.days ?? 14
  const series = useMemo(() => weekdaySeries(events, rangeDays, now), [events, rangeDays, now])
  // The heatmap always describes the last 90 days, whatever the chart range.
  const heatEvents = useMemo(() => {
    const cutoff = now.getTime() - 90 * 86_400_000
    return events.filter(e => new Date(e.at).getTime() >= cutoff)
  }, [events, now])
  const heat = useMemo(() => weekdayHeatmap(heatEvents, 10), [heatEvents])
  const rows = useMemo(() => (data ? leaderboardRows(data.scopes, window) : []), [data, window])
  const ytd = useMemo(
    () => (data?.scopes.all?.ytd ?? []).reduce((sum, e) => sum + e.count, 0),
    [data]
  )
  const memberCount = data?.backend_members?.length ?? 0
  const tab = WINDOW_TABS.find(t => t.key === window) ?? WINDOW_TABS[1]

  return (
    <div className="min-h-screen" style={{ background: A.bg, color: A.text }}>
      <AppHeader variant="classic" lastUpdated={data?.generated_at ?? null} />

      <main className="mx-auto max-w-[1480px] px-5 py-6 sm:px-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>Sprint Analytics</h1>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              Approved reviews on the repositories this dashboard follows. Change requests and comments are not counted.
            </p>
          </div>
          <label className="flex cursor-pointer select-none items-center gap-2.5" style={{ fontSize: 13 }}>
            <span
              role="switch"
              aria-checked={backendOnly}
              tabIndex={0}
              onClick={() => setBackendOnly(v => !v)}
              onKeyDown={e => {
                if (e.key === ' ' || e.key === 'Enter') {
                  e.preventDefault()
                  setBackendOnly(v => !v)
                }
              }}
              className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2"
              style={{ background: backendOnly ? A.accent : A.mutedSoft }}
            >
              <span
                className="inline-block h-4 w-4 rounded-full transition-transform"
                style={{ background: A.text, transform: backendOnly ? 'translateX(18px)' : 'translateX(2px)' }}
              />
            </span>
            Backend review group only{memberCount > 0 ? ` (${memberCount})` : ''}
          </label>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-md px-4 py-3" style={{ border: `1px solid ${A.down}`, fontSize: 13 }}>
            <span>{error}</span>
            <button
              type="button"
              onClick={() => setReloadKey(k => k + 1)}
              className="rounded-md px-2.5 py-1"
              style={{ border: `1px solid ${A.line}`, fontSize: 12 }}
            >
              Retry
            </button>
          </div>
        )}

        {!data && loading && !error && (
          <p className="mt-10" style={{ fontSize: 13 }}>Loading approvals…</p>
        )}

        {data && (
          <div
            aria-busy={loading}
            className="mt-6 transition-opacity"
            style={{ opacity: loading ? 0.5 : 1 }}
          >
            {/* Hero band: the one number, its neighbours, and the pulse. */}
            <section className="grid gap-4 lg:grid-cols-[minmax(300px,2fr)_5fr]">
              <div className="flex flex-col gap-3">
                <div className="rounded-lg px-5 py-4" style={{ background: A.surface, border: `1px solid ${A.line}` }}>
                  <div style={{ fontSize: 13 }}>Approvals in the last 30 days</div>
                  <div data-testid="hero-count" style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.05, marginTop: 6 }}>
                    {formatCompact(summary.month.count)}
                  </div>
                  <div className="mt-2">
                    <Delta count={summary.month.count} previous={summary.month.previous} period="30 days before" />
                  </div>
                </div>
                <StatTile label="Last 24 hours" count={summary.day.count} previous={summary.day.previous} note="day before" />
                <StatTile label="Last 7 days" count={summary.week.count} previous={summary.week.previous} spark={summary.week.spark} note="week before" />
                <StatTile label="Year to date" count={ytd} note={`Since January 1, ${now.getFullYear()}`} />
              </div>
              <div className="rounded-lg px-5 py-4" style={{ background: A.surface, border: `1px solid ${A.line}` }}>
                <PulseChart data={series} range={range} onRangeChange={setRange} />
              </div>
            </section>

            <section className="mt-8 grid gap-8 lg:grid-cols-5" style={{ borderTop: `1px solid ${A.line}`, paddingTop: 24 }}>
              <div className="lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 style={{ fontSize: 14, fontWeight: 500 }}>Who is reviewing</h2>
                    <p style={{ fontSize: 12 }}>Approvals per reviewer, {tab.label.toLowerCase()}.</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <SeriesLegend />
                    <div role="tablist" aria-label="Window" className="flex rounded-md p-0.5" style={{ background: A.mutedSoft }}>
                      {WINDOW_TABS.map(t => {
                        const active = t.key === window
                        return (
                          <button
                            key={t.key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setWindow(t.key)}
                            className="rounded px-2.5 py-1 transition-colors"
                            style={{
                              fontSize: 12,
                              fontWeight: active ? 600 : 400,
                              color: A.text,
                              background: active ? A.accent : 'transparent',
                            }}
                          >
                            {t.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <Leaderboard rows={rows} emptyNote={tab.empty} />
              </div>
              <div className="lg:col-span-2">
                <h2 style={{ fontSize: 14, fontWeight: 500 }}>When reviews happen</h2>
                <p style={{ fontSize: 12 }}>Approvals by weekday, last 90 days, busiest ten reviewers.</p>
                <WeekdayHeatmap heat={heat} />
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}

export default ReviewerMetrics
