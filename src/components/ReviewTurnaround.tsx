import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Clock, TrendingUp, Users } from 'lucide-react';

interface ReviewTurnaroundData {
  pr_number: number;
  title: string;
  author: string;
  url: string;
  ready_at: string;
  approved_at: string;
  approved_by: string;
  turnaround_hours: number;
  turnaround_business_hours: number;
}

interface TurnaroundDistribution {
  under_1h: number;
  '1h_4h': number;
  '4h_8h': number;
  '8h_24h': number;
  '24h_48h': number;
  over_48h: number;
}

interface ReviewerStats {
  reviewer: string;
  review_count: number;
  average_hours: number;
  median_hours: number;
}

interface TurnaroundMetrics {
  total_prs_reviewed: number;
  average_turnaround_hours: number;
  median_turnaround_hours: number;
  average_business_hours: number;
  median_business_hours: number;
  min_turnaround_hours: number;
  max_turnaround_hours: number;
  distribution: TurnaroundDistribution;
  by_reviewer: ReviewerStats[];
  recent_reviews: ReviewTurnaroundData[];
}

interface ReviewTurnaroundProps {
  sprintOffset: number;
}

const ReviewTurnaround: React.FC<ReviewTurnaroundProps> = ({ sprintOffset }) => {
  const [metrics, setMetrics] = useState<TurnaroundMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  useEffect(() => {
    fetchTurnaroundMetrics();
  }, [sprintOffset]);

  const fetchTurnaroundMetrics = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const url = sprintOffset === 0
        ? `${apiUrl}/api/v1/sprint_metrics/review_turnaround`
        : `${apiUrl}/api/v1/sprint_metrics/review_turnaround?sprint_offset=${sprintOffset}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch review turnaround metrics');
      }

      const data = await response.json();
      setMetrics(data.metrics);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatHours = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`;
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      return `${days}d ${remainingHours.toFixed(0)}h`;
    }
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getGitHubAvatarUrl = (githubHandle: string): string => {
    return `https://github.com/${githubHandle}.png?size=40`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-gray-400 font-light">Loading review turnaround metrics...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="text-red-400 font-light">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.total_prs_reviewed === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-400" />
            Review Turnaround Time
          </CardTitle>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <div className="text-gray-400 font-light">No review turnaround data available for this sprint.</div>
          <div className="text-sm text-gray-500 mt-2">Timestamps will be collected as PRs become ready for review.</div>
        </CardContent>
      </Card>
    );
  }

  // Prepare distribution chart data
  const distributionData = [
    { name: '<1h', count: metrics.distribution.under_1h, color: '#10b981' },
    { name: '1-4h', count: metrics.distribution['1h_4h'], color: '#22d3ee' },
    { name: '4-8h', count: metrics.distribution['4h_8h'], color: '#3b82f6' },
    { name: '8-24h', count: metrics.distribution['8h_24h'], color: '#8b5cf6' },
    { name: '1-2d', count: metrics.distribution['24h_48h'], color: '#f59e0b' },
    { name: '>2d', count: metrics.distribution.over_48h, color: '#ef4444' },
  ].filter(d => d.count > 0);

  const displayedReviews = showAllReviews
    ? metrics.recent_reviews
    : metrics.recent_reviews.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-teal-400" />
          Review Turnaround Time
        </CardTitle>
        <div className="text-sm text-gray-400 font-light mt-1">
          Time from "Ready for Backend Review" to "Backend Approved"
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 font-light">Average</div>
            <div className="text-2xl font-light text-teal-400">
              {formatHours(metrics.average_turnaround_hours)}
            </div>
            <div className="text-xs text-gray-500">total time</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 font-light">Median</div>
            <div className="text-2xl font-light text-teal-400">
              {formatHours(metrics.median_turnaround_hours)}
            </div>
            <div className="text-xs text-gray-500">total time</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 font-light">Business Hours Avg</div>
            <div className="text-2xl font-light text-cyan-400">
              {formatHours(metrics.average_business_hours)}
            </div>
            <div className="text-xs text-gray-500">9am-5pm ET</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-400 font-light">PRs Reviewed</div>
            <div className="text-2xl font-light text-white">
              {metrics.total_prs_reviewed}
            </div>
            <div className="text-xs text-gray-500">this sprint</div>
          </div>
        </div>

        {/* Distribution Chart */}
        {distributionData.length > 0 && (
          <div>
            <h4 className="text-sm font-light text-gray-400 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Turnaround Distribution
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={distributionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} horizontal={false} />
                <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#e5e7eb', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#9ca3af"
                  tick={{ fill: '#e5e7eb', fontSize: 12 }}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    borderRadius: '8px',
                    color: '#9ca3af'
                  }}
                  formatter={(value: number) => [`${value} PRs`, 'Count']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* By Reviewer */}
        {metrics.by_reviewer.length > 0 && (
          <div>
            <h4 className="text-sm font-light text-gray-400 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Reviewer
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {metrics.by_reviewer.map((reviewer) => (
                <div
                  key={reviewer.reviewer}
                  className="flex items-center gap-3 bg-gray-800/30 rounded-lg p-3"
                >
                  <img
                    src={getGitHubAvatarUrl(reviewer.reviewer)}
                    alt={reviewer.reviewer}
                    className="w-8 h-8 rounded-full border border-teal-500/50"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-light text-white truncate">
                      {reviewer.reviewer}
                    </div>
                    <div className="text-xs text-gray-400">
                      {reviewer.review_count} reviews
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-light text-teal-400">
                      {formatHours(reviewer.average_hours)}
                    </div>
                    <div className="text-xs text-gray-500">avg</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Reviews */}
        {metrics.recent_reviews.length > 0 && (
          <div>
            <h4 className="text-sm font-light text-gray-400 mb-3">Recent Reviews</h4>
            <div className="space-y-2">
              {displayedReviews.map((review) => (
                <div
                  key={review.pr_number}
                  className="flex items-center gap-4 bg-gray-800/20 rounded-lg p-3 text-sm"
                >
                  <a
                    href={review.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 font-light"
                  >
                    #{review.pr_number}
                  </a>
                  <div className="flex-1 min-w-0">
                    <a
                      href={review.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-teal-400 font-light truncate block"
                    >
                      {review.title}
                    </a>
                    <div className="text-xs text-gray-400">
                      by {review.author} • approved by {review.approved_by}
                    </div>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="text-sm font-light text-teal-400">
                      {formatHours(review.turnaround_hours)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDateTime(review.approved_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {metrics.recent_reviews.length > 5 && (
              <button
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="mt-3 text-sm text-teal-400 hover:text-teal-300 font-light"
              >
                {showAllReviews
                  ? 'Show less'
                  : `Show all ${metrics.recent_reviews.length} reviews`}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReviewTurnaround;
