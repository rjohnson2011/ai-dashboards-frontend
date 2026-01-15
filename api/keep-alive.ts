// Vercel Serverless Function to keep the Render backend warm
// This endpoint is called by Vercel Cron every 5 minutes

export const config = {
  runtime: 'edge',
};

export default async function handler() {
  const apiUrl = process.env.VITE_API_URL || 'https://ai-dashboards.onrender.com';

  try {
    // Ping the health endpoint to keep the server warm
    const response = await fetch(`${apiUrl}/api/v1/reviews`, {
      method: 'GET',
      headers: {
        'User-Agent': 'KeepAlive-Cron/1.0',
      },
    });

    const status = response.ok ? 'healthy' : 'unhealthy';

    return new Response(
      JSON.stringify({
        success: true,
        status,
        timestamp: new Date().toISOString(),
        apiUrl,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
