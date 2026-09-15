export const runtime = "edge";

import { NextResponse } from "next/server";
import { zipSync, strToU8 } from "fflate";

const SUPABASE_API_BASE = "https://api.supabase.com/v1";

export async function POST(req: Request) {
    try {
        const { ref, token, code } = await req.json();

        if (!token || !ref || !code) {
            return NextResponse.json(
                { ok: false, error: "Missing parameters" },
                { status: 400 }
            );
        }

        const slug = "weixin-assistant";

        // 把函数代码打包成 zip
        const zipData = zipSync({
    "index.mjs": strToU8(code),
});
        // Supabase 新版函数部署 API
        const form = new FormData();

        form.append(
            "metadata",
            JSON.stringify({
                name: "微信助手",
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

        const deployRes = await fetch(
            `${SUPABASE_API_BASE}/projects/${ref}/functions/deploy?slug=${slug}`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: form,
            }
        );

        const data = await deployRes.json();

        if (!deployRes.ok) {
            throw new Error(
                data.message ||
                data.error ||
                JSON.stringify(data) ||
                "Failed to deploy function"
            );
        }

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
