export async function GET() {
  // EXPERT TWEAK: Add 503 branch for missing backend URL
  if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: 'Backend URL not configured',
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  return Response.json({ 
    status: 'ok', 
    frontend: process.env.VERCEL_ENV || 'local',
    backend: process.env.NEXT_PUBLIC_BACKEND_URL,
    timestamp: new Date().toISOString()
  })
} 