import { NextResponse } from 'next/server';
import { auth } from '@/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Cookie-authenticated image proxy. Streams bytes from the API so <img>
 * tags never depend on short-lived MinIO presigned URLs.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await auth();

  if (!session?.accessToken) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', message: 'Authentication is required' },
      { status: 401 },
    );
  }

  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '');
  if (!base) {
    return NextResponse.json(
      { code: 'CONFIG_ERROR', message: 'NEXT_PUBLIC_API_URL is required' },
      { status: 500 },
    );
  }

  const upstream = await fetch(`${base}/files/${id}/content`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    const body = await upstream.text();
    return new NextResponse(body || upstream.statusText, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ?? 'application/json',
      },
    });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type':
        upstream.headers.get('Content-Type') ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=300',
    },
  });
}
