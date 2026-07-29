import { NextRequest, NextResponse } from "next/server";
import { auth0 } from "@/lib/auth0";

// Routes that require an authenticated session to view.
const PROTECTED_ROUTES = ["/dashboard"];

// Next.js 16 replaces `middleware.ts` with `proxy.ts` as the network
// interception boundary. This mounts the Auth0 SDK's auth routes
// (/auth/login, /auth/logout, /auth/callback, ...) and manages the session.
export async function proxy(request: NextRequest) {
  const authRes = await auth0.middleware(request);

  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    const session = await auth0.getSession(request);

    if (!session) {
      const loginUrl = new URL("/auth/login", request.nextUrl.origin);
      loginUrl.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return authRes;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
