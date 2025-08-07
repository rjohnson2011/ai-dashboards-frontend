import { useEffect, useState } from 'react'
import { 
  GitPullRequest, 
  CheckCircle2, 
  XCircle,
  Clock,
  RefreshCw,
  TrendingUp
} from 'lucide-react'
import { PRHistoryChart } from './components/PRHistoryChart-VA'

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

// Declare VA components as JSX intrinsic elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'va-banner': any
      'va-card': any
      'va-table': any
      'va-alert': any
      'va-loading-indicator': any
      'va-segmented-progress-bar': any
      'va-button': any
      'va-search-input': any
      'va-breadcrumbs': any
    }
  }
}

function App() {
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [repository, setRepository] = useState('')
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [, setRateLimit] = useState<ApiResponse['rate_limit'] | null>(null)
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showChart, setShowChart] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>('ready')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchPullRequests()
  }, [])

  const fetchPullRequests = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/v1/reviews`)
      if (!response.ok) {
        throw new Error('Failed to fetch pull requests')
      }
      const data: ApiResponse = await response.json()
      setPullRequests(data.pull_requests || [])
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
        return <CheckCircle2 className="va-u-color--green" style={{ width: '16px', height: '16px' }} />
      case 'failure':
        return <XCircle className="va-u-color--secondary-dark" style={{ width: '16px', height: '16px' }} />
      case 'pending':
        return <Clock className="va-u-color--warning" style={{ width: '16px', height: '16px' }} />
      default:
        return <Clock className="va-u-color--gray-medium" style={{ width: '16px', height: '16px' }} />
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
          pr.approval_summary && 
          pr.approval_summary.approved_count > 0 &&
          pr.backend_approval_status !== 'approved' &&
          !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
        )
        break
      case 'failing':
        filtered = filtered.filter(pr => pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr))
        break
      case 'draft':
        filtered = filtered.filter(pr => pr.draft)
        break
      case 'reviewed-today':
        filtered = filtered.filter(pr => 
          pr.backend_approval_status === 'approved' || 
          (pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
        )
        break
      case 'all':
        // No filter needed
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

  // Calculate metrics
  const readyForReviewCount = pullRequests.filter(pr => 
    !pr.draft &&
    pr.approval_summary && 
    pr.approval_summary.approved_count > 0 &&
    pr.backend_approval_status !== 'approved' &&
    !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
  ).length

  const failingCICount = pullRequests.filter(pr => pr.ci_status === 'failure' && hasNonReviewFailingChecks(pr)).length
  const draftCount = pullRequests.filter(pr => pr.draft).length
  const reviewedCount = pullRequests.filter(pr => 
    pr.backend_approval_status === 'approved' || 
    (pr.approval_summary?.approved_users?.some(user => BACKEND_REVIEWERS.includes(user)))
  ).length

  if (loading) {
    return (
      <div className="vads-l-grid-container" style={{ paddingTop: '2rem' }}>
        <va-loading-indicator 
          label="Loading pull requests..."
          message="Please wait while we fetch the latest data."
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="vads-l-grid-container" style={{ paddingTop: '2rem' }}>
        <va-alert 
          status="error"
          visible="true"
        >
          <h2 slot="headline">Error loading data</h2>
          <p>{error}</p>
          <va-button text="Try Again" onClick={fetchPullRequests} />
        </va-alert>
      </div>
    )
  }

  const createTableRows = () => {
    return filteredPullRequests.map((pr) => {
      const readyForReview = (!pr.draft &&
        pr.approval_summary && 
        pr.approval_summary.approved_count > 0 &&
        pr.backend_approval_status !== 'approved' &&
        !(pr.approval_summary.approved_users?.some(user => BACKEND_REVIEWERS.includes(user))))

      return `
        <tr key="${pr.id}">
          <td>
            <a href="${pr.url}" target="_blank" rel="noopener noreferrer">
              #${pr.number}
            </a>
          </td>
          <td>
            <a href="${pr.url}" target="_blank" rel="noopener noreferrer" style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block;">
              ${pr.title}
            </a>
            ${pr.draft ? '<span style="margin-left: 8px; font-size: 0.875rem; color: #5b616b;">[Draft]</span>' : ''}
          </td>
          <td>
            <a href="https://github.com/${pr.author}" target="_blank" rel="noopener noreferrer">
              ${pr.author}
            </a>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${pr.ci_status === 'success' ? 
                '<span style="color: #2e8540;">✓</span>' : 
                pr.ci_status === 'failure' ? 
                '<span style="color: #e31c3d;">✗</span>' : 
                '<span style="color: #fdb81e;">○</span>'}
              <span style="font-size: 0.875rem;">
                ${pr.failed_checks > 0 ? 
                  `<span style="color: #e31c3d;">${pr.failed_checks} failing</span>` : 
                  pr.total_checks - pr.successful_checks > 0 ? 
                  `<span style="color: #fdb81e;">${pr.total_checks - pr.successful_checks} pending</span>` : 
                  '<span style="color: #2e8540;">All passing</span>'}
              </span>
            </div>
          </td>
          <td>
            ${pr.ci_status === 'pending' && pr.total_checks - pr.successful_checks === 1 && pr.failed_checks === 0 ? 
              '<span style="font-size: 0.75rem; color: #fdb81e;">Succeed if backend approval</span>' : 
              pr.failing_checks.length > 0 ? 
              pr.failing_checks.map(check => 
                `<div style="font-size: 0.75rem; color: #e31c3d; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px;" title="${check.name}">${check.name}</div>`
              ).join('') : 
              '<span style="font-size: 0.75rem; color: #5b616b;">None</span>'}
          </td>
          <td>
            ${pr.approval_summary?.approved_users && pr.approval_summary.approved_users.length > 0 ? 
              pr.approval_summary.approved_users.map(user => 
                `<div style="font-size: 0.875rem;">${user}</div>`
              ).join('') : 
              '<span style="font-size: 0.875rem; color: #5b616b;">None</span>'}
          </td>
          <td style="text-align: center;">
            ${readyForReview ? 
              '<span style="color: #2e8540; font-size: 1.25rem;">✓</span>' : 
              '<span style="color: #5b616b; font-size: 1.25rem;">–</span>'}
          </td>
          <td style="font-size: 0.875rem; color: #5b616b;">
            ${formatTimeAgo(pr.created_at)}
          </td>
          <td style="font-size: 0.875rem; color: #5b616b; text-align: right;">
            ${formatTimeAgo(pr.updated_at)}
          </td>
        </tr>
      `
    }).join('')
  }

  return (
    <>
      <va-banner 
        type="info"
        headline="VA Pull Request Dashboard"
      >
        Track and manage pull requests for {repository}
      </va-banner>

      <div className="vads-l-grid-container" style={{ paddingTop: '2rem' }}>
        {/* Header */}
        <div className="vads-l-row">
          <div className="vads-l-col--12">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <h1 className="vads-u-margin-y--0">Pull Request Dashboard</h1>
                <p className="vads-u-color--gray-medium vads-u-margin-top--0p5">
                  Your pull request overview and insights
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {lastUpdated && (
                  <span className="vads-u-color--gray-medium" style={{ fontSize: '0.875rem' }}>
                    Last updated {formatTimeAgo(lastUpdated)} ({new Date(lastUpdated).toLocaleString('en-US', { 
                      timeZone: 'America/New_York',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })} EST)
                  </span>
                )}
                <va-button text="Refresh" onClick={fetchPullRequests} secondary />
              </div>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="vads-l-row vads-u-margin-bottom--2">
          <div className="vads-l-col--12">
            <va-search-input
              value={searchTerm}
              onInput={(e: any) => setSearchTerm(e.target.value)}
              label="Search pull requests"
              buttonText="Search"
            />
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="vads-l-row vads-u-margin-bottom--3">
          <div className="vads-l-col--12 medium-screen:vads-l-col--3">
            <div 
              className={`vads-u-background-color--gray-lightest vads-u-padding--2 vads-u-border--1px vads-u-border-color--gray-light ${activeFilter === 'ready' ? 'vads-u-border-color--green' : ''}`}
              style={{ cursor: 'pointer', borderWidth: activeFilter === 'ready' ? '2px' : '1px' }}
              onClick={() => setActiveFilter('ready')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="vads-u-margin-y--0 vads-u-font-size--base">Ready for Review</h3>
                  <p className="vads-u-font-size--h2 vads-u-margin-y--0p5">{readyForReviewCount}</p>
                  <p className="vads-u-color--gray vads-u-margin-y--0 vads-u-font-size--sm">Can be reviewed</p>
                </div>
                <CheckCircle2 style={{ color: '#2e8540', width: '24px', height: '24px' }} />
              </div>
            </div>
          </div>

          <div className="vads-l-col--12 medium-screen:vads-l-col--3">
            <div 
              className={`vads-u-background-color--gray-lightest vads-u-padding--2 vads-u-border--1px vads-u-border-color--gray-light ${activeFilter === 'all' ? 'vads-u-border-color--primary' : ''}`}
              style={{ cursor: 'pointer', borderWidth: activeFilter === 'all' ? '2px' : '1px' }}
              onClick={() => setActiveFilter('all')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="vads-u-margin-y--0 vads-u-font-size--base">Total Pull Requests</h3>
                  <p className="vads-u-font-size--h2 vads-u-margin-y--0p5">{pullRequests.length}</p>
                  <p className="vads-u-color--gray vads-u-margin-y--0 vads-u-font-size--sm">{reviewedCount} backend reviewed</p>
                </div>
                <GitPullRequest style={{ color: '#5b616b', width: '24px', height: '24px' }} />
              </div>
            </div>
          </div>

          <div className="vads-l-col--12 medium-screen:vads-l-col--3">
            <div 
              className={`vads-u-background-color--gray-lightest vads-u-padding--2 vads-u-border--1px vads-u-border-color--gray-light ${activeFilter === 'failing' ? 'vads-u-border-color--secondary-dark' : ''}`}
              style={{ cursor: 'pointer', borderWidth: activeFilter === 'failing' ? '2px' : '1px' }}
              onClick={() => setActiveFilter('failing')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="vads-u-margin-y--0 vads-u-font-size--base">Failing CI</h3>
                  <p className="vads-u-font-size--h2 vads-u-margin-y--0p5">{failingCICount}</p>
                  <p className="vads-u-color--gray vads-u-margin-y--0 vads-u-font-size--sm">Failing checks</p>
                </div>
                <XCircle style={{ color: '#e31c3d', width: '24px', height: '24px' }} />
              </div>
            </div>
          </div>

          <div className="vads-l-col--12 medium-screen:vads-l-col--3">
            <div 
              className={`vads-u-background-color--gray-lightest vads-u-padding--2 vads-u-border--1px vads-u-border-color--gray-light ${activeFilter === 'reviewed-today' ? 'vads-u-border-color--gold' : ''}`}
              style={{ cursor: 'pointer', borderWidth: activeFilter === 'reviewed-today' ? '2px' : '1px' }}
              onClick={() => setActiveFilter('reviewed-today')}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 className="vads-u-margin-y--0 vads-u-font-size--base">PRs Reviewed</h3>
                  <p className="vads-u-font-size--h2 vads-u-margin-y--0p5">{reviewedCount}</p>
                  <p className="vads-u-color--gray vads-u-margin-y--0 vads-u-font-size--sm">Backend reviewed</p>
                </div>
                <CheckCircle2 style={{ color: '#fdb81e', width: '24px', height: '24px' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Toggle */}
        <div className="vads-l-row vads-u-margin-bottom--2">
          <div className="vads-l-col--12">
            <va-button 
              text={showChart ? "Hide PR Trends" : "Show PR Trends"}
              onClick={() => setShowChart(!showChart)} 
              secondary
            />
          </div>
        </div>

        {/* Chart */}
        {showChart && (
          <div className="vads-l-row vads-u-margin-bottom--3">
            <div className="vads-l-col--12">
              <PRHistoryChart days={7} />
            </div>
          </div>
        )}

        {/* Table */}
        <div className="vads-l-row">
          <div className="vads-l-col--12">
            <h2>Pull Requests</h2>
            <p className="vads-u-color--gray-medium">A list of all pull requests in the repository.</p>
            
            <div style={{ overflowX: 'auto' }}>
              <va-table 
                table-title="Pull Requests Table"
                sortable
              >
                <table className="usa-table usa-table--borderless" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th scope="col" onClick={() => handleSort('number')} style={{ cursor: 'pointer' }}>
                        PR {sortColumn === 'number' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('title')} style={{ cursor: 'pointer' }}>
                        Title {sortColumn === 'title' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('author')} style={{ cursor: 'pointer' }}>
                        Author {sortColumn === 'author' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('ci_status')} style={{ cursor: 'pointer' }}>
                        CI Status {sortColumn === 'ci_status' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('failures')} style={{ cursor: 'pointer' }}>
                        CI Failures {sortColumn === 'failures' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('approvals')} style={{ cursor: 'pointer' }}>
                        Approvals {sortColumn === 'approvals' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('ready_for_backend')} style={{ cursor: 'pointer' }}>
                        Ready {sortColumn === 'ready_for_backend' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('created')} style={{ cursor: 'pointer' }}>
                        Created {sortColumn === 'created' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th scope="col" onClick={() => handleSort('updated')} style={{ cursor: 'pointer' }}>
                        Updated {sortColumn === 'updated' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                    </tr>
                  </thead>
                  <tbody dangerouslySetInnerHTML={{ __html: createTableRows() }} />
                </table>
              </va-table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default App