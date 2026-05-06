// Keep-alive service to prevent Render cold starts
// Pings the API every 4 minutes when the app is open

const API_URL = import.meta.env.VITE_API_URL || 'https://ai-dashboards.onrender.com';
const PING_INTERVAL = 4 * 60 * 1000; // 4 minutes

let pingInterval: number | null = null;

async function pingAPI(): Promise<boolean> {
  try {
    // Use the public version endpoint so the ping works without a valid auth token.
    const response = await fetch(`${API_URL}/api/v1/reviews/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function startKeepAlive(): void {
  if (pingInterval) return; // Already running

  // Initial ping
  pingAPI();

  // Set up interval
  pingInterval = window.setInterval(pingAPI, PING_INTERVAL);

  // Also ping when tab becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      pingAPI();
    }
  });
}

export function stopKeepAlive(): void {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
}

// Wake up the server - for use during initial load
export async function wakeUpServer(maxRetries = 3): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    const isUp = await pingAPI();
    if (isUp) return true;
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  return false;
}
