import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import ReviewTurnaround from './components/ReviewTurnaround';
import { authService } from './services/auth';

interface SprintInfo {
  sprint_number: number;
  engineer_name: string;
  start_date: string;
  end_date: string;
}

interface TimeToApproval {
  average_hours: number;
  average_days: number;
  median_hours: number;
  sample_size: number;
  distribution: Array<{ pr_number: number; hours: number; days: number }>;
}

interface FirstResponseTime {
  average_hours: number;
  median_hours: number;
  sample_size: number;
  fastest_reviewers: Record<string, number>;
}

interface ReviewCycles {
  average_cycles: number;
  first_time_approval_rate: number;
  distribution: Record<number, number>;
  sample_size: number;
}

interface ApprovalRate {
  first_time_approval_rate: number;
  total_reviewed: number;
  approved_first_time: number;
  required_changes: number;
}

interface StalePR {
  number: number;
  title: string;
  author: string;
  days_old: number;
  url: string;
}

interface StalePRs {
  count: number;
  threshold_days: number;
  prs: StalePR[];
}

interface RepositoryBreakdown {
  repositories: Array<{ repository: string; reviews: number }>;
  total_repositories: number;
}

interface SprintData {
  sprint_number: number;
  engineer: string;
  start_date: string;
  end_date: string;
  total_approvals: number;
  business_days: number;
  avg_per_day: number;
}

interface SprintComparison {
  sprints: SprintData[];
  trend: string;
}

interface QueueDepthData {
  date: string;
  queue_depth: number;
}

interface QueueDepthOverTime {
  daily_data: QueueDepthData[];
  max_depth: number;
  avg_depth: number;
}

interface DetailedMetrics {
  sprint_info: SprintInfo;
  time_to_approval: TimeToApproval;
  first_response_time: FirstResponseTime;
  review_cycles: ReviewCycles;
  approval_rate: ApprovalRate;
  stale_prs: StalePRs;
  repository_breakdown: RepositoryBreakdown;
  sprint_comparison: SprintComparison;
  queue_depth_over_time: QueueDepthOverTime;
}

