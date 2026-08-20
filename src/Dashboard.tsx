import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { authService } from './services/auth'
import { subscribeToPullRequests } from './services/actionCable'
import { APP_VERSION } from './version'
import { CHANGELOG } from './changelog'
// import { LoginButton } from './components/LoginButton'
// import { UserProfile } from './components/UserProfile'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Input } from './components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table'
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ExternalLink,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import { useTheme } from './contexts/ThemeContext'
import { displayUser, isGhostUser } from './lib/utils'
import AppHeader from './components/AppHeader'

interface CheckRun {
  name: string
  status: string
  url: string
  description?: string
  required?: boolean
}

interface PullRequest {
  id: number
  number: number
  title: string
  author: string
  created_at: string
  updated_at: string
  url: string
  state: string
  draft: boolean
  mergeable?: boolean
  additions?: number
  deletions?: number
  changed_files?: number
  ci_status: string
  failing_checks: CheckRun[]
  total_checks: number
  successful_checks: number
  failed_checks: number
  backend_approval_status: string
  ready_for_backend_review: boolean
  approval_summary?: {
    status: string
    approved_count: number
    changes_requested_count: number
    pending_count: number
    approved_users: string[]
    changes_requested_users: string[]
    commented_users: string[]
    pending_users: string[]
    pending_teams: string[]
  }
  labels?: string[]
  repository_name?: string
  repository_owner?: string
  awaiting_author_changes?: boolean
  changes_requested_info?: {
    status: string
    message: string
    backend_commenter?: string
    backend_comment_at?: string
    author_comment_at?: string
    backend_reviewer?: string
    dismissed_at?: string
    requested_at?: string
    approved_at?: string
  } | null
  latest_reviewer_activity?: {
    message: string
    user: string
    type: string
    reviewer_type: string
    timestamp: string
    preview?: string
    url?: string
  } | null
}

interface ApiResponse {
  pull_requests: PullRequest[]
  approved_pull_requests: PullRequest[]
  count: number
  approved_count: number
  repository: string
  last_updated: string
  updating: boolean
  rate_limit?: {
    remaining: number
    limit: number
    resets_at: string
  }
}


// All bucketing predicates and the backend reviewer list live in
// types/pull-request.ts so that /dashboard and /redesign share one
// source of truth.
import {
  isTrulyExemptFromBackendReview,
  isReadyForReview,
  isAwaitingAuthorChanges,
  isFinishedUnmerged,
  needsFirstTeamReview,
  isDependabot,
} from './types/pull-request'
import { isInFailingCiBucket } from './lib/dashboard'

// The event each changes-requested status is reporting happened at a specific
// moment, and "when" is what tells a reviewer whether it's stale. Each status
// carries its own timestamp field, so pick the one that matches.
function changesRequestedTimestamp(
  info: NonNullable<PullRequest['changes_requested_info']>
): string | null {
  switch (info.status) {
    case 'changes_requested':
      return info.requested_at || info.backend_comment_at || null
    case 'new_commits_after_approval':
      return info.approved_at || null
    case 'backend_approval_dismissed':
    case 'new_commit_from_author':
      return info.dismissed_at || null
    case 'new_comment_from_author':
      return info.author_comment_at || info.backend_comment_at || null
    default:
      return null
  }
}

// Eastern time, matching the reviewer-activity column. Includes the date since
// these events are often days old — a bare clock time reads as "today".
function formatEastern(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  })
}

