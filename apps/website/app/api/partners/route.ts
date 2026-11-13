import { NextRequest, NextResponse } from 'next/server'
export async function GET(request:NextRequest) {
 const locale=request.nextUrl.searchParams.get('locale')==='en'?'en':'ar'
 try {
  const response=await fetch(`${process.env.API_URL ?? 'http://localhost:3000/v1'}/content/partners?locale=${locale}`,{next:{revalidate:120},signal:AbortSignal.timeout(10000)})
  return NextResponse.json(await response.json(),{status:response.status})
 } catch { return NextResponse.json({error:'Partners unavailable'},{status:503}) }
}
