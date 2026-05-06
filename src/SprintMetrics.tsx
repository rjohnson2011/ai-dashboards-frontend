import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label } from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import ReviewTurnaround from './components/ReviewTurnaround';

interface SprintInfo {
  sprint_number: number;
  engineer_name: string;
  start_date: string;
  end_date: string;
  repository_name: string;
  repository_owner: string;
}

interface DailyApproval {
  date: string;
  total: number;
  by_engineer: Record<string, number>;
}

interface SprintTotals {
  total: number;
  days: number;
  days_elapsed: number;
  average_per_day: number;
}

interface EngineerTotal {
  engineer: string;
  approvals: number;
}

interface ApprovedPR {
  number: number;
  title: string;
  url: string;
  author: string;
  approved_by: string;
  approved_at: string;
  state: string;
}

interface ApprovedPRsByDay {
  date: string;
  prs: ApprovedPR[];
}

interface UpcomingRotation {
  engineer_name: string;
  start_date: string;
  end_date: string;
}

interface DependabotPR {
  number: number;
  title: string;
  url: string;
  repository: string;
}

interface DependabotMetrics {
  merged_count: number;
  closed_count: number;
  merged_prs: DependabotPR[];
  closed_prs: DependabotPR[];
}

interface BackendApprovedClosedPR {
  number: number;
  title: string;
  url: string;
  state: string;
  author: string;
  closed_at: string;
  approved_by: string[];
}

interface MonthlyBreakdown {
  month: string;
  month_date: string;
  total: number;
  merged: number;
  closed: number;
  open: number;
  prs: BackendApprovedClosedPR[];
}

interface BackendApprovedClosed {
  total: number;
  merged: number;
  closed: number;
  open: number;
  monthly_breakdown: MonthlyBreakdown[];
}

interface SprintMetricsData {
  current_sprint: SprintInfo | null;
  daily_approvals: DailyApproval[];
  sprint_totals: SprintTotals;
  engineer_totals: EngineerTotal[];
  approved_prs_by_day: ApprovedPRsByDay[];
  dependabot_metrics?: DependabotMetrics;
  approved_unmerged_count?: number;
  upcoming_rotations?: UpcomingRotation[];
  backend_approved_closed?: BackendApprovedClosed;
  has_previous_sprint?: boolean;
  has_next_sprint?: boolean;
}

const SprintMetrics: React.FC = () => {
  const [data, setData] = useState<SprintMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prSearch, setPrSearch] = useState('');
  const [sprintOffset, setSprintOffset] = useState(0); // 0 = current, -1 = previous, etc.
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [sprintCache, setSprintCache] = useState<Record<number, SprintMetricsData>>({});

  useEffect(() => {
    fetchSprintMetrics(sprintOffset);
  }, [sprintOffset]);

  const fetchSprintMetrics = async (offset: number = 0, retryCount: number = 0) => {
    const maxRetries = 3;

    try {
      // Check cache first - use cached data for historical sprints (offset < 0)
      // Always fetch fresh data for current sprint (offset === 0)
      if (offset < 0 && sprintCache[offset]) {
        setData(sprintCache[offset]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = offset === 0
        ? `${apiUrl}/api/v1/sprint_metrics`
        : `${apiUrl}/api/v1/sprint_metrics?sprint_offset=${offset}`;

      // Add 30-second timeout to handle slow API responses
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to fetch sprint metrics (HTTP ${response.status})`);
        }

        const jsonData = await response.json();
        setData(jsonData);
        setError(null);

        // Cache historical sprint data (offset < 0)
        if (offset < 0) {
          setSprintCache(prev => ({ ...prev, [offset]: jsonData }));
        }
      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err) {
      // Auto-retry on timeout (server might be waking up)
      if (retryCount < maxRetries) {
        console.log(`Retrying sprint metrics... (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => fetchSprintMetrics(offset, retryCount + 1), 2000);
        return;
      }

      // Provide more helpful error messages
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Server is waking up. Please wait a moment and click Retry.');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      if (retryCount >= maxRetries || !error) {
        setLoading(false);
      }
    }
  };

  const goToPreviousSprint = () => {
    // Only navigate if there's a previous sprint available
    if (data?.has_previous_sprint) {
      setSprintOffset(prev => prev - 1);
    }
  };

  const goToNextSprint = () => {
    // Only navigate if there's a next sprint available AND we're not on the current sprint
    // (Don't allow navigation to future sprints that haven't happened yet)
    if (data?.has_next_sprint && sprintOffset < 0) {
      setSprintOffset(prev => prev + 1);
    }
  };

  const toggleMonth = (monthDate: string) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthDate)) {
        newSet.delete(monthDate);
      } else {
        newSet.add(monthDate);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string, includeDayOfWeek: boolean = false) => {
    // Parse date in UTC to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    const monthDay = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });

    if (includeDayOfWeek) {
      const dayOfWeek = date.toLocaleDateString('en-US', {
        weekday: 'short',
        timeZone: 'UTC'
      });
      return `${monthDay} (${dayOfWeek})`;
    }

    return monthDay;
  };

  const getEngineerDisplayName = (githubHandle: string): string => {
    const nameMap: Record<string, string> = {
      'rjohnson2011': 'Ryan Johnson',
      'RachalCassity': 'Rachal Cassity',
      'stiehlrod': 'Jennica Stiehl',
      'rmtolmach': 'Rebecca Tolmach',
      'ericboehs': 'Eric Boehs',
      'LindseySaari': 'Lindsey Saari',
      'stevenjcumming': 'Steven Cumming',
      'Crankums': 'Craig Donavin',
      'jweissman': 'Joseph Weissman'
    };
    return nameMap[githubHandle] || githubHandle;
  };

  const getGitHubAvatarUrl = (githubHandle: string): string => {
    return `https://va.ghe.com/${githubHandle}.png?size=80`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-xl font-light text-white">Loading sprint metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-[600px]">
          <CardHeader>
            <CardTitle className="text-red-400">Error Loading Sprint Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 font-light text-white">{error}</p>
            <p className="text-sm text-gray-400 mb-4 font-light">
              This feature requires database migrations to be run. Please wait a few minutes for the deployment to complete, then try again.
            </p>
            <button
              onClick={() => fetchSprintMetrics(0)}
              className="px-4 py-2 bg-teal-600 text-white rounded font-light hover:bg-teal-500 transition-colors"
            >
              Retry
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data?.current_sprint) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-white">No Sprint Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-light text-white">No sprint rotation data has been configured yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data - fill in missing days with zeros
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

  // Get all engineers
  const allEngineers = Array.from(
    new Set(
      data.daily_approvals.flatMap(day => Object.keys(day.by_engineer))
    )
  );

  // Create a map of existing data
  const dataMap = new Map(
    data.daily_approvals.map(day => [day.date, day])
  );

  // Generate all dates in the sprint range (including future days)
  const startDate = new Date(data.current_sprint.start_date + 'T00:00:00Z');
  const endDate = new Date(data.current_sprint.end_date + 'T00:00:00Z');

  const allDates: string[] = [];
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    allDates.push(currentDate.toISOString().split('T')[0]);
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // Fill in all days, setting missing days to zero
  const chartData = allDates.map(dateStr => {
    const dayData = dataMap.get(dateStr);
    const [year, month, day] = dateStr.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = date.getUTCDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isThanksgiving = dateStr === '2025-11-27';
    const isHoliday = dateStr === '2024-12-25' || dateStr === '2025-01-01' ||
                     dateStr === '2025-12-25' || dateStr === '2026-01-01';

    if (dayData) {
      return {
        date: formatDate(dateStr, true),
        rawDate: dateStr,
        total: dayData.total,
        isWeekend,
        isThanksgiving,
        isHoliday,
        ...dayData.by_engineer
      };
    } else {
      // Fill with zeros for missing days
      const emptyDay: any = {
        date: formatDate(dateStr, true),
        rawDate: dateStr,
        total: 0,
        isWeekend,
        isThanksgiving,
        isHoliday
      };
      allEngineers.forEach(engineer => {
        emptyDay[engineer] = 0;
      });
      return emptyDay;
    }
  });

  // Get unique engineers for chart lines
  const engineers = Array.from(
    new Set(
      data.daily_approvals.flatMap(day => Object.keys(day.by_engineer))
    )
  );

  const colors = [
    '#5eead4', '#2dd4bf', '#14b8a6', '#22d3ee', '#67e8f9',
    '#06b6d4', '#99f6e4', '#5eead4', '#2dd4bf', '#14b8a6'
  ];

  // Helper functions for date handling
  const isWeekend = (dateStr: string): boolean => {
    const date = new Date(dateStr + 'T00:00:00Z');
    const day = date.getUTCDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const isHoliday = (dateStr: string): boolean => {
    // Holidays: Dec 25 and Jan 1
    return dateStr === '2024-12-25' || dateStr === '2025-01-01' ||
           dateStr === '2025-12-25' || dateStr === '2026-01-01';
  };

  const getAllSprintDays = (): string[] => {
    if (!data.current_sprint) return [];

    const start = new Date(data.current_sprint.start_date + 'T00:00:00Z');
    const end = new Date(data.current_sprint.end_date + 'T00:00:00Z');
    const days: string[] = [];

    const current = new Date(start);
    while (current <= end) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      days.push(`${year}-${month}-${day}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return days.reverse(); // Descending order (newest first)
  };

  // Filter approved PRs by search term
  const filteredApprovedPRsBySearch = data.approved_prs_by_day.map(day => ({
    ...day,
    prs: day.prs.filter(pr => {
      const searchLower = prSearch.toLowerCase();
      return (
        pr.number.toString().includes(searchLower) ||
        pr.title.toLowerCase().includes(searchLower) ||
        pr.author.toLowerCase().includes(searchLower) ||
        pr.approved_by.toLowerCase().includes(searchLower)
      );
    })
  }));

  // Create a map of dates to PR data
  const prsByDate = new Map(
    filteredApprovedPRsBySearch.map(day => [day.date, day])
  );

  // Generate all sprint days with PR data merged in
  const allSprintDays = getAllSprintDays();

  const filteredApprovedPRs = allSprintDays.map(date => ({
    date,
    prs: prsByDate.get(date)?.prs || [],
    isWeekend: isWeekend(date),
    isHoliday: isHoliday(date)
  })).filter(day => {
    // Only show elapsed days (not future), exclude weekends
    if (day.date > today) return false;
    if (day.isWeekend) return false;

    // If searching, only show days with matching PRs
    // If not searching, show all elapsed non-weekend days
    return prSearch ? day.prs.length > 0 : true;
  });

  return (
    <div className="min-h-screen bg-black p-6"

>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-light">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={goToPreviousSprint}
              disabled={!data?.has_previous_sprint}
              className="p-2 text-gray-400 hover:text-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Previous Sprint"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <h1 className="text-4xl font-extralight tracking-wide text-white">
              Sprint #{data?.current_sprint?.sprint_number}
            </h1>
            <button
              onClick={goToNextSprint}
              disabled={sprintOffset >= 0 || !data?.has_next_sprint}
              className="p-2 text-gray-400 hover:text-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Next Sprint"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <Link
            to="/sprint-metrics/detailed"
            className="px-4 py-2 bg-gray-700 text-white rounded font-light hover:bg-gray-600 transition-colors"
          >
            Detailed Metrics (Beta)
          </Link>
        </div>

        {/* Current Sprint Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Sprint #{data.current_sprint.sprint_number}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-teal-900/30 rounded border border-teal-500/30">
              <div className="text-sm text-teal-400 font-light mb-2">Support Engineer on Duty</div>
              <div className="flex items-center gap-3">
                <img
                  src={getGitHubAvatarUrl(data.current_sprint.engineer_name)}
                  alt={getEngineerDisplayName(data.current_sprint.engineer_name)}
                  className="w-16 h-16 rounded-full border-2 border-teal-500"
                />
                <div>
                  <div className="text-2xl font-light text-white">
                    {getEngineerDisplayName(data.current_sprint.engineer_name)}
                  </div>
                  <div className="text-sm text-gray-400">
                    ({data.current_sprint.engineer_name})
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 font-light">Sprint Number</div>
                <div className="text-2xl font-light text-white">#{data.current_sprint.sprint_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-light">Start Date</div>
                <div className="text-lg font-light text-white">{formatDate(data.current_sprint.start_date, true)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 font-light">End Date</div>
                <div className="text-lg font-light text-white">{formatDate(data.current_sprint.end_date, true)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Support Rotations */}
        {data.upcoming_rotations && data.upcoming_rotations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.upcoming_rotations.map((rotation, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-white">
                    {index === 0 ? 'Upcoming Support' : 'Up Next'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <img
                      src={getGitHubAvatarUrl(rotation.engineer_name)}
                      alt={getEngineerDisplayName(rotation.engineer_name)}
                      className="w-20 h-20 rounded-full border-2 border-teal-500"
                    />
                    <div className="flex-1">
                      <div className="text-2xl font-light text-white">
                        {getEngineerDisplayName(rotation.engineer_name)}
                      </div>
                      <div className="text-sm text-gray-400 mb-2">
                        ({rotation.engineer_name})
                      </div>
                      <div className="text-sm font-light text-gray-300">
                        {formatDate(rotation.start_date, true)} - {formatDate(rotation.end_date, true)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Sprint Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Total Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-extralight text-teal-400">
                {data.sprint_totals.total}
              </div>
              {data.approved_unmerged_count !== undefined && data.approved_unmerged_count > 0 && (
                <div className="text-xs text-amber-400 mt-2 font-light">
                  {data.approved_unmerged_count} approved, not yet merged
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Days in Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-extralight text-teal-400">
                {data.sprint_totals.days_elapsed}/{data.sprint_totals.days}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">days elapsed / business days</div>
              {data.current_sprint.start_date.startsWith('2025-11') && (
                <div className="text-xs text-amber-400 mt-1 font-light">Thanksgiving: 11/27</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Average per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-extralight text-teal-400">
                {data.sprint_totals.average_per_day.toFixed(1)}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">per business day</div>
            </CardContent>
          </Card>
        </div>

        {/* Dependabot Metrics */}
        {data.dependabot_metrics && (data.dependabot_metrics.merged_count > 0 || data.dependabot_metrics.closed_count > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-white">Dependabot PRs Merged</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-extralight text-green-400">
                  {data.dependabot_metrics.merged_count}
                </div>
                {data.dependabot_metrics.merged_prs.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {data.dependabot_metrics.merged_prs.map(pr => (
                      <a
                        key={pr.number}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm p-2 bg-gray-800/50 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="text-teal-400 font-light">#{pr.number}</div>
                        <div className="text-white font-light text-xs truncate">{pr.title}</div>
                        <div className="text-gray-500 text-xs">{pr.repository}</div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-white">Dependabot PRs Closed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-5xl font-extralight text-gray-400">
                  {data.dependabot_metrics.closed_count}
                </div>
                {data.dependabot_metrics.closed_prs.length > 0 && (
                  <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                    {data.dependabot_metrics.closed_prs.map(pr => (
                      <a
                        key={pr.number}
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-sm p-2 bg-gray-800/50 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="text-teal-400 font-light">#{pr.number}</div>
                        <div className="text-white font-light text-xs truncate">{pr.title}</div>
                        <div className="text-gray-500 text-xs">{pr.repository}</div>
                      </a>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Review Turnaround Time */}
        <ReviewTurnaround sprintOffset={sprintOffset} />

        {/* Charts Grid - 2 columns on wide screens */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Daily Approvals Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Daily Approvals by Engineer</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  {/* Reference areas for weekends and holidays */}
                  {(() => {
                    const areas: JSX.Element[] = [];
                    let weekendStartDate: string | null = null;

                    chartData.forEach((day, index) => {
                      if (day.isThanksgiving) {
                        // Add Thanksgiving reference area
                        areas.push(
                          <ReferenceArea
                            key={`thanksgiving-${index}`}
                            x1={day.date}
                            x2={day.date}
                            fill="#fbbf24"
                            fillOpacity={0.2}
                            ifOverflow="extendDomain"
                          >
                            <Label
                              value="HOLIDAY"
                              position="insideTop"
                              fill="#fbbf24"
                              fontSize={11}
                              fontWeight="bold"
                              offset={15}
                            />
                          </ReferenceArea>
                        );
                      } else if (day.isWeekend) {
                        if (weekendStartDate === null) {
                          weekendStartDate = day.date;
                        }
                      } else if (weekendStartDate !== null) {
                        // End of weekend, add reference area
                        const prevDay = chartData[index - 1];
                        areas.push(
                          <ReferenceArea
                            key={`weekend-${weekendStartDate}`}
                            x1={weekendStartDate}
                            x2={prevDay.date}
                            fill="#6b7280"
                            fillOpacity={0.15}
                            ifOverflow="extendDomain"
                          >
                            <Label
                              value="WEEKEND"
                              position="insideTop"
                              fill="#9ca3af"
                              fontSize={11}
                              fontWeight="bold"
                              offset={15}
                            />
                          </ReferenceArea>
                        );
                        weekendStartDate = null;
                      }
                    });

                    // Handle case where sprint ends on a weekend
                    if (weekendStartDate !== null) {
                      const lastDay = chartData[chartData.length - 1];
                      areas.push(
                        <ReferenceArea
                          key={`weekend-${weekendStartDate}`}
                          x1={weekendStartDate}
                          x2={lastDay.date}
                          fill="#6b7280"
                          fillOpacity={0.15}
                          ifOverflow="extendDomain"
                        >
                          <Label
                            value="WEEKEND"
                            position="insideTop"
                            fill="#9ca3af"
                            fontSize={11}
                            fontWeight="bold"
                            offset={15}
                          />
                        </ReferenceArea>
                      );
                    }

                    return areas;
                  })()}
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} vertical={false} />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#9ca3af"
                    tick={{ fill: '#e5e7eb', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    tick={{ fill: '#e5e7eb', fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#9ca3af'
                    }}
                    cursor={false}
                  />
                  <Legend
                    wrapperStyle={{ color: '#e5e7eb' }}
                  />
                  {engineers.map((engineer, index) => (
                    <Bar
                      key={engineer}
                      dataKey={engineer}
                      stackId="a"
                      fill={colors[index % colors.length]}
                      name={engineer}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Engineer Totals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Approvals by Engineer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-teal-500/20">
                  <thead className="bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-light text-gray-400 uppercase tracking-wider">
                        Engineer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-light text-gray-400 uppercase tracking-wider">
                        Approvals
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-light text-gray-400 uppercase tracking-wider">
                        Avg per Day
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-500/10">
                    {data.engineer_totals.map((engineer) => {
                      // Use days elapsed from API (already calculated on backend)
                      const daysElapsed = data.sprint_totals.days_elapsed || 1;
                      const avgPerDay = (engineer.approvals / daysElapsed).toFixed(1);

                      return (
                        <tr key={engineer.engineer}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <img
                                src={getGitHubAvatarUrl(engineer.engineer)}
                                alt={getEngineerDisplayName(engineer.engineer)}
                                className="w-10 h-10 rounded-full border border-teal-500"
                              />
                              <div>
                                <div className="text-sm font-light text-white">
                                  {getEngineerDisplayName(engineer.engineer)}
                                </div>
                                <div className="text-xs text-gray-400">
                                  {engineer.engineer}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-teal-400">
                            {engineer.approvals}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-light text-gray-300">
                            {avgPerDay}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approved & Closed PRs by Day */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-white">Approved & Closed PRs</CardTitle>
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Search by PR #, title, author, or approver..."
                  value={prSearch}
                  onChange={(e) => setPrSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-teal-500/30 bg-gray-800 text-white rounded font-light focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent placeholder-gray-500"
                />
                {prSearch && (
                  <button
                    onClick={() => setPrSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-400"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApprovedPRs.length === 0 ? (
              <div className="text-center py-8 text-gray-400 font-light">
                {prSearch ? `No PRs match "${prSearch}"` : 'No PRs found'}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredApprovedPRs.map((day) => (
                <div key={day.date} className="border-b border-teal-500/20 pb-4 last:border-b-0">
                  <h3 className="text-lg font-light mb-3 text-white flex items-center gap-2">
                    <span>{formatDate(day.date)} ({day.prs.length} {day.prs.length === 1 ? 'PR' : 'PRs'})</span>
                    {day.isHoliday && (
                      <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded">
                        Holiday
                      </span>
                    )}
                    {day.isWeekend && !day.isHoliday && (
                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded">
                        Weekend
                      </span>
                    )}
                  </h3>
                  {day.prs.length === 0 ? (
                    <div className="text-sm text-gray-500 italic font-light">No PRs approved on this day</div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
                    {day.prs.map((pr) => (
                      <div key={pr.number} className="flex items-start gap-3 text-sm">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-400 hover:text-teal-300 hover:underline font-light"
                        >
                          #{pr.number}
                        </a>
                        <div className="flex-1">
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:text-teal-400 hover:underline font-light"
                          >
                            {pr.title}
                          </a>
                          <div className="text-xs text-gray-400 mt-1 font-light">
                            by {pr.author} • approved by <span className="font-light text-teal-400">{pr.approved_by}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                  )}
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend Team Reviews (Past 6 Months) - All repositories */}
        {data.backend_approved_closed && data.backend_approved_closed.total > 0 && (
          <Card className="bg-slate-800 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-xl font-light text-white flex items-center justify-between">
                <span>Backend Team Reviews</span>
                <span className="text-sm text-amber-400">Past 6 Months</span>
              </CardTitle>
              <div className="flex justify-start mt-4">
                <div className="text-left">
                  <div className="text-4xl font-extralight text-amber-400">{data.backend_approved_closed.total}</div>
                  <div className="text-sm text-gray-400 mt-1">Total Approvals</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {[...data.backend_approved_closed.monthly_breakdown].reverse().map((month) => {
                  const isExpanded = expandedMonths.has(month.month_date);
                  return (
                    <div key={month.month_date} className="border-b border-amber-500/20 pb-4 last:border-b-0">
                      <button
                        onClick={() => toggleMonth(month.month_date)}
                        className="w-full flex items-center justify-between text-lg font-light mb-3 text-white hover:text-amber-400 transition-colors"
                      >
                        <span>
                          {month.month} ({month.total} {month.total === 1 ? 'approval' : 'approvals'})
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-amber-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2">
                          {month.prs.map((pr) => (
                            <div key={pr.number} className="flex items-start gap-3 text-sm">
                              <a
                                href={pr.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-amber-400 hover:text-amber-300 hover:underline font-light"
                              >
                                #{pr.number}
                              </a>
                              <div className="flex-1">
                                <a
                                  href={pr.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-white hover:text-amber-400 hover:underline font-light"
                                >
                                  {pr.title}
                                </a>
                                <div className="text-xs text-gray-400 mt-1 font-light">
                                  by {pr.author} • {pr.state === 'merged' ? '✓ merged' : '✕ closed'} • approved by <span className="font-light text-amber-400">{pr.approved_by.join(', ')}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SprintMetrics;
