import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') === 'en' ? 'en' : 'ar'
  const api = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1'
  try {
    const responses = await Promise.all(['departments', 'doctors'].map(path => fetch(`${api}/${path}?locale=${locale}`, { next: { revalidate:120 }, signal:AbortSignal.timeout(10000) })))
    if (responses.some(response => !response.ok)) throw new Error('Options unavailable')
    const [departments, doctors] = await Promise.all(responses.map(response => response.json()))
    return NextResponse.json({ departments:departments.data ?? [], doctors:doctors.data ?? [] })
  } catch {
    return NextResponse.json({ error:'Options unavailable' }, { status:503 })
  }
}