const DetailedSprintMetrics: React.FC = () => {
  const [data, setData] = useState<DetailedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sprintOffset, setSprintOffset] = useState(0);

  useEffect(() => {
    fetchDetailedMetrics(sprintOffset);
  }, [sprintOffset]);

  const fetchDetailedMetrics = async (offset: number = 0) => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = offset === 0
        ? `${apiUrl}/api/v1/sprint_metrics/detailed`
        : `${apiUrl}/api/v1/sprint_metrics/detailed?sprint_offset=${offset}`;
      const response = await fetch(url, {
        headers: { ...authService.getAuthHeaders() },
      });

      if (response.status === 401 || response.status === 403) {
        authService.logout();
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to fetch detailed metrics');
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

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC'
    });
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'increasing') return <TrendingUp className="h-5 w-5 text-teal-400" />;
    if (trend === 'decreasing') return <TrendingDown className="h-5 w-5 text-red-400" />;
    return <Minus className="h-5 w-5 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-xl font-light text-white">Loading detailed metrics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <Card className="w-[600px]">
          <CardHeader>
            <CardTitle className="text-red-400">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-light text-white">{error || 'No data available'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Prepare sprint comparison chart data
  const comparisonChartData = data.sprint_comparison.sprints.map(sprint => ({
    sprint: `#${sprint.sprint_number}`,
    approvals: sprint.total_approvals,
    avg_per_day: sprint.avg_per_day
  }));

  // Prepare queue depth chart data
  const queueChartData = data.queue_depth_over_time.daily_data.map(day => ({
    date: formatDate(day.date),
    queue: day.queue_depth
  }));

  // Prepare review cycles distribution chart
  const cyclesChartData = Object.entries(data.review_cycles.distribution).map(([cycles, count]) => ({
    cycles: `${cycles} ${parseInt(cycles) === 1 ? 'cycle' : 'cycles'}`,
    count: count
  }));

  return (
    <div className="min-h-screen bg-black p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              to="/sprint-metrics"
              className="flex items-center gap-2 text-gray-400 hover:text-teal-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="font-light">Back to Sprint Metrics</span>
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
                {isCurrentSprint ? 'Current Sprint' : `Sprint #${data.sprint_info.sprint_number}`} - Detailed Metrics
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
        </div>

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg Time to Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extralight text-teal-400">
                {data.time_to_approval.average_hours}h
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">
                {data.time_to_approval.average_days} days
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">First Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extralight text-teal-400">
                {data.first_response_time.average_hours}h
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">
                median: {data.first_response_time.median_hours}h
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Avg Review Cycles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extralight text-teal-400">
                {data.review_cycles.average_cycles}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">
                {data.review_cycles.first_time_approval_rate.toFixed(1)}% approved first time
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Stale PRs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-extralight text-teal-400">
                {data.stale_prs.count}
              </div>
              <div className="text-xs text-gray-400 mt-1 font-light">
                &gt;{data.stale_prs.threshold_days} days old
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Review Turnaround Time */}
        <ReviewTurnaround sprintOffset={sprintOffset} />

        {/* Sprint Comparison - 3 Months */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Sprint Comparison (Last 3 Months)</CardTitle>
              <div className="flex items-center gap-2">
                {getTrendIcon(data.sprint_comparison.trend)}
                <span className="text-sm text-gray-400 font-light capitalize">
                  {data.sprint_comparison.trend}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={comparisonChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis dataKey="sprint" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    color: '#9ca3af'
                  }}
                />
                <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                <Bar dataKey="approvals" fill="#14b8a6" name="Total Approvals" radius={[4, 4, 0, 0]} />
                <Bar dataKey="avg_per_day" fill="#5eead4" name="Avg/Day" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Queue Depth Over Time */}
          <Card>
            <CardHeader>
              <CardTitle>Review Queue Depth</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="text-sm text-gray-400 font-light">Max: {data.queue_depth_over_time.max_depth} | Avg: {data.queue_depth_over_time.avg_depth}</div>
              </div>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={queueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    stroke="#9ca3af"
                    tick={{ fill: '#e5e7eb', fontSize: 12 }}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#9ca3af'
                    }}
                  />
                  <Line type="monotone" dataKey="queue" stroke="#14b8a6" strokeWidth={2} dot={{ fill: '#14b8a6' }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Review Cycles Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Review Cycles Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={cyclesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="cycles" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #1a1a1a',
                      borderRadius: '8px',
                      color: '#9ca3af'
                    }}
                  />
                  <Bar dataKey="count" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Fastest Reviewers */}
          <Card>
            <CardHeader>
              <CardTitle>Fastest Reviewers (Avg Response Time)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(data.first_response_time.fastest_reviewers).map(([reviewer, hours]) => (
                  <div key={reviewer} className="flex justify-between items-center py-2 border-b border-teal-500/10">
                    <span className="text-white font-light">{reviewer}</span>
                    <span className="text-teal-400 font-light">{hours}h</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Repository Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Reviews by Repository</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.repository_breakdown.repositories.slice(0, 10).map((repo) => (
                  <div key={repo.repository} className="flex justify-between items-center py-2 border-b border-teal-500/10">
                    <span className="text-white font-light truncate">{repo.repository}</span>
                    <span className="text-teal-400 font-light">{repo.reviews}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stale PRs */}
        {data.stale_prs.count > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Stale PRs (Waiting &gt;{data.stale_prs.threshold_days} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.stale_prs.prs.map((pr) => (
                  <div key={pr.number} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded border border-teal-500/10">
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
                        className="text-white hover:text-teal-400 hover:underline font-light block mb-1"
                      >
                        {pr.title}
                      </a>
                      <div className="text-xs text-gray-400 font-light">
                        by {pr.author} • <span className="text-red-400">{pr.days_old} days old</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Slowest to Approve */}
        {data.time_to_approval.distribution.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Longest Time to Approval</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                {data.time_to_approval.distribution.map((item) => (
                  <div key={item.pr_number} className="flex justify-between items-center py-2 px-3 bg-gray-800/50 rounded border border-teal-500/10">
                    <span className="text-teal-400 font-light">PR #{item.pr_number}</span>
                    <span className="text-white font-light">{item.hours}h ({item.days}d)</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default DetailedSprintMetrics;
