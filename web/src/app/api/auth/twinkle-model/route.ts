import { NextResponse } from "next/server";

import { readJsonBody } from "@/lib/auth/request";
import { getCurrentUser } from "@/lib/auth/session";
import { bindTwinkleModelAccount, getTwinkleModelBindingStatus, setTwinkleModelProviderPreference, TwinkleModelAccountError, unbindTwinkleModelAccount } from "@/lib/server/twinkle-model-account-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    return NextResponse.json({ data: await getTwinkleModelBindingStatus(user.id) });
}

export async function POST(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    try {
        const body = await readJsonBody<{ email?: string; password?: string }>(request);
        return NextResponse.json({ data: await bindTwinkleModelAccount({ userId: user.id, email: body.email || "", password: body.password || "" }) });
    } catch (error) {
        return bindingErrorResponse(error);
    }
}

export async function PATCH(request: Request) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    try {
        const body = await readJsonBody<{ provider?: string }>(request);
        if (body.provider !== "twinkle-model" && body.provider !== "twinkle-video") return NextResponse.json({ error: "无效的服务选择" }, { status: 400 });
        return NextResponse.json({ data: await setTwinkleModelProviderPreference(user.id, body.provider) });
    } catch (error) {
        return bindingErrorResponse(error);
    }
}

export async function DELETE() {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    try {
        return NextResponse.json({ data: await unbindTwinkleModelAccount(user.id) });
    } catch (error) {
        return bindingErrorResponse(error);
    }
}

function bindingErrorResponse(error: unknown) {
    if (error instanceof TwinkleModelAccountError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Twinkle Model account operation failed", error);
    return NextResponse.json({ error: "Twinkle Model 账户操作失败，请稍后重试" }, { status: 500 });
}
