import { cookies } from "next/headers";
import { NextRequest } from "next/server";
export const runtime = "nodejs";
async function forward(request:NextRequest,context:{params:Promise<{path:string[]}>}) {
  const {path}=await context.params;
  if(!["GET","HEAD","OPTIONS"].includes(request.method)) {
    const origin=request.headers.get("origin");
    const allowed=new Set([process.env.NEXT_PUBLIC_APP_URL,"http://localhost:3000","http://127.0.0.1:3000"].filter(Boolean));
    if(origin && !allowed.has(origin)) return Response.json({detail:"Request origin is not allowed."},{status:403});
    if(!origin && process.env.NODE_ENV === "production") return Response.json({detail:"Origin header is required for state-changing requests."},{status:403});
  }
  const token=(await cookies()).get("finese_session")?.value;
  if(!token) return Response.json({detail:"Authentication required."},{status:401});
  const target=`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers=new Headers(); const contentType=request.headers.get("content-type"); if(contentType) headers.set("content-type",contentType); headers.set("Authorization",`Bearer ${token}`);
  const init:RequestInit={method:request.method,headers,cache:"no-store",redirect:"manual"};
  if(!["GET","HEAD"].includes(request.method)) init.body=await request.arrayBuffer();
  try {
    const upstream=await fetch(target,init); const responseHeaders=new Headers();
    for(const key of ["content-type","content-disposition","content-length","cache-control"]) { const v=upstream.headers.get(key); if(v) responseHeaders.set(key,v); }
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  } catch { return Response.json({detail:"The FINESE DATA compute service is unavailable. Check BACKEND_URL and start the Python API."},{status:503}); }
}
export const GET=forward; export const POST=forward; export const DELETE=forward; export const PUT=forward; export const PATCH=forward;
