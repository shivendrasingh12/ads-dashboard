import { NextResponse } from 'next/server'

/**
 * Optional password protection for the dashboard.
 * 
 * To enable: set DASHBOARD_PASSWORD in your Vercel env vars.
 * To access: visit https://your-dashboard.vercel.app?p=yourpassword
 * Cookie lasts 30 days so team only needs to do this once per browser.
 * 
 * To disable: remove DASHBOARD_PASSWORD env var entirely.
 */
export function middleware(request) {
  const password = process.env.DASHBOARD_PASSWORD
  
  // No password set — allow everyone through
  if (!password) return NextResponse.next()

  // Check existing auth cookie
  const cookie = request.cookies.get('dash-auth')
  if (cookie?.value === password) return NextResponse.next()

  // Check password in query string
  const { searchParams, pathname } = new URL(request.url)
  const attempt = searchParams.get('p')
  
  if (attempt === password) {
    // Correct — set cookie and redirect to clean URL
    const cleanUrl = new URL(pathname, request.url)
    const response = NextResponse.redirect(cleanUrl)
    response.cookies.set('dash-auth', password, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
      httpOnly: true,
      sameSite: 'lax',
    })
    return response
  }

  // Not authenticated — show simple instructions page
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Ads Command — Login</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: system-ui, sans-serif; background: #f8f7f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
        .box { background: white; border: 0.5px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 32px; max-width: 360px; width: 100%; }
        h1 { font-size: 18px; font-weight: 500; margin-bottom: 6px; }
        p { font-size: 13px; color: #888; margin-bottom: 20px; line-height: 1.5; }
        input { width: 100%; padding: 10px 12px; border: 0.5px solid rgba(0,0,0,0.15); border-radius: 8px; font-size: 14px; margin-bottom: 12px; box-sizing: border-box; outline: none; }
        input:focus { border-color: #378ADD; }
        button { width: 100%; padding: 10px; background: #378ADD; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; font-weight: 500; }
        button:hover { opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="box">
        <h1>Ads Command</h1>
        <p>Enter the team password to access the dashboard.</p>
        <form method="GET">
          <input type="password" name="p" placeholder="Team password" autofocus />
          <button type="submit">Access dashboard</button>
        </form>
      </div>
    </body>
    </html>
  `

  return new NextResponse(html, {
    status: 401,
    headers: { 'Content-Type': 'text/html' },
  })
}

export const config = {
  // Run on all routes except API routes and Next.js internals
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
