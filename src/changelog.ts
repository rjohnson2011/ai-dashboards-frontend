export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "5.0.0",
    date: new Date().toISOString(),
    changes: [
      "NEW: Real-time dashboard updates via WebSocket",
      "Dashboard now refreshes within ~1 second of GitHub events",
      "60-second polling kept as fallback"
    ]
  },
  {
    version: "2.4.0",
    date: new Date().toISOString(),
    changes: [
      "NEW: Sprint Metrics dashboard page",
      "Track which engineer is on support each sprint",
      "View daily PR approvals with line chart",
      "See per-engineer approval breakdowns",
      "Display sprint totals and averages",
      "Fixed 'Open All' button to open all PRs instead of just one"
    ]
  },
  {
    version: "2.3.2",
    date: new Date().toISOString(),
    changes: [
      "Removed Timeline Updates column from PR table",
      "Simplified table layout for better readability"
    ]
  },
  {
    version: "2.3.1",
    date: "2025-09-29T14:00:00.000Z",
    changes: [
      "Improved dark mode colors and contrast",
      "Enhanced gradient cards for better visibility in dark mode",
      "Updated dark theme to use navy/slate color palette"
    ]
  },
  {
    version: "2.3.0",
    date: "2025-09-29T12:00:00.000Z",
    changes: [
      "Added dark mode toggle with sun/moon icons",
      "Removed 'Auto-refresh ON' text",
      "Full dark mode support with custom gradient cards"
    ]
  },
  {
    version: "2.2.5",
    date: "2025-09-22T21:10:00.000Z",
    changes: [
      "CRITICAL FIX: Backend now fetches PR labels from GitHub",
      "PRs with exempt-be-review label now correctly show in Exempt section",
      "Fixed PR #24350 and similar PRs being miscategorized"
    ]
  },
  {
    version: "2.2.4",
    date: "2025-09-22T20:45:00.000Z",
    changes: [
      "Clarified header timestamps: 'Data refreshed' vs 'Version'",
      "Removed version build timestamp from header",
      "Tooltip now shows 'Deployed' date instead of just date"
    ]
  },
  {
    version: "2.2.3",
    date: "2025-09-22T18:35:00.000Z",
    changes: [
      "Fixed backend ready_for_backend_review calculation",
      "Handles 'Require backend-review-group approval / Get PR Data' check",
      "PR #24312 now correctly appears in Ready for Review"
    ]
  },
  {
    version: "2.2.2",
    date: "2025-09-22T18:50:00.000Z",
    changes: [
      "Confirmed Get PR Data and Check Workflow Statuses are review-related checks",
      "PRs with only these checks failing properly appear in Ready for Review",
      "Fixed PR #24206 categorization with team approvals"
    ]
  },
  {
    version: "2.2.1",
    date: "2025-09-19T18:45:00.000Z",
    changes: [
      "Ensured Danger failures don't prevent Ready for Review status",
      "Added case-insensitive check for Danger-related checks",
      "PRs with only Danger failures now properly appear in Ready for Review"
    ]
  },
  {
    version: "2.2.0",
    date: "2025-01-10T16:00:00.000Z",
    changes: [
      "Updated Ready for Review description",
      "Now shows: CI passing, team approved or non-vets-api PRs",
      "More accurate description of filtering logic"
    ]
  },
  {
    version: "2.1.9",
    date: "2025-01-09T20:45:00.000Z",
    changes: [
      "Fixed remaining horizontal scrollbar on table",
      "Updated header to list repositories on new line",
      "Further reduced column widths for better fit"
    ]
  },
  {
    version: "2.1.8",
    date: "2025-01-09T20:30:00.000Z",
    changes: [
      "Removed auto-refresh toggle - always on now",
      "Removed user menu and login UI",
      "Reduced table column widths to prevent horizontal scrolling"
    ]
  },
  {
    version: "2.1.7",
    date: "2025-01-09T20:15:00.000Z",
    changes: [
      "Added 'Check Workflow Statuses' to review-related checks",
      "PRs with only workflow status checks now show in Ready for Review",
      "Fixed PR #24041 categorization"
    ]
  },
  {
    version: "2.1.6",
    date: "2025-01-09T19:45:00.000Z",
    changes: [
      "Removed repository name from header",
      "Header now shows only 'Last updated...'",
      "Cleaner header display"
    ]
  },
  {
    version: "2.1.5",
    date: "2025-01-09T19:30:00.000Z",
    changes: [
      "Fixed header showing 'all' to show 'All repositories'",
      "Restored Total Pull Requests card",
      "Fixed pull request workflow triggers"
    ]
  },
  {
    version: "2.1.4",
    date: "2025-01-09T19:00:00.000Z",
    changes: [
      "Platform-atlas PRs now go directly to Ready for Review",
      "All dependabot PRs now show in Dependabot section",
      "Fixed stale mockdata PRs in database"
    ]
  },
  {
    version: "2.1.3",
    date: "2025-01-09T18:15:00.000Z",
    changes: [
      "Fixed PRs with only review checks showing in Failing CI",
      "Added 'Succeed if backend approval' to review-related checks",
      "PRs awaiting approval now show in correct sections"
    ]
  },
  {
    version: "2.1.2",
    date: "2025-01-09T18:00:00.000Z",
    changes: [
      "Improved review-related check detection",
      "Added debugging for PR filtering issues",
      "Fixed case-sensitive check name matching"
    ]
  },
  {
    version: "2.1.1",
    date: "2025-01-09T17:30:00.000Z",
    changes: [
      "Fixed PR filtering for 'Get PR data' failures",
      "PRs with these checks now appear in Ready for Review",
      "Treats PR data fetch errors as review-related"
    ]
  },
  {
    version: "2.1.0",
    date: "2025-01-09T16:35:00.000Z",
    changes: [
      "Added version changelog hover tooltip",
      "PR review fetching added (v4 scraper)",
      "Shows last 3 version updates on hover"
    ]
  },
  {
    version: "2.0.0",
    date: "2025-09-09T15:08:53.131Z",
    changes: [
      "Multi-repository support added",
      "Removed repository selector dropdown",
      "Dashboard shows all repositories at once"
    ]
  },
  {
    version: "1.11.3",
    date: "2025-09-08T19:38:24.129Z",
    changes: [
      "Removed repository selector UI",
      "API returns all repositories by default",
      "Simplified routing structure"
    ]
  },
  {
    version: "1.11.2",
    date: "2025-09-08T19:31:40.732Z",
    changes: [
      "Added repository column to PR table",
      "Repository selector dropdown restored",
      "Support for multiple repository sources"
    ]
  }
]