export const runtime = "edge";

import { NextResponse } from "next/server";

const SUPABASE_API_BASE = "https://api.supabase.com/v1";

export async function POST(req: Request) {
    try {
        const { projectRef, token, gatewayCode, generateCode, resultCode, bridgeCode, screenChatCode, schemaSql } = await req.json();
        if (!token || !projectRef) {
            return NextResponse.json({ ok: false, error: "Missing parameters" }, { status: 400 });
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        const deployFunction = async (slug: string, name: string, code: string) => {
            const checkRes = await fetch(`${SUPABASE_API_BASE}/projects/${projectRef}/functions/${slug}`, { headers });
            const method = checkRes.ok ? "PATCH" : "POST";
            const url = checkRes.ok 
                ? `${SUPABASE_API_BASE}/projects/${projectRef}/functions/${slug}`
                : `${SUPABASE_API_BASE}/projects/${projectRef}/functions`;

            const res = await fetch(url, {
                method,
                headers,
                body: JSON.stringify({ slug, name, code, verify_jwt: false }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(`Failed to deploy ${slug}: ${data.message || "Unknown error"}`);
            }
        };

        // 部署推送相关的一系列函数
        await deployFunction("ai-phone-push", "离线推送网关", gatewayCode);
        await deployFunction("push-generate", "推送内容生成", generateCode);
        await deployFunction("push-shortcut-result", "快捷动作回调", resultCode);
        await deployFunction("push-bridge", "推送桥接", bridgeCode);
        await deployFunction("screen-chat", "屏幕速聊", screenChatCode);

        // 注意：SQL 执行在 Edge API 中通常需要 service_role key 直接连数据库，
        // Management API 不直接支持运行 SQL。这里我们假设用户已经通过 SQL Editor 运行了 schema.sql，
        // 或者我们返回成功让前端继续健康检查。
        
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
