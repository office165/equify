import { appRouteMethodNotAllowed } from '../../../../../lib/api/http';
import { handleValuationCalculatePost } from '../../../../../lib/api/handlers/valuation_generate';

export async function POST(request: Request) {
  return handleValuationCalculatePost(request);
}

export function GET() {
  return appRouteMethodNotAllowed(['POST']);
}

export function PUT() {
  return appRouteMethodNotAllowed(['POST']);
}

export function DELETE() {
  return appRouteMethodNotAllowed(['POST']);
}
