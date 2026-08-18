import { NextResponse } from 'next/server';
import { appRouteMethodNotAllowed } from '../../../../../lib/api/http';
import {
  countDeliveredReports,
} from '../../../../../lib/landing/public_stats';

export const runtime = 'nodejs';
export const revalidate = 300;

export async function GET() {
  const count = await countDeliveredReports();
  return NextResponse.json(
    { count },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      },
    },
  );
}

export function POST() {
  return appRouteMethodNotAllowed(['GET']);
}
