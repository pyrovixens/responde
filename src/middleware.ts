import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';
import { isMaliciousUserAgent } from '@/lib/security/sanitizer';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent');
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown-ip';
  const pathname = request.nextUrl.pathname;

  // 1. Block Automated Hacker Scanners (sqlmap, nikto, dirbuster, etc.)
  if (isMaliciousUserAgent(userAgent)) {
    return new NextResponse('Forbidden: Access Denied by Security Policy', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  // 2. Rate Limiting on API endpoints
  if (pathname.startsWith('/api/v1/')) {
    const rateLimit = checkRateLimit(`api:${ip}`, { limit: 120, windowMs: 60000 });
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests from your IP. Please wait before retrying.',
          retryAfterSeconds: Math.ceil(rateLimit.resetInMs / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil(rateLimit.resetInMs / 1000)),
          },
        }
      );
    }
  }

  // 3. Security response headers
  const response = NextResponse.next();

  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
};
