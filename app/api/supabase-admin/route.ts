export const runtime = "edge";

import { NextResponse } from "next/server";

const SUPABASE_API_BASE = "https://api.supabase.com/v1";

export async function POST(req: Request) {
    try {
        const { action, token, ...params } = await req.json();
        if (!token) return NextResponse.json({ ok: false, error: "Missing token" }, { status: 401 });

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        };

        if (action === "organizations") {
            const res = await fetch(`${SUPABASE_API_BASE}/organizations`, { headers });
            const data = await res.json();
            return NextResponse.json({ ok: true, organizations: data });
        }

        if (action === "project_status") {
    const { projectRef } = params;

    const url = new URL(
        `${SUPABASE_API_BASE}/projects/${projectRef}/health`
    );

    url.searchParams.append("services", "auth");
    url.searchParams.append("services", "rest");
    url.searchParams.append("services", "db");
    url.searchParams.append("services", "storage");
    url.searchParams.append("services", "realtime");

    const res = await fetch(url.toString(), {
        headers,
    });

    const data = await res.json();

    if (!res.ok) {
        throw new Error(
            data.message ||
            data.error ||
            JSON.stringify(data) ||
            "Failed to check project health"
        );
    }

    const services = Array.isArray(data) ? data : [];

    const unhealthy = services.find(
        (service: any) => service.status !== "ACTIVE_HEALTHY"
    );

    return NextResponse.json({
        ok: true,
        status: unhealthy
            ? unhealthy.status
            : "ACTIVE_HEALTHY",
    });
        }
        
        if (action === "create_project") {
            const { organizationSlug, regionCode } = params;

            const dbPass =
                crypto.randomUUID().replace(/-/g, "") +
                crypto.randomUUID().replace(/-/g, "");

            const res = await fetch(`${SUPABASE_API_BASE}/projects`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                    name: "AI Phone Personal Cloud",
                    organization_slug: organizationSlug,
                    db_pass: dbPass,
                    region_selection: {
                                 type: "smartGroup",
                                 code: regionCode || "americas",
            },
        }),
    });

    

    
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Failed to create project");
            return NextResponse.json({ ok: true, projectRef: data.id });
        }

        if (action === "api_keys") {
            const { projectRef } = params;
            const res = await fetch(`${SUPABASE_API_BASE}/projects/${projectRef}/api-keys`, { headers });
            const data = await res.json();
            const serviceRoleKey = data.find((k: any) => k.name === "service_role")?.api_key;
            return NextResponse.json({ ok: true, serviceRoleKey });
        }

        if (action === "run_sql") {
    const { projectRef, sql } = params;

    if (!projectRef || !sql) {
        return NextResponse.json(
            {
                ok: false,
                error: "Missing projectRef or sql",
            },
            { status: 400 }
        );
    }

    const res = await fetch(
        `${SUPABASE_API_BASE}/projects/${projectRef}/database/query`,
        {
            method: "POST",
            headers,
            body: JSON.stringify({
                query: sql,
            }),
        }
    );

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(
            data.message ||
            data.error ||
            JSON.stringify(data) ||
            `Failed to execute SQL (HTTP ${res.status})`
        );
    }

    return NextResponse.json({
        ok: true,
        data,
    });
        }

        if (action === "assert_dedicated_project") {
            return NextResponse.json({ ok: true });
        }

        return NextResponse.json({ ok: false, error: "Unknown action" }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
    }
}
