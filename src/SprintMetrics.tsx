import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft } from 'lucide-react';

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

interface SprintMetricsData {
  current_sprint: SprintInfo | null;
  daily_approvals: DailyApproval[];
  sprint_totals: SprintTotals;
  engineer_totals: EngineerTotal[];
  approved_prs_by_day: ApprovedPRsByDay[];
}

const SprintMetrics: React.FC = () => {
  const [data, setData] = useState<SprintMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prSearch, setPrSearch] = useState('');

  useEffect(() => {
    fetchSprintMetrics();
  }, []);

  const fetchSprintMetrics = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/v1/sprint_metrics`);

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

  const formatDate = (dateString: string) => {
    // Parse date in UTC to avoid timezone shifts
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading sprint metrics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-[600px]">
          <CardHeader>
            <CardTitle className="text-red-500">Error Loading Sprint Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">{error}</p>
            <p className="text-sm text-gray-600 mb-4">
              This feature requires database migrations to be run. Please wait a few minutes for the deployment to complete, then try again.
            </p>
            <button
              onClick={fetchSprintMetrics}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>No Sprint Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No sprint rotation data has been configured yet.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.daily_approvals.map(day => ({
    date: formatDate(day.date),
    total: day.total,
    ...day.by_engineer
  }));

  // Get unique engineers for chart lines
  const engineers = Array.from(
    new Set(
      data.daily_approvals.flatMap(day => Object.keys(day.by_engineer))
    )
  );

  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1',
    '#d084d0', '#a4de6c', '#d0ed57', '#ffa07a', '#20b2aa'
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold">Sprint Metrics</h1>
          </div>
          <button
            onClick={fetchSprintMetrics}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Refresh
          </button>
        </div>

        {/* Current Sprint Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Sprint</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-700 font-medium mb-1">Support Engineer on Duty</div>
              <div className="text-3xl font-bold text-blue-900">{data.current_sprint.engineer_name}</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Sprint Number</div>
                <div className="text-2xl font-bold">#{data.current_sprint.sprint_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="text-lg">{formatDate(data.current_sprint.start_date)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End Date</div>
                <div className="text-lg">{formatDate(data.current_sprint.end_date)}</div>
                {data.current_sprint.start_date.startsWith('2025-11') && (
                  <div className="text-xs text-gray-400 mt-1">Thanksgiving: 11/27</div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sprint Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {data.sprint_totals.total}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Days in Sprint</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">
                {calculateBusinessDays(data.current_sprint.start_date, data.current_sprint.end_date)}
              </div>
              <div className="text-xs text-gray-500 mt-1">business days</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">
                {(() => {
                  const businessDays = calculateBusinessDays(data.current_sprint.start_date, data.current_sprint.end_date);
                  return businessDays > 0 ? (data.sprint_totals.total / businessDays).toFixed(1) : '0.0';
                })()}
              </div>
              <div className="text-xs text-gray-500 mt-1">per business day</div>
            </CardContent>
          </Card>
        </div>

        {/* Daily Approvals Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#000000"
                  strokeWidth={2}
                  name="Total"
                />
                {engineers.map((engineer, index) => (
                  <Line
                    key={engineer}
                    type="monotone"
                    dataKey={engineer}
                    stroke={colors[index % colors.length]}
                    strokeWidth={1.5}
                    name={engineer}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Engineer Totals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Approvals by Engineer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Engineer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Approvals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.engineer_totals.map((engineer) => {
                    const percentage = data.sprint_totals.total > 0
                      ? ((engineer.approvals / data.sprint_totals.total) * 100).toFixed(1)
                      : '0.0';

                    return (
                      <tr key={engineer.engineer}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {engineer.engineer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {engineer.approvals}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
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

        {/* Approved & Closed PRs by Day */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle>Approved & Closed PRs</CardTitle>
              <div className="relative w-full md:w-96">
                <input
                  type="text"
                  placeholder="Search by PR #, title, author, or approver..."
                  value={prSearch}
                  onChange={(e) => setPrSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {prSearch && (
                  <button
                    onClick={() => setPrSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredApprovedPRs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {prSearch ? `No PRs match "${prSearch}"` : 'No PRs found'}
              </div>
            ) : (
              <div className="space-y-6">
                {filteredApprovedPRs.map((day) => (
                <div key={day.date} className="border-b pb-4 last:border-b-0">
                  <h3 className="text-lg font-semibold mb-3 text-gray-700">
                    {formatDate(day.date)} ({day.prs.length} {day.prs.length === 1 ? 'PR' : 'PRs'})
                  </h3>
                  <div className="space-y-2">
                    {day.prs.map((pr) => (
                      <div key={pr.number} className="flex items-start gap-3 text-sm">
                        <a
                          href={pr.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                        >
                          #{pr.number}
                        </a>
                        <div className="flex-1">
                          <a
                            href={pr.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-900 hover:text-blue-600 hover:underline"
                          >
                            {pr.title}
                          </a>
                          <div className="text-xs text-gray-500 mt-1">
                            by {pr.author} • approved by <span className="font-medium text-gray-700">{pr.approved_by}</span>
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
      </div>
    </div>
  );
};

export default SprintMetrics;
