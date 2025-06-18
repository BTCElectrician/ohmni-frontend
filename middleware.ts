// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Define public routes that don't need authentication
  const publicRoutes = ['/login', '/register', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

  // Define protected routes that need authentication
  const protectedRoutes = ['/chat', '/construction', '/profile'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  // Get response object
  const response = NextResponse.next();

  // Add online/offline detection headers
  // This helps the client know the user's connection status
  response.headers.set('X-Online-Status', 'online');
  
  // Placeholder for offline handling
  // TODO: In the future, we can check if user is offline and:
  // - Serve cached content
  // - Add special headers for offline mode
  // - Route to offline-specific pages
  
  // Example offline detection (to be implemented with service worker):
  // if (req.headers.get('X-Offline-Mode') === 'true') {
  //   response.headers.set('X-Online-Status', 'offline');
  //   response.headers.set('X-Cache-Strategy', 'cache-first');
  // }

  // Redirect to login if trying to access protected route without auth
  if (isProtectedRoute && !isLoggedIn) {
    const newUrl = new URL("/login", req.nextUrl.origin);
    // Preserve the original URL they were trying to access
    newUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(newUrl);
  }

  // Redirect to home if trying to access auth pages while logged in
  if (isPublicRoute && isLoggedIn && pathname !== '/reset-password') {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  return response;
});

export const config = {
  // Run middleware on all routes except static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)",
  ],
}; 