import { NextRequest, NextResponse } from 'next/server'
export async function POST(request:NextRequest) {
  try {
    const response = await fetch(`${process.env.API_URL ?? 'http://localhost:3000/v1'}/bookings/requests`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(await request.json()),signal:AbortSignal.timeout(15000),cache:'no-store'})
    return NextResponse.json(await response.json(),{status:response.status})
  } catch { return NextResponse.json({error:'Unable to submit request'},{status:503}) }
}
