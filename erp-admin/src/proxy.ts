import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const schoolToken = request.cookies.get('school_access_token');
  const fallbackToken = request.cookies.get('access_token');
  const token = schoolToken || fallbackToken;

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/' || pathname === '/login';

  // Protect institutional admin routes against unauthenticated or cross-portal tokens
  if (!token && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect authenticated school users away from login
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const middleware = proxy;
export default proxy;

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
