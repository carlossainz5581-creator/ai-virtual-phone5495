export const runtime = "edge";

import { NextResponse } from "next/server";

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

        const form = new FormData();

        form.append(
            "metadata",
            JSON.stringify({
                name: "微信助手",
                entrypoint_path: "index.mjs",
                verify_jwt: false,
            })
        );

        // 关键：直接上传 index.mjs，不再打 ZIP
        form.append(
            "file",
            new Blob([code], {
                type: "application/javascript",
            }),
            "index.mjs"
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
                error: err?.message || String(err),
            },
            { status: 500 }
        );
    }
}
