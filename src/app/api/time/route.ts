import { NextResponse } from 'next/server';
import { getNowPHTIso } from '@/lib/time';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET() {
  const epochMs = Date.now();
  return NextResponse.json(
    {
      serverTime: getNowPHTIso(epochMs),
      epochMs,
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}
