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

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        const slug = "weixin-assistant";

        // 先删除旧函数，彻底清掉旧的 source/index.mjs 配置
        const deleteRes = await fetch(
            `${SUPABASE_API_BASE}/projects/${ref}/functions/${slug}`,
            {
                method: "DELETE",
                headers,
            }
        );

        if (!deleteRes.ok && deleteRes.status !== 404) {
            const deleteData = await deleteRes.json().catch(() => ({}));

            throw new Error(
                deleteData.message ||
                deleteData.error ||
                JSON.stringify(deleteData) ||
                `删除旧微信函数失败（HTTP ${deleteRes.status}）`
            );
        }

        // ZIP 内部明确使用 source/index.mjs
        const zipData = zipSync({
            "source/index.mjs": strToU8(code),
        });

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
                headers,
                body: form,
            }
        );

        const data = await deployRes.json().catch(() => ({}));

        if (!deployRes.ok) {
            throw new Error(
                data.message ||
                data.error ||
                JSON.stringify(data) ||
                `微信函数部署失败（HTTP ${deployRes.status}）`
            );
        }

        return NextResponse.json({
            ok: true,
            function: data,
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
