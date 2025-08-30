import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card'
import { authService } from './services/auth'
import { APP_VERSION } from './version'
// import { LoginButton } from './components/LoginButton'
// import { UserProfile } from './components/UserProfile'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar'
import { Input } from './components/ui/input'
// Temporarily commented out - to be removed with repository selector
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from './components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './components/ui/dropdown-menu'
import { 
  GitPullRequest, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Clock,
  RefreshCw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Bot
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './components/ui/tooltip'
import { PRHistoryChart } from './components/PRHistoryChart'

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
  recent_timeline?: string[]
  labels?: string[]
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

interface Repository {
  owner: string
  name: string
  display_name: string
  full_name: string
  backend_review_required: boolean
}

const BACKEND_REVIEWERS = ['ericboehs', 'LindseySaari', 'rmtolmach', 'stiehlrod', 'RachalCassity', 'rjohnson2011', 'stevenjcumming']

function Dashboard() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [repository, setRepository] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [, setRateLimit] = useState<ApiResponse['rate_limit'] | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>('updated')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showChart, setShowChart] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('ready')
  const [searchTerm, setSearchTerm] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null)
  const { repositoryName } = useParams<{ repositoryName: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    fetchRepositories()
  }, [])
  
  useEffect(() => {
    // When repository changes in URL, update selected repository
    if (repositories.length > 0 && repositoryName) {
      const repo = repositories.find(r => r.name === repositoryName)
      if (repo) {
        setSelectedRepository(repo)
      } else {
        // If repository not found, redirect to vets-api
        navigate('/dashboard/vets-api', { replace: true })
      }
    }
  }, [repositoryName, repositories, navigate])
  
  useEffect(() => {
    if (selectedRepository) {
      fetchPullRequests()
    }
  }, [selectedRepository])

  const fetchRepositories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/repositories`, {
        headers: {
          ...authService.getAuthHeaders()
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch repositories')
      }
      const data = await response.json()
      setRepositories(data.repositories || [])
      // Don't auto-select, let the URL param drive selection
    } catch (err) {
      console.error('Error fetching repositories:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }
  
  const fetchPullRequests = async () => {
    if (!selectedRepository) return
    
    setLoading(true)
    try {
      const params = new URLSearchParams({
        repository_owner: selectedRepository.owner,
        repository_name: selectedRepository.name
      })
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reviews?${params}`, {
        headers: {
          ...authService.getAuthHeaders()
        }
      })
      if (!response.ok) {
        throw new Error('Failed to fetch pull requests')
      }
      const data: ApiResponse = await response.json()
      // Combine both regular and approved pull requests
      const allPRs = [...(data.pull_requests || []), ...(data.approved_pull_requests || [])]
      setPullRequests(allPRs)
      setRepository(data.repository)
      setLastUpdated(data.last_updated)
      setRateLimit(data.rate_limit || null)
      setLoading(false)
    } catch (err) {
      console.error('Error fetching PRs:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }


  const getCIStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'failure':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }


  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diffInMs = now.getTime() - then.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours !== 1 ? 's' : ''} ago`
    } else {
      return `${diffInDays} day${diffInDays !== 1 ? 's' : ''} ago`
    }
  }


  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
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
        default:
          return 0
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }

  const hasNonReviewFailingChecks = (pr: PullRequest) => {
    return pr.failing_checks.some(check => 
      check.name !== 'Pull Request Ready for Review' && 
      !check.name.toLowerCase().includes('backend')
    )
  }

  const filterPullRequests = (prs: PullRequest[]) => {
    let filtered = prs
    
    // Apply card filter
    switch (activeFilter) {
      case 'ready':
        filtered = filtered.filter(pr => 
          !pr.draft &&
          pr.backend_approval_status !== 'approved' &&
          // Exclude PRs with exempt-be-review label (they should be in "Exempt BE Review" section)
          !(pr.labels && pr.labels.includes('exempt-be-review')) &&
          // Exclude PRs with failing CI checks (they should be in "Failing CI" section)
          !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
          // Must be ready for backend review
          pr.ready_for_backend_review &&
          (
            // Regular PRs with approvals (not from backend reviewers)
            (pr.approval_summary && 
             pr.approval_summary.approved_count > 0 &&
             !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))) ||
            // PRs from backend team members (auto-ready for review)
            BACKEND_REVIEWERS.includes(pr.author)
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
        filtered = filtered.filter(pr => !pr.draft && pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr))
        break
      case 'draft':
        filtered = filtered.filter(pr => pr.draft)
        break
      case 'reviewed-today':
        filtered = filtered.filter(pr => 
          pr.backend_approval_status !== 'approved' && 
          !(pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user))) &&
          !pr.draft &&
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
          !pr.draft && (
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
            <Button onClick={fetchPullRequests} className="mt-4">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex-col md:flex min-h-screen gradient-bg">
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-16 items-center px-4">
            <GitPullRequest className="mr-2 h-5 w-5" />
            <h2 className="text-lg font-semibold">Pull Request Dashboard</h2>
            <div className="ml-auto flex items-center space-x-4">
              {/* Authentication UI - Temporarily disabled during OAuth setup */}
              {/* {authService.isAuthenticated() ? (
                <UserProfile />
              ) : (
                <LoginButton />
              )} */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">
                  {repository}
                </span>
                {lastUpdated && (
                  <>
                    <span className="text-sm text-muted-foreground">
                      • Last updated {formatTimeAgo(lastUpdated)} ({new Date(lastUpdated).toLocaleString('en-US', { 
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })} EST)
                    </span>
                    <span className="text-sm text-muted-foreground">
                      • Version {APP_VERSION.version} ({new Date(APP_VERSION.timestamp).toLocaleString('en-US', { 
                        timeZone: 'America/New_York',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })} EST)
                    </span>
                  </>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback>U</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Log out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-4 p-8 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">Your pull request overview and insights</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Repository selector temporarily hidden - to be removed later
              <Select 
                value={selectedRepository?.name || ''} 
                onValueChange={(value) => {
                  const repo = repositories.find(r => r.name === value)
                  if (repo) {
                    navigate(`/dashboard/${repo.name}`)
                  }
                }}
              >
                <SelectTrigger className="w-[280px]">
                  <SelectValue placeholder="Select a repository" />
                </SelectTrigger>
                <SelectContent>
                  {repositories.map((repo) => (
                    <SelectItem key={repo.name} value={repo.name}>
                      {repo.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              */}
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
          <div className="flex justify-between items-center">
            <Button
              variant={showChart ? "default" : "outline"}
              size="sm"
              onClick={() => setShowChart(!showChart)}
              className="mb-4"
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              PR Trends
            </Button>
          </div>
          {showChart && (
            <div className="mb-6">
              <PRHistoryChart 
                days={7} 
                repositoryName={selectedRepository?.name}
                repositoryOwner={selectedRepository?.owner}
              />
            </div>
          )}
          <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-8">
                <Card 
                  data-slot="card" 
                  className={`card-gradient-success cursor-pointer transition-all hover:scale-105 ${activeFilter === 'ready' ? 'ring-2 ring-green-500' : ''}`}
                  onClick={() => setActiveFilter('ready')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Ready for Review
                    </CardTitle>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pullRequests.filter(pr => 
                        !pr.draft &&
                        pr.backend_approval_status !== 'approved' &&
                        // Exclude PRs with exempt-be-review label
                        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
                        // Exclude PRs with failing CI checks
                        !(pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)) &&
                        // Must be ready for backend review
                        pr.ready_for_backend_review &&
                        (
                          // Regular PRs with approvals (not from backend reviewers)
                          (pr.approval_summary && 
                           pr.approval_summary.approved_count > 0 &&
                           !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))) ||
                          // PRs from backend team members (auto-ready for review)
                          BACKEND_REVIEWERS.includes(pr.author)
                        )
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Can be reviewed
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  data-slot="card" 
                  className={`card-gradient-subtle cursor-pointer transition-all hover:scale-105 ${activeFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Pull Requests
                    </CardTitle>
                    <GitPullRequest className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{pullRequests.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {pullRequests.filter(pr => 
                        !pr.draft && (
                          pr.backend_approval_status === 'approved' || 
                          (pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
                        )
                      ).length} backend reviewed
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  data-slot="card" 
                  className={`card-gradient-destructive cursor-pointer transition-all hover:scale-105 ${activeFilter === 'failing' ? 'ring-2 ring-red-500' : ''}`}
                  onClick={() => setActiveFilter('failing')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failing CI
                    </CardTitle>
                    <XCircle className="h-5 w-5 text-destructive" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pullRequests.filter(pr => !pr.draft && pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Failing multiple checks
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  data-slot="card" 
                  className={`card-gradient-subtle cursor-pointer transition-all hover:scale-105 ${activeFilter === 'draft' ? 'ring-2 ring-gray-500' : ''}`}
                  onClick={() => setActiveFilter('draft')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Draft PRs
                    </CardTitle>
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pullRequests.filter(pr => pr.draft).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Work in progress
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  data-slot="card" 
                  className={`card-gradient-warning cursor-pointer transition-all hover:scale-105 ${activeFilter === 'reviewed-today' ? 'ring-2 ring-yellow-500' : ''}`}
                  onClick={() => setActiveFilter('reviewed-today')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      PRs Needing Team Review
                    </CardTitle>
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pullRequests.filter(pr => 
                        pr.backend_approval_status !== 'approved' && 
                        !(pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user))) &&
                        !pr.draft &&
                        // Exclude PRs with exempt-be-review label
                        !(pr.labels && pr.labels.includes('exempt-be-review')) &&
                        // Exclude PRs that already have approvals (they should be in "Ready for Review")
                        !(pr.approval_summary && pr.approval_summary.approved_count > 0)
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting backend review
                    </p>
                  </CardContent>
                </Card>
                <Card 
                  data-slot="card" 
                  className={`cursor-pointer transition-all hover:scale-105 ${activeFilter === 'exempt' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setActiveFilter('exempt')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Exempt BE Review
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">Exempt</Badge>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
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
                  data-slot="card" 
                  className={`cursor-pointer transition-all hover:scale-105 ${activeFilter === 'finished' ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setActiveFilter('finished')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Finished but Unmerged
                    </CardTitle>
                    <CheckCircle2 className="h-5 w-5 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
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
                <Card 
                  data-slot="card" 
                  className={`cursor-pointer transition-all hover:scale-105 ${activeFilter === 'dependabot' ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => setActiveFilter('dependabot')}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Dependabot PRs
                    </CardTitle>
                    <Bot className="h-5 w-5 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pullRequests.filter(pr => 
                        !pr.draft && pr.author === 'dependabot[bot]'
                      ).length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automated updates
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Pull Requests</CardTitle>
                  <CardDescription>
                    A list of all pull requests in the repository.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border border-gray-200 dark:border-gray-800 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[100px]">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('number')}
                            >
                              PR
                              {sortColumn === 'number' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead className="max-w-[250px]">
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('title')}
                            >
                              Title
                              {sortColumn === 'title' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('author')}
                            >
                              Author
                              {sortColumn === 'author' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('ci_status')}
                            >
                              CI Status
                              {sortColumn === 'ci_status' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('failures')}
                            >
                              CI Failures
                              {sortColumn === 'failures' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
                            <button
                              className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                              onClick={() => handleSort('approvals')}
                            >
                              Approvals
                              {sortColumn === 'approvals' ? (
                                sortDirection === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
                              ) : (
                                <ArrowUpDown className="h-4 w-4 opacity-50" />
                              )}
                            </button>
                          </TableHead>
                          <TableHead>
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
                          <TableHead>Commented</TableHead>
                          <TableHead className="min-w-[200px]">Timeline Updates</TableHead>
                          <TableHead>
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
                          <TableHead className="text-right">
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
                            className="cursor-pointer"
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
                            <div className="flex items-center gap-2">
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline max-w-[250px] truncate"
                              >
                                {pr.title}
                              </a>
                              {pr.draft && <Badge variant="outline">Draft</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <a
                              href={`https://github.com/${pr.author}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-blue-600"
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
                                      <span className="text-red-600">{pr.failed_checks} failing</span>
                                    ) : pr.total_checks - pr.successful_checks > 0 ? (
                                      <span className="text-yellow-600">{pr.total_checks - pr.successful_checks} pending</span>
                                    ) : (
                                      <span className="text-green-600">All passing</span>
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
                                <span className="text-xs font-medium text-yellow-600">Succeed if backend approval is confirmed</span>
                              ) : pr.failing_checks.length > 0 ? (
                                pr.failing_checks.map((check, idx) => (
                                  <a
                                    key={idx}
                                    href={`${pr.url}#pullrequestreview-new_review_form`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-red-600 hover:underline truncate max-w-[200px]"
                                    title={check.name}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {check.name}
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
                                  className="block hover:underline text-blue-600"
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
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
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
                          <TableCell className="min-w-[200px]">
                            <div className="space-y-1">
                              {pr.recent_timeline?.map((event, idx) => (
                                <div key={idx} className="text-xs text-muted-foreground">
                                  {event}
                                </div>
                              ))}
                              {(!pr.recent_timeline || pr.recent_timeline.length === 0) && (
                                <span className="text-xs text-muted-foreground">Loading...</span>
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
      </div>
    </TooltipProvider>
  )
}

export default Dashboard