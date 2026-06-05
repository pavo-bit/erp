import { NextRequest, NextResponse } from "next/server";

/**
 * Next.js middleware — intentionally a no-op pass-through.
 * 
 * All route protection is handled client-side by AuthProvider (lib/auth-context.tsx).
 * The previous middleware caused redirect loops by checking cookie existence
 * without validating token expiry, conflicting with client-side auth checks.
 */
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Empty matcher = middleware won't run on any routes
  matcher: [],
};
