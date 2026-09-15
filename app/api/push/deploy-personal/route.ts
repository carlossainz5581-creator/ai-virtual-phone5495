export const runtime = "edge";

import { NextResponse } from "next/server";

const SUPABASE_API_BASE = "https://api.supabase.com/v1";

export async function POST(req: Request) {
    try {
        const {
            projectRef,
            token,
            gatewayCode,
            generateCode,
            resultCode,
            bridgeCode,
            screenChatCode,
            schemaSql,
        } = await req.json();

        if (!token || !projectRef) {
            return NextResponse.json(
                { ok: false, error: "Missing parameters" },
                { status: 400 }
            );
        }

        const deployFunction = async (
            slug: string,
            name: string,
            code: string
        ) => {
            if (!code) {
                throw new Error(`Missing code for ${slug}`);
            }

            const form = new FormData();

            form.append(
                "metadata",
                JSON.stringify({
                    name,
                    entrypoint_path: "index.mjs",
                    verify_jwt: false,
                })
            );

            // 和微信助手一样：直接上传 index.mjs
            form.append(
                "file",
                new Blob([code], {
                    type: "application/javascript",
                }),
                "index.mjs"
            );

            const res = await fetch(
                `${SUPABASE_API_BASE}/projects/${projectRef}/functions/deploy?slug=${slug}`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: form,
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    `Failed to deploy ${slug}: ${
                        data.message ||
                        data.error ||
                        JSON.stringify(data) ||
                        "Unknown error"
                    }`
                );
            }
        };

        // 1. 离线推送网关
        await deployFunction(
            "ai-phone-push",
            "离线推送网关",
            gatewayCode
        );

        // 2. 推送内容生成
        await deployFunction(
            "push-generate",
            "推送内容生成",
            generateCode
        );

        // 3. 快捷动作回调
        await deployFunction(
            "push-shortcut-result",
            "快捷动作回调",
            resultCode
        );

        // 4. 推送桥接
        await deployFunction(
            "push-bridge",
            "推送桥接",
            bridgeCode
        );

        // 5. 屏幕速聊
        await deployFunction(
            "screen-chat",
            "屏幕速聊",
            screenChatCode
        );

        // schemaSql 暂时不执行
        void schemaSql;

        return NextResponse.json({
            ok: true,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err?.message || String(err),
            },
            { status: 500 }
        );
    }
}
