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

interface SprintMetricsData {
  current_sprint: SprintInfo | null;
  daily_approvals: DailyApproval[];
  sprint_totals: SprintTotals;
  engineer_totals: EngineerTotal[];
}

const SprintMetrics: React.FC = () => {
  const [data, setData] = useState<SprintMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-500">Sprint Number</div>
                <div className="text-2xl font-bold">#{data.current_sprint.sprint_number}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Support Engineer</div>
                <div className="text-2xl font-bold">{data.current_sprint.engineer_name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Start Date</div>
                <div className="text-lg">{formatDate(data.current_sprint.start_date)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">End Date</div>
                <div className="text-lg">{formatDate(data.current_sprint.end_date)}</div>
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
                {data.sprint_totals.days}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Average per Day</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">
                {data.sprint_totals.average_per_day}
              </div>
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
      </div>
    </div>
  );
};

export default SprintMetrics;
