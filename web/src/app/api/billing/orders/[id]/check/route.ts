import { apiCompatError, apiSuccess } from "@/app/api/_shared/api-response";
import { getCurrentUser } from "@/lib/auth/session";
import { isBillingInputError } from "@/lib/server/billing-service";
import { checkBillingOrderPaymentForUser } from "@/lib/server/payment-status-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getCurrentUser();
    if (!user) return apiCompatError(401, "请先登录");
    try {
        const { id } = await params;
        return apiSuccess({ order: await checkBillingOrderPaymentForUser(user.id, id) }, "支付状态已更新");
    } catch (error) {
        if (isBillingInputError(error)) return apiCompatError(error.status, error.message);
        console.error("Check billing order payment failed", error);
        return apiCompatError(500, "检查支付状态失败");
    }
}
