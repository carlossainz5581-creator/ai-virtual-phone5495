export const runtime = "edge";

import { NextResponse } from "next/server";

const SUPABASE_API_BASE = "https://api.supabase.com/v1";

export async function POST(req: Request) {
    try {
        const { ref, token, code } = await req.json();
        if (!token || !ref || !code) {
            return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 });
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        // 部署微信助手云函数 (weixin-assistant)
        // 逻辑：先尝试获取，存在则更新，不存在则创建
        const slug = "weixin-assistant";
        const checkRes = await fetch(`${SUPABASE_API_BASE}/projects/${ref}/functions/${slug}`, { headers });
        
        const method = checkRes.ok ? "PATCH" : "POST";
        const url = checkRes.ok 
            ? `${SUPABASE_API_BASE}/projects/${ref}/functions/${slug}`
            : `${SUPABASE_API_BASE}/projects/${ref}/functions`;

        const deployRes = await fetch(url, {
            method,
            headers,
            body: JSON.stringify({
                slug,
                name: "微信助手",
                code,
                verify_jwt: false,
            }),
        });

        const data = await deployRes.json();
        if (!deployRes.ok) throw new Error(data.message || "Failed to deploy function");

        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
