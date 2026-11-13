import { NextRequest, NextResponse } from 'next/server'
export async function GET(request:NextRequest) {
  const params = new URLSearchParams()
  for (const key of ['locale','type','q','category','page','limit']) {
    const value = request.nextUrl.searchParams.get(key)
    if (value !== null) params.set(key,value)
  }
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/v1'}/posts?${params}`, { cache:'no-store',signal:AbortSignal.timeout(10000) })
    return NextResponse.json(await response.json(),{status:response.status})
  } catch { return NextResponse.json({error:'Posts unavailable'},{status:503}) }
}
