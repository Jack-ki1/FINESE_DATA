import { cookies } from "next/headers";
import { redirect } from "next/navigation";
export const metadata={title:"Studio",robots:{index:false,follow:false}};
export default async function StudioLayout({children}:{children:React.ReactNode}){
 const token=(await cookies()).get("finese_session")?.value;
 if(!token) redirect("/login");
 try { const res=await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:8000"}/api/auth/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}); if(!res.ok) redirect("/login"); }
 catch { redirect("/login"); }
 return children;
}
