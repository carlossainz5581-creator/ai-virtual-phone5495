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

        // 使用 Supabase 新版 Edge Function Deploy API
        const deployFunction = async (
            slug: string,
            name: string,
            code: string
        ) => {
            if (!code) {
                throw new Error(`Missing code for ${slug}`);
            }

            // 将函数代码打包成 zip
            const zip = new JSZip();
            zip.file("index.mjs", code);

            const zipData = await zip.generateAsync({
                type: "uint8array",
            });

            const form = new FormData();

            form.append(
                "metadata",
                JSON.stringify({
                    name,
                    entrypoint_path: "index.mjs",
                    verify_jwt: false,
                })
            );

            form.append(
                "file",
                new Blob([zipData], {
                    type: "application/zip",
                }),
                "function.zip"
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

        // 部署推送相关的 5 个函数
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

        // schemaSql 暂时不在这里执行
        // 后续如果健康检查提示数据库表不存在，再处理 SQL 部署。

        return NextResponse.json({
            ok: true,
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                ok: false,
                error: err.message,
            },
            { status: 500 }
        );
    }
}
