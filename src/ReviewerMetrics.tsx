import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card'
import { authService } from './services/auth'
import { displayUser } from './lib/utils'
import AppHeader from './components/AppHeader'

type Entry = { reviewer: string; count: number }
type Windows = { day: Entry[]; week: Entry[]; month: Entry[]; ytd: Entry[] }

const WINDOW_LABELS: Array<{ key: keyof Windows; label: string }> = [
  { key: 'day', label: 'Last 24 hours' },
  { key: 'week', label: 'Last 7 days' },
  { key: 'month', label: 'Last 30 days' },
  { key: 'ytd', label: '2026 to date' },
]

function ReviewerMetrics() {
  const [windows, setWindows] = useState<Windows | null>(null)
  const [backendMembers, setBackendMembers] = useState<string[]>([])
  const [backendOnly, setBackendOnly] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const base = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        const res = await fetch(
          `${base}/api/v1/reviews/reviewer_activity?backend_only=${backendOnly}`,
          { headers: { ...authService.getAuthHeaders() } }
        )
        if (res.status === 401 || res.status === 403) {
          authService.logout()
          return
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`)
        const data = await res.json()
        setWindows(data.windows)
        setBackendMembers(data.backend_members || [])
        setError(null)
      } catch {
        setError('Could not load reviewer activity.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [backendOnly])

  return (
    <div className="min-h-screen bg-background">
      <AppHeader variant="classic" />
      <div className="px-4 py-6 space-y-6 mx-auto max-w-[1480px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Reviewer Activity</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Approved reviews per reviewer. Change requests and comments are not counted.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={backendOnly}
              onChange={e => setBackendOnly(e.target.checked)}
            />
            Backend review group only ({backendMembers.length})
          </label>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}

        {windows && !loading && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {WINDOW_LABELS.map(({ key, label }) => {
              const rows = windows[key] || []
              const max = rows.length > 0 ? rows[0].count : 0
              return (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle className="text-base">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No approvals in this window.</p>
                    ) : (
                      rows.map(row => (
                        <div key={row.reviewer} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="truncate">{displayUser(row.reviewer)}</span>
                            <span className="text-muted-foreground tabular-nums">{row.count}</span>
                          </div>
                          {/* Width relative to the window's top reviewer, so
                              each card scales independently. */}
                          <div className="h-1.5 rounded bg-muted overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: max > 0 ? `${(row.count / max) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewerMetrics
