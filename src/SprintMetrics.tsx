import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceArea, Label } from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

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
  prs: BackendApprovedClosedPR[];
}

interface BackendApprovedClosed {
  total: number;
  merged: number;
  closed: number;
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
}

const SprintMetrics: React.FC = () => {
  const [data, setData] = useState<SprintMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prSearch, setPrSearch] = useState('');
  const [sprintOffset, setSprintOffset] = useState(0); // 0 = current, -1 = previous, etc.
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSprintMetrics(sprintOffset);
  }, [sprintOffset]);

  const fetchSprintMetrics = async (offset: number = 0) => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = offset === 0
        ? `${apiUrl}/api/v1/sprint_metrics`
        : `${apiUrl}/api/v1/sprint_metrics?sprint_offset=${offset}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('Failed to fetch sprint metrics');
      }

      const jsonData = await response.json();
      setData(jsonData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousSprint = () => {
    // Limit to 3 months back (roughly 6 sprints of 2 weeks each)
    if (sprintOffset > -6) {
      setSprintOffset(prev => prev - 1);
    }
  };

  const goToNextSprint = () => {
    if (sprintOffset < 0) {
      setSprintOffset(prev => prev + 1);
    }
  };

  const isCurrentSprint = sprintOffset === 0;

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
      'stevenjcumming': 'Steven Cumming'
    };
    return nameMap[githubHandle] || githubHandle;
  };

  const getGitHubAvatarUrl = (githubHandle: string): string => {
    return `https://github.com/${githubHandle}.png?size=80`;
  };

  const calculateBusinessDays = (startDate: string, endDate: string) => {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);

    const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    let businessDays = 0;
    let current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getUTCDay();
      // Count weekdays (Mon-Fri = 1-5)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        businessDays++;
      }
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Check for Thanksgiving (4th Thursday of November)
    if (startYear === 2025 && startMonth === 11) {
      // Thanksgiving 2025 is Nov 27
      const thanksgiving = new Date(Date.UTC(2025, 10, 27));
      if (thanksgiving >= start && thanksgiving <= end) {
        businessDays--;
      }
    }

    return businessDays;
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

  // Generate all dates in the sprint range
  const startDate = new Date(data.current_sprint.start_date + 'T00:00:00Z');
  const endDate = isCurrentSprint
    ? new Date(today + 'T00:00:00Z')
    : new Date(data.current_sprint.end_date + 'T00:00:00Z');

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

    if (dayData) {
      return {
        date: formatDate(dateStr, true),
        rawDate: dateStr,
        total: dayData.total,
        isWeekend,
        isThanksgiving,
        ...dayData.by_engineer
      };
    } else {
      // Fill with zeros for missing days
      const emptyDay: any = {
        date: formatDate(dateStr, true),
        rawDate: dateStr,
        total: 0,
        isWeekend,
        isThanksgiving
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

  // Filter approved PRs by search term
  const filteredApprovedPRs = data.approved_prs_by_day.map(day => ({
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
  })).filter(day => day.prs.length > 0); // Only show days with matching PRs

  return (
    <div className="min-h-screen bg-black p-6"

>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
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
                disabled={sprintOffset <= -6}
                className="p-2 text-gray-400 hover:text-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Previous Sprint"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h1 className="text-4xl font-extralight tracking-wide text-white">
                {isCurrentSprint ? 'Current Sprint' : `Sprint #${data?.current_sprint?.sprint_number}`}
              </h1>
              <button
                onClick={goToNextSprint}
                disabled={sprintOffset >= 0}
                className="p-2 text-gray-400 hover:text-teal-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next Sprint"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/sprint-metrics/detailed"
              className="px-4 py-2 bg-gray-700 text-white rounded font-light hover:bg-gray-600 transition-colors"
            >
              View Detailed Metrics
            </Link>
            <button
              onClick={() => fetchSprintMetrics(sprintOffset)}
              className="px-4 py-2 bg-teal-600 text-white rounded font-light hover:bg-teal-500 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Current Sprint Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-white">{isCurrentSprint ? 'Current Sprint' : `Sprint #${data.current_sprint.sprint_number}`}</CardTitle>
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
                {calculateBusinessDays(data.current_sprint.start_date, data.current_sprint.end_date)}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">business days</div>
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
                {(() => {
                  const businessDays = calculateBusinessDays(data.current_sprint.start_date, data.current_sprint.end_date);
                  return businessDays > 0 ? (data.sprint_totals.total / businessDays).toFixed(1) : '0.0';
                })()}
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
                        Percentage
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-500/10">
                    {data.engineer_totals.map((engineer) => {
                      const percentage = data.sprint_totals.total > 0
                        ? ((engineer.approvals / data.sprint_totals.total) * 100).toFixed(1)
                        : '0.0';

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
                            {percentage}%
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
                  <h3 className="text-lg font-light mb-3 text-white">
                    {formatDate(day.date)} ({day.prs.length} {day.prs.length === 1 ? 'PR' : 'PRs'})
                  </h3>
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
                </div>
              ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend Approved & Closed PRs (Past 6 Months) */}
        {data.backend_approved_closed && data.backend_approved_closed.total > 0 && (
          <Card className="bg-slate-800 border-amber-500/30">
            <CardHeader>
              <CardTitle className="text-xl font-light text-white flex items-center justify-between">
                <span>Backend-Approved & Closed PRs</span>
                <span className="text-sm text-amber-400">Past 6 Months</span>
              </CardTitle>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center">
                  <div className="text-3xl font-extralight text-white">{data.backend_approved_closed.total}</div>
                  <div className="text-xs text-gray-400 mt-1">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extralight text-green-400">{data.backend_approved_closed.merged}</div>
                  <div className="text-xs text-gray-400 mt-1">Merged</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extralight text-gray-400">{data.backend_approved_closed.closed}</div>
                  <div className="text-xs text-gray-400 mt-1">Closed</div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {data.backend_approved_closed.monthly_breakdown.map((month) => {
                  const isExpanded = expandedMonths.has(month.month_date);
                  return (
                    <div key={month.month_date} className="border-b border-amber-500/20 pb-4 last:border-b-0">
                      <button
                        onClick={() => toggleMonth(month.month_date)}
                        className="w-full flex items-center justify-between text-lg font-light mb-3 text-white hover:text-amber-400 transition-colors"
                      >
                        <span>
                          {month.month} ({month.total} {month.total === 1 ? 'PR' : 'PRs'}: {month.merged} merged, {month.closed} closed)
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
