import { cookies } from "next/headers";
import { NextResponse } from "next/server";
export async function GET() {
  const token=(await cookies()).get("finese_session")?.value;
  if(!token) return NextResponse.json({error:"Not signed in"},{status:401});
  try { const r=await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/auth/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}); const d=await r.json(); return NextResponse.json(d,{status:r.status}); }
  catch { return NextResponse.json({error:"Authentication service unavailable"},{status:503}); }
}
