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

     

        /*
         * 关键修复：
         * 旧版本函数可能保存了 source/index.mjs 作为 entrypoint。
         * 先删除旧函数，再用新版 Deploy API 重新创建。
         */
        const deleteRes = await fetch(
            `${SUPABASE_API_BASE}/projects/${ref}/functions/${slug}`,
            {
                method: "DELETE",
                headers,
            }
        );

        // 404 = 原本没有这个函数，可以直接创建
        if (!deleteRes.ok && deleteRes.status !== 404) {
            const deleteData = await deleteRes.json().catch(() => ({}));

            throw new Error(
                deleteData.message ||
                deleteData.error ||
                JSON.stringify(deleteData) ||
                `删除旧微信函数失败（HTTP ${deleteRes.status}）`
            );
        }

        /*
         * 新函数只有一个入口文件：
         *
         * index.mjs
         */
        const zipData = zipSync({
            "index.mjs": strToU8(code),
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

        /*
         * Supabase 新版 Edge Function Deploy API
         */
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
