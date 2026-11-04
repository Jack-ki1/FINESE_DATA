import { NextResponse } from "next/server";
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const upstream = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/auth/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body), cache:"no-store" });
    const data = await upstream.json();
    if (!upstream.ok) return NextResponse.json({error:data.detail || "Unable to sign in."},{status:upstream.status});
    const response = NextResponse.json({user:data.user});
    response.cookies.set("finese_session",data.access_token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*7});
    return response;
  } catch { return NextResponse.json({error:"Authentication service is unavailable."},{status:503}); }
}
