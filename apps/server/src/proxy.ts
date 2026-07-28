import { type NextRequest, NextResponse } from 'next/server';

import { isAllowedCorsOrigin } from './lib/env';

const corsHeaders = {
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function proxy(request: NextRequest) {
  const origin = request.headers.get('origin') ?? '';
  const originAllowed = origin !== '' && isAllowedCorsOrigin(origin);

  if (request.method === 'OPTIONS') {
    if (!originAllowed) {
      return NextResponse.json(
        { message: 'Origin is not allowed.' },
        { status: 403 },
      );
    }
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': origin,
        Vary: 'Origin',
      },
    });
  }

  const response = NextResponse.next();
  Object.entries(corsHeaders).forEach(([name, value]) =>
    response.headers.set(name, value),
  );
  response.headers.set('Vary', 'Origin');
  if (originAllowed) response.headers.set('Access-Control-Allow-Origin', origin);
  return response;
}

export const config = { matcher: '/api/:path*' };