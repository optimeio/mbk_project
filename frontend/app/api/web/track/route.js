import { NextResponse } from 'next/server';

const getBackendOrigin = () => {
  const raw = (
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.API_ORIGIN ||
    'http://127.0.0.1:5005'
  ).trim();

  return raw.replace(/\/+$/, '').replace(/\/api\/?$/i, '');
};

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body' },
      { status: 400 },
    );
  }

  if (!body?.eventType) {
    return NextResponse.json(
      { success: false, message: 'eventType is required in request body' },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${getBackendOrigin()}/api/web/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': request.headers.get('user-agent') || '',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });

    const payload = await response.json().catch(() => ({ success: response.ok }));
    return NextResponse.json(payload, { status: response.status });
  } catch {
    // Analytics is best-effort when the API server is not running locally.
    return NextResponse.json({ success: true, skipped: true }, { status: 202 });
  }
}
