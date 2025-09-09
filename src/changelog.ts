export interface ChangelogEntry {
  version: string
  date: string
  changes: string[]
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "2.1.0",
    date: new Date().toISOString(),
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