import { NextResponse } from 'next/server'

// Redirect unauthenticated visitors from `/` and `/app/*` to `/login`.
export function middleware(req) {
  const url = req.nextUrl.clone()
  const { pathname } = req.nextUrl

  // Allow Next internals, static assets and API routes
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/favicon.ico')) return NextResponse.next()
  if (pathname.startsWith('/api/')) return NextResponse.next()

  // Public pages
  const publicPaths = ['/login', '/signup', '/auth', '/twiml-demo']
  if (publicPaths.includes(pathname)) return NextResponse.next()

  // Check session cookie (set by `lib/auth.js` - COOKIE_NAME = 'genie_session')
  const cookie = req.cookies.get('genie_session')
  if (!cookie) {
    url.pathname = '/login'
    url.searchParams.set('returnTo', pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/app/:path*']
}
