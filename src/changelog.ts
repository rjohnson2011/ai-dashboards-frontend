export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.1.9",
    date: new Date().toISOString(),
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