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
                    entrypoint_path: "index.ts",
                    verify_jwt: false,
                })
            );

            // Push 函数本身是 TypeScript，所以直接上传 index.ts
            form.append(
                "file",
                new Blob([code], {
                    type: "application/typescript",
                }),
                "index.ts"
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

            const data = await res.json().catch(() => ({}));

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

        await deployFunction(
            "ai-phone-push",
            "离线推送网关",
            gatewayCode
        );

        await deployFunction(
            "push-generate",
            "推送内容生成",
            generateCode
        );

        await deployFunction(
            "push-shortcut-result",
            "快捷动作回调",
            resultCode
        );

        await deployFunction(
            "push-bridge",
            "推送桥接",
            bridgeCode
        );

        await deployFunction(
            "screen-chat",
            "屏幕速聊",
            screenChatCode
        );

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