function Dashboard() {
  useTheme()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [, setRateLimit] = useState<ApiResponse['rate_limit'] | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>('updated')
  // Oldest-updated first: a PR that hasn't moved in days is the one most likely
  // to be forgotten, so it belongs at the top of the queue rather than buried
  // under PRs that were touched minutes ago. Clicking the column still toggles.
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [activeFilter, setActiveFilter] = useState<string>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [popupsBlocked, setPopupsBlocked] = useState(false)

  // Use ref to avoid stale closure in polling interval
  const lastUpdatedRef = useRef<string | null>(null)

  useEffect(() => {
    // Fetch PRs immediately on mount
    fetchPullRequests()
  }, [])

  // Polling effect - fallback when WebSocket is disconnected
  useEffect(() => {
    // Poll every 5 seconds when updating, every 60 seconds otherwise
    const interval = isUpdating ? 5000 : 60000

    const timer = setInterval(() => {
      fetchPullRequests(true)
    }, interval)

    return () => clearInterval(timer)
  }, [isUpdating])

  // ActionCable WebSocket - real-time updates from server
  useEffect(() => {
    const unsubscribe = subscribeToPullRequests(() => {
      fetchPullRequests(true)
    })
    return unsubscribe
  }, [])


  const fetchPullRequests = useCallback(async (isPolling = false, retryCount = 0) => {
    const maxRetries = 3

    if (!isPolling) {
      setLoading(true)
    }

    try {
      let data: ApiResponse
      if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
        const { mockApiResponse } = await import('./services/mockData')
        await new Promise(r => setTimeout(r, 100))
        data = mockApiResponse() as unknown as ApiResponse
      } else {
        // Add timeout to detect slow/cold server
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout

        // Fetch all repositories - no params needed
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reviews`, {
          headers: {
            ...authService.getAuthHeaders()
          },
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (response.status === 401 || response.status === 403) {
          authService.logout()
          return
        }
        if (!response.ok) {
          throw new Error('Failed to fetch pull requests')
        }
        data = await response.json()
      }

      // Update the updating status
      setIsUpdating(data.updating || false)

      // Only update data if it has changed (use ref to avoid stale closure)
      if (!isPolling || data.last_updated !== lastUpdatedRef.current) {
        // Combine both regular and approved pull requests
        const allPRs = [...(data.pull_requests || []), ...(data.approved_pull_requests || [])]
        setPullRequests(allPRs)
        lastUpdatedRef.current = data.last_updated
        setLastUpdated(data.last_updated)
        setRateLimit(data.rate_limit || null)
      }

      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Error fetching PRs:', err)

      // Auto-retry on timeout (server might be waking up)
      if (!isPolling && retryCount < maxRetries) {
        console.log(`Retrying... (attempt ${retryCount + 1}/${maxRetries})`)
        setTimeout(() => fetchPullRequests(false, retryCount + 1), 2000)
        return
      }

      if (!isPolling) {
        const isTimeout = err instanceof Error && err.name === 'AbortError'
        setError(isTimeout
          ? 'Server is waking up. Please wait a moment and try again.'
          : (err instanceof Error ? err.message : 'An error occurred'))
      }
      setLoading(false)
    }
  }, [])


  const getCIStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-success" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-danger" />
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />
      default:
        return <AlertCircle className="h-4 w-4 text-tertiary" />
    }
  }


  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffInMs = now.getTime() - then.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    // If the timestamp is in the future, it's likely a timezone issue
    if (diffInMs < 0) {
      return 'just now'
    }

    if (diffInMinutes < 1) {
      return 'just now'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
    }
  }


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc')
      } else if (sortDirection === 'desc') {
        // Third click: reset to default order
        setSortColumn(null)
        setSortDirection('asc')
      }
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const sortPullRequests = (prs: PullRequest[]) => {
    if (!sortColumn) return prs

    return [...prs].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortColumn) {
        case 'number':
          aValue = a.number
          bValue = b.number
          break
        case 'title':
          aValue = a.title
          bValue = b.title
          break
        case 'author':
          aValue = a.author
          bValue = b.author
          break
        case 'ci_status':
          aValue = a.ci_status
          bValue = b.ci_status
          break
        case 'failures':
          aValue = a.failed_checks
          bValue = b.failed_checks
          break
        case 'approvals':
          aValue = a.approval_summary?.approved_count || 0
          bValue = b.approval_summary?.approved_count || 0
          break
        case 'backend_approval':
          aValue = a.backend_approval_status
          bValue = b.backend_approval_status
          break
        case 'created':
          aValue = new Date(a.created_at).getTime()
          bValue = new Date(b.created_at).getTime()
          break
        case 'updated':
          aValue = new Date(a.updated_at).getTime()
          bValue = new Date(b.updated_at).getTime()
          break
        case 'repository':
          aValue = a.repository_name || 'vets-api'
          bValue = b.repository_name || 'vets-api'
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  // hasNonReviewFailingChecks, needsTeamApproval, isTrulyExemptFromBackendReview
  // are now imported from types/pull-request.ts so /dashboard and /redesign
  // share the same logic.

  const filterPullRequests = (prs: PullRequest[]) => {
    let filtered = prs
    
    // Apply card filter via the shared predicates from types/pull-request.ts
    // and lib/dashboard.ts, so /dashboard and /redesign agree on bucketing.
    switch (activeFilter) {
      case 'ready':
        filtered = filtered.filter(isReadyForReview)
        // Default to showing newest updated PRs first for ready for review
        if (!sortColumn) {
          filtered = filtered.sort((a, b) => {
            const aTime = new Date(a.updated_at).getTime()
            const bTime = new Date(b.updated_at).getTime()
            return bTime - aTime
          })
        }
        break
      case 'failing':
        filtered = filtered.filter(isInFailingCiBucket)
        break
      case 'draft':
        filtered = filtered.filter(pr => pr.draft)
        break
      case 'reviewed-today':
        filtered = filtered.filter(needsFirstTeamReview)
        break
      case 'awaiting-changes':
        filtered = filtered.filter(isAwaitingAuthorChanges)
        break
      case 'exempt':
        filtered = filtered.filter(pr => !pr.draft && isTrulyExemptFromBackendReview(pr))
        break
      case 'finished':
        filtered = filtered.filter(isFinishedUnmerged)
        break
      case 'dependabot':
        filtered = filtered.filter(isDependabot)
        break
    }
    
    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(pr => 
        pr.title.toLowerCase().includes(search) ||
        pr.author.toLowerCase().includes(search) ||
        pr.number.toString().includes(search) ||
        pr.failing_checks.some(check => check.name.toLowerCase().includes(search))
      )
    }
    
    return filtered
  }

  const filteredPullRequests = sortPullRequests(filterPullRequests(pullRequests))

  // Open every currently visible PR (respecting the active filter + sort order)
  // in a new browser tab.
  //
  // Browsers gate opening multiple tabs on the site having pop-ups allowed:
  // without that, only the FIRST window.open() per user gesture succeeds and the
  // rest are blocked (verified in Chrome — anchor-click loops and setTimeout
  // staggering are blocked too; staggering is worse because it runs outside the
  // gesture). So we open all tabs synchronously inside the click gesture — which
  // opens every tab once the user allows pop-ups for the site — and detect the
  // blocked case to show a one-time "allow pop-ups" hint.
  const handleOpenAll = () => {
    const urls = filteredPullRequests.map((pr) => pr.url).filter(Boolean)
    if (urls.length === 0) return

    if (
      urls.length > 10 &&
      !window.confirm(`Open all ${urls.length} visible PRs in new tabs?`)
    ) {
      return
    }

    let openedCount = 0
    urls.forEach((url) => {
      const win = window.open(url, '_blank', 'noopener,noreferrer')
      if (win) openedCount++
    })

    // If we tried to open more than one but the browser only let one (or none)
    // through, pop-ups are blocked for this site. Surface a hint; otherwise
    // clear any previous hint.
    setPopupsBlocked(urls.length > 1 && openedCount < urls.length)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading pull requests...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
            <Button onClick={() => fetchPullRequests(false)} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen bg-background">
        <AppHeader
          variant="classic"
          lastUpdated={lastUpdated}
          isUpdating={isUpdating}
          onRefresh={() => fetchPullRequests()}
        />
        <div className="flex-1 space-y-6 sm:space-y-8 px-3 sm:px-2 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Repositories Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">Pull requests across configured repositories:</p>
              <p className="text-xs text-muted-foreground">vets-api, vets-api-mockdata, platform-atlas</p>
            </div>
            <div className="flex items-center gap-2">
              {showSearch ? (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-64"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowSearch(false)
                      setSearchTerm('')
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSearch(true)}
                >
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </Button>
              )}
            </div>
          </div>
          <div className="space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-2 sm:gap-3">
                <Card 
                  className={`gradient-card gradient-ready-review cursor-pointer ${activeFilter === 'ready' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('ready')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ready for Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(isReadyForReview).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CI passing, team approved or non-vets-api PRs
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`gradient-card gradient-awaiting-changes cursor-pointer ${activeFilter === 'awaiting-changes' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('awaiting-changes')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Awaiting Changes
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(isAwaitingAuthorChanges).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reviewer requested changes
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`gradient-card gradient-dependabot cursor-pointer ${activeFilter === 'dependabot' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('dependabot')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dependabot PRs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(isDependabot).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automated updates
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`gradient-card gradient-total-prs cursor-pointer ${activeFilter === 'all' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pull Requests
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">{pullRequests.length}</div>
                    <p className="text-xs text-muted-foreground">
                      All open PRs
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  className={`gradient-card gradient-ci-failures cursor-pointer ${activeFilter === 'failing' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('failing')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failing CI
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(isInFailingCiBucket).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Failing multiple checks
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  className={`gradient-card gradient-drafts cursor-pointer ${activeFilter === 'draft' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('draft')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Draft PRs
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(pr => pr.draft).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Work in progress
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`gradient-card gradient-needs-review cursor-pointer ${activeFilter === 'reviewed-today' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('reviewed-today')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      PRs Needing Team Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(needsFirstTeamReview).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting team review
                    </p>
                  </CardContent>
                </Card>
                <Card
                  className={`gradient-card gradient-exempt cursor-pointer ${activeFilter === 'exempt' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('exempt')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Exempt BE Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(pr => !pr.draft && isTrulyExemptFromBackendReview(pr)).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Backend review not required
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  className={`gradient-card gradient-finished cursor-pointer ${activeFilter === 'finished' ? 'selected' : ''}`}
                  onClick={() => setActiveFilter('finished')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Finished but Unmerged
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[85px]">
                    <div className="text-2xl font-semibold">
                      {pullRequests.filter(isFinishedUnmerged).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ready to merge
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                    <CardTitle>Pull Requests</CardTitle>
                    <CardDescription>
                      {activeFilter === 'ready' && 'Ready for Review - PRs with team approvals awaiting backend review'}
                      {activeFilter === 'all' && 'Total Pull Requests - All open PRs in the repository'}
                      {activeFilter === 'failing' && 'Failing CI - PRs with failing CI checks that need attention'}
                      {activeFilter === 'draft' && 'Draft PRs - Work in progress pull requests'}
                      {activeFilter === 'reviewed-today' && 'PRs Needing Team Review - Awaiting initial team review'}
                      {activeFilter === 'awaiting-changes' && 'Awaiting Author Changes - Reviewers requested changes that need to be addressed'}
                      {activeFilter === 'exempt' && 'Exempt BE Review - PRs that do not require backend review'}
                      {activeFilter === 'finished' && 'Finished but Unmerged - Backend approved PRs ready to merge'}
                      {activeFilter === 'dependabot' && 'Dependabot PRs - Automated dependency updates'}
                    </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleOpenAll}
                      disabled={filteredPullRequests.length === 0}
                      className="shrink-0 whitespace-nowrap"
                      title="Open every visible PR in a new tab (in the current sort order)"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open All ({filteredPullRequests.length})
                    </Button>
                  </div>
                  {popupsBlocked && (
                    <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                      <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        Your browser blocked some of the new tabs. Click the
                        pop-up icon in the address bar and choose{' '}
                        <span className="font-medium">
                          “Always allow pop-ups from this site”
                        </span>
                        , then click <span className="font-medium">Open All</span>{' '}
                        again.
                      </div>
                      <button
                        type="button"
                        onClick={() => setPopupsBlocked(false)}
                        className="shrink-0 text-amber-300/80 hover:text-amber-100"
                        aria-label="Dismiss"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-x-auto">
                    <Table className="w-full">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[70px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'number' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('number')}
                              aria-sort={sortColumn === 'number' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              PR
                            </button>
                          </TableHead>
                          <TableHead className="w-[90px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'repository' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('repository')}
                              aria-sort={sortColumn === 'repository' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Repo
                            </button>
                          </TableHead>
                          <TableHead className="w-[180px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'title' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('title')}
                              aria-sort={sortColumn === 'title' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Title
                            </button>
                          </TableHead>
                          <TableHead className="w-[100px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'author' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('author')}
                              aria-sort={sortColumn === 'author' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Author
                            </button>
                          </TableHead>
                          <TableHead className="w-[90px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'ci_status' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('ci_status')}
                              aria-sort={sortColumn === 'ci_status' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              CI Status
                            </button>
                          </TableHead>
                          <TableHead className="w-[100px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'failures' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('failures')}
                              aria-sort={sortColumn === 'failures' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              CI Failures
                            </button>
                          </TableHead>
                          <TableHead className="w-[90px]">
                            <button
                              className={`table-header-sortable ${sortColumn === 'approvals' ? 'table-header-sorted' : ''}`}
                              onClick={() => handleSort('approvals')}
                              aria-sort={sortColumn === 'approvals' ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
                            >
                              Approvals
                            </button>
                          </TableHead>
                          <TableHead className="w-[100px]">Changes Requested</TableHead>
                          <TableHead className="w-[90px]">Commented</TableHead>
                          <TableHead className="w-[70px]">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('created')}
                            >
                              Created
                              {sortColumn === 'created' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="w-[80px] text-right">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors ml-auto"
                              onClick={() => handleSort('updated')}
                            >
                              Updated
                              {sortColumn === 'updated' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPullRequests.map((pr) => (
                          <TableRow 
                            key={pr.id || `${pr.number}-${pr.id}`}
                            className="cursor-pointer table-row-hover table-row-stripe"
                          >
                          <TableCell className="font-medium">
                            <a
                              href={pr.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline"
                            >
                              #{pr.number}
                            </a>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {pr.repository_name || 'vets-api'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {pr.draft && <Badge variant="outline">Draft</Badge>}
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline max-w-[250px] truncate"
                              >
                                {pr.title}
                              </a>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isGhostUser(pr.author) ? (
                              <span className="text-muted-foreground italic">{displayUser(pr.author)}</span>
                            ) : (
                              <a
                                href={`https://va.ghe.com/${pr.author}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-primary"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {pr.author}
                              </a>
                            )}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <a
                                  href={`${pr.url}#pullrequestreview-new_review_form`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {getCIStatusIcon(pr.ci_status)}
                                  <span className="text-sm">
                                    {(() => {
                                      // Trust ci_status as the source of truth
                                      if (pr.ci_status === 'success') {
                                        return <span className="text-success">All passing</span>;
                                      } else if (pr.ci_status === 'pending') {
                                        const pendingCount = (pr.total_checks - pr.successful_checks - pr.failed_checks) || 1;
                                        return <span className="text-warning">{pendingCount} pending</span>;
                                      } else if (pr.ci_status === 'failure') {
                                        // Filter out the backend-review-group check - it's a required review, not CI
                                        const ciFailures = pr.failing_checks?.filter(c => !c.name.includes('backend-review-group')) || [];
                                        if (ciFailures.length > 0) {
                                          return <span className="text-destructive">{ciFailures.length} {ciFailures.length === 1 ? 'failure' : 'failing'}</span>;
                                        } else if (pr.failed_checks > 0) {
                                          // Has failures but they're all backend-review-group (filtered out)
                                          return <span className="text-warning">{pr.failed_checks} {pr.failed_checks === 1 ? 'failure' : 'failures'} (review)</span>;
                                        }
                                        return <span className="text-destructive">Failing</span>;
                                      } else {
                                        return <span className="text-muted-foreground">{pr.ci_status}</span>;
                                      }
                                    })()}
                                  </span>
                                </a>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="space-y-1">
                                  <p className="font-semibold">CI Status: {pr.ci_status}</p>
                                  <p>Successful: {pr.successful_checks}</p>
                                  <p>Failed: {pr.failed_checks}</p>
                                  <p>Pending/Skipped: {pr.total_checks - pr.successful_checks - pr.failed_checks}</p>
                                  <p>Total: {pr.total_checks}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pr.ci_status === 'success' ? (
                                <span className="text-xs text-muted-foreground">None</span>
                              ) : pr.ci_status === 'pending' && pr.total_checks - pr.successful_checks === 1 && pr.failed_checks === 0 ? (
                                <span className="text-xs font-medium text-warning">Succeed if backend approval is confirmed</span>
                              ) : pr.failing_checks.length > 0 ? (
                                pr.failing_checks.map((check, idx) => (
                                  <a
                                    key={idx}
                                    href={`${pr.url}#pullrequestreview-new_review_form`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-destructive hover:underline truncate max-w-[120px]"
                                    title={
                                      check.name === 'Status Checks'
                                        ? 'Requires backend approval'
                                        : check.name
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {check.name === 'Status Checks'
                                      ? 'Requires backend approval'
                                      : check.name}
                                  </a>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pr.approval_summary?.approved_users && pr.approval_summary.approved_users.length > 0 ? (
                                <a
                                  href={pr.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block hover:underline text-primary"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {pr.approval_summary?.approved_users?.map((user, idx) => (
                                    <div key={idx} className={`text-xs ${isGhostUser(user) ? 'italic text-muted-foreground' : ''}`}>
                                      {displayUser(user)}
                                    </div>
                                  ))}
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pr.changes_requested_info ? (
                                <>
                                  {pr.changes_requested_info.status === 'new_commit_from_author' ? (
                                    <span className="text-xs font-medium text-purple-500">
                                      New commits by author
                                    </span>
                                  ) : pr.changes_requested_info.status === 'new_comment_from_author' ? (
                                    <span className="text-xs font-medium text-blue-500">
                                      New comment from author
                                    </span>
                                  ) : pr.changes_requested_info.status === 'new_commits_after_approval' ? (
                                    <span className="text-xs font-medium text-orange-500">
                                      New commits after approval
                                    </span>
                                  ) : pr.changes_requested_info.status === 'backend_approval_dismissed' ? (
                                    <span className="text-xs font-medium text-red-500">
                                      BE approval dismissed
                                    </span>
                                  ) : (
                                    <span className="text-xs text-warning">
                                      {pr.changes_requested_info.message}
                                    </span>
                                  )}
                                  {(() => {
                                    const ts = changesRequestedTimestamp(pr.changes_requested_info)
                                    return ts ? (
                                      <div className="text-xs text-muted-foreground">
                                        {formatEastern(ts)}
                                      </div>
                                    ) : null
                                  })()}
                                </>
                              ) : pr.latest_reviewer_activity ? (
                                <a
                                  href={pr.latest_reviewer_activity.url || pr.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-xs hover:underline ${
                                    pr.latest_reviewer_activity.reviewer_type === 'backend'
                                      ? 'text-teal-500'
                                      : 'text-blue-400'
                                  }`}
                                  title={pr.latest_reviewer_activity.preview || pr.latest_reviewer_activity.message}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {displayUser(pr.latest_reviewer_activity.user)} {pr.latest_reviewer_activity.type === 'comment' ? 'commented' : pr.latest_reviewer_activity.type}
                                  <br />
                                  <span className="text-muted-foreground">
                                    {formatEastern(pr.latest_reviewer_activity.timestamp)}
                                  </span>
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pr.approval_summary?.commented_users?.map((user, idx) => (
                                <div key={idx} className={`text-xs ${isGhostUser(user) ? 'italic text-muted-foreground' : ''}`}>
                                  {displayUser(user)}
                                </div>
                              ))}
                              {(!pr.approval_summary?.commented_users || pr.approval_summary.commented_users.length === 0) && (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatTimeAgo(pr.created_at)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatTimeAgo(pr.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>
          </div>
        </div>
        <div className="mt-8 pb-4 text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground cursor-help">
                  Version {APP_VERSION.version}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-md">
                <div className="space-y-3 p-2">
                  <p className="font-semibold text-sm">Recent Updates</p>
                  {CHANGELOG.slice(0, 3).map((entry, index) => (
                    <div key={index} className="border-t pt-2 first:border-t-0 first:pt-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">v{entry.version}</span>
                        <span className="text-xs text-muted-foreground">
                          Deployed {new Date(entry.date).toLocaleDateString()}
                        </span>
                      </div>
                      <ul className="text-xs space-y-0.5">
                        {entry.changes.map((change, i) => (
                          <li key={i} className="text-muted-foreground">• {change}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default Dashboard