import { getRequestId, jsonSuccess } from '../../../lib/api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const requestId = getRequestId(request);

  return jsonSuccess({
    status: 'ok',
    service: 'elchanan-construction-platform',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  }, 200, {
    requestId,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
