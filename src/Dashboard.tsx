import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { authService } from './services/auth'
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
  GitPullRequest, 
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
  Sun,
  Moon
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import { useTheme } from './contexts/ThemeContext'

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


const BACKEND_REVIEWERS = ['ericboehs', 'LindseySaari', 'rmtolmach', 'stiehlrod', 'RachalCassity', 'rjohnson2011', 'stevenjcumming']

function Dashboard() {
  const { theme, toggleTheme } = useTheme()
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [, setRateLimit] = useState<ApiResponse['rate_limit'] | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>('updated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [activeFilter, setActiveFilter] = useState<string>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    // Fetch PRs immediately on mount
    fetchPullRequests()
  }, [])

  // Polling effect - always on
  useEffect(() => {
    // Poll every 5 seconds when updating, every 30 seconds otherwise
    const interval = isUpdating ? 5000 : 30000
    
    const timer = setInterval(() => {
      fetchPullRequests(true)
    }, interval)
    
    return () => clearInterval(timer)
  }, [isUpdating, lastUpdated])

  
  const fetchPullRequests = async (isPolling = false) => {
    if (!isPolling) {
      setLoading(true)
    }
    
    try {
      // Fetch all repositories - no params needed
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reviews`, {
        headers: {
          ...authService.getAuthHeaders()
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch pull requests')
      }
      const data: ApiResponse = await response.json()
      
      // Update the updating status
      setIsUpdating(data.updating || false)
      
      // Only update data if it has changed
      if (!isPolling || data.last_updated !== lastUpdated) {
        // Combine both regular and approved pull requests
        const allPRs = [...(data.pull_requests || []), ...(data.approved_pull_requests || [])]
        setPullRequests(allPRs)
        setLastUpdated(data.last_updated)
        setRateLimit(data.rate_limit || null)
      }
      
      setLoading(false)
      setError(null)
    } catch (err) {
      console.error('Error fetching PRs:', err)
      if (!isPolling) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      }
      setLoading(false)
    }
  }


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
        case 'ready_for_backend':
          aValue = a.ready_for_backend_review ? 1 : 0
          bValue = b.ready_for_backend_review ? 1 : 0
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

  const hasNonReviewFailingChecks = (pr: PullRequest) => {
    // List of checks that are review-related and shouldn't prevent Ready for Review
    const reviewRelatedChecks = [
      'Pull Request Ready for Review',
      'Danger',
      'Status Checks',
      'Get PR data',
      'Get PR Data',
      'Check Workflow Statuses'
    ]
    
    return pr.failing_checks.some(check => {
      // Check if it's a backend-related check (including "Succeed if backend approval")
      if (check.name.toLowerCase().includes('backend')) return false
      
      // Check if it's in our review-related list
      if (reviewRelatedChecks.some(reviewCheck => check.name === reviewCheck)) return false
      
      // Check if it contains "Get PR Data" in any form
      if (check.name.includes('Get PR Data')) return false
      
      // Check if it's the backend approval confirmation check
      if (check.name.includes('Succeed if backend approval')) return false
      
      // Check if it contains "Check Workflow Statuses" in any form
      if (check.name.includes('Check Workflow Statuses')) return false
      
      // Check if it's Danger in any form
      if (check.name.toLowerCase().includes('danger')) return false
      
      // This is a non-review failing check
      return true
    })
  }

  const filterPullRequests = (prs: PullRequest[]) => {
    let filtered = prs
    
    // Apply card filter
    switch (activeFilter) {
      case 'ready':
        filtered = filtered.filter(pr => 
          !pr.draft &&
          pr.backend_approval_status !== 'approved' &&
          // Exclude dependabot PRs (they have their own section)
          pr.author !== 'dependabot[bot]' &&
          // Exclude PRs with exempt-be-review label (they should be in "Exempt BE Review" section)
          !(pr.labels && pr.labels.includes('exempt-be-review')) &&
          // Exclude PRs with failing CI checks (they should be in "Failing CI" section)
          !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
          (
            // Special case: platform-atlas PRs don't need approval to be ready for review
            pr.repository_name === 'platform-atlas' ||
            // Must be ready for backend review
            (pr.ready_for_backend_review &&
             (
               // Regular PRs with approvals (not from backend reviewers)
               (pr.approval_summary && 
                pr.approval_summary.approved_count > 0 &&
                !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))) ||
               // PRs from backend team members (auto-ready for review)
               BACKEND_REVIEWERS.includes(pr.author)
             ))
          )
        )
        // Default to showing newest updated PRs first for ready for review
        if (!sortColumn) {
          filtered = filtered.sort((a, b) => {
            const aTime = new Date(a.updated_at).getTime()
            const bTime = new Date(b.updated_at).getTime()
            return bTime - aTime // Descending = newest first
          })
        }
        break
      case 'failing':
        filtered = filtered.filter(pr => 
          !pr.draft && 
          pr.ci_status === 'failure' && 
          hasNonReviewFailingChecks(pr) &&
          // Exclude PRs with exempt-be-review label (they should be in "Exempt BE Review" section)
          !(pr.labels && pr.labels.includes('exempt-be-review'))
        )
        break
      case 'draft':
        filtered = filtered.filter(pr => pr.draft)
        break
      case 'reviewed-today':
        filtered = filtered.filter(pr => 
          pr.backend_approval_status !== 'approved' && 
          !(pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user))) &&
          !pr.draft &&
          // Exclude dependabot PRs (they have their own section)
          pr.author !== 'dependabot[bot]' &&
          // Exclude platform-atlas PRs (they go straight to Ready for Review)
          pr.repository_name !== 'platform-atlas' &&
          // Exclude PRs with exempt-be-review label
          !(pr.labels && pr.labels.includes('exempt-be-review')) &&
          // Exclude PRs that already have approvals (they should be in "Ready for Review")
          !(pr.approval_summary && pr.approval_summary.approved_count > 0)
        )
        break
      case 'exempt':
        filtered = filtered.filter(pr => 
          !pr.draft && pr.labels && pr.labels.includes('exempt-be-review')
        )
        break
      case 'finished':
        filtered = filtered.filter(pr => 
          !pr.draft && 
          // Exclude PRs with exempt-be-review label (they should be in "Exempt BE Review" section)
          !(pr.labels && pr.labels.includes('exempt-be-review')) &&
          (
            pr.backend_approval_status === 'approved' || 
            (pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
          )
        )
        break
      case 'dependabot':
        filtered = filtered.filter(pr => 
          !pr.draft && pr.author === 'dependabot[bot]'
        )
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

  const openAllPRs = () => {
    // Limit to prevent opening too many tabs at once
    const maxTabs = 20
    const prsToOpen = filteredPullRequests.slice(0, maxTabs)
    
    // Open tabs with a small delay to avoid popup blockers
    prsToOpen.forEach((pr, index) => {
      setTimeout(() => {
        window.open(pr.url, '_blank', 'noopener,noreferrer')
      }, index * 100) // 100ms delay between each tab
    })
    
    if (filteredPullRequests.length > maxTabs) {
      setTimeout(() => {
        alert(`Opened first ${maxTabs} PRs. Total PRs: ${filteredPullRequests.length}`)
      }, maxTabs * 100)
    }
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
      <div className="flex-col md:flex min-h-screen bg-background">
        <div className="border-b bg-white dark:bg-zinc-900">
          <div className="flex h-16 items-center px-4">
            <GitPullRequest className="mr-2 h-4 w-4 text-muted-foreground" />
            <h2 className="text-lg font-medium">Pull Request Dashboard</h2>
            <div className="ml-auto flex items-center space-x-4">
              {/* Authentication UI - Temporarily disabled during OAuth setup */}
              {/* {authService.isAuthenticated() ? (
                <UserProfile />
              ) : (
                <LoginButton />
              )} */}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {lastUpdated && (
                    <>
                      <span className="text-sm text-muted-foreground">
                        Data refreshed {formatTimeAgo(lastUpdated)} ({new Date(lastUpdated).toLocaleString('en-US', { 
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })} ET)
                      </span>
                      <span className="text-sm text-muted-foreground">
                        • Version {APP_VERSION.version}
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleTheme}
                  className="ml-2"
                >
                  {theme === 'light' ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-8 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Repositories Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">Pull requests across configured repositories:</p>
              <p className="text-xs text-muted-foreground">vets-api, vets-json-schema, vets-api-mockdata, platform-atlas</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
              {showSearch ? (
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="Search PRs by title, author, number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
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
          </div>
          <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
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
                      {pullRequests.filter(pr => 
                        !pr.draft &&
                        pr.backend_approval_status !== 'approved' &&
                        // Exclude dependabot PRs (they have their own section)
                        pr.author !== 'dependabot[bot]' &&
                        // Exclude PRs with exempt-be-review label
                        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
                        // Exclude PRs with failing CI checks
                        !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
                        (
                          // Special case: platform-atlas PRs don't need approval to be ready for review
                          pr.repository_name === 'platform-atlas' ||
                          // Must be ready for backend review
                          (pr.ready_for_backend_review &&
                           (
                             // Regular PRs with approvals (not from backend reviewers)
                             (pr.approval_summary && 
                              pr.approval_summary.approved_count > 0 &&
                              !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))) ||
                             // PRs from backend team members (auto-ready for review)
                             BACKEND_REVIEWERS.includes(pr.author)
                           ))
                        )
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      CI passing, team approved or non-vets-api PRs
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
                      {pullRequests.filter(pr => 
                        !pr.draft && pr.author === 'dependabot[bot]'
                      ).length}
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
                      {pullRequests.filter(pr => !pr.draft && pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)).length}
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
                      {pullRequests.filter(pr => 
                        pr.backend_approval_status !== 'approved' && 
                        !(pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user))) &&
                        !pr.draft &&
                        // Exclude dependabot PRs (they have their own section)
                        pr.author !== 'dependabot[bot]' &&
                        // Exclude platform-atlas PRs (they go straight to Ready for Review)
                        pr.repository_name !== 'platform-atlas' &&
                        // Exclude PRs with exempt-be-review label
                        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
                        // Exclude PRs that already have approvals (they should be in "Ready for Review")
                        !(pr.approval_summary && pr.approval_summary.approved_count > 0)
                      ).length}
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
                      {pullRequests.filter(pr => 
                        !pr.draft && pr.labels && pr.labels.includes('exempt-be-review')
                      ).length}
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
                      {pullRequests.filter(pr => 
                        !pr.draft && (
                          pr.backend_approval_status === 'approved' || 
                          (pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
                        )
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Ready to merge
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Pull Requests</CardTitle>
                      <CardDescription>
                        {activeFilter === 'ready' && 'Ready for Review - PRs with team approvals awaiting backend review'}
                        {activeFilter === 'all' && 'Total Pull Requests - All open PRs in the repository'}
                        {activeFilter === 'failing' && 'Failing CI - PRs with failing CI checks that need attention'}
                        {activeFilter === 'draft' && 'Draft PRs - Work in progress pull requests'}
                        {activeFilter === 'reviewed-today' && 'PRs Needing Team Review - Awaiting initial team review'}
                        {activeFilter === 'exempt' && 'Exempt BE Review - PRs that do not require backend review'}
                        {activeFilter === 'finished' && 'Finished but Unmerged - Backend approved PRs ready to merge'}
                        {activeFilter === 'dependabot' && 'Dependabot PRs - Automated dependency updates'}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openAllPRs}
                      disabled={filteredPullRequests.length === 0}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open All ({filteredPullRequests.length})
                    </Button>
                  </div>
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
                          <TableHead className="w-[200px]">
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
                          <TableHead className="w-[120px]">
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
                          <TableHead className="w-[100px]">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('ready_for_backend')}
                            >
                              Ready for Review
                              {sortColumn === 'ready_for_backend' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
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
                            <a
                              href={`https://github.com/${pr.author}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-primary"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {pr.author}
                            </a>
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
                                    {pr.failed_checks > 0 ? (
                                      <span className="text-destructive">{pr.failed_checks} failing</span>
                                    ) : pr.total_checks - pr.successful_checks > 0 ? (
                                      <span className="text-warning">{pr.total_checks - pr.successful_checks} pending</span>
                                    ) : (
                                      <span className="text-success">All passing</span>
                                    )}
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
                              {pr.ci_status === 'pending' && pr.total_checks - pr.successful_checks === 1 && pr.failed_checks === 0 ? (
                                <span className="text-xs font-medium text-warning">Succeed if backend approval is confirmed</span>
                              ) : pr.failing_checks.length > 0 ? (
                                pr.failing_checks.map((check, idx) => (
                                  <a
                                    key={idx}
                                    href={`${pr.url}#pullrequestreview-new_review_form`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-destructive hover:underline truncate max-w-[200px]"
                                    title={check.name === 'Status Checks' ? 'Danger' : check.name}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {check.name === 'Status Checks' ? 'Danger' : check.name}
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
                                    <div key={idx} className="text-xs">
                                      {user}
                                    </div>
                                  ))}
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">None</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              {(!pr.draft &&
                                pr.approval_summary && 
                                pr.approval_summary.approved_count > 0 &&
                                pr.backend_approval_status !== 'approved' &&
                                !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))) ? (
                                <CheckCircle2 className="h-5 w-5 text-success" />
                              ) : (
                                <XCircle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {pr.approval_summary?.commented_users?.map((user, idx) => (
                                <div key={idx} className="text-xs">
                                  {user}
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